# Penpot 自托管接入（T015a / RTG-03）

## 锁定版本

| 组件 | 镜像 |
|------|------|
| frontend | `penpotapp/frontend:2.4.3` |
| backend | `penpotapp/backend:2.4.3` |
| exporter | `penpotapp/exporter:2.4.3` |

## 启动

```bash
cd infrastructure/docker
docker compose -f docker-compose.yml -f docker-compose.penpot.yml up -d
```

- Canvory 基建：Postgres `:5432`、Redis `:6379`、MinIO `:9000`/`:9001`
- Penpot UI：`http://localhost:9002`（容器内前端监听 **8080**）
- `PENPOT_FLAGS` 含 **`enable-feature-plugins`**（插件管理器开关；写在 frontend 与 backend）。另含注册、密码登录、关闭邮件验证，便于本地验收。

## 插件一键安装

1. `pnpm --filter @canvory/penpot-plugin build` 后托管 `dist/`（含 `manifest.json`、`plugin.js`、`index.html`）。
2. 本地示例：`pnpm --filter @canvory/penpot-plugin exec vite preview --host 127.0.0.1 --port 4400`。
3. 在设计文件编辑器内用插件管理器（Ctrl+Alt+P）安装：`http://127.0.0.1:4400/manifest.json`。
   也可试：`http://localhost:9002/#?plugin=http://127.0.0.1:4400/manifest.json`。

若整份 compose 因 `minio/minio` 镜像被拒绝而失败，可只启动 Penpot 所需服务：

```bash
docker compose -f docker-compose.yml -f docker-compose.penpot.yml up -d postgres redis penpot-frontend penpot-backend penpot-exporter
```

## CORS / HTTPS

- 生产：Penpot 与插件同域或配置 CORS。
- `PENPOT_PUBLIC_URI` 指向对外可达地址。
- `manifest.json` 短缓存。

## 验收清单

- [ ] 可登录 Penpot
- [ ] `enable-feature-plugins` 已开启（插件管理器可用）
- [ ] 可安装 Canvory PPTX 插件
- [ ] 插件可读取画板并触发导出

## 注意

不 fork Penpot 前端源码（宪法 / 规格假设）。
Penpot 需要独立 Postgres 库 `penpot`（见 `init-penpot-db.sql`；若卷已初始化需手动 `CREATE DATABASE penpot`）。
