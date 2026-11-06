# 记忆讲解链路留存增强 · 交付报告（草稿）

> 日期：2026-11-07 · 基线：构建 1216（`online/index.html` 的 `__VETQUIZ_BUILD.sw`）  
> 产品文件：`vetquiz-web/online/ai.js`（唯一改动文件）  
> 本报告只写可核数字；d7 没有真实样本，就不写“达标”。

## 0. 一句话

这次改的是「记忆卡真的能先测后看、口诀/画面不再因属性换行而丢失、d7 主复习路径能上报」。
冻结 14 项编码判据保持不回退；**d7 本身仍需真实 7 天样本，本文不伪造、不把探针当 d7**。

## 1. 改了什么（只改记忆讲解链路）

| # | 位置 | 改动 | 为什么 |
|---|---|---|---|
| 1 | `mem4CardsHtml` | `pick` 正则支持 `【口诀】\n…` / `【画面】\n…` 这种属性换行；`口诀` 不再误抓 `口诀表`；修复 `window.UIkit` → `window.UIKit` | 改前 30 条原文里口诀只显示 0 条、画面 2 条；自测走不到 `dictationList` |
| 2 | `mem4CardsHtml` / `memStructClean` | 卡片自测只显示问句；`问：…答：…` 同一行时强制分行 | 模型原文 28/30 条 Q/A 同一行，改前卡片能提取到的 17 条全部泄答案；先测后看才是提取练习 |
| 3 | `memStructClean` | 截掉 `【答题】` 之后模型多写的 `【判断题】【填空题】【单选题】` | 产品明确不做这三类记忆卡；名解-7 曾多出 3 段、633 字 |
| 4 | 复习 dock | 判分后补发 `POST /api/metrics/recall`（通过 `window.__vetMetricsSend`），本地日志加 `checkpoint` | dock 是 d7 主入口，原来只写 localStorage，跨用户报表永远 0 条 |
| 5 | 复习 dock | 默写提示从“先默写 3 个关键词”改为“默写完整要点” | 原提示把 `writeCov` 上限压在 3 个词，和 ≥0.6 的验收相反 |

不改：RAG 检索层、UI 视觉（无样式/布局改动）、计划算法、判断/填空/单选记忆卡、验收阈值。
不新增固定数组/池子，不放宽任何判据。

## 2. 同批原文配对实验（30 条模型原文完全不变）

脚本：`tests/_mem_render_ab.mjs`；数据：`evidence/render_ab.json`。
改前 = `_t2i/_mem_recall_20261107/ai.js.baseline`；改后 = 当前 `online/ai.js`。

| 指标 | 改前 | 改后 |
|---|---:|---:|
| 口诀可见 | 0/30 | **30/30** |
| 画面可见 | 2/30 | **30/30** |
| 自测可见 | 17/30 | **30/30** |
| 自测泄答案 | 17/30 | **0/30** |
| 多余题型段 | 6 段 | **0 段** |
| 问/答分行 | 4/30 | **30/30** |

结论：同一批原文下，改后卡片从“只有一条错误口诀”变成“口诀 + 画面 + 闭卷自测”三块都能显示；
答案泄漏和多写题型段归零。这不是抽样波动，是渲染路径的确定性差异。

## 3. 30 例终验（冻结 14 项）

```
== 终验 v3（30 例，含重试）==
  1 六段通过                  30/30   ≥27       ✅
  2 渲染覆盖                  30/30   ≥27       ✅
  3 独特性                   30/30   ≥24       ✅
  4 感官≥2类                 28/30   ≥24       ✅
  5 感官≥3类                 17/30   参考        ✅
  6 位置覆盖                  30/30   =30       ✅
  7 平均长度                    402   ≤420      ✅
  8 术语命中                   100%   100%      ✅
  9 字符串重复率                   2%   ≤20%      ✅
  10 每行修饰片段                 2.1   1.6-2.2   ✅
  11 格式遵从                  100%   ≥95%      ✅
  12 额外废话                     0   0         ✅
  13 倍数型占比                  10%   ≤30%      ✅
  14 修饰词重合度                  5%   ≤20%      ✅
  14b 单题单一句式               0/30   参考        ✅
  15 口诀虚词收尾                0/30   0         ✅
  通过 14/14（第 5 项为参考不计）· 总调用 38 次（1.27/题）
  ★ 14/14 全过
```

数据：`evidence/finalv3_raw.json`（30 条原文，构建 1216 基线）· 汇总：`evidence/finalv3_summary.txt`。
判据脚本未改阈值；仍是 `_tests/_mem_final_v3.mjs` 的 14 项。
本次补丁没有改 `MEM_STRUCT_SYS` / `memStructParse` / `memEnhanceLoci` 的评测路径，所以用同一 30 例缓存 `REUSE=1` 复算仍是 14/14。
2026-11-07 02:11 另外启动过一次 30 例新采样，但单次调用长挂起超过 5 分钟，已停止；交付的 30 例 JSON 是构建 1216 基线缓存，不冒充“新采样”。

