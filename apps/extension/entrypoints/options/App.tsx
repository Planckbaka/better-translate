import type { TestResult } from '@/lib/protocol'
import { sendBg } from '@/lib/rpc'
import { loadSettings, saveSettings } from '@/lib/storage'
import { PRESETS, providerFromPreset } from '@bt/shared'
import type { ModelMeta, Provider, Settings, UsageRecord } from '@bt/shared'
import { useEffect, useMemo, useState } from 'react'

type Tab = 'providers' | 'slots' | 'general' | 'usage'

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('providers')
  const [flash, setFlash] = useState('')

  useEffect(() => {
    void loadSettings().then(setSettings)
  }, [])

  function update(mutate: (s: Settings) => void) {
    if (!settings) return
    const next = structuredClone(settings)
    mutate(next)
    setSettings(next)
    void saveSettings(next)
  }

  function notify(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash(''), 2500)
  }

  if (!settings) return <div style={{ padding: 24 }}>加载中…</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px 40px' }}>
      <h1 style={{ padding: '18px 0 12px', fontSize: 18 }}>Better Translate 设置</h1>
      <div className="bt-tabs">
        {(
          [
            ['providers', '模型供应商'],
            ['slots', '功能模型分配'],
            ['general', '通用'],
            ['usage', '用量统计'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={`bt-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {flash && (
        <div style={{ position: 'fixed', top: 16, right: 16 }} className="bt-card">
          {flash}
        </div>
      )}
      <div style={{ paddingTop: 16 }}>
        {tab === 'providers' && <ProvidersTab settings={settings} update={update} notify={notify} />}
        {tab === 'slots' && <SlotsTab settings={settings} update={update} />}
        {tab === 'general' && <GeneralTab settings={settings} update={update} />}
        {tab === 'usage' && <UsageTab />}
      </div>
    </div>
  )
}

/* ————————————————— 供应商 ————————————————— */

function ProvidersTab({
  settings,
  update,
  notify,
}: {
  settings: Settings
  update: (fn: (s: Settings) => void) => void
  notify: (msg: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)

  function addProvider(presetId: string) {
    const p = providerFromPreset(presetId)
    update((s) => {
      s.providers.push(p)
      // 第一个供应商的模型自动填进空槽位，开箱即用
      const first = p.models[0]
      if (first) {
        const route = `${p.id}/${first.id}`
        if (!s.slots.selection) s.slots.selection = route
        if (!s.slots.page) s.slots.page = route
        if (!s.slots.explain) s.slots.explain = route
        if (!s.slots.retryStrong) s.slots.retryStrong = route
      }
    })
    setShowAdd(false)
    notify(`已添加 ${p.name}，填入 API Key 后即可使用`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="bt-row" style={{ justifyContent: 'space-between' }}>
        <label className="bt-row bt-muted">
          <input
            type="checkbox"
            checked={settings.onlyLocalModel}
            onChange={(e) => {
              const checked = e.target.checked
              update((s) => {
                s.onlyLocalModel = checked
              })
            }}
          />
          隐私模式：仅允许本地模型（127.0.0.1 / localhost 端点）
        </label>
        <button type="button" className="bt-btn bt-btn--primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? '收起' : '+ 添加供应商'}
        </button>
      </div>

      {showAdd && <PresetGallery onPick={addProvider} />}

      {settings.providers.length === 0 && !showAdd && (
        <div className="bt-card bt-muted">还没有供应商。点击「添加供应商」，选择一个预设并填入 API Key。</div>
      )}

      {settings.providers.map((p) => (
        <ProviderCard key={p.id} provider={p} settings={settings} update={update} notify={notify} />
      ))}

      <div className="bt-row" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="bt-btn bt-btn--sm"
          onClick={() => {
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `better-translate-settings-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(a.href)
          }}
        >
          导出配置
        </button>
        <label className="bt-btn bt-btn--sm" style={{ cursor: 'pointer' }}>
          导入配置
          <input
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const imported = JSON.parse(await file.text()) as Settings
                if (!Array.isArray(imported.providers)) throw new Error('格式不正确')
                update((s) => Object.assign(s, imported))
                notify('配置已导入')
              } catch (err) {
                notify(`导入失败：${err instanceof Error ? err.message : String(err)}`)
              }
            }}
          />
        </label>
      </div>
    </div>
  )
}

