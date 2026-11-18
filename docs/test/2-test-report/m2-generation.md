# M2 生成协议实测

日期：2026-11-18。只覆盖生成子计划。没有调用真实模型，没有绘制画板。模板、图表和三种导出没有实现。

## 命令

在仓库根目录连续执行，全部退出码 0：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

`pnpm test` 里有断言的用例 59 个：

| 包 | 通过 |
| --- | ---: |
| `@canvory/document-model` | 4 |
| `@canvory/core` | 22 |
| `@canvory/exporter-pptx` | 3 |
| `@canvory/server` | 13 |
| `@canvory/penpot-plugin` | 17 |

没有测试文件的包以 `--passWithNoTests` 退出码 0，不计入 59。

## 不需要密钥就能做的事

- 长文本按空行再按句号分块，超长片段继续按字数切开，不丢字。
- 资料正文按文件 id 存在服务端进程内存。另一个文件 id 读不到。
- 浮窗可以提交需求和引用资料。引用 id 写入当前文件会话。`finish` 之后不能再写。
- 系统提示固定为「你只返回 JSON 操作数组。」用户文本只在 `user` 字段。
- 白名单操作：`createBoard`、`createText`、`createRectangle`、`createEllipse`、`setPluginData`、`uploadMedia`、`replaceText`。未知操作或 `code` 字段整段拒绝。
- `generateWithProvider` 的返回值 `drawn` 固定为 false。
- `POST /api/v1/assistant/generate` 在 `CANVORY_MODEL_PROVIDER` 或 `CANVORY_MODEL_API_KEY` 为空时返回 503，文案 `MODEL_PROVIDER_UNCONFIGURED`。
- 两个变量都有值时返回 501 `PROVIDER_ADAPTER_MISSING`，响应里没有 `MOCK:`，也没有 `createBoard`。
- `apps/server/src/main.ts` 和 `provider-factory.ts` 不引用 `MockModelProvider`。
- 用 `node dist/main.js` 在本机 3010 端口调用 `POST /api/v1/assistant/generate`，响应 503，正文含 `MODEL_PROVIDER_UNCONFIGURED` 和 `drawn: false`。这次没有拿到新的浮窗截图。

## 外部依赖

真实供应商调用还没有适配器。配置了名字和密钥也不会出网，也不会画板。密钥不写入日志和响应。资料正文在进程内存里，重启后要重新引用。

## 还没有做

- 没有把操作应用到 Penpot 图层。逐画板手改修订仍属于绘制里程碑。
- 没有模板、原生图表、HTML 或 PDF。
- 没有合并。
