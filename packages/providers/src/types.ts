/** 统一的 LLM 适配器契约 —— 所有协议差异在此层收敛 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'usage'; inTokens: number; outTokens: number }
  | { type: 'done' }

export interface ChatRequest {
  messages: ChatMessage[]
  model: string // apiId
  baseUrl: string
  apiKey?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  /** 额外请求头（部分网关需要） */
  extraHeaders?: Record<string, string>
}

/** 归一化错误：UI 展示时不需再区分协议 */
export class AdapterError extends Error {
  status: number
  detail?: string

  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.name = 'AdapterError'
    this.status = status
    this.detail = detail
  }
}

export interface LLMAdapter {
  /** 流式对话。done 事件之后迭代自然结束 */
  stream(req: ChatRequest): AsyncIterable<StreamEvent>
  /** 拉取模型目录（/models 端点），不支持时返回 null */
  listModels(req: { baseUrl: string; apiKey?: string; signal?: AbortSignal }): Promise<string[] | null>
}

export async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    // 常见 JSON 错误体，抽出 message / error.message
    try {
      const data = JSON.parse(text) as { error?: { message?: string }; message?: string }
      const msg = data.error?.message ?? data.message
      if (msg) return `${res.status} ${msg}`
    } catch {
      /* 非 JSON，原样返回 */
    }
    return `${res.status} ${text.slice(0, 300)}`
  } catch {
    return `${res.status} ${res.statusText}`
  }
}
