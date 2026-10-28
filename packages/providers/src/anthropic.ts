import { SseParser } from './sse'
import type { AnthropicStreamEvent } from './sse'
import { AdapterError, readErrorBody } from './types'
import type { ChatRequest, LLMAdapter, StreamEvent } from './types'

/** Anthropic /v1/messages 协议（Claude 系列） */
export class AnthropicAdapter implements LLMAdapter {
  async *stream(req: ChatRequest): AsyncIterable<StreamEvent> {
    const url = `${req.baseUrl.replace(/\/+$/, '')}/v1/messages`
    const system = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const messages = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.apiKey ?? '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        ...req.extraHeaders,
      },
      body: JSON.stringify({
        model: req.model,
        system: system || undefined,
        messages,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature,
        stream: true,
      }),
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
        yield* handleAnthropicPayload(payload)
      }
    }
    for (const payload of parser.flush()) {
      yield* handleAnthropicPayload(payload)
    }
    yield { type: 'done' }
  }

  async listModels(): Promise<string[] | null> {
    // Anthropic 模型目录端点需要单独权限，M3 再补；先返回内置目录
    return null
  }
}

function* handleAnthropicPayload(payload: string): Generator<StreamEvent> {
  const data = payload.trim()
  if (!data) return
  let ev: AnthropicStreamEvent
  try {
    ev = JSON.parse(data) as AnthropicStreamEvent
  } catch {
    return
  }
  if (ev.type === 'content_block_delta' && ev.delta?.text) {
    yield { type: 'delta', text: ev.delta.text }
  } else if (ev.type === 'message_start' && ev.message?.usage) {
    yield {
      type: 'usage',
      inTokens: ev.message.usage.input_tokens ?? 0,
      outTokens: ev.message.usage.output_tokens ?? 0,
    }
  } else if (ev.type === 'message_delta' && ev.usage) {
    yield {
      type: 'usage',
      inTokens: ev.usage.input_tokens ?? 0,
      outTokens: ev.usage.output_tokens ?? 0,
    }
  }
}
