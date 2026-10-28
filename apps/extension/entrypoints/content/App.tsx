import { startChat } from '@/lib/rpc'
import { loadSettings } from '@/lib/storage'
import { buildExplainMessages, buildTranslateMessages, decideDirection } from '@bt/core'
import type { Settings } from '@bt/shared'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { MiniMd } from './MiniMd'
import { panelStore } from './bridge'
import { panelPosition } from './selection'

type Tab = 'translate' | 'explain' | 'origin'
type Feature = 'selection' | 'explain' | 'retry'

interface TabResult {
  text: string
  streaming: boolean
  error: string
  route: string
}

const TAB_LABELS: Record<Tab, string> = {
  translate: '译文',
  explain: '解释',
  origin: '原文',
}

function emptyResult(): TabResult {
  return { text: '', streaming: false, error: '', route: '' }
}

function firstRoute(settings: Settings): string {
  for (const p of settings.providers) {
    const first = p.models[0]
    if (p.off || !first) continue
    return `${p.id}/${first.id}`
  }
  return ''
}

function buildContext(
  info: NonNullable<ReturnType<typeof panelStore.get>['info']>,
  settings: Settings
): string {
  const parts: string[] = []
  if (settings.sendPageTitle && info.pageTitle) parts.push(`页面标题：${info.pageTitle}`)
  if (info.before) parts.push(`前文：…${info.before}`)
  if (info.after) parts.push(`后文：${info.after}…`)
  return parts.join('\n')
}

export default function App() {
  const state = useSyncExternalStore(panelStore.subscribe, panelStore.get)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('translate')
  const [results, setResults] = useState<Record<Exclude<Tab, 'origin'>, TabResult>>({
    translate: emptyResult(),
    explain: emptyResult(),
  })
  const cacheRef = useRef(new Map<string, string>())
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    void loadSettings().then(setSettings)
    const onChange = () => {
      void loadSettings().then(setSettings)
    }
    browser.storage.onChanged.addListener(onChange)
    return () => {
      browser.storage.onChanged.removeListener(onChange)
      abortRef.current?.()
    }
  }, [])

  const info = state.info
  const infoKey = info ? `${info.text}\u0000${info.before}\u0000${info.after}` : ''

  function run(which: Exclude<Tab, 'origin'>, opts: { route?: string; feature?: Feature } = {}) {
    if (!info || !settings) return
    const fallback = which === 'translate' ? settings.slots.selection : settings.slots.explain
    const route = opts.route ?? (fallback || firstRoute(settings))
    if (!route) {
      setResults((prev) => ({
        ...prev,
        [which]: {
          text: '',
          streaming: false,
          error: '尚未配置模型：请到扩展设置添加供应商并分配模型。',
          route: '',
        },
      }))
      return
    }
    abortRef.current?.()
    const context = buildContext(info, settings)
    const to = settings.targetLang
    const dir = decideDirection(info.text, to)
    const messages =
      which === 'translate'
        ? buildTranslateMessages({ text: info.text, from: dir.from, to: dir.to, context })
        : buildExplainMessages({ text: info.text, to, context })

    const cacheKey = `${which}|${route}|${info.text}|${context}`
    const cached = cacheRef.current.get(cacheKey)
    if (cached !== undefined) {
      setResults((prev) => ({ ...prev, [which]: { text: cached, streaming: false, error: '', route } }))
      return
    }

    setResults((prev) => ({ ...prev, [which]: { text: '', streaming: true, error: '', route } }))
    abortRef.current = startChat(
      { route, messages, feature: opts.feature ?? (which === 'translate' ? 'selection' : 'explain') },
      {
        onDelta: (t) =>
          setResults((prev) => ({ ...prev, [which]: { ...prev[which], text: prev[which].text + t } })),
        onDone: () =>
          setResults((prev) => {
            cacheRef.current.set(cacheKey, prev[which].text)
            return { ...prev, [which]: { ...prev[which], streaming: false } }
          }),
        onError: (message) =>
          setResults((prev) => ({ ...prev, [which]: { ...prev[which], streaming: false, error: message } })),
      }
    )
  }

  // 面板打开或选区变化：重置会话并立即请求译文
  // biome-ignore lint/correctness/useExhaustiveDependencies: run 每次渲染重建，仅以面板开关与选区内容为触发条件
  useEffect(() => {
    if (!state.visible || !info || !settings) return
    setTab('translate')
    setResults({ translate: emptyResult(), explain: emptyResult() })
    run('translate')
  }, [state.visible, infoKey, settings])

  function switchTab(next: Tab) {
    setTab(next)
    if (next !== 'origin') {
      const cur = results[next]
      if (!cur.text && !cur.streaming && !cur.error) run(next)
    }
  }

  function retryStrong() {
    if (!settings?.slots.retryStrong) {
      setResults((prev) => ({
        ...prev,
        translate: { ...prev.translate, error: '未设置「单段重译」模型：请到设置的「功能模型分配」里配置。' },
      }))
      return
    }
    run('translate', { route: settings.slots.retryStrong, feature: 'retry' })
  }

  if (!state.visible || !info) {
    return state.fabVisible && info ? (
      <button
        type="button"
        className="bt-fab"
        title="翻译"
        style={{ left: state.fabPos.x, top: state.fabPos.y }}
        onClick={() => {
          panelStore.set({ visible: true, fabVisible: false, panelPos: panelPosition(info.rect) })
        }}
      >
        译
      </button>
    ) : null
  }

  const active = tab === 'origin' ? null : results[tab]
  const activeRoute = tab === 'translate' ? results.translate.route : results.explain.route

  return (
    <div className="bt-panel" style={{ left: state.panelPos.x, top: state.panelPos.y }}>
      <div className="bt-panel__head">
        <span className="bt-panel__text" title={info.text}>
          {info.text}
        </span>
        <button type="button" className="bt-iconbtn" title="关闭（Esc）" onClick={() => panelStore.hideAll()}>
          ✕
        </button>
      </div>
      <div className="bt-panel__tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`bt-tab ${tab === id ? 'active' : ''}`}
            onClick={() => switchTab(id)}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>
      <div className="bt-panel__body">
        {tab === 'origin' ? (
          <div className="bt-origin">
            {info.before && <span>…{info.before} </span>}
            <mark className="bt-origin__mark">{info.text}</mark>
            {info.after && <span> {info.after}…</span>}
            {!info.before && !info.after && <span>（该选区没有可用的前后文）</span>}
          </div>
        ) : active?.error ? (
          <div className="bt-error">{active.error}</div>
        ) : (
          <>
            <MiniMd text={active?.text ?? ''} />
            {active?.streaming && <span className="bt-caret" />}
            {!active?.streaming && !active?.text && !active?.error && (
              <span className="bt-muted">正在请求模型…</span>
            )}
          </>
        )}
      </div>
      <div
        className="bt-row"
        style={{ padding: '6px 10px 8px', borderTop: '1px solid var(--border)', flex: 'none' }}
      >
        {tab !== 'origin' && active?.text && (
          <button
            type="button"
            className="bt-iconbtn"
            onClick={() => void navigator.clipboard.writeText(active.text)}
          >
            复制
          </button>
        )}
        {tab === 'translate' && !results.translate.streaming && (
          <button type="button" className="bt-iconbtn" title="用强模型重译此段" onClick={retryStrong}>
            ⟳ 重译
          </button>
        )}
        <span style={{ flex: 1 }} />
        {activeRoute && <span className="bt-muted">{activeRoute}</span>}
      </div>
    </div>
  )
}
