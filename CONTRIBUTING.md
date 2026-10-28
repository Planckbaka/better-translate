# 贡献指南（Contributing Guide）

感谢你对 Better Translate 的关注！无论是报告问题、提议功能还是提交代码，都非常欢迎。
在参与之前，请花两分钟阅读本指南，它能让协作更顺畅。

## 行为准则

参与本项目即表示你同意遵守[行为准则](CODE_OF_CONDUCT.md)。

## 开发环境

| 依赖 | 版本要求 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 20（推荐 22 LTS） | |
| pnpm | ≥ 9 | 推荐 `corepack enable` 自动启用（仓库已锁定版本） |
| 浏览器 | Chrome / Edge 最新版 | MV3 目标 |

```bash
git clone https://github.com/Planckbaka/better-translate.git
cd better-translate
pnpm install
pnpm dev   # 启动 WXT 开发模式，自动拉起 Chrome 并加载扩展，改动热更新
```

> `pnpm dev` 首次运行需要你在弹出的浏览器里手动确认加载开发扩展；之后改动会自动热更新，无需重载。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发模式（HMR） |
| `pnpm build` | 生产构建，产物在 `apps/extension/.output/chrome-mv3/` |
| `pnpm zip` | 构建并打包 zip（发布用） |
| `pnpm test` | Vitest 单测（watch 模式：`pnpm exec vitest`） |
| `pnpm typecheck` | TypeScript 严格检查（含 `wxt prepare`） |
| `pnpm lint` | Biome 检查（CI 会执行同一命令） |
| `pnpm lint:fix` | 自动修复格式与可修复问题 |

## 项目结构

```
packages/
├─ shared/      领域模型与类型：Provider / ModelMeta / Slots / UsageRecord、preset 目录、价格表
├─ providers/   统一 LLM 适配层：openai-chat / anthropic 协议、SSE 增量解析器
└─ core/        平台无关引擎：prompt 构建、语言检测（后续：分段、批处理、路由）
apps/
└─ extension/   WXT + React 扩展
   ├─ entrypoints/background.ts   流式网关：唯一 fetch 出口、隐私熔断、用量落库
   ├─ entrypoints/popup/          手动翻译框
   ├─ entrypoints/options/        设置页
   └─ lib/                        协议定义、storage、IndexedDB、RPC 客户端
```

## 提交规范

仓库遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，PR 标题会被 CI 校验：

| 类型 | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（既非新增也非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或依赖变更 |
| `ci` | CI 配置变更 |
| `chore` | 其他杂项 |

示例：

```
feat(providers): 支持 Gemini 原生协议适配器
fix(background): 修复 abort 后仍记录用量流水的问题
docs: 补充 preset 贡献指南
```

## 提交 PR

1. Fork 仓库，从 `main` 拉出功能分支：`git checkout -b feat/your-feature`
2. 完成开发，确保以下命令全部通过（CI 会跑同样的检查）：
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```
3. 为核心逻辑补充单元测试（`packages/*/test/`），尤其是协议解析、批处理对齐这类边界逻辑
4. UI 变更请在 PR 描述中附截图或录屏
5. 提交 PR，标题遵循 Conventional Commits，描述中关联对应 Issue（`Closes #123`）

## 如何添加新的模型供应商预设

`packages/shared/src/presets.ts` 的 `PRESETS` 数组是唯一需要修改的地方：

```ts
{
  id: 'myprovider',                  // preset 唯一 id
  name: 'My Provider',
  kind: 'openai-chat',               // openai-chat 兼容绝大多数服务；仅 Claude 原生接口用 anthropic
  baseUrl: 'https://api.myprovider.com/v1',
  needsKey: true,
  website: 'https://myprovider.com',
  keysUrl: 'https://myprovider.com/keys',  // 方便用户一键跳转申请
  models: [
    { id: 'my-model-fast', context: 128000, speed: 'fast', priceIn: 0.1, priceOut: 0.4 },
  ],
}
```

检查清单：

- [ ] `speed` 与价格尽量准确（它们驱动功能槽位推荐与成本估算）
- [ ] 免费/本地服务标注 `local: true`（隐私模式下的白名单依据）
- [ ] 同步更新 README 的供应商列表与 CHANGELOG

## 如何添加新的协议适配器

实现 `packages/providers/src/types.ts` 里的 `LLMAdapter` 接口：

```ts
export interface LLMAdapter {
  stream(req: ChatRequest): AsyncIterable<StreamEvent>
  listModels(req: { baseUrl: string; apiKey?: string; signal?: AbortSignal }): Promise<string[] | null>
}
```

要求：

- 流式实现必须基于 `SseParser`（增量解析，处理跨 chunk 断行），并在 `packages/providers/test/` 补充解析用例
- 错误统一抛 `AdapterError`（带 HTTP status），UI 层不做协议判断

## 报告问题

- Bug 请使用 [Issue 模板](https://github.com/Planckbaka/better-translate/issues/new?template=bug_report.yml)，附上浏览器版本与控制台报错
- 功能建议使用[功能模板](https://github.com/Planckbaka/better-translate/issues/new?template=feature_request.yml)
- 安全漏洞请**不要**公开提 Issue，走 [安全策略](SECURITY.md)中的私密渠道

## License 条款

向本项目提交的贡献将按 [MIT License](LICENSE) 提供，提交即表示你接受该条款。
