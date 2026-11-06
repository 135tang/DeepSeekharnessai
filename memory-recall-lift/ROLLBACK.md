# 回滚命令（记忆讲解链路补丁）

本补丁只改一个产品文件：`vetquiz-web/online/ai.js`；新增三个测试文件。没有数据库、没有远端、没有自动合并。

## 1. 恢复产品文件

```bash
cp -p "/mnt/d/桌面/模型/_t2i/_mem_recall_20261107/ai.js.baseline" \
      "/mnt/d/桌面/模型/vetquiz-web/online/ai.js"
```

基线副本的 SHA256（本次生成时核对）：

```bash
sha256sum "/mnt/d/桌面/模型/_t2i/_mem_recall_20261107/ai.js.baseline"
```

## 2. 如果已经跑过构建 / 部署

本项目没有 git；构建会改 `dist/` 与 `online/ai.<hash>.js`。构建前先备份：

```bash
cp -a "/mnt/d/桌面/模型/vetquiz-web/dist" "/mnt/d/桌面/模型/vetquiz-web/dist.before_mem_recall_$(date +%Y%m%d%H%M)"
```

回滚构建产物：

```bash
rm -rf "/mnt/d/桌面/模型/vetquiz-web/dist"
mv "/mnt/d/桌面/模型/vetquiz-web/dist.before_mem_recall_YYYYmmddHHMM" \
   "/mnt/d/桌面/模型/vetquiz-web/dist"
```

如果已经部署到 Cloudflare Pages，重新部署回滚后的 `dist/`（需要人工执行，不在本 ticket 内自动执行）。

## 3. 删除本次新增测试（可选）

```bash
rm -f "/mnt/d/桌面/模型/vetquiz-web/_tests/_mem_render_ab.mjs" \
      "/mnt/d/桌面/模型/vetquiz-web/_tests/_mem_retention_probe.mjs" \
      "/mnt/d/桌面/模型/vetquiz-web/_tests/_mem_human_read_doc.mjs"
```

## 4. 清理本地测试数据（浏览器控制台，可选）

```js
localStorage.removeItem('vet_metrics_queue_v1');
localStorage.removeItem('vet_review_log_v1');
```

## 5. 验证回滚

```bash
cd "/mnt/d/桌面/模型/vetquiz-web"
node --check online/ai.js
node _tests/_mem_final_v3.mjs   # REUSE=1 可复用缓存；新采样才走 API
```

回滚后 `ai.js` 应回到 2026-11-07 01:51 的 708189 字节基线（`ai.js.baseline`）。