function PresetGallery({ onPick }: { onPick: (presetId: string) => void }) {
  return (
    <div
      className="bt-card"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}
    >
      {PRESETS.map((preset) => (
        <button
          type="button"
          key={preset.id}
          className="bt-btn"
          style={{ textAlign: 'left', padding: 10, display: 'flex', flexDirection: 'column', gap: 3 }}
          onClick={() => onPick(preset.id)}
        >
          <strong>{preset.name}</strong>
          <span className="bt-muted">{preset.note ?? (preset.baseUrl || '自定义端点')}</span>
        </button>
      ))}
    </div>
  )
}

function ProviderCard({
  provider,
  settings,
  update,
  notify,
}: {
  provider: Provider
  settings: Settings
  update: (fn: (s: Settings) => void) => void
  notify: (msg: string) => void
}) {
  const [open, setOpen] = useState(settings.providers.length === 1)
  const [test, setTest] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [newModel, setNewModel] = useState('')
  const needsKey = PRESETS.find((x) => x.id === provider.preset)?.needsKey ?? true

  function patch(fn: (p: Provider) => void) {
    update((s) => {
      const target = s.providers.find((x) => x.id === provider.id)
      if (target) fn(target)
    })
  }

  async function runTest() {
    setTesting(true)
    setTest(null)
    const res = await sendBg<{ ok: true; test: TestResult } | { ok: false; error: string }>({
      type: 'bt/testProvider',
      providerId: provider.id,
    })
    setTesting(false)
    if (res.ok) setTest(res.test)
    else setTest({ ok: false, ms: 0, error: res.error })
  }

  async function fetchModels() {
    const res = await sendBg<{ ok: true; models: string[] } | { ok: false; error: string }>({
      type: 'bt/listModels',
      providerId: provider.id,
    })
    if (!res.ok) {
      notify(`拉取失败：${res.error}`)
      return
    }
    const known = new Set(provider.models.map((mm) => mm.id))
    const fresh = res.models.filter((id) => !known.has(id))
    if (fresh.length === 0) {
      notify('没有发现新模型')
      return
    }
    patch((p) => {
      p.models.push(...fresh.map((id) => ({ id }) satisfies ModelMeta))
    })
    notify(`发现 ${fresh.length} 个新模型，已合并（重复已跳过）`)
  }

  return (
    <div className="bt-card" style={{ opacity: provider.off ? 0.55 : 1 }}>
      <div className="bt-row" style={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          className="bt-row"
          style={{
            cursor: 'pointer',
            flex: 1,
            border: 'none',
            background: 'none',
            padding: 0,
            textAlign: 'left',
          }}
          onClick={() => setOpen((v) => !v)}
        >
          <strong>{provider.name || '(未命名)'}</strong>
          <span className="bt-badge">{provider.preset ?? provider.kind}</span>
          <span className="bt-muted">{provider.models.length} 个模型</span>
        </button>
        <div className="bt-row">
          <button
            type="button"
            className={`bt-switch ${provider.off ? '' : 'on'}`}
            title={provider.off ? '已停用' : '启用中'}
            onClick={() => {
              patch((p) => {
                p.off = !p.off
              })
            }}
          />
          <button
            type="button"
            className="bt-btn bt-btn--sm"
            onClick={() => void runTest()}
            disabled={testing}
          >
            {testing ? '测试中…' : '测试'}
          </button>
          <button
            type="button"
            className="bt-btn bt-btn--sm bt-btn--danger"
            onClick={() => {
              if (!window.confirm(`删除供应商「${provider.name}」？`)) return
              update((s) => {
                s.providers = s.providers.filter((x) => x.id !== provider.id)
                for (const key of ['selection', 'explain', 'page', 'retryStrong'] as const) {
                  if (s.slots[key].startsWith(`${provider.id}/`)) s.slots[key] = ''
                }
              })
            }}
          >
            删除
          </button>
        </div>
      </div>

      {test && (
        <div style={{ marginTop: 8 }} className={test.ok ? 'bt-muted' : 'bt-error'}>
          {test.ok ? `✓ 连通正常（${test.ms}ms）：${test.sample}` : `✗ ${test.error}`}
        </div>
      )}

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <div className="bt-row">
            <label className="bt-muted" style={{ width: 84 }} htmlFor={`bt-p-name-${provider.id}`}>
              名称
            </label>
            <input
              id={`bt-p-name-${provider.id}`}
              value={provider.name}
              onChange={(e) => {
                const v = e.target.value
                patch((p) => {
                  p.name = v
                })
              }}
              style={{ flex: 1 }}
            />
          </div>
          <div className="bt-row">
            <label className="bt-muted" style={{ width: 84 }} htmlFor={`bt-p-url-${provider.id}`}>
              Base URL
            </label>
            <input
              id={`bt-p-url-${provider.id}`}
              value={provider.baseUrl ?? ''}
              placeholder="https://…/v1"
              onChange={(e) => {
                const v = e.target.value.trim()
                patch((p) => {
                  p.baseUrl = v
                })
              }}
              style={{ flex: 1 }}
            />
          </div>
          {needsKey && (
            <div className="bt-row">
              <label className="bt-muted" style={{ width: 84 }} htmlFor={`bt-p-key-${provider.id}`}>
                API Key
              </label>
              <input
                id={`bt-p-key-${provider.id}`}
                type={showKey ? 'text' : 'password'}
                value={provider.apiKey ?? ''}
                placeholder="sk-…"
                onChange={(e) => {
                  const v = e.target.value.trim()
                  patch((p) => {
                    p.apiKey = v
                  })
                }}
                style={{ flex: 1 }}
              />
              <button type="button" className="bt-btn bt-btn--sm" onClick={() => setShowKey((v) => !v)}>
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          )}
          {provider.keysUrl && (
            <div className="bt-muted">
              还没有 Key？
              <a href={provider.keysUrl} target="_blank" rel="noreferrer">
                去这里申请 ↗
              </a>
            </div>
          )}

          <div>
            <div className="bt-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="bt-muted">模型列表（速度档与价格用于推荐与成本估算）</span>
              <button type="button" className="bt-btn bt-btn--sm" onClick={() => void fetchModels()}>
                从 API 拉取模型
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {provider.models.map((mm, i) => (
                <div key={mm.id} className="bt-row">
                  <input
                    value={mm.id}
                    onChange={(e) =>
                      patch((p) => {
                        const target = p.models[i]
                        if (target) target.id = e.target.value.trim()
                      })
                    }
                    style={{ flex: 2, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                  />
                  <select
                    value={mm.speed ?? ''}
                    onChange={(e) =>
                      patch((p) => {
                        const target = p.models[i]
                        if (target) target.speed = (e.target.value || undefined) as ModelMeta['speed']
                      })
                    }
                  >
                    <option value="">速度？</option>
                    <option value="fast">快</option>
                    <option value="balanced">均衡</option>
                    <option value="strong">强</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="$入/M"
                    value={mm.priceIn ?? ''}
                    onChange={(e) =>
                      patch((p) => {
                        const target = p.models[i]
                        if (target)
                          target.priceIn = e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    style={{ width: 84 }}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="$出/M"
                    value={mm.priceOut ?? ''}
                    onChange={(e) =>
                      patch((p) => {
                        const target = p.models[i]
                        if (target)
                          target.priceOut = e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                    style={{ width: 84 }}
                  />
                  <button
                    type="button"
                    className="bt-btn bt-btn--sm bt-btn--danger"
                    onClick={() => patch((p) => void p.models.splice(i, 1))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="bt-row" style={{ marginTop: 6 }}>
              <input
                value={newModel}
                placeholder="手动添加模型 id，如 gpt-4o-mini"
                onChange={(e) => setNewModel(e.target.value)}
                style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newModel.trim()) {
                    patch((p) => {
                      if (!p.models.some((mm) => mm.id === newModel.trim()))
                        p.models.push({ id: newModel.trim() })
                    })
                    setNewModel('')
                  }
                }}
              />
              <button
                type="button"
                className="bt-btn bt-btn--sm"
                onClick={() => {
                  if (!newModel.trim()) return
                  patch((p) => {
                    if (!p.models.some((mm) => mm.id === newModel.trim()))
                      p.models.push({ id: newModel.trim() })
                  })
                  setNewModel('')
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ————————————————— 槽位分配 ————————————————— */

const SLOT_META: { key: 'selection' | 'explain' | 'page' | 'retryStrong'; label: string; hint: string }[] = [
  { key: 'selection', label: '划词翻译', hint: '高频轻量请求，建议用「快」档模型' },
  { key: 'explain', label: 'AI 解释', hint: '词义/例句讲解，可用中等模型' },
  { key: 'page', label: '整页沉浸翻译', hint: '批量请求量最大，强烈建议「快」档模型控制成本' },
  { key: 'retryStrong', label: '单段重译', hint: '对不满意段落用「强」档模型重译' },
]

function SlotsTab({ settings, update }: { settings: Settings; update: (fn: (s: Settings) => void) => void }) {
  const routes = useMemo(
    () =>
      settings.providers.flatMap((p) =>
        p.models.map((mm) => ({
          route: `${p.id}/${mm.id}`,
          label: `${p.name} · ${mm.id}${p.off ? '（已停用）' : ''}`,
          off: !!p.off,
        }))
      ),
    [settings.providers]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="bt-card bt-muted">
        每个功能可以绑定不同的模型（借鉴 magpie
        的按功能分配设计）。整页翻译吞吐量大，绑定便宜快速的模型能显著降低成本。
      </div>
      {SLOT_META.map(({ key, label, hint }) => (
        <div key={key} className="bt-card bt-row">
          <div style={{ width: 130 }}>
            <div style={{ fontWeight: 600 }}>{label}</div>
            <div className="bt-muted">{hint}</div>
          </div>
          <select
            value={settings.slots[key]}
            onChange={(e) => {
              const v = e.target.value
              update((s) => {
                s.slots[key] = v
              })
            }}
            style={{ flex: 1 }}
          >
            <option value="">（未设置）</option>
            {!routes.some((r) => r.route === settings.slots[key]) && settings.slots[key] && (
              <option value={settings.slots[key]}>{settings.slots[key]}（已失效）</option>
            )}
            {routes.map((r) => (
              <option key={r.route} value={r.route} disabled={r.off}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

/* ————————————————— 通用 ————————————————— */

function GeneralTab({
  settings,
  update,
}: { settings: Settings; update: (fn: (s: Settings) => void) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="bt-card bt-row">
        <div style={{ width: 130 }}>
          <div style={{ fontWeight: 600 }}>默认目标语言</div>
          <div className="bt-muted">翻译的主要方向</div>
        </div>
        <select
          value={settings.targetLang}
          onChange={(e) => {
            const v = e.target.value
            update((s) => {
              s.targetLang = v
            })
          }}
        >
          <option value="zh-Hans">简体中文</option>
          <option value="zh-Hant">繁體中文</option>
          <option value="en">英语</option>
          <option value="ja">日语</option>
          <option value="ko">韩语</option>
        </select>
      </div>
      <div className="bt-card bt-row">
        <div style={{ width: 130 }}>
          <div style={{ fontWeight: 600 }}>划词触发延迟</div>
          <div className="bt-muted">选中文本后浮钮出现的等待时间</div>
        </div>
        <select
          value={settings.triggerDelayMs}
          onChange={(e) => {
            const v = Number(e.target.value)
            update((s) => {
              s.triggerDelayMs = v
            })
          }}
        >
          <option value={0}>立即（0ms）</option>
          <option value={200}>200ms</option>
          <option value={300}>300ms（推荐）</option>
          <option value={500}>500ms</option>
          <option value={800}>800ms</option>
        </select>
      </div>
      <div className="bt-card bt-row">
        <div style={{ width: 130 }}>
          <div style={{ fontWeight: 600 }}>划词触发方式</div>
          <div className="bt-muted">选中文字后的响应方式</div>
        </div>
        <select
          value={settings.selectionTrigger}
          onChange={(e) => {
            const v = e.target.value as Settings['selectionTrigger']
            update((s) => {
              s.selectionTrigger = v
            })
          }}
        >
          <option value="button">浮钮（先出小圆钮，点击展开）</option>
          <option value="panel">直接展开面板</option>
        </select>
      </div>
      <div className="bt-card bt-row">
        <div style={{ width: 130 }}>
          <div style={{ fontWeight: 600 }}>页面显示模式</div>
          <div className="bt-muted">沉浸式翻译的默认展示方式</div>
        </div>
        <select
          value={settings.pageDisplayMode}
          onChange={(e) => {
            const v = e.target.value as Settings['pageDisplayMode']
            update((s) => {
              s.pageDisplayMode = v
            })
          }}
        >
          <option value="bilingual">双语对照（译文在下方）</option>
          <option value="replace">仅译文（悬停看原文）</option>
          <option value="hover">悬停浮层</option>
        </select>
      </div>
      <div className="bt-card bt-row">
        <div style={{ width: 130 }}>
          <div style={{ fontWeight: 600 }}>携带页面标题</div>
          <div className="bt-muted">作为翻译上下文发送（不含 URL），提升译名一致性</div>
        </div>
        <button
          type="button"
          className={`bt-switch ${settings.sendPageTitle ? 'on' : ''}`}
          onClick={() => {
            update((s) => {
              s.sendPageTitle = !s.sendPageTitle
            })
          }}
        />
      </div>
      <SiteRules settings={settings} update={update} />
    </div>
  )
}

function SiteRules({
  settings,
  update,
}: { settings: Settings; update: (fn: (s: Settings) => void) => void }) {
  const [pattern, setPattern] = useState('')

  function addRule() {
    const p = pattern.trim().toLowerCase()
    if (!p) return
    update((s) => {
      // 同 pattern 的旧规则替换位置，保持"后写覆盖先写"的顺序语义
      s.siteRules = [...s.siteRules.filter((r) => r.pattern !== p), { pattern: p, enabled: false }]
    })
    setPattern('')
  }

  return (
    <div className="bt-card">
      <div className="bt-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>站点规则</div>
          <div className="bt-muted">
            禁用的站点不出现划词按钮与面板。支持 <code>example.com</code>（含子域）与{' '}
            <code>*.example.com</code>（仅子域），规则按顺序生效，后写覆盖先写。
          </div>
        </div>
      </div>
      {settings.siteRules.length === 0 && <div className="bt-muted">暂无规则，所有站点启用划词翻译。</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {settings.siteRules.map((rule, i) => (
          <div key={`${rule.pattern}-${i}`} className="bt-row">
            <input
              value={rule.pattern}
              onChange={(e) => {
                const v = e.target.value.trim().toLowerCase()
                update((s) => {
                  const target = s.siteRules[i]
                  if (target) target.pattern = v
                })
              }}
              style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
            />
            <span className="bt-muted" style={{ width: 76 }}>
              {rule.enabled === false ? '已禁用' : '已启用'}
            </span>
            <button
              type="button"
              className={`bt-switch ${rule.enabled === false ? '' : 'on'}`}
              title={rule.enabled === false ? '点击启用' : '点击禁用'}
              onClick={() => {
                update((s) => {
                  const target = s.siteRules[i]
                  if (target) target.enabled = target.enabled === false
                })
              }}
            />
            <button
              type="button"
              className="bt-btn bt-btn--sm bt-btn--danger"
              onClick={() => {
                update((s) => {
                  s.siteRules.splice(i, 1)
                })
              }}
            >
              删除
            </button>
          </div>
        ))}
      </div>
      <div className="bt-row" style={{ marginTop: 8 }}>
        <input
          value={pattern}
          placeholder="example.com 或 *.example.com"
          onChange={(e) => setPattern(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addRule()
          }}
          style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
        />
        <button type="button" className="bt-btn bt-btn--sm" onClick={addRule}>
          添加并禁用
        </button>
      </div>
    </div>
  )
}

/* ————————————————— 用量 ————————————————— */

function UsageTab() {
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [days, setDays] = useState(7)

  useEffect(() => {
    void sendBg<{ ok: true; records: UsageRecord[] }>({ type: 'bt/usageSummary', days }).then((res) => {
      if (res.ok) setRecords(res.records)
    })
  }, [days])

  const totals = useMemo(() => {
    let inTok = 0
    let outTok = 0
    let cost = 0
    for (const r of records) {
      inTok += r.inTokens
      outTok += r.outTokens
      cost += r.costUsd ?? 0
    }
    return { inTok, outTok, cost, count: records.length }
  }, [records])

  const byModel = useMemo(() => {
    const map = new Map<string, { count: number; tokens: number; cost: number }>()
    for (const r of records) {
      const key = `${r.providerId}/${r.modelId}`
      const acc = map.get(key) ?? { count: 0, tokens: 0, cost: 0 }
      acc.count += 1
      acc.tokens += r.inTokens + r.outTokens
      acc.cost += r.costUsd ?? 0
      map.set(key, acc)
    }
    return [...map.entries()].sort((a, b) => b[1].tokens - a[1].tokens)
  }, [records])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="bt-row" style={{ justifyContent: 'space-between' }}>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={1}>今天</option>
          <option value={7}>近 7 天</option>
          <option value={30}>近 30 天</option>
        </select>
        <span className="bt-muted">成本按你在供应商里填写的单价估算</span>
      </div>
      <div className="bt-card bt-row" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
        {(
          [
            ['请求数', String(totals.count)],
            ['输入 tokens', formatTok(totals.inTok)],
            ['输出 tokens', formatTok(totals.outTok)],
            ['估算成本', `$${totals.cost.toFixed(4)}`],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
            <div className="bt-muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="bt-card">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>按模型</div>
        {byModel.length === 0 && <div className="bt-muted">暂无记录</div>}
        {byModel.map(([route, acc]) => (
          <div key={route} className="bt-row" style={{ justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{route}</span>
            <span className="bt-muted">
              {acc.count} 次 · {formatTok(acc.tokens)} tok{acc.cost > 0 && ` · $${acc.cost.toFixed(4)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTok(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}
