export type Style = 'faithful' | 'fluent' | 'literary' | 'technical' | 'academic'

export const STYLE_LABELS: Record<Style, string> = {
  faithful: '忠实',
  fluent: '流畅',
  literary: '文学',
  technical: '技术文档',
  academic: '学术',
}

const STYLE_PROMPTS: Record<Style, string> = {
  faithful: '忠实原意，不增不减，保留原文的语气与强调。',
  fluent: '以目标语言母语者的自然表达为准，允许调整语序，但不改变事实与含义。',
  literary: '兼顾文学性与可读性，保留修辞与节奏，允许适度意译。',
  technical: '面向技术文档：术语准确、表述严谨、保留代码与命令原样，不翻译标识符。',
  academic: '面向学术文本：术语规范、逻辑显式、句式严谨，符合学科惯例。',
}

export interface TranslateOptions {
  text: string
  from?: string // 源语言（auto = 自动检测）
  to: string
  style?: Style
  /** 页面上下文：标题、前后句、术语表等 */
  context?: string
  /** 强制术语映射 term → 译名 */
  glossary?: Record<string, string>
}

const LANG_NAMES: Record<string, string> = {
  auto: '自动检测',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ru: '俄语',
}

export function langName(code: string): string {
  return LANG_NAMES[code] ?? code
}

export function buildTranslateMessages(opts: TranslateOptions) {
  const style = opts.style ?? 'fluent'
  const glossaryText = opts.glossary
    ? Object.entries(opts.glossary)
        .map(([k, v]) => `- ${k} → ${v}`)
        .join('\n')
    : ''

  const system = [
    '你是一名专业翻译。只输出译文本身，不要解释、不要加引号、不要输出任何多余内容。',
    `翻译风格：${STYLE_PROMPTS[style]}`,
    `目标语言：${langName(opts.to)}`,
    '保留原文中的代码、命令、URL、数字格式与专有标识符原样不译。',
    opts.context ? `以下是辅助理解的上下文，不要翻译或输出它：\n${opts.context}` : '',
    glossaryText ? `术语表（必须遵守）：\n${glossaryText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return [
    { role: 'system' as const, content: system },
    {
      role: 'user' as const,
      content: opts.from && opts.from !== 'auto' ? `[${langName(opts.from)}]\n${opts.text}` : opts.text,
    },
  ]
}

export interface ExplainOptions {
  text: string
  to: string
  /** 选区上下文（前后句） */
  context?: string
}

/** 划词解释：词义、词性、搭配、语境用法、例句 —— 面向语言学习 */
export function buildExplainMessages(opts: ExplainOptions) {
  const system = [
    '你是一名语言学习助手。针对用户选中的文本进行讲解，用 Markdown 输出，结构如下：',
    '1. **释义**：主要含义（多义项时列出最常用的 2-3 个），标注词性',
    '2. **语境含义**：结合上下文此处最可能的含义',
    '3. **用法**：常见搭配或语法要点（如有）',
    '4. **例句**：2-3 个典型例句（原文 + 译文）',
    '语言精炼，总共不超过 250 字。如果选中的是完整句子或段落，改为：给出流畅译文，然后指出 1-3 个值得注意的语言点（词组、语法、文化背景）。',
    opts.context ? `上下文（仅用于理解，不要输出）：\n${opts.context}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: opts.text },
  ]
}
