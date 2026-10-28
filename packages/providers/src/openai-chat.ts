import type { Provider } from '@bt/shared'
import { SseParser } from './sse'
import type { OpenAiStreamChunk } from './sse'
import { AdapterError, readErrorBody } from './types'
import type { ChatRequest, LLMAdapter, StreamEvent } from './types'

/**
 * OpenAI /v1/chat/completions 兼容协议 —— 覆盖绝大多数供应商与聚合网关
 * （OpenAI、DeepSeek、智谱、SiliconFlow、Moonshot、Gemini 兼容层、Ollama、magpie、one-api…）。
 * OpenAI 专属的 stream_options 仅对官方端点发送，避免部分兼容网关 400。
 */
export class OpenAIChatAdapter implements LLMAdapter {
  constructor(private provider?: Provider) {}

  async *stream(req: ChatRequest): AsyncIterable<StreamEvent> {
    const url = joinUrl(req.baseUrl, '/chat/completions')
    const isOfficialOpenAI = req.baseUrl.includes('api.openai.com')
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
      stream: true,
    }
    if (req.temperature !== undefined) body.temperature = req.temperature
    if (req.maxTokens !== undefined) body.max_tokens = req.maxTokens
    if (isOfficialOpenAI) body.stream_options = { include_usage: true }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.apiKey ? { Authorization: `Bearer ${req.apiKey}` } : {}),
        ...req.extraHeaders,
      },
      body: JSON.stringify(body),
      signal: req.signal,
    })
    if (!res.ok) throw new AdapterError(res.status, await readErrorBody(res))
    if (!res.body) throw new AdapterError(res.status, '响应无内容流')

    const parser = new SseParser()
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const payload of parser.push(decoder.decode(value, { stream: true }))) {
        yield* this.handlePayload(payload)
      }
    }
    for (const payload of parser.flush()) {
      yield* this.handlePayload(payload)
    }
    yield { type: 'done' }
  }

  private *handlePayload(payload: string): Generator<StreamEvent> {
    const data = payload.trim()
    if (!data || data === '[DONE]') return
    let chunk: OpenAiStreamChunk
    try {
      chunk = JSON.parse(data) as OpenAiStreamChunk
    } catch {
      return // 非法 JSON 片段直接忽略（部分网关心跳）
    }
    const text = chunk.choices?.[0]?.delta?.content
    if (text) yield { type: 'delta', text }
    if (chunk.usage?.prompt_tokens !== undefined) {
      yield {
        type: 'usage',
        inTokens: chunk.usage.prompt_tokens ?? 0,
        outTokens: chunk.usage.completion_tokens ?? 0,
      }
    }
  }

  async listModels(req: { baseUrl: string; apiKey?: string; signal?: AbortSignal }): Promise<string[]> {
    const res = await fetch(joinUrl(req.baseUrl, '/models'), {
      headers: { ...(req.apiKey ? { Authorization: `Bearer ${req.apiKey}` } : {}) },
      signal: req.signal,
    })
    if (!res.ok) throw new AdapterError(res.status, await readErrorBody(res))
    const data = (await res.json()) as { data?: Array<{ id?: string }> }
    return (data.data ?? []).map((x) => x.id ?? '').filter(Boolean)
  }
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path
}
