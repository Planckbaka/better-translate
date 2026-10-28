import { sendBg, startChat } from '@/lib/rpc'
import { loadSettings } from '@/lib/storage'
import { STYLE_LABELS, buildTranslateMessages, decideDirection } from '@bt/core'
import type { Style } from '@bt/core'
import { modelDisplayName } from '@bt/shared'
import type { Settings, UsageRecord } from '@bt/shared'
import { useEffect, useMemo, useRef, useState } from 'react'

const LANGS = [
  { id: 'auto', label: '自动检测' },
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'zh-Hant', label: '繁體中文' },
  { id: 'en', label: '英语' },
  { id: 'ja', label: '日语' },
  { id: 'ko', label: '韩语' },
  { id: 'fr', label: '法语' },
  { id: 'de', label: '德语' },
  { id: 'ru', label: '俄语' },
]

function langLabel(id: string): string {
  return LANGS.find((l) => l.id === id)?.label ?? id
}

interface RouteOption {
  route: string
  providerName: string
  off: boolean
}

function listRoutes(settings: Settings): RouteOption[] {
  return settings.providers.flatMap((p) =>
    p.models.map((mm) => ({ route: `${p.id}/${mm.id}`, providerName: p.name, off: !!p.off }))
  )
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('auto')
  const [to, setTo] = useState('zh-Hans')
  const [style, setStyle] = useState<Style>('fluent')
  const [route, setRoute] = useState('')
  const [usage, setUsage] = useState<{ tokens: number; cost: number; count: number } | null>(null)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    void (async () => {
      const s = await loadSettings()
      setSettings(s)
      setTo(s.targetLang)
      const routes = listRoutes(s)
      const preferred = s.slots.selection || routes.find((r) => !r.off)?.route || ''
      setRoute(preferred)
      const res = await sendBg<{ ok: true; records: UsageRecord[] }>({ type: 'bt/usageSummary', days: 1 })
      if (res.ok) {
        const tokens = res.records.reduce((acc, r) => acc + r.inTokens + r.outTokens, 0)
        const cost = res.records.reduce((acc, r) => acc + (r.costUsd ?? 0), 0)
        setUsage({ tokens, cost, count: res.records.length })
      }
    })()
    return () => abortRef.current?.()
  }, [])

  const routes = useMemo(() => (settings ? listRoutes(settings) : []), [settings])

  function translate() {
    const text = input.trim()
    if (!text || !route || streaming) return
    const dir = from === 'auto' ? decideDirection(text, to) : { from, to }
    const messages = buildTranslateMessages({ text, from: dir.from, to: dir.to, style })
    setOutput('')
    setError('')
    setStreaming(true)
    abortRef.current = startChat(
      { route, messages, feature: 'manual' },
      {
        onDelta: (t) => setOutput((prev) => prev + t),
        onDone: () => setStreaming(false),
        onError: (message) => {
          setError(message)
          setStreaming(false)
        },
      }
    )
  }

  function stop() {
    abortRef.current?.()
    abortRef.current = null
    setStreaming(false)
  }

  if (!settings) return <div style={{ padding: 16 }}>加载中…</div>

  const noRoute = routes.length === 0

  return (
    <div style={{ width: 420, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="bt-row" style={{ justifyContent: 'space-between' }}>
        <div className="bt-row">
          <strong style={{ fontSize: 14 }}>Better Translate</strong>
          <span className="bt-badge">AI 原生</span>
        </div>
        <div className="bt-row">
          {route && (
            <select
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              style={{ maxWidth: 180 }}
              title="翻译模型"
            >
              {!routes.some((r) => r.route === route) && (
                <option value={route}>{modelDisplayName(route)}</option>
              )}
              {routes.map((r) => (
                <option key={r.route} value={r.route} disabled={r.off}>
                  {r.providerName} · {modelDisplayName(r.route)}
                  {r.off ? '（已停用）' : ''}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="bt-btn bt-btn--sm"
            onClick={() => void browser.runtime.openOptionsPage()}
            title="设置"
          >
            设置
          </button>
        </div>
      </div>

      {noRoute && (
        <div className="bt-card" style={{ borderColor: 'var(--accent)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>先添加一个模型供应商</div>
          <div className="bt-muted" style={{ marginBottom: 8 }}>
            支持智谱、DeepSeek、OpenAI、Claude、Ollama 本地模型，或任意 OpenAI 兼容端点（含本机 magpie
            网关）。
          </div>
          <button
            type="button"
            className="bt-btn bt-btn--primary bt-btn--sm"
            onClick={() => void browser.runtime.openOptionsPage()}
          >
            去添加供应商
          </button>
        </div>
      )}

      <div className="bt-row">
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="bt-btn bt-btn--sm"
          title="交换语言"
          onClick={() => {
            if (from === 'auto') return
            const f = from
            setFrom(to)
            setTo(f)
          }}
        >
          ⇄
        </button>
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          {LANGS.filter((l) => l.id !== 'auto').map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <select value={style} onChange={(e) => setStyle(e.target.value as Style)} title="翻译风格">
          {Object.entries(STYLE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') translate()
        }}
        placeholder="输入要翻译的文本…（⌘/Ctrl + Enter 翻译）"
        rows={5}
        style={{ resize: 'vertical' }}
      />

      <div className="bt-row">
        {streaming ? (
          <button type="button" className="bt-btn" onClick={stop}>
            停止
          </button>
        ) : (
          <button
            type="button"
            className="bt-btn bt-btn--primary"
            onClick={translate}
            disabled={!input.trim() || !route}
          >
            翻译
          </button>
        )}
        {output && !streaming && (
          <button
            type="button"
            className="bt-btn"
            onClick={() => void navigator.clipboard.writeText(output)}
            title="复制译文"
          >
            复制
          </button>
        )}
        {output && !streaming && (
          <button type="button" className="bt-btn" onClick={() => setInput('')} title="清空">
            清空
          </button>
        )}
        <span style={{ flex: 1 }} />
        {usage && usage.count > 0 && (
          <span className="bt-muted">
            今日 {usage.count} 次 · {(usage.tokens / 1000).toFixed(1)}K tok
            {usage.cost > 0 && ` · ≈$${usage.cost.toFixed(4)}`}
          </span>
        )}
      </div>

      {error && <div className="bt-error">{error}</div>}

      {(output || streaming) && (
        <div className="bt-card bt-stream" style={{ maxHeight: 260, overflow: 'auto' }}>
          <span className={streaming ? 'bt-caret' : undefined}>{output}</span>
        </div>
      )}

      <div className="bt-muted" style={{ textAlign: 'center' }}>
        当前语言方向：{langLabel(from)} → {langLabel(to)}
      </div>
    </div>
  )
}
