# 远程验收记录（2026-11-17）

环境：云端 Linux。不是先前 macOS checkout。命令都在该环境执行。退出码来自当次进程，不用以前的本机结果代替。

| 项 | 结果 | 命令 | 退出码 | 说明 |
|----|------|------|--------|------|
| lint | PASS | `pnpm lint` | 0 | 10 个包，`--max-warnings 0`。空接口改为类型别名；删掉未生效的 `eslint-disable` |
| typecheck | PASS | `pnpm typecheck` | 0 | 16/16 |
| 单元/集成测试 | PASS | `pnpm test` | 0 | 当时 core 3、server 9、document-model 2、plugin 2。插件改动后重跑 plugin：2/2，退出码 0 |
| build | PASS | `pnpm build` | 0 | 10/10。插件二次构建产出单个 `plugin.js` |
| quickstart V1 | SKIP | `pnpm validate:quickstart` | 0 | 汇总 PASS 8 / FAIL 0 / SKIP 1。V1 仍是 Penpot UI |
| quickstart V2–V5、V8–V9 | PASS | 同上 | 0 | 脚本内断言。V9 是单页 CLI 2ms |
| quickstart V6/V7 | PASS（脚本级） | 同上 | 0 | 只检查常量和恢复语义说明。跨进程版本与 BullMQ 以 RM-03 为准 |
| SC-001 | PASS | `pnpm validate:sc-rates` | 0 | 5/5 = 100% |
| SC-002 | PASS | 同上 | 0 | 3/3 = 100% |
| SC-003 | SKIP | `pnpm validate:sc003` | 0 | 无 soffice。未安装 LibreOffice。这不是 SC-005 通过 |
| PPTX ZIP 冒烟 | PASS | `pnpm validate:pptx-smoke` | 0 | 只证明 OOXML ZIP。不能代替办公软件打开 |
| RM-03 鉴权/版本/队列/对象存储 | PASS | `pnpm validate:rm03` | 0 | `USE_MEMORY_DB=0`，`EXPORT_INLINE=0`。细节见 `rm03-infra.md` |
| RM-01 Penpot 实机导出 | BLOCKED | 见下 | — | 服务起来了，三页下载没有完成 |
| SC-005 四款软件 | BLOCKED-ENV | `command -v` / `dpkg -l` | — | PowerPoint、WPS、Keynote、LibreOffice 都不在这台机器上。T087 未勾 |
| SC-008 五人试用 | BLOCKED | 查 `sc008-usability.md` | — | 没有真实参与者记录。脚本在 `sc008-trial-script.md`。未发邀请 |
| SC-009 | 未成立 | — | — | 兼容与 Penpot 下载仍缺 |

## RM-03 覆盖

已核对：未认证 401 且响应体不含文档标记；错误令牌 401；版本 1/2 与 restore 出的版本 3 写入 Postgres；停掉 server 再拉起后仍读到 v1 文本和三个版本号；任务 `transport=bullmq`；取消后 artifact 404，Worker 启动后仍为 cancelled 且 MinIO 没有该 pptx；成功任务 HTTP 200、ZIP 内含 v1 文本和上传的 PNG；对象大小与下载字节一致；`export_jobs` 行分别为 succeeded / cancelled。测试文档和对象桶 `canvory-it-7484` 在结束时删除。

## RM-01 做到哪一步

- `http://127.0.0.1:9002/` 返回 200。`/js/config.js` 含 `enable-feature-plugins`。backend 日志有 `welcome to penpot` 2.4.3，flags 含 `feature-plugins`、`registration`、`login-with-password`。
- 插件站 `http://127.0.0.1:4400/manifest.json`、`plugin.js`、`index.html` 均为 200。
- 整份 `docker compose up` 会因 Docker Hub 拒绝 `minio/minio` 而失败。本次只启动了 postgres、redis、penpot-frontend、penpot-backend、penpot-exporter。
- 浏览器里注册了本地账号并打开过设计文件。第二次尝试里 Ctrl+Alt+P 打开了插件管理器，安装对话框的权限与本仓库 manifest 一致。之后看到的面板文案（「配置 / 运行环境」）不在本仓库 UI 源码里，不能当作「宿主: Penpot」的证据。
- `/home/ubuntu` 与 `/tmp` 没有新的 pptx。三页（文本、矩形、图片）导出下载没有完成。
- 因此 V1 保持 SKIP，不把健康检查或 Demo 回退写成实机通过。

本地复现入口（需在编辑器里自己点完导出）：

1. 打开 `http://127.0.0.1:9002/`
2. 进入设计文件，Ctrl+Alt+P，安装 `http://127.0.0.1:4400/manifest.json`
3. 做三个同尺寸画板（文本、矩形、图片），范围全部、模式 auto、不要勾后台导出，点「导出」
4. 只有界面写着「宿主: Penpot」并且下载到 pptx，才能把 V1 改成 PASS

## 仍开放

T087、RM-01、RM-02、SC-005、SC-008、SC-009。SC-003 维持 SKIP。
