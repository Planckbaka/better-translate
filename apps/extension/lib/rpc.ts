import type { BgRequest, BgResponse, ChatStartPayload, PortToBg, PortToUi } from '@/lib/protocol'

export interface StreamHandlers {
  onDelta?: (text: string) => void
  onUsage?: (inTokens: number, outTokens: number) => void
  onDone?: () => void
  onError?: (message: string, status: number) => void
}

/** 发起一次流式对话；返回中止函数 */
export function startChat(payload: ChatStartPayload, handlers: StreamHandlers): () => void {
  const id = crypto.randomUUID()
  const port = browser.runtime.connect({ name: 'bt:llm' })
  const onMessage = (msg: PortToUi) => {
    if (msg.id !== id) return
    switch (msg.kind) {
      case 'delta':
        handlers.onDelta?.(msg.text)
        break
      case 'usage':
        handlers.onUsage?.(msg.inTokens, msg.outTokens)
        break
      case 'done':
        handlers.onDone?.()
        port.disconnect()
        break
      case 'error':
        handlers.onError?.(msg.message, msg.status)
        port.disconnect()
        break
    }
  }
  port.onMessage.addListener(onMessage)
  port.postMessage({ kind: 'chat', id, payload } satisfies PortToBg)
  return () => {
    try {
      port.postMessage({ kind: 'abort', id } satisfies PortToBg)
    } catch {
      /* port 已断开 */
    }
    port.disconnect()
  }
}

export async function sendBg<T extends BgResponse>(req: BgRequest): Promise<T> {
  return (await browser.runtime.sendMessage(req)) as T
}
