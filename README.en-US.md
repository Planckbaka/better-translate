<div align="center">

# ✨ Better Translate

**AI-native browser translation extension — context-aware selection & immersive webpage translation with transparent, controllable model management**

[![CI](https://github.com/Planckbaka/better-translate/actions/workflows/ci.yml/badge.svg)](https://github.com/Planckbaka/better-translate/actions/workflows/ci.yml)
[![Release](https://github.com/Planckbaka/better-translate/actions/workflows/release.yml/badge.svg)](https://github.com/Planckbaka/better-translate/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[简体中文](README.md) | English

</div>

---

Better Translate treats the **LLM as the translation engine itself**, not an add-on bolted onto a legacy MT service. It tackles three pain points of today's translation tools:

1. **Broken context** — paragraph-by-paragraph translation causes inconsistent terminology and mistranslated pronouns ([immersive-translate issue #164](https://github.com/immersive-translate/immersive-translate/issues/164))
2. **Opaque models** — AI behind paywalls, painful BYOK setup, unpredictable spend
3. **Intrusive UX** — misfiring popups, missing translate buttons, broken reading flow

The model-management layer is inspired by [magpie](https://github.com/yetone): a provider registry, composite route keys, per-feature model slots, failover groups, and per-request usage logs.

## ✨ Features

### Shipped (v0.2.0)

- **Selection AI** — highlight text to surface a floating "译" button (or expand the panel directly), trigger via `Alt+T` / double-click / context menu; a streaming panel with **Translation / Explain / Original** tabs, where Explain covers senses, part of speech, collocations and example sentences
- **Context-aware** — page title and surrounding sentences ride along with the selection, so "bank" lands on the right sense
- **Retry** — one click to re-translate the selection with the strong model slot
- **Site rules** — disable selection translation per site, wildcard subdomains supported
- **🔗 Multi-provider registry** — presets for Zhipu GLM / DeepSeek / OpenAI / Anthropic / Google Gemini / Moonshot Kimi / SiliconFlow / Ollama, plus any OpenAI-compatible custom endpoint (one-api, new-api, or a **local magpie gateway**)
- **🎯 Per-feature model slots** — selection / explain / page / retry each bound to their own model: fast tiers for bulk work, strong tiers for hard text
- **⚡ Streaming translation** — popup scratchpad with SSE streaming, ⌘/Ctrl + Enter to translate
- **📊 Usage & cost observability** — every request logs tokens / TTFT / latency / estimated cost, aggregated per day and per model
- **🔒 Privacy mode** — one switch to allow local endpoints only (127.0.0.1 / localhost); cloud requests are refused, not silently downgraded
- **🧪 One-click connectivity test & model catalog fetch** — validate a key instantly, discover models from `/models`

### On the roadmap

- Immersive webpage translation: bilingual / replace / hover modes with batching and progressive rendering (M2)
- Page-level glossary warm-up for terminology consistency (M2)
- Model groups with failover, quota display (M3)
- Vocabulary notebook, history, custom prompts (M4)

See the [roadmap](#-roadmap) below.

## 🚀 Getting Started

```bash
git clone https://github.com/Planckbaka/better-translate.git
cd better-translate
pnpm install
pnpm build
# output: apps/extension/.output/chrome-mv3/
```

Or grab a prebuilt zip from [Releases](https://github.com/Planckbaka/better-translate/releases).

**Load in Chrome / Edge**: open `chrome://extensions` → enable Developer mode → "Load unpacked" → select `apps/extension/.output/chrome-mv3`.

**Configure a model**: click the toolbar icon → Settings → "Add provider" → pick a preset or custom endpoint → paste your API key → hit "Test". The first provider's models are auto-assigned to all slots.

> 💡 Running [magpie](https://github.com/yetone) locally? Add a "custom endpoint" pointing at its OpenAI-compatible URL to reuse all of your configured models.

## 🔒 Privacy

- **Minimal payload by default** — only your selected text (plus an optional page title) is sent; URLs never leave the browser
- **Privacy mode** — global switch that only permits local endpoints
- **Local-first storage** — settings and API keys live in `chrome.storage.local`; zero telemetry
- **Request transparency** — inspect every request's destination and cost in the usage log

## 🗺️ Roadmap

| Milestone | Scope | Status |
| --- | --- | --- |
| M0 | Provider management + popup translation + usage stats | ✅ v0.1.0 |
| M1 | Selection AI: trigger system + streaming translate/explain/original panel | ✅ v0.2.0 |
| M2 | Immersive page translation: smart segmentation, batching, 3 display modes, SPA support, caching, glossary warm-up | 📋 |
| M3 | Model group failover, catalog discovery, quota display, page-sticky routing | 📋 |
| M4 | Vocabulary notebook, glossary injection, history, custom prompts & styles | 📋 |
| M5 | PDF reading, input-box rewrite, TTS, Edge / Firefox | 📋 |

## 🛠️ Development

```bash
pnpm dev         # WXT dev mode with HMR (launches Chrome automatically)
pnpm build       # production build (Chrome MV3)
pnpm test        # Vitest unit tests
pnpm typecheck   # strict TypeScript check
pnpm lint        # Biome
```

**Requirements**: Node.js ≥ 20, pnpm ≥ 9 (`corepack enable`).

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## ❤️ Acknowledgements

- [magpie](https://github.com/yetone) — inspiration for the model-management design
- [Immersive Translate](https://immersivetranslate.com/) & [Selection Translate](https://github.com/hcfyapp/crx-selection-translate) — proved the value of bilingual pages and selection translation; many trade-offs here come from studying their community feedback
- [WXT](https://wxt.dev/) — makes extension development enjoyable again

## 📄 License

[MIT](LICENSE) © 2026 Planckbaka
