import type { Provider } from '@bt/shared'
import { AnthropicAdapter } from './anthropic'
import { OpenAIChatAdapter } from './openai-chat'
import type { LLMAdapter } from './types'

export * from './types'

const registry = new Map<string, LLMAdapter>()

export function getAdapter(provider: Provider): LLMAdapter {
  const cached = registry.get(provider.id)
  if (cached) return cached
  const adapter = provider.kind === 'anthropic' ? new AnthropicAdapter() : new OpenAIChatAdapter(provider)
  registry.set(provider.id, adapter)
  return adapter
}
