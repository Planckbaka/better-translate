import { DEFAULT_SETTINGS } from '@bt/shared'
import type { Settings } from '@bt/shared'

const KEY = 'bt:settings'

export async function loadSettings(): Promise<Settings> {
  const obj = await browser.storage.local.get(KEY)
  const stored = obj[KEY] as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...stored, slots: { ...DEFAULT_SETTINGS.slots, ...stored?.slots } }
}

export async function saveSettings(s: Settings): Promise<void> {
  await browser.storage.local.set({ [KEY]: s })
}
