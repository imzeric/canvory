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
- Penpot UI：`http://localhost:9002`
- `PENPOT_FLAGS` 含 **`enable-plugins-runtime`**

## 插件一键安装

1. 托管插件静态资源（如 `pnpm --filter @canvory/penpot-plugin build` 后起静态站）。
2. 将 `manifest.json` 暴露为 HTTPS（或本机 HTTP 开发）。
3. 安装链接：`http://localhost:9002/#?plugin=<manifest-url>`

## CORS / HTTPS

- 生产：Penpot 与插件同域或配置 CORS。
- `PENPOT_PUBLIC_URI` 指向对外可达地址。
- `manifest.json` 短缓存。

## 验收清单

- [ ] 可登录 Penpot
- [ ] plugins runtime 已开启
- [ ] 可安装 Canvory PPTX 插件
- [ ] 插件可读取画板并触发导出

## 注意

不 fork Penpot 前端源码（宪法 / 规格假设）。
Penpot 需要独立 Postgres 库 `penpot`（见 `init-penpot-db.sql`；若卷已初始化需手动 `CREATE DATABASE penpot`）。
