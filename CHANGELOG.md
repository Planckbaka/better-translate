# 更新日志（Changelog）

本项目的所有显著变更都会记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中

- M2：沉浸式网页翻译（智能分段、批处理、双语/替换/悬停三模式、SPA 增量、缓存、术语预热）

## [0.2.0] - 2026-10-28

划词 AI（M1）。

### Added

- **划词触发系统**：选中文本浮现「译」字浮钮（延迟可配 0–800ms）、双击取词、`Alt+T` 快捷键、右键菜单
- **触发方式可切换**：浮钮确认 / 选中直接展开面板
- **悬浮翻译面板**（Shadow DOM 隔离、明暗主题自适应）：译文 / 解释 / 原文对照三个标签页，全 Tab 流式渲染
- **解释页**：词义、词性、搭配、语境用法与例句 —— 面向语言学习的结构化讲解
- **上下文感知翻译**：自动携带页面标题（可关）与选区前后文，「bank」不再译错
- **「重译」按钮**：用「单段重译」槽位的强模型重译当前选区
- **站点规则**：按站点禁用/启用划词翻译，支持 `example.com`（含子域）与 `*.example.com`（仅子域），规则按顺序覆盖
- **防误触**：输入框 / 富文本编辑器内不触发；拖拽选区等待松开再评估；Esc 与点击空白关闭；滚动自动收起浮钮
- 无依赖迷你 Markdown 渲染器（输出 React 元素而非 innerHTML，规避注入风险）

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
