# 远程验收记录（2026-11-17）

环境：云端 Linux。不是先前 macOS checkout。命令都在该环境执行。退出码来自当次进程，不用以前的本机结果代替。

| 项 | 结果 | 命令 | 退出码 | 说明 |
|----|------|------|--------|------|
| lint | PASS | `pnpm lint` | 0 | 10 个包，`--max-warnings 0`。空接口改为类型别名；删掉未生效的 `eslint-disable` |
| typecheck | PASS | `pnpm typecheck` | 0 | 16/16 |
| 单元/集成测试 | PASS | `pnpm test` | 0 | 最终复验 21 项：core 3、document-model 2、plugin 4、exporter 3、server 9 |
| build | PASS | `pnpm build` | 0 | 10/10。插件二次构建产出单个 `plugin.js` |
| quickstart 脚本 V1 | SKIP | `pnpm validate:quickstart` | 0 | 汇总仍是 PASS 8 / FAIL 0 / SKIP 1。脚本不打开浏览器，不把这一行改成 PASS |
| quickstart V2–V5、V8–V9 | PASS | 同上 | 0 | 脚本内断言。V9 是单页 CLI 2ms |
| quickstart V6/V7 | PASS（脚本级） | 同上 | 0 | 只检查常量和恢复语义说明。跨进程版本与 BullMQ 以 RM-03 为准 |
| SC-001 | PASS | `pnpm validate:sc-rates` | 0 | 5/5 = 100% |
| SC-002 | PASS | 同上 | 0 | 3/3 = 100% |
| SC-003 | SKIP | `pnpm validate:sc003` | 0 | 无 soffice。未安装 LibreOffice。这不是 SC-005 通过 |
| PPTX ZIP 冒烟 | PASS | `pnpm validate:pptx-smoke` | 0 | 只证明 OOXML ZIP。不能代替办公软件打开 |
| RM-03 鉴权/版本/队列/对象存储 | PASS | `pnpm validate:rm03` | 0 | `USE_MEMORY_DB=0`，`EXPORT_INLINE=0`。细节见 `rm03-infra.md` |
| Penpot 浏览器 UI（与脚本 V1 分开） | PASS | 宿主 findShapes + 浏览器下载后解包 | 0 | 见文末「内容闭环」。不是 quickstart 脚本计数 |
| SC-005 四款软件 | 豁免，不是 PASS | `command -v` / `dpkg -l` | — | 历史结果仍是 BLOCKED-ENV。用户豁免后不是当前阻断。T087 不勾 |
| SC-008 五人试用 | 豁免，不是 PASS | 查 `sc008-usability.md` | — | 样本仍为 0。用户豁免后不是当前阻断。脚本在 `sc008-trial-script.md` |
| SC-009 | 所列四项有证据 | — | — | 映射+预检、Penpot 前台下载、版本恢复、后台任务都有记录。SC-003 仍 SKIP，SC-005/SC-008 仍是豁免，都不记通过 |

## RM-03 覆盖

已核对：未认证 401 且响应体不含文档标记；错误令牌 401；版本 1/2 与 restore 出的版本 3 写入 Postgres；停掉 server 再拉起后仍读到 v1 文本和三个版本号；任务 `transport=bullmq`；取消后 artifact 404，Worker 启动后仍为 cancelled 且 MinIO 没有该 pptx；成功任务 HTTP 200、ZIP 内含 v1 文本和上传的 PNG；对象大小与下载字节一致；`export_jobs` 行分别为 succeeded / cancelled。测试文档和对象桶 `canvory-it-7484` 在结束时删除。

## 历史：第一次浏览器尝试没有完成下载

下面是当时的记录，保留下来，不再当作当前阻塞。当前结论是文末的内容闭环。

- `http://127.0.0.1:9002/` 返回 200。`/js/config.js` 含 `enable-feature-plugins`。backend 日志有 `welcome to penpot` 2.4.3，flags 含 `feature-plugins`、`registration`、`login-with-password`。
- 插件站 `http://127.0.0.1:4400/manifest.json`、`plugin.js`、`index.html` 均为 200。
- 整份 `docker compose up` 会因 Docker Hub 拒绝 `minio/minio` 而失败。当时只启动了 postgres、redis、penpot-frontend、penpot-backend、penpot-exporter。
- 浏览器里注册了本地账号并打开过设计文件。第二次尝试里 Ctrl+Alt+P 打开了插件管理器，安装对话框的权限与本仓库 manifest 一致。之后看到的面板文案（「配置 / 运行环境」）不在本仓库 UI 源码里，不能当作「宿主: Penpot」的证据。
- 那一次 `/tmp` 里还没有含目标内容的 pptx，三页下载没有完成。健康检查和 Demo 回退不能记成实机通过。

quickstart 脚本里的 V1 到现在仍是 SKIP，因为脚本不打开浏览器。这一行不因后来的浏览器下载改成 PASS，自动化汇总保持 PASS 8 / FAIL 0 / SKIP 1。浏览器实机另记，见「内容闭环」。

## 2026-11-17 豁免

