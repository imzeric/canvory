# M2 生成协议实测

日期：2026-11-18。没有调用外部付费模型，没有把操作画到 Penpot。模板、图表和三种导出没有实现。

## 命令

在仓库根目录、且未导出 `DATABASE_URL` 时连续执行，全部退出码 0：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

`pnpm test` 里有断言的用例 66 个：

| 包 | 通过 |
| --- | ---: |
| `@canvory/document-model` | 4 |
| `@canvory/core` | 23 |
| `@canvory/exporter-pptx` | 3 |
| `@canvory/server` | 18 |
| `@canvory/penpot-plugin` | 18 |

没有测试文件的包以 `--passWithNoTests` 退出码 0，不计入 66。

## 协议

注册的 provider 类型只有 `openai-compatible`。它按 OpenAI Chat Completions 文档发 `POST {CANVORY_MODEL_BASE_URL}/chat/completions`，请求体只有 `model` 和 `messages`（`system` 与 `user`），头是 `Authorization: Bearer` 和 `Content-Type: application/json`。不加载任意模块，也不使用 MockModelProvider。

本地 HTTP fixture 覆盖了：成功返回并经 schema 校验、429、超时 504、调用方取消 408、连接失败 502、带 `code` 的操作和 `canvory.mounts` 被拒绝。响应 `drawn` 为 false，且不含密钥。长文本先分块再放进 `user`，字符不丢，系统提示不含这些字符。用户文本里的地址不会被服务端另外抓取。

无 `CANVORY_MODEL_PROVIDER` 或 `CANVORY_MODEL_API_KEY` 时返回 503。未注册的类型返回 400 `PROVIDER_UNKNOWN`，不再返回 501。

## 资料

支持粘贴 `text/plain`。不支持 PDF、图片、任意 URL 和本机路径。`fileId` 不能含 `/` 或 `..`。读写同时核对认证用户和 file id。

`assistant_materials` 在 Postgres。另起一个 Node 进程能读回同一条正文，别的 owner 读不到。配置了 MinIO 时，同一正文的字节写入对象存储，新进程按 `storage_key` 取回，长度 55 字节。未配置数据库时仍可用进程内存，那种模式重启后不会保留，不记成恢复通过。

## 插件

「生成」把服务端返回的操作留在结果里，但 `drawn` 固定为 false，文案含「没有绘制画板」。「绘制」仍禁用。这不是外部模型验收。

## 还没有做

- 没有把操作画到图层。逐画板手改修订属于绘制里程碑。
- 没有用真实密钥打到外部供应商。
- 没有合并。
