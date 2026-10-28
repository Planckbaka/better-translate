/** 轻量语言检测：覆盖中英日韩，其余按拉丁字母归为 en（够用于翻译方向自动决策） */
export function detectLang(text: string): string {
  const t = text.slice(0, 500)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(t)) return 'ja'
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(t)) return 'ko'
  const han = (t.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latin = (t.match(/[a-zA-Z]/g) ?? []).length
  if (han > latin * 0.5) return 'zh-Hans' // 繁简细分留给后续，先统一按简中处理
  if (latin > 0) return 'en'
  return 'auto'
}

/** 决定翻译方向：源为 auto 时按检测结果的"对侧"主流语言 */
export function decideDirection(text: string, targetLang: string): { from: string; to: string } {
  const detected = detectLang(text)
  const isZh = detected.startsWith('zh')
  if (isZh && targetLang.startsWith('zh')) {
    // 中文互译场景：简 ↔ 繁
    return { from: detected, to: detected === 'zh-Hans' ? 'zh-Hant' : 'zh-Hans' }
  }
  if (detected === 'auto') return { from: 'auto', to: targetLang }
  return { from: detected, to: targetLang.startsWith('zh') || detected !== 'en' ? targetLang : 'zh-Hans' }
}
