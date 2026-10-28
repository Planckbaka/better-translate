# 更新日志（Changelog）

本项目的所有显著变更都会记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中

- M1：划词 AI（选中浮钮 / 快捷键触发，译文 + 词义解释 + 例句流式面板）
- M2：沉浸式网页翻译（智能分段、批处理、双语/替换/悬停三模式、SPA 增量、缓存、术语预热）

## [0.1.0] - 2026-10-28

首个可用版本（M0）。

### Added

- **模型供应商管理**：8 个内置预设（智谱 GLM、DeepSeek、OpenAI、Anthropic、Gemini、Moonshot Kimi、SiliconFlow、Ollama）+ 自定义 OpenAI 兼容端点（支持 one-api / new-api / 本机 magpie 网关）
- **供应商运营能力**：一键连通测试、`/models` 模型目录自动发现与合并、模型元数据编辑（上下文 / 速度档 / 单价）、供应商启停开关
- **按功能分配模型**：划词 / 解释 / 整页 / 重译四个槽位各自绑定 `provider/model` 组合路由键
- **Popup 手动翻译**：流式渲染（SSE）、语言方向自动检测与手动切换、五种翻译风格、模型快捷下拉、⌘/Ctrl + Enter 快捷翻译
- **用量与成本统计**：逐请求流水（tokens / TTFT / 耗时 / 状态 / 估算成本）落 IndexedDB，按日与按模型聚合展示
- **隐私模式**：一键仅允许本地端点（127.0.0.1 / localhost），云模型请求熔断并给出明确提示
- **配置管理**：导出 / 导入 JSON 配置
- **工程化**：pnpm monorepo（shared / providers / core / extension）、Biome + TypeScript strict、Vitest 单测（25 例）、GitHub Actions CI 与自动 Release

[Unreleased]: https://github.com/Planckbaka/better-translate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Planckbaka/better-translate/releases/tag/v0.1.0
