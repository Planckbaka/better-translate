import type { ModelMeta, Provider } from './model'

/**
 * 内置 preset 目录 —— 借鉴 magpie 的 provider preset 设计：
 * 每个 preset 声明协议类型、默认端点、常见模型目录与 key 申请入口，
 * 用户选择 preset 后只需填 key 即可使用；custom 类型留给任意 OpenAI 兼容端点
 * （包括本机 magpie 网关、one-api、new-api 等聚合网关）。
 */
export interface ProviderPreset {
  id: string
  name: string
  kind: Provider['kind']
  baseUrl: string
  /** 是否需要 API key（Ollama 等本地端不需要） */
  needsKey: boolean
  /** 本地推理端点，隐私模式下始终可用 */
  local?: boolean
  website?: string
  keysUrl?: string
  models: ModelMeta[]
  /** 预填到输入框的说明 */
  note?: string
}

const m = (id: string, extra: Partial<ModelMeta> = {}): ModelMeta => ({ id, ...extra })

export const PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    kind: 'openai-chat',
    baseUrl: 'https://api.openai.com/v1',
    needsKey: true,
    website: 'https://platform.openai.com',
    keysUrl: 'https://platform.openai.com/api-keys',
    models: [
      m('gpt-4o-mini', { context: 128000, vision: true, speed: 'fast', priceIn: 0.15, priceOut: 0.6 }),
      m('gpt-4o', { context: 128000, vision: true, speed: 'strong', priceIn: 2.5, priceOut: 10 }),
      m('gpt-4.1-mini', { context: 1000000, vision: true, speed: 'fast', priceIn: 0.4, priceOut: 1.6 }),
      m('gpt-4.1', { context: 1000000, vision: true, speed: 'strong', priceIn: 2, priceOut: 8 }),
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    needsKey: true,
    website: 'https://console.anthropic.com',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      m('claude-haiku-4-5', { context: 200000, speed: 'fast', priceIn: 1, priceOut: 5 }),
      m('claude-sonnet-4-5', { context: 200000, speed: 'strong', priceIn: 3, priceOut: 15 }),
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    kind: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    needsKey: true,
    website: 'https://platform.deepseek.com',
    keysUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      m('deepseek-chat', { context: 128000, speed: 'fast', priceIn: 0.27, priceOut: 1.1 }),
      m('deepseek-reasoner', {
        context: 128000,
        reasoning: true,
        speed: 'strong',
        priceIn: 0.55,
        priceOut: 2.19,
      }),
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    kind: 'openai-chat',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    needsKey: true,
    website: 'https://open.bigmodel.cn',
    keysUrl: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
    models: [
      m('glm-4.5-flash', { context: 128000, speed: 'fast', priceIn: 0, priceOut: 0 }),
      m('glm-4.5-air', { context: 128000, speed: 'fast', priceIn: 0.57, priceOut: 2.29 }),
      m('glm-4.5', { context: 128000, reasoning: true, speed: 'strong', priceIn: 0.57, priceOut: 2.29 }),
    ],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow 硅基流动',
    kind: 'openai-chat',
    baseUrl: 'https://api.siliconflow.cn/v1',
    needsKey: true,
    website: 'https://siliconflow.cn',
    keysUrl: 'https://cloud.siliconflow.cn/account/ak',
    models: [
      m('Qwen/Qwen2.5-7B-Instruct', { context: 32000, speed: 'fast', priceIn: 0, priceOut: 0 }),
      m('deepseek-ai/DeepSeek-V3', { context: 64000, speed: 'strong', priceIn: 0.27, priceOut: 1.1 }),
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot Kimi',
    kind: 'openai-chat',
    baseUrl: 'https://api.moonshot.cn/v1',
    needsKey: true,
    website: 'https://platform.moonshot.cn',
    keysUrl: 'https://platform.moonshot.cn/console/api-keys',
    models: [m('kimi-k2-0905-preview', { context: 256000, speed: 'fast', priceIn: 0.6, priceOut: 2.5 })],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    kind: 'openai-chat', // 经 OpenAI 兼容层访问，M3 再补原生端点
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    needsKey: true,
    website: 'https://aistudio.google.com',
    keysUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      m('gemini-2.5-flash', { context: 1000000, vision: true, speed: 'fast', priceIn: 0.3, priceOut: 2.5 }),
      m('gemini-2.5-pro', { context: 1000000, vision: true, speed: 'strong', priceIn: 1.25, priceOut: 10 }),
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    kind: 'openai-chat',
    baseUrl: 'http://127.0.0.1:11434/v1',
    needsKey: false,
    local: true,
    website: 'https://ollama.com',
    note: '本地推理端点，隐私模式（仅本地模型）下始终可用',
    models: [
      m('qwen3:8b', { context: 128000, speed: 'fast' }),
      m('llama3.1:8b', { context: 128000, speed: 'fast' }),
    ],
  },
  {
    id: 'custom',
    name: '自定义端点（OpenAI 兼容）',
    kind: 'openai-chat',
    baseUrl: '',
    needsKey: true,
    note: '可填任意 OpenAI 兼容网关：magpie 本地网关、one-api / new-api、Azure 代理等',
    models: [],
  },
]

export function getPreset(id: string): ProviderPreset | undefined {
  return PRESETS.find((p) => p.id === id)
}

let idCounter = 0
/** 从 preset 创建 provider 实例（M3 起支持模型目录发现补充 pickedFrom） */
export function providerFromPreset(presetId: string, overrides: Partial<Provider> = {}): Provider {
  const preset = getPreset(presetId)
  idCounter += 1
  const id = overrides.id ?? `${presetId}-${Date.now().toString(36)}${idCounter}`
  return {
    id,
    name: preset?.name ?? presetId,
    kind: preset?.kind ?? 'openai-chat',
    preset: presetId,
    baseUrl: preset?.baseUrl ?? '',
    apiKey: '',
    models: preset ? preset.models.map((mm) => ({ ...mm })) : [],
    website: preset?.website,
    keysUrl: preset?.keysUrl,
    createdAt: Date.now(),
    ...overrides,
  }
}

/** 成本估算：tokens → 美元。价格缺省按 0 计 */
export function estimateCost(meta: ModelMeta | undefined, inTokens: number, outTokens: number): number {
  if (!meta) return 0
  const pin = meta.priceIn ?? 0
  const pout = meta.priceOut ?? 0
  return (inTokens / 1_000_000) * pin + (outTokens / 1_000_000) * pout
}
