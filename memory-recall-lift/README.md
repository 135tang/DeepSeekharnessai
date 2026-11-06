# memory-recall-lift · 记忆讲解链路留存增强（草稿）

本目录是 GitHub issue #4 的交付包。**本仓库（135tang/DeepSeekharnessai）只有 README，不是 vetquiz 代码仓**；因此 PR 以补丁 + 证据的形式提交，产品文件在本地 `vetquiz-web` 工作区已改动。

- `ai-js.patch`：唯一的产线代码改动（`vetquiz-web/online/ai.js`，约 40 行）
- `REPORT.md`：改动、配对实验、30 例终验、d7/readMs/writeCov 读数、验收状态
- `ROLLBACK.md`：回滚命令
- `evidence/render_ab.json`：同批 30 条原文的「改前 vs 改后」渲染配对
- `evidence/finalv3_raw.json`：30 例终验 JSON
- `evidence/finalv3_summary.txt`：14 项机检结果
- `evidence/retention_probe.json`：本地浏览器探针（卡片 + d7 遥测）
- `evidence/d7_readout.json`：线上 d7 读数（当前 0 条）
- `evidence/human_read_5.md`：5 条人工抽读（Agent 预读，人工确认待填）
- `tests/`：本次新增的测试脚本（可拷回 `vetquiz-web/_tests/` 运行）

## 应用补丁

```bash
cd /mnt/d/桌面/模型/vetquiz-web
patch -p1 < /path/to/memory-recall-lift/ai-js.patch
node --check online/ai.js
node _tests/_mem_render_ab.mjs
```

补丁只改 `online/ai.js`；不新增固定数组/池子，不改验收阈值，不改 RAG/UI 视觉/计划算法/判断填空单选记忆卡。

## 状态

- 记忆卡冻结 14 项：见 `evidence/finalv3_summary.txt`
- d7 / readMs / writeCov：**没有真实样本，不能声称达标**；详见 `REPORT.md`
- 人工 5 条：已准备，结论待人工
- 没有自动合并、没有自动部署
