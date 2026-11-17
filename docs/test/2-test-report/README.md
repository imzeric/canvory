# Test Report — 测试报告归档

本目录存放单次测试执行的详细报告。`0-tested.md` / `1-defect.md` 仅保留索引。

## 命名约定

```text
YYYYMMDD-<用例或批次ID>-<简短描述>.md
```

示例：

- `20261117-AT-A-cdm-dual-output.md`
- `20261120-QA-PPTX-04-compat-matrix.md`

## 报告最小结构

1. 元信息：日期、执行人、环境、构建/提交  
2. 范围：覆盖用例列表  
3. 结果摘要：通过 / 失败 / 跳过  
4. 详细步骤与证据（截图、文件路径、日志）  
5. 结论与后续（缺陷 ID、是否可发布）

## 当前归档

2026-11-17 远程记录在本目录：`remote-acceptance-7484.md`（浏览器三页内容与脚本 V1 分开）、`sc009-evidence.md`、`quickstart-v1-v9.md`（脚本 PASS 8 / SKIP 1）、`rm03-infra.md`、`sc003-measure.md`（SKIP）、`compat-matrix.md`（四软件未验证）、`sc008-usability.md`（样本 0）。