用户要求把四款办公软件（SC-005 / T087 / RM-02）和五人真实试用（SC-008）从本阶段发布阻断里拿掉。规格、看板和本记录已改成「豁免、后续项」。历史 BLOCKED-ENV 和样本为 0 都还在，没有改成通过。SC-003 不在这次豁免里。

## SC-003 为什么是 SKIP

测量规程写在 `fixtures/golden/metrics.md`：用 LibreOffice 的 `soffice --headless --convert-to pdf` 把 PPTX 渲成 PDF，再用 `pdftoppm` 得到 PNG，把图上的元素中心和 CDM `transform` 中心比较。阈值仍是页宽的 0.5%，没有改。

`scripts/sc003-measure.mts` 只查找 PATH 里的 `soffice` 或 `libreoffice`。找不到就写 SKIP 并退出 0。找到了也只做 PDF 转换，中心点误差仍要按 metrics 再测。这次用户只问原因，没有要求重新安装或开跑，所以继续 SKIP，不算通过。

## Penpot 三页导出（同一次远程浏览器）

- 插件面板是仓库里的 UI：`宿主: Penpot`，画板 `文本` / `矩形` / `图片`，模式 `auto`，未勾后台导出。预检能打开。截图见 PR 附件。
- 浏览器导出不再报 `nodebuffer is not supported`。修复是：有 DOM 时 `pptxgenjs` 用 `uint8array`。
- 页面根画板 `00000000-0000-0000-0000-000000000000` 不再被当成一页，避免和 1920×1080 的用户画板一起触发 `SIZE_MISMATCH`。
- Penpot 的图片是 `rectangle` + `fillImage`，现已按图片导出。
- 更早一次下载的 `New File 8.pptx` 有 3 页，但三页里没有 `IT7484-PENPOT-TEXT`，没有图片部件，也没有矩形形状。当时元素没有成为三块画板的子图层。那一次不能记成内容闭环通过。

## 内容闭环（同一远程浏览器，重新造样例之后）

样例用 Penpot 2.4.3 官方插件 API（`content:write`，安装时点了 ALLOW）在空文件里创建，并在重新打开文件后用 `currentPage.findShapes` 核对归属。没有往 PPTX 里注入成品。

重新打开后的图层树：

| 形状 | 父图层 | 几何 |
|------|--------|------|
| 画板「文本」 | Root Frame | 1920×1080 |
| 文本 `IT7484-PENPOT-TEXT`，字符同名 | 文本 | x=120 y=100，880×140 |
| 画板「矩形」 | Root Frame | 1920×1080 |
| 矩形 `IT7484-RECT`，填充 `#3366cc` | 矩形 | x=160 y=180，480×280 |
| 画板「图片」 | Root Frame | 1920×1080 |
| 矩形 `IT7484-IMAGE`，`fillImage=true` | 图片 | x=160 y=180，320×240 |

Canvory 插件面板为「宿主: Penpot」，画板是「文本 / 矩形 / 图片」，模式 auto，未勾后台导出。预检后前台导出，浏览器下载 `New File 11.pptx`（56720 字节）。解包：

- 3 页：`ppt/slides/slide1.xml` … `slide3.xml`
- slide1 文本节点 `<a:t>IT7484-PENPOT-TEXT</a:t>`
- slide2 形状填充 `srgbClr val="3366CC"`
- slide3 有 `r:embed="rId1"`，`slide3.xml.rels` 的 Relationship 类型是 image，Target 为 `../media/image-3-1.png`（1961 字节，PNG 文件头）

第一次能下到三页但没有图片，是因为插件在 Penpot SES 隔间里调用未绑定的 `btoa`，异常被吞掉，图片 data URL 为空，导出器就跳过了这一页的图片。现改为按字节手写 base64，并用带下标的普通对象做回归（`bytesToDataUrl` / `dataUrlFromExportBytes`）。修复后的这次下载才算内容闭环。

最终复验（2026-11-17，文档收口前再跑一遍）：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm validate:quickstart`、`pnpm validate:sc-rates`、`pnpm validate:sc003`、`pnpm validate:pptx-smoke`、`pnpm validate:rm03` 退出码都是 0。测试 21 项（core 3、document-model 2、plugin 4、exporter 3、server 9）。quickstart 仍是 PASS 8 / FAIL 0 / SKIP 1。SC-001 5/5，SC-002 3/3。SC-003 SKIP。RM-03 PASS。

## 当前判定和剩余限制

SC-009 的有效必需项是：完整元素映射与预检、Penpot 宿主前台导出并下载、文档版本恢复、后台导出任务。这四项都有上面的证据，先前失败的下载只作历史。

这些没有验证，不能写成通过：

- SC-003 位置误差仍是 SKIP。没有 LibreOffice，阈值仍是页宽 0.5%，没有测量中心点。
- SC-005 / T087 / RM-02 四款办公软件是用户豁免。历史 BLOCKED-ENV 保留，没有打开 PowerPoint、WPS、Keynote 或 LibreOffice。
- SC-008 五人试用是用户豁免。样本仍是 0。
- quickstart 脚本 V1 仍是 SKIP。它和上面的浏览器 UI PASS 是两件事。
