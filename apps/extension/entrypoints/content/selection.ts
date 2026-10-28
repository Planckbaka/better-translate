/** 划词选区工具 —— DOM 依赖，仅 content script 使用 */

export interface SelectionInfo {
  text: string
  /** 选区所在块的前后文（已归一化空白），用于上下文翻译 */
  before: string
  after: string
  pageTitle: string
  /** 选区在视口坐标系中的矩形 */
  rect: { top: number; left: number; right: number; bottom: number }
}

const MIN_TEXT = 2
const MAX_TEXT = 5000
const CONTEXT_CHARS = 160

const BLOCK_SELECTOR = 'p,li,h1,h2,h3,h4,h5,h6,td,th,dd,dt,blockquote,pre,caption,figcaption'

export function isEditableTarget(node: Node | null): boolean {
  if (!node) return false
  const el = node instanceof Element ? node : node.parentElement
  if (!el) return false
  if (el.closest('input, textarea, select, [is]')) return true
  const ce = el.closest('[contenteditable]')
  if (ce && (ce.getAttribute('contenteditable') ?? '').toLowerCase() !== 'false') return true
  return false
}

/* 面板宿主元素，由 UI 挂载时注册，用于判断点击是否发生在面板内部 */
let panelHost: HTMLElement | null = null
export function setPanelHost(el: HTMLElement | null): void {
  panelHost = el
}
export function isInsidePanel(e: MouseEvent): boolean {
  return panelHost !== null && e.composedPath().includes(panelHost)
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function selectionRect(sel: Selection): DOMRect | null {
  if (sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (rect.width > 0 || rect.height > 0) return rect
  // 折叠边角情况（如选区跨 display:contents 节点）：取第一个非零片段矩形
  for (const r of range.getClientRects()) {
    if (r.width > 0 || r.height > 0) return r
  }
  return null
}

/** 读取当前选区；无效（过短/在输入框内）时返回 null */
export function getSelectionInfo(): SelectionInfo | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
  const text = normalize(sel.toString())
  if (text.length < MIN_TEXT || text.length > MAX_TEXT) return null
  if (isEditableTarget(sel.anchorNode) || isEditableTarget(sel.focusNode)) return null
  const rect = selectionRect(sel)
  if (!rect) return null

  // 上下文：从锚点向上找最近的块级容器，取选区前后的文本
  let before = ''
  let after = ''
  const anchorEl =
    sel.anchorNode instanceof Element ? sel.anchorNode : (sel.anchorNode?.parentElement ?? null)
  const block = anchorEl?.closest(BLOCK_SELECTOR)
  if (block) {
    const blockNorm = normalize(block.textContent ?? '')
    const idx = blockNorm.indexOf(text)
    if (idx > 0) {
      before = blockNorm.slice(Math.max(0, idx - CONTEXT_CHARS), idx).trim()
    }
    if (idx >= 0) {
      after = blockNorm.slice(idx + text.length, idx + text.length + CONTEXT_CHARS).trim()
    }
  }

  return {
    text,
    before,
    after,
    pageTitle: document.title || '',
    rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom },
  }
}

/* ————— 视口定位 ————— */

const MARGIN = 8
export const PANEL_WIDTH = 380
export const PANEL_MAX_HEIGHT = 430

export function fabPosition(rect: SelectionInfo['rect']): { x: number; y: number } {
  return {
    x: Math.min(Math.max(MARGIN, rect.right + 6), window.innerWidth - 38),
    y: Math.min(Math.max(MARGIN, rect.bottom + 6), window.innerHeight - 38),
  }
}

export function panelPosition(rect: SelectionInfo['rect']): { x: number; y: number } {
  const x = Math.min(Math.max(MARGIN, rect.right - 40), window.innerWidth - PANEL_WIDTH - MARGIN)
  const below = rect.bottom + 8
  const y =
    below + PANEL_MAX_HEIGHT > window.innerHeight ? Math.max(MARGIN, rect.top - PANEL_MAX_HEIGHT - 8) : below
  return { x, y }
}
