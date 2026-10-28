/** 站点规则匹配 —— 纯函数，content script（划词/沉浸翻译）与设置页共用 */

/**
 * host 是否命中规则 pattern。
 * 支持三种写法：
 * - 精确 host：`github.com`
 * - 后缀匹配：`example.com` 命中 `docs.example.com`
 * - 通配：`*.example.com`（等价于上面的后缀匹配，不含自身）
 */
export function hostMatches(host: string, pattern: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '')
  const p = pattern
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
  if (!p) return false
  if (p.startsWith('*.')) return h.endsWith(p.slice(1)) // 保留前导点：*.example.com → .example.com 后缀
  return h === p || h.endsWith(`.${p}`)
}

/** 依据规则表判定某 host 是否启用划词/翻译。后写的规则覆盖先写的 */
export function siteEnabled(siteRules: { pattern: string; enabled?: boolean }[], host: string): boolean {
  let enabled = true
  for (const rule of siteRules) {
    if (hostMatches(host, rule.pattern)) enabled = rule.enabled !== false
  }
  return enabled
}
