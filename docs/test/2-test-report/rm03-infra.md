# RM-03 Postgres / Redis / MinIO 联调

- 日期：2026-11-17
- 环境：远程 Linux（非本机 Mac）。Postgres 16、Redis 7、MinIO RELEASE.2024-12-18T13-15-44Z，均监听 127.0.0.1。
- 模式：`USE_MEMORY_DB=0`，`EXPORT_INLINE=0`，`MINIO_BUCKET=canvory-it-7484`。
- 凭据：与 `infrastructure/docker/docker-compose.yml` 中的开发默认值相同，未另引入生产密钥。
- 命令：`pnpm validate:rm03`
- 退出码：0
- 结果：PASS 26 / FAIL 0


| 检查 | 结果 | 说明 |
|------|------|------|
| postgres 可达 | PASS | SELECT 1 |
| 迁移 001_init | PASS | exit 0 |
| server 健康检查 | PASS | GET /api/health on :3011 |
| 未认证拒绝且不返回文档体 | PASS | status 401 |
| 错误令牌 401 | PASS | status 401 |
| 资源预签名 | PASS | status 201 key uploads/6c40ce58-3712-4ca7-a4ef-a2c0ab1214b6/it7484.png |
| 资源上传 | PASS | status 201 |
| MinIO 对象存在（非内存） | PASS | uploads/6c40ce58-3712-4ca7-a4ef-a2c0ab1214b6/it7484.png |
| 创建文档 | PASS | id 834b9253-0234-45cc-a0f7-1d2513d519ee |
| 版本 1 已写入 Postgres | PASS | text=IT7484-V1-TEXT |
| 保存版本 2 | PASS | version 2 |
| 恢复 v1 产生新版本 | PASS | version 3 |
| Postgres 保留 v1/v2/v3 且 v3 内容为 v1 | PASS | 1:IT7484-V1-TEXT,2:IT7484-V2-TEXT,3:IT7484-V1-TEXT |
| 入队走 BullMQ | PASS | status 201 transport bullmq |
| 取消排队任务 | PASS | status cancelled |
| 取消后不可下载 | PASS | status 404 |
| Worker 不把已取消任务写成可下载 | PASS | status cancelled object=false |
| 成功路径再次入队 | PASS | task be290021-bcfb-4cfb-875c-1924d02ef2b1 |
| 导出任务成功 | PASS | succeeded |
| 成功任务可下载 | PASS | status 200 bytes 46079 |
| PPTX 含恢复后的 v1 文本与 MinIO 图片 | PASS | {"MISSING":"","MEDIA":"ppt/media/,ppt/media/image-1-1.png","SLIDE_HAS_V1":"True","SLIDE_HAS_V2":"False","MEDIA_HAS_PNG":"False","MEDIA_CONTAINS_PNG":"True","NAMES":"40"} |
| 产物对象在 MinIO | PASS | size 46079 |
| Postgres 任务状态为 succeeded | PASS | succeeded |
| Postgres 取消状态保留 | PASS | cancelled |
| 新进程从 Postgres 读到恢复后的版本 | PASS | status 200 text=IT7484-V1-TEXT versions=1,2,3 |
| 重启后未认证仍 401 | PASS | status 401 |

临时 PPTX 与进程日志留在远程 `/tmp`，不写入仓库，也不写入用户本机。
