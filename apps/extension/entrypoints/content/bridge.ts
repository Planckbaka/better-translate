import type { SelectionInfo } from './selection'

/** 面板与浮钮的共享状态 —— content 入口（事件侧）与 React App（渲染侧）解耦 */
export interface PanelState {
  info: SelectionInfo | null
  /** 面板展开中 */
  visible: boolean
  /** 浮钮显示中 */
  fabVisible: boolean
  fabPos: { x: number; y: number }
  panelPos: { x: number; y: number }
}

const initial: PanelState = {
  info: null,
  visible: false,
  fabVisible: false,
  fabPos: { x: 0, y: 0 },
  panelPos: { x: 0, y: 0 },
}

let state: PanelState = initial
const listeners = new Set<() => void>()

function emit(): void {
  for (const fn of listeners) fn()
}

export const panelStore = {
  get: (): PanelState => state,
  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  set(partial: Partial<PanelState>): void {
    state = { ...state, ...partial }
    emit()
  },
  hideAll(): void {
    state = { ...state, visible: false, fabVisible: false }
    emit()
  },
  /** 面板保持打开、仅更新定位（如视口尺寸变化） */
  reposition(
    rect: SelectionInfo['rect'],
    fab: { x: number; y: number },
    panel: { x: number; y: number }
  ): void {
    state = { ...state, fabPos: fab, panelPos: panel }
    emit()
  },
}
