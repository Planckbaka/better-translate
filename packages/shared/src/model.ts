/**
 * Provider 注册表数据模型 —— 结构借鉴 magpie：
 * - 组合模型 id `provider/model`（或未来的 `group/…`）作为全局唯一路由键
 * - provider 可携带多协议端点、preset 模板、模型目录（pickedFrom）、off 开关
 * - 按功能槽位分配模型（对应 magpie settings.json 的 vision/imageGen/searcher 模式）
 */

export type ProviderKind =
  | 'openai-chat' // OpenAI /v1/chat/completions 兼容（OpenAI、DeepSeek、智谱、SiliconFlow、Ollama、magpie、任意兼容网关）
  | 'anthropic' // Anthropic /v1/messages 协议

export interface ModelMeta {
  /** 展示用 id，同时是路由键的 model 部分 */
  id: string
  /** 实际请求发到 API 的模型名，缺省同 id */
  apiId?: string
  context?: number
  maxOutput?: number
  vision?: boolean
  reasoning?: boolean
  /** 速度档位，用于"快/强"推荐 */
  speed?: 'fast' | 'balanced' | 'strong'
  /** 每百万 tokens 价格（输入/输出），用于成本估算 */
  priceIn?: number
  priceOut?: number
}

export interface Provider {
  id: string
  name: string
  kind: ProviderKind
  preset?: string // 来自 PRESETS 的模板 id，custom 的为空
  baseUrl?: string
  apiKey?: string
  /** OpenAI Responses 等备用端点，M3 使用，先保留字段 */
  altEndpoints?: Record<string, string>
  models: ModelMeta[]
  off?: boolean
  website?: string
  keysUrl?: string
  createdAt: number
}

export interface ModelGroup {
  id: string
  name: string
  /** 成员为 `provider/model` 组合 id，按顺序 failover */
  members: string[]
}

/** 功能槽位 —— 每个功能绑定一个路由键 */
export interface Slots {
  /** 划词翻译 */
  selection: string
  /** AI 解释（词义/例句） */
  explain: string
  /** 整页沉浸翻译 */
  page: string
  /** 单段重译（强模型） */
  retryStrong: string
}

export const DEFAULT_SLOTS: Slots = {
  selection: '',
  explain: '',
  page: '',
  retryStrong: '',
}

export type DisplayMode = 'bilingual' | 'replace' | 'hover'

export interface SiteRule {
  pattern: string // host 或 match pattern
  enabled?: boolean // false = 永不翻译
  displayMode?: DisplayMode
  from?: string
  to?: string
}

export interface Settings {
  providers: Provider[]
  groups: ModelGroup[]
  slots: Slots
  /** 通用偏好 */
  targetLang: string // 默认目标语言
  triggerDelayMs: number // 划词浮钮延迟
  pageDisplayMode: DisplayMode
  sendPageTitle: boolean // 是否携带页面标题作为上下文
  onlyLocalModel: boolean // 隐私：仅允许本地 provider
  localProviderIds: string[]
  siteRules: SiteRule[]
}

export const DEFAULT_SETTINGS: Settings = {
  providers: [],
  groups: [],
  slots: DEFAULT_SLOTS,
  targetLang: 'zh-Hans',
  triggerDelayMs: 300,
  pageDisplayMode: 'bilingual',
  sendPageTitle: true,
  onlyLocalModel: false,
  localProviderIds: ['ollama'],
  siteRules: [],
}

/** 一次 LLM 请求的用量流水（对应 magpie 的 routing 日志行） */
export interface UsageRecord {
  id: string
  t: number // 时间戳
  feature: 'selection' | 'explain' | 'page' | 'retry' | 'manual' | 'test'
  providerId: string
  modelId: string
  inTokens: number
  outTokens: number
  ms: number
  ttftMs?: number
  status: number // 200 正常 / 非 0 即异常
  costUsd?: number
  error?: string
}

/** 解析组合路由键 `provider/model` | `group/xxx` */
export function parseRoute(
  route: string
): { kind: 'provider' | 'group'; providerId: string; modelId: string } | null {
  const idx = route.indexOf('/')
  if (idx <= 0) return null
  const head = route.slice(0, idx)
  const rest = route.slice(idx + 1)
  if (!rest) return null
  if (head === 'group') return { kind: 'group', providerId: '', modelId: rest }
  return { kind: 'provider', providerId: head, modelId: rest }
}

export function makeRoute(providerId: string, modelId: string): string {
  return `${providerId}/${modelId}`
}

export function modelDisplayName(route: string): string {
  const parsed = parseRoute(route)
  return parsed ? parsed.modelId : route
}