## 4. d7 / readMs / writeCov

### d7（验收 #2）

- 线上读数：`/api/metrics/report?checkpoint=d7` 两条队列都是 **0 条**；`evidence/d7_readout.json`。
- 原因不是“没测”，是：d7 需要用户 **7 天后**回来默写；新卡 11-04 上线，最早的真实 d7 在 11-11 之后；
  且 dock 主路径此前不上报，已在本次修复。
- **本 PR 不声称 d7 ≥70%**；没有 30 条真实样本就是没有。

### readMs / writeCov（验收 #3/#4）

- 两者由 `vet_review_log_v1` 在用户判分时写入；当前没有导出的真实用户日志，无法算中位数。
- 本次把 dock 的 `writeCov` 提示改为“完整要点”，并在日志里保留 `readMs`/`writeCov`/`checkpoint` 字段。
- 读数工具：`tests/_mem_retention_readout.mjs`（输入导出的 JSON，输出 d7/readMs/writeCov 的 n、中位数、判定）。

## 5. 5 条人工抽读（验收 #5）

- 文件：`evidence/human_read_5.md`。
- 选择：名解-1 / 名解-7 / 名解-15 / 解答-1 / 解答-7（覆盖名解与解答）。
- 每条已遮住 `（=术语）`，只给口诀 + 画面 + 自测问句；“人工确认（能/不能）”栏留空。
- **Agent 不替人打分**；≥4/5 的结论必须由人填。

## 6. 验收状态（诚实版）

| # | 验收 | 状态 |
|---|---|---|
| 1 | 记忆卡冻结 14 项不低于 14/14 | ✅ 30/30 六段通过、14/14（构建 1216 的 30 例缓存 + 当前代码 `REUSE=1` 复算） |
| 2 | d7 样本 ≥30 时通过率 ≥70% | ⏸ **0 条真实 d7**；遥测已修，需部署后等 11-11 之后 |
| 3 | readMs 中位数 ≤6 分钟/题 | ⏸ 无导出真实日志；字段已记录 |
| 4 | writeCov 中位数 ≥0.6 | ⏸ 无导出真实日志；提示已改 |
| 5 | 人工抽 5 条 ≥4/5 | ⏸ 5 条已备，人工栏待填 |
| 6 | 不新增固定数组/池子/放宽阈值 | ✅ 见补丁；无新增数组，未改 `_mem_final_v3.mjs` 阈值 |

## 7. 本地探针与门禁

- `tests/_mem_retention_probe.mjs`：**10/10** 通过（本地 `online/`，非线上）。
  覆盖：口诀可见、画面可见、自测不泄答案、多余段截断、问/答分行、dock 挂载、metrics POST、checkpoint=d7、pass=true、qid 匹配。
  数据：`evidence/retention_probe.json`。
- `node build/ui_gate.mjs --strict`：**全部在预算内**（无新增 UI 计数）。
- `node build/matrix_freeze_gate.mjs`：❌ **本次改动前就已失败**——`chain_narrator` 指纹在 2026-11-07 01:51 被 `_fix_vetquiz_brain.mjs` 改过，`build/matrix_freeze.json` 未同步；
  与本补丁无关（本补丁没碰 `SYS_CHAIN`）。因此完整 `online_build.mjs` 会被该锁拦截；需要单独决定是否同步该指纹。
- 改后/改前同题截图：`evidence/before.png` / `evidence/after.png`（430×900，同一主题、同一模型原文）。

## 8. 回滚

见 `ROLLBACK.md`。最短命令：

```bash
cp -p "/mnt/d/桌面/模型/_t2i/_mem_recall_20261107/ai.js.baseline" \
      "/mnt/d/桌面/模型/vetquiz-web/online/ai.js"
```

## 9. 证据清单

| 文件 | 内容 |
|---|---|
| `evidence/render_ab.json` | 30 条同批原文的改前/改后渲染配对 |
| `evidence/finalv3_raw.json` | 30 例终验原文 |
| `evidence/finalv3_summary.txt` | 14 项机检结果 |
| `evidence/retention_probe.json` | 本地浏览器探针 10 项 |
| `evidence/d7_readout.json` | 线上 d7 读数（0 条） |
| `evidence/human_read_5.md` | 5 条人工抽读（待确认） |
| `evidence/before.png` / `after.png` | 同一题、同一 viewport 的真实卡片截图 |
| `tests/` | 新增测试（可拷回 `vetquiz-web/_tests/`） |
| `ai-js.patch` | 唯一产品改动补丁 |
