import { loadSettings } from '@/lib/storage'
import { siteEnabled } from '@bt/core'
import type { Settings } from '@bt/shared'
import ReactDOM from 'react-dom/client'
import App from './App'
import { panelStore } from './bridge'
import { fabPosition, getSelectionInfo, isInsidePanel, panelPosition, setPanelHost } from './selection'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let settings: Settings = await loadSettings()
    let mouseDown = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let rafId = 0

    browser.storage.onChanged.addListener(() => {
      void loadSettings().then((s) => {
        settings = s
      })
    })

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
    }

    function evaluateSelection(manual = false): void {
      if (!siteEnabled(settings.siteRules, location.hostname)) {
        panelStore.hideAll()
        return
      }
      const info = getSelectionInfo()
      if (!info) {
        if (!panelStore.get().visible) panelStore.hideAll()
        else panelStore.set({ fabVisible: false })
        return
      }
      if (manual || settings.selectionTrigger === 'panel') {
        panelStore.set({
          info,
          visible: true,
          fabVisible: false,
          panelPos: panelPosition(info.rect),
        })
      } else if (panelStore.get().visible) {
        // 面板已开、选区变了：就地更新内容与位置
        panelStore.set({ info, panelPos: panelPosition(info.rect) })
      } else {
        panelStore.set({ info, fabVisible: true, fabPos: fabPosition(info.rect) })
      }
    }

    const schedule = (manual = false): void => {
      clearTimer()
      timer = setTimeout(() => evaluateSelection(manual), manual ? 0 : settings.triggerDelayMs)
    }

    const collapse = (): void => {
      clearTimer()
      if (!panelStore.get().visible) panelStore.hideAll()
      else panelStore.set({ fabVisible: false })
    }

    // 拖拽选择期间不响应，等 mouseup 再评估
    document.addEventListener(
      'mousedown',
      (e) => {
        mouseDown = true
        if (!isInsidePanel(e)) panelStore.hideAll()
      },
      true
    )
    document.addEventListener('mouseup', () => {
      mouseDown = false
      schedule()
    })
    // 键盘选区（Shift+方向键 / Ctrl+A）走 selectionchange
    document.addEventListener('selectionchange', () => {
      if (mouseDown) return
      const sel = document.getSelection()
      if (!sel || sel.isCollapsed) collapse()
      else schedule()
    })
    const reposition = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        const s = panelStore.get()
        if (s.fabVisible) panelStore.set({ fabVisible: false })
        if (s.visible && s.info) {
          const info = getSelectionInfo()
          if (!info) panelStore.hideAll()
          else panelStore.set({ info, panelPos: panelPosition(info.rect) })
        }
      })
    }
    window.addEventListener('scroll', reposition, { capture: true, passive: true })
    window.addEventListener('resize', reposition)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') panelStore.hideAll()
    })

    // Alt+T 快捷键 / 右键菜单由 background 转发到这里
    browser.runtime.onMessage.addListener((msg: unknown) => {
      if ((msg as { type?: string } | null)?.type === 'bt/translateSelection') {
        evaluateSelection(true)
      }
    })

    const ui = await createShadowRootUi(ctx, {
      name: 'better-translate',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const root = container.getRootNode()
        if (root instanceof ShadowRoot) setPanelHost(root.host as HTMLElement)
        const reactRoot = ReactDOM.createRoot(container)
        reactRoot.render(<App />)
        return reactRoot
      },
      onRemove: (reactRoot) => {
        setPanelHost(null)
        reactRoot?.unmount()
      },
    })
    ui.autoMount()
  },
})
