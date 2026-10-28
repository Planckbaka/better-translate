import type { UsageRecord } from '@bt/shared'

/** IndexedDB 用量流水 —— 对应 magpie 的 routing/usage 日志，按日聚合在 UI 层完成 */

const DB_NAME = 'bt'
const STORE = 'usage'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('t', 't')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addUsage(rec: UsageRecord): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(rec)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function usageSince(sinceMs: number, limit = 2000): Promise<UsageRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const idx = tx.objectStore(STORE).index('t')
    const range = IDBKeyRange.lowerBound(sinceMs)
    const out: UsageRecord[] = []
    const req = idx.openCursor(range)
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor || out.length >= limit) {
        resolve(out)
        return
      }
      out.push(cursor.value as UsageRecord)
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
}

export function startOfDay(now = Date.now()): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
