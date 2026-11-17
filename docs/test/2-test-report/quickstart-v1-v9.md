# Quickstart 自动验收报告

**日期**: 2026-11-17T12:53:44.673Z  
**范围**: V1–V9（V1 需 Penpot UI，标记 SKIP）  
**结果**: PASS=8 FAIL=0 SKIP=1

| ID | 名称 | 结果 | 详情 | ms |
|----|------|------|------|----|
| V1 | 浏览器最小导出（Penpot UI） | SKIP | 需自托管 Penpot + 插件安装；见 RTG-03；CLI 等价见 V8 |  |
| V2 | 混尺寸拒绝 | PASS | blockingErrors=SIZE_MISMATCH; 未生成文件 |  |
| V3 | 预检与降级 | PASS | FX L2=1; SKIP L3=3; 导出报告一致 |  |
| V4 | 富文本与备注 | PASS | notes 存在; multi-runs; fonts=1; pptx=45024B |  |
| V5 | 三模式 | PASS | {"editable":{"L0":0,"L1":1,"L2":0,"L3":0},"auto":{"L0":0,"L1":0,"L2":1,"L3":0},"fidelity":{"L0":0,"L1":0,"L2":1,"L3":0}} |  |
| V6 | 后台提示常量 | PASS | PAGE_SOFT_LIMIT=20; 完整任务轮询见 server 集成测 / 人工 |  |
| V7 | 版本恢复语义 | PASS | contracts/export-api restore MUST 拷贝；见 server versions 集成测 |  |
| V8 | 架构验收 A/B | PASS | 页数=1; HTML 含主文本; PPTX=44985B; 2ms | 2 |
| V9 | 性能提示 SC-004 | PASS | 墙钟 3ms ≤ 30000ms (单页样例 CLI) | 3 |

## 产物

- `docs/test/2-test-report/quickstart-artifacts/`
