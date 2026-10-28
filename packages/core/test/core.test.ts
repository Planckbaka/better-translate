import { describe, expect, it } from 'vitest'
import {
  buildExplainMessages,
  buildTranslateMessages,
  decideDirection,
  detectLang,
  hostMatches,
  siteEnabled,
} from '../src'

describe('detectLang', () => {
  it('识别日文假名', () => {
    expect(detectLang('こんにちは世界')).toBe('ja')
  })
  it('识别韩文', () => {
    expect(detectLang('안녕하세요')).toBe('ko')
  })
  it('中文', () => {
    expect(detectLang('今天天气不错')).toBe('zh-Hans')
  })
  it('英文', () => {
    expect(detectLang('The quick brown fox')).toBe('en')
  })
})

describe('decideDirection', () => {
  it('英文默认翻到中文', () => {
    expect(decideDirection('hello world', 'zh-Hans')).toEqual({ from: 'en', to: 'zh-Hans' })
  })
  it('中文翻到默认目标语言', () => {
    expect(decideDirection('你好世界', 'en')).toEqual({ from: 'zh-Hans', to: 'en' })
  })
  it('目标语言也是中文时做简繁互换', () => {
    expect(decideDirection('你好世界', 'zh-Hans')).toEqual({ from: 'zh-Hans', to: 'zh-Hant' })
  })
})

describe('buildTranslateMessages', () => {
  it('只输出译文的系统约束 + 风格 + 术语表注入', () => {
    const msgs = buildTranslateMessages({
      text: 'Rust makes GC optional',
      to: 'zh-Hans',
      style: 'technical',
      glossary: { Rust: 'Rust' },
    })
    expect(msgs[0]?.role).toBe('system')
    const sys = msgs[0]!.content
    expect(sys).toContain('只输出译文')
    expect(sys).toContain('术语表')
    expect(sys).toContain('Rust → Rust')
    expect(msgs[1]?.content).toContain('Rust makes GC optional')
  })

  it('上下文仅进入 system 不进入 user', () => {
    const msgs = buildTranslateMessages({ text: 'bank', to: 'zh-Hans', context: '页面标题：河岸生态' })
    expect(msgs[0]!.content).toContain('河岸生态')
    expect(msgs[1]!.content).toBe('bank')
  })
})

describe('buildExplainMessages', () => {
  it('讲解结构约束', () => {
    const msgs = buildExplainMessages({ text: 'serendipity', to: 'zh-Hans' })
    expect(msgs[0]!.content).toContain('释义')
    expect(msgs[0]!.content).toContain('例句')
  })
})

describe('hostMatches', () => {
  it('精确 host', () => {
    expect(hostMatches('github.com', 'github.com')).toBe(true)
    expect(hostMatches('gitlab.com', 'github.com')).toBe(false)
  })
  it('子域后缀匹配', () => {
    expect(hostMatches('docs.example.com', 'example.com')).toBe(true)
    expect(hostMatches('example.com', 'example.com')).toBe(true)
    expect(hostMatches('notexample.com', 'example.com')).toBe(false)
  })
  it('通配模式', () => {
    expect(hostMatches('docs.example.com', '*.example.com')).toBe(true)
    expect(hostMatches('example.com', '*.example.com')).toBe(false)
  })
  it('容忍 URL 与 www 前缀输入', () => {
    expect(hostMatches('www.GitHub.com', 'https://github.com/docs')).toBe(true)
  })
})

describe('siteEnabled', () => {
  it('无规则默认启用', () => {
    expect(siteEnabled([], 'example.com')).toBe(true)
  })
  it('禁用规则生效', () => {
    expect(siteEnabled([{ pattern: 'example.com', enabled: false }], 'docs.example.com')).toBe(false)
  })
  it('后写规则覆盖先写', () => {
    const rules = [
      { pattern: 'example.com', enabled: false },
      { pattern: 'docs.example.com', enabled: true },
    ]
    expect(siteEnabled(rules, 'docs.example.com')).toBe(true)
    expect(siteEnabled(rules, 'blog.example.com')).toBe(false)
  })
})
