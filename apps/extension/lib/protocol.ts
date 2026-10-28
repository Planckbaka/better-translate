/** UI ↔ background 的消息协议 */
import type { ChatMessage } from '@bt/providers'
import type { UsageRecord } from '@bt/shared'

export interface ChatStartPayload {
  /** 组合路由键 provider/model */
  route: string
  messages: ChatMessage[]
  feature: UsageRecord['feature']
  temperature?: number
  maxTokens?: number
}

export type PortToBg = { kind: 'chat'; id: string; payload: ChatStartPayload } | { kind: 'abort'; id: string }

export type PortToUi =
  | { kind: 'delta'; id: string; text: string }
  | { kind: 'usage'; id: string; inTokens: number; outTokens: number }
  | { kind: 'done'; id: string }
  | { kind: 'error'; id: string; message: string; status: number }

export interface TestResult {
  ok: boolean
  ms: number
  sample?: string
  error?: string
}

export type BgRequest =
  | { type: 'bt/listModels'; providerId: string }
  | { type: 'bt/testProvider'; providerId: string }
  | { type: 'bt/usageSummary'; days: number }

export type BgResponse =
  | { ok: true; models: string[] }
  | { ok: true; test: TestResult }
  | { ok: true; records: UsageRecord[] }
  | { ok: false; error: string }
