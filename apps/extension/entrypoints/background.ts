import { addUsage, startOfDay, usageSince } from '@/lib/db'
import type { BgRequest, BgResponse, ChatStartPayload, PortToBg, PortToUi } from '@/lib/protocol'
import { loadSettings } from '@/lib/storage'
import { AdapterError, getAdapter } from '@bt/providers'
import { estimateCost, parseRoute } from '@bt/shared'
import type { ModelMeta, Provider, Settings, UsageRecord } from '@bt/shared'

export default defineBackground(() => {
  // —— 流式通道：popup / 未来 content script 统一走这个 port ——
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'bt:llm') return
    const aborts = new Map<string, AbortController>()

    port.onMessage.addListener((msg: PortToBg) => {
      if (msg.kind === 'abort') {
        aborts.get(msg.id)?.abort()
        aborts.delete(msg.id)
      } else if (msg.kind === 'chat') {
        void runChat(port, msg.id, msg.payload, aborts)
      }
    })

    port.onDisconnect.addListener(() => {
      for (const ctrl of aborts.values()) ctrl.abort()
      aborts.clear()
    })
  })

  // —— 划词触发：快捷键（Alt+T）与右键菜单 → 转发给当前标签页的 content script ——
  browser.commands.onCommand.addListener((command) => {
    if (command !== 'translate-selection') return
    void sendToActiveTab()
  })

  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.removeAll(() => {
      browser.contextMenus.create({
        id: 'bt-translate-selection',
        title: 'Better Translate：翻译选中文本',
        contexts: ['selection'],
      })
    })
  })

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== 'bt-translate-selection') return
    if (tab?.id !== undefined) {
      void browser.tabs.sendMessage(tab.id, { type: 'bt/translateSelection' }).catch(() => undefined)
    }
  })

  async function sendToActiveTab(): Promise<void> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (tab?.id !== undefined) {
      await browser.tabs.sendMessage(tab.id, { type: 'bt/translateSelection' }).catch(() => undefined)
    }
  }

  // —— 一次性请求：模型目录 / 连通测试 / 用量汇总 ——
  browser.runtime.onMessage.addListener(async (msg: BgRequest): Promise<BgResponse> => {
    try {
      if (msg.type === 'bt/listModels') {
        const { provider } = await resolveProvider(msg.providerId)
        const adapter = getAdapter(provider)
        const models = await adapter.listModels({ baseUrl: provider.baseUrl ?? '', apiKey: provider.apiKey })
        return { ok: true, models: models ?? [] }
      }
      if (msg.type === 'bt/testProvider') {
        return { ok: true, test: await testProvider(msg.providerId) }
      }
      if (msg.type === 'bt/usageSummary') {
        const since = startOfDay() - (msg.days - 1) * 86_400_000
        return { ok: true, records: await usageSince(since) }
      }
      return { ok: false, error: `未知请求 ${JSON.stringify(msg)}` }
    } catch (err) {
      return { ok: false, error: errorMessage(err) }
    }
  })
})

async function resolveProvider(providerId: string): Promise<{ provider: Provider; settings: Settings }> {
  const settings = await loadSettings()
  const provider = settings.providers.find((p) => p.id === providerId)
  if (!provider) throw new AdapterError(0, `未找到供应商 ${providerId}`)
  if (provider.off) throw new AdapterError(0, `供应商 ${provider.name} 已停用`)
  return { provider, settings }
}

function privacyGate(settings: Settings, provider: Provider): void {
  if (!settings.onlyLocalModel) return
  const isLocal =
    settings.localProviderIds.includes(provider.id) ||
    (provider.baseUrl ?? '').startsWith('http://127.0.0.1') ||
    (provider.baseUrl ?? '').startsWith('http://localhost')
  if (!isLocal) throw new AdapterError(0, '隐私模式已开启：仅允许本地模型（可在设置中调整）')
}

async function runChat(
  port: { postMessage: (m: PortToUi) => void },
  id: string,
  job: ChatStartPayload,
  aborts: Map<string, AbortController>
): Promise<void> {
  const send = (m: PortToUi) => {
    try {
      port.postMessage(m)
    } catch {
      /* port 已断开 */
    }
  }
  const started = Date.now()
  let ttft: number | undefined
  let inTokens = 0
  let outTokens = 0
  let modelMeta: ModelMeta | undefined
  let providerId = ''
  let modelId = ''
  const controller = new AbortController()
  aborts.set(id, controller)

  try {
    const parsed = parseRoute(job.route)
    if (!parsed || parsed.kind !== 'provider') {
      throw new AdapterError(0, `无效的路由 ${job.route}（模型组将在后续版本支持）`)
    }
    const { provider, settings } = await resolveProvider(parsed.providerId)
    privacyGate(settings, provider)
    providerId = provider.id
    modelId = parsed.modelId
    modelMeta = provider.models.find((mm) => mm.id === modelId)

    const adapter = getAdapter(provider)
    const stream = adapter.stream({
      baseUrl: provider.baseUrl ?? '',
      apiKey: provider.apiKey,
      model: modelMeta?.apiId ?? modelId,
      messages: job.messages,
      temperature: job.temperature,
      maxTokens: job.maxTokens,
      signal: controller.signal,
    })

    for await (const ev of stream) {
      if (ev.type === 'delta') {
        if (ttft === undefined) ttft = Date.now() - started
        send({ kind: 'delta', id, text: ev.text })
      } else if (ev.type === 'usage') {
        inTokens = ev.inTokens
        outTokens = ev.outTokens
      }
    }
    send({ kind: 'done', id })
  } catch (err) {
    const aborted = controller.signal.aborted
    if (aborted) {
      send({ kind: 'done', id }) // 用户主动中止按正常结束处理
    } else {
      const status = err instanceof AdapterError ? err.status : 0
      send({ kind: 'error', id, message: errorMessage(err), status })
    }
  } finally {
    aborts.delete(id)
    const ms = Date.now() - started
    // 中止且无任何输出的请求不值得记录
    if (!(controller.signal.aborted && !ttft)) {
      await addUsage({
        id: `${id}`,
        t: started,
        feature: job.feature,
        providerId,
        modelId,
        inTokens,
        outTokens,
        ms,
        ttftMs: ttft,
        status: controller.signal.aborted ? 499 : 200,
        costUsd: estimateCost(modelMeta, inTokens, outTokens) || undefined,
      }).catch(() => undefined)
    }
  }
}

async function testProvider(
  providerId: string
): Promise<{ ok: boolean; ms: number; sample?: string; error?: string }> {
  const started = Date.now()
  try {
    const { provider, settings } = await resolveProvider(providerId)
    privacyGate(settings, provider)
    const adapter = getAdapter(provider)
    const model = provider.models[0]
    if (!model) return { ok: false, ms: 0, error: '该供应商还没有配置任何模型' }
    let sample = ''
    const stream = adapter.stream({
      baseUrl: provider.baseUrl ?? '',
      apiKey: provider.apiKey,
      model: model.apiId ?? model.id,
      messages: [
        { role: 'system', content: '你是翻译引擎，只输出译文。' },
        { role: 'user', content: '把 "Better Translate" 翻译成简体中文，只输出译文。' },
      ],
      maxTokens: 64,
    })
    for await (const ev of stream) {
      if (ev.type === 'delta') sample += ev.text
    }
    return { ok: true, ms: Date.now() - started, sample: sample.slice(0, 80) }
  } catch (err) {
    return { ok: false, ms: Date.now() - started, error: errorMessage(err) }
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
