This is by an automated agent, not a human.

## 交付

记忆讲解链路留存增强（draft）。本仓库不是 vetquiz 代码仓，所以 PR 以「补丁 + 同批配对 + 30 例终验 + 5 条人工抽读 + 回滚」的形式提交。

- 补丁：[`ai-js.patch`](https://github.com/135tang/DeepSeekharnessai/blob/agent/mem-recall-lift-410bb3cf29ea/memory-recall-lift/ai-js.patch)
- 报告：[`REPORT.md`](https://github.com/135tang/DeepSeekharnessai/blob/agent/mem-recall-lift-410bb3cf29ea/memory-recall-lift/REPORT.md)
- 回滚：[`ROLLBACK.md`](https://github.com/135tang/DeepSeekharnessai/blob/agent/mem-recall-lift-410bb3cf29ea/memory-recall-lift/ROLLBACK.md)

## 改了什么（只改记忆讲解链路）

- 记忆卡口诀/画面/自测支持 `【段】\n内容` 换行；修复 `window.UIkit` → `window.UIKit`，自测走 `UIKit.dictationList`（先写、判分、看答案）。
- 卡片自测只显示问句；`memStructClean` 把同一行的 `问：…答：…` 分行，并截掉 `【答题】` 后多写的判断题/填空题/单选题。
- 复习 dock 判分补发 `POST /api/metrics/recall`（d7 主入口原来只写 localStorage，跨用户永远 0 条），本地日志加 `checkpoint`。
- 复习默写提示改为“完整要点”，不再把 `writeCov` 压在 3 个词。

不改：RAG、UI 视觉、计划算法、判断/填空/单选记忆卡、验收阈值；不新增固定数组/池子。

## 验证

- 同批 30 条原文渲染配对：口诀 0→30、画面 2→30、自测可见 17→30、自测泄答案 17→0、多余题型段 6→0、问/答分行 4→30（`evidence/render_ab.json`）。
- 冻结 14 项：30/30 六段通过、14/14（构建 1216 的 30 例缓存 + 当前代码 `REUSE=1` 复算；本补丁未改评测路径，见 `evidence/finalv3_summary.txt`）。
- 本地浏览器探针 10/10（`evidence/retention_probe.json`）。
- `node build/ui_gate.mjs --strict`：全部在预算内。
- 30 例终验 JSON：`evidence/finalv3_raw.json`（构建 1216 基线缓存；本补丁不改评测路径）。

## 复现

```bash
cd /mnt/d/桌面/模型/vetquiz-web
node _tests/_mem_render_ab.mjs          # 同批 30 条原文渲染配对
node _tests/_mem_retention_probe.mjs    # 本地浏览器探针 10 项
REUSE=1 node _tests/_mem_final_v3.mjs   # 冻结 14 项（复用 30 例缓存）
node build/ui_gate.mjs --strict         # UI 纪律闸门
```

## 回滚

```bash
cp -p "/mnt/d/桌面/模型/_t2i/_mem_recall_20261107/ai.js.baseline" \
      "/mnt/d/桌面/模型/vetquiz-web/online/ai.js"
```

完整回滚（含构建产物/测试文件）：见 `ROLLBACK.md`。

## Before / After（同一题、同一模型原文、430×900）

Baseline：`ai.js` SHA256 `6f8e41af41e9…`（构建 1216）。After：本 PR 补丁。

Before：

![Before](https://raw.githubusercontent.com/135tang/DeepSeekharnessai/agent/mem-recall-lift-410bb3cf29ea/memory-recall-lift/evidence/before.png)

After：

![After](https://raw.githubusercontent.com/135tang/DeepSeekharnessai/agent/mem-recall-lift-410bb3cf29ea/memory-recall-lift/evidence/after.png)

## 未完成 / 限制（必须看）

- **d7**：线上 `/api/metrics/report?checkpoint=d7` 仍是 0 条真实样本；本 PR 不声称 ≥70%。遥测已修，需部署后等 11-11 之后才有真实 d7。
- **readMs / writeCov**：没有导出的真实用户日志，无法算中位数；字段已记录，读数工具见 `tests/_mem_retention_readout.mjs`。
- **人工 5 条**：`evidence/human_read_5.md`，人工确认栏待填；不替人打分。
- 完整 `online_build.mjs` 仍被既有 `matrix_freeze_gate` 的 `chain_narrator` 指纹不一致拦截（2026-11-07 01:51 的 `_fix_vetquiz_brain.mjs`，非本补丁）；本补丁没碰 `SYS_CHAIN`。
- 没有自动合并、没有自动部署。
