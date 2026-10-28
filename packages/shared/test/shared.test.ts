import { describe, expect, it } from 'vitest'
import { estimateCost, getPreset, makeRoute, parseRoute, providerFromPreset } from '../src'

describe('route', () => {
  it('解析 provider/model 组合键', () => {
    expect(parseRoute('zhipu/glm-4.5')).toEqual({ kind: 'provider', providerId: 'zhipu', modelId: 'glm-4.5' })
  })
  it('解析 group 键', () => {
    expect(parseRoute('group/auto-fast')).toEqual({ kind: 'group', providerId: '', modelId: 'auto-fast' })
  })
  it('模型 id 内可再含斜杠', () => {
    expect(parseRoute('siliconflow/Qwen/Qwen2.5-7B-Instruct')).toEqual({
      kind: 'provider',
      providerId: 'siliconflow',
      modelId: 'Qwen/Qwen2.5-7B-Instruct',
    })
  })
  it('往返一致', () => {
    expect(parseRoute(makeRoute('a', 'b/c'))).toEqual({ kind: 'provider', providerId: 'a', modelId: 'b/c' })
  })
  it('非法输入返回 null', () => {
    expect(parseRoute('')).toBeNull()
    expect(parseRoute('nomodel')).toBeNull()
    expect(parseRoute('openai/')).toBeNull()
  })
})

describe('presets', () => {
  it('preset 创建的 provider 保留目录与引导链接', () => {
    const p = providerFromPreset('zhipu')
    expect(p.kind).toBe('openai-chat')
    expect(p.models.length).toBeGreaterThan(0)
    expect(p.keysUrl).toBeTruthy()
    expect(getPreset('zhipu')?.baseUrl).toBe(p.baseUrl)
  })
  it('custom preset 无端点、无模型', () => {
    const p = providerFromPreset('custom')
    expect(p.baseUrl).toBe('')
    expect(p.models).toHaveLength(0)
  })
})

describe('estimateCost', () => {
  it('按百万单价折算', () => {
    expect(estimateCost({ id: 'x', priceIn: 1, priceOut: 3 }, 1_000_000, 500_000)).toBeCloseTo(2.5)
  })
  it('无元数据或无价格按 0', () => {
    expect(estimateCost(undefined, 1000, 1000)).toBe(0)
    expect(estimateCost({ id: 'free' }, 1000, 1000)).toBe(0)
  })
})
