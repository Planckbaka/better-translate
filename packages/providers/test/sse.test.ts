import { describe, expect, it } from 'vitest'
import { SseParser } from '../src/sse'

function collect(parser: SseParser, chunks: string[]): string[] {
  return chunks.flatMap((c) => parser.push(c)).concat(parser.flush())
}

describe('SseParser', () => {
  it('解析标准事件流', () => {
    const events = collect(new SseParser(), ['data: {"a":1}\n\n', 'data: {"a":2}\n\n', 'data: [DONE]\n\n'])
    expect(events).toEqual(['{"a":1}', '{"a":2}', '[DONE]'])
  })

  it('处理跨 chunk 断行', () => {
    const events = collect(new SseParser(), ['data: {"a"', ':1}\n', '\ndata', ': {"b":2}\n\n'])
    expect(events).toEqual(['{"a":1}', '{"b":2}'])
  })

  it('处理 CRLF 与孤立 CR', () => {
    const events = collect(new SseParser(), ['data: x\r\ndata: y\r\n\r\n', 'data: z\r\r'])
    expect(events).toEqual(['x\ny', 'z'])
  })

  it('多 data 行按 SSE 规范拼接，注释行忽略', () => {
    const events = collect(new SseParser(), [': ping\n\n', 'data: line1\ndata: line2\n\n'])
    expect(events).toEqual(['line1\nline2'])
  })

  it('结尾缺空行时 flush 兜底', () => {
    const events = collect(new SseParser(), ['data: tail'])
    expect(events).toEqual(['tail'])
  })

  it('data 值前导空格只剥一个', () => {
    const events = collect(new SseParser(), ['data:  spaced\n\n'])
    expect(events).toEqual([' spaced'])
  })
})
