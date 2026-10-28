/**
 * 增量 SSE 解析器 —— 纯函数状态机，方便单测。
 * 按 text/event-stream 规范：事件以空行分隔，`data:` 行承载负载。
 * 处理 CRLF、跨 chunk 断行、多 data 行拼接、注释行。
 */
export class SseParser {
  private buffer = ''
  private dataLines: string[] = []

  /** 送入一段文本，返回本次完整产出的事件负载（已按行拼接） */
  push(chunk: string): string[] {
    this.buffer += chunk
    const events: string[] = []
    for (;;) {
      const idx = this.findLineEnd()
      if (idx === -1) break
      const line = this.buffer.slice(0, idx)
      const endLen = this.buffer.startsWith('\r\n', idx) ? 2 : 1
      const ev = this.consumeLine(line)
      if (ev !== null) events.push(ev)
      this.buffer = this.buffer.slice(idx + endLen)
    }
    return events
  }

  /** 流结束时调用：把残留的不完整行作为事件冲出（容错：部分网关结尾缺空行） */
  flush(): string[] {
    const events: string[] = []
    const ev = this.consumeLine(this.buffer)
    if (ev !== null) events.push(ev)
    this.buffer = ''
    if (this.dataLines.length) {
      events.push(this.dataLines.join('\n'))
      this.dataLines = []
    }
    return events
  }

  private findLineEnd(): number {
    const nl = this.buffer.indexOf('\n')
    const cr = this.buffer.indexOf('\r')
    if (nl === -1) return cr
    if (cr === -1) return nl
    return Math.min(nl, cr)
  }

  /** 返回拼好的 data 负载；非事件返回 null */
  private consumeLine(line: string): string | null {
    const clean = line.endsWith('\r') ? line.slice(0, -1) : line
    if (clean === '') {
      // 空行 = 事件边界
      if (this.dataLines.length) {
        const ev = this.dataLines.join('\n')
        this.dataLines = []
        return ev
      }
      return null
    }
    if (clean.startsWith(':')) return null // 注释行
    const colon = clean.indexOf(':')
    const field = colon === -1 ? clean : clean.slice(0, colon)
    let value = colon === -1 ? '' : clean.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'data') this.dataLines.push(value)
    return null
  }
}

export interface OpenAiStreamChunk {
  choices?: Array<{
    delta?: { content?: string | null }
    finish_reason?: string | null
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null
}

export interface AnthropicStreamEvent {
  type: string
  delta?: { text?: string }
  message?: { usage?: { input_tokens?: number; output_tokens?: number } }
  usage?: { input_tokens?: number; output_tokens?: number }
}
