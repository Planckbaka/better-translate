import type { ReactNode } from 'react'

/**
 * 迷你 Markdown 渲染器 —— 解释 Tab 用。
 * 刻意不依赖 react-markdown：输出 React 元素（非 dangerouslySetInnerHTML），
 * 只支持标题 / 加粗 / 行内代码 / 列表 / 引用 / 分隔线，足够承载 LLM 的讲解输出。
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let i = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    const token = match[0] ?? ''
    if (start > last) nodes.push(text.slice(last, start))
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    }
    last = start + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

interface PendingList {
  ordered: boolean
  items: string[]
}

export function MiniMd({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: PendingList | null = null

  const flushList = () => {
    if (!list) return
    const rendered = list.items.map((item, idx) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: 静态只读列表，无重排与组件状态，索引键即可
      <li key={idx}>{renderInline(item, `li-${blocks.length}-${idx}`)}</li>
    ))
    const key = `l-${blocks.length}`
    blocks.push(list.ordered ? <ol key={key}>{rendered}</ol> : <ul key={key}>{rendered}</ul>)
    list = null
  }

  const lines = text.split('\n')
  for (const [i, raw] of lines.entries()) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      flushList()
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      const level = heading[1]?.length ?? 3
      const Tag = (level <= 2 ? `h${level}` : 'h3') as 'h1' | 'h2' | 'h3'
      blocks.push(<Tag key={i}>{renderInline(heading[2] ?? '', `h-${i}`)}</Tag>)
      continue
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushList()
      blocks.push(<hr key={i} />)
      continue
    }
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushList()
      blocks.push(<blockquote key={i}>{renderInline(quote[1] ?? '', `q-${i}`)}</blockquote>)
      continue
    }
    const ulItem = /^[-*]\s+(.*)$/.exec(line)
    if (ulItem) {
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list?.items.push(ulItem[1] ?? '')
      continue
    }
    const olItem = /^\d+[.、)]\s+(.*)$/.exec(line)
    if (olItem) {
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list?.items.push(olItem[1] ?? '')
      continue
    }
    flushList()
    blocks.push(<p key={i}>{renderInline(line, `p-${i}`)}</p>)
  }
  flushList()

  return <div className="bt-md">{blocks}</div>
}
