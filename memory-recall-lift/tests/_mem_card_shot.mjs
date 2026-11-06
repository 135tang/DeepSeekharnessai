/* 记忆卡改前/改后真实截图（本地 online/，同一题、同一 viewport、同一主题）。
   改前 = ai.js.baseline；改后 = online/ai.js。只替换 /ai.26128752.js 的伺服字节，磁盘产品文件不动。
   用法：node _tests/_mem_card_shot.mjs
   输出：_t2i/_mem_card_before.png · _t2i/_mem_card_after.png
*/
import fs from 'node:fs';
import path from 'node:path';
import { Server, Browser, findEdge, sleep, ONLINE } from './lib/harness.mjs';

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, '..', '..');
const BASE = path.join(ROOT, '_t2i', '_mem_recall_20261107', 'ai.js.baseline');
const RAW = path.join(ROOT, '_t2i', '_mem_recall_20261107', '_finalv3_raw.baseline.json');
const sample = JSON.parse(fs.readFileSync(RAW, 'utf8')).find((x) => x.tag === '名解-1') || JSON.parse(fs.readFileSync(RAW, 'utf8'))[0];

const arms = [
  { name: 'before', file: BASE, out: path.join(ROOT, '_t2i', '_mem_card_before.png') },
  { name: 'after', file: path.join(ONLINE, 'ai.js'), out: path.join(ROOT, '_t2i', '_mem_card_after.png') }
];
const results = [];
for (const arm of arms) {
  const srv = new Server();
  await srv.listen();
  srv.set('/ai.26128752.js', fs.readFileSync(arm.file, 'utf8'));
  const br = await new Browser(await findEdge()).start();
  try {
    await br.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 900, deviceScaleFactor: 2, mobile: true });
    await br.navigate(srv.origin + '/?memtest=1&v=' + Date.now(), 5000);
    await sleep(3200);
    const r = await br.evaluate(`(function(){
      var q = STUDY_DATA.questions.filter(function(x){return x.type==='名解' && x.a;})[0];
      var raw = ${JSON.stringify(sample.raw)};
      var html = window.__memGate.cards(raw, q);
      document.body.innerHTML = '<div id="shot" style="padding:12px;background:#f8fafc;">'
        + '<div style="font:13px/1.5 sans-serif;color:#64748b;margin-bottom:8px;">名解-1 · 同一条模型原文 · ${arm.name === 'before' ? '改前' : '改后'}渲染</div>'
        + html + '</div>';
      return { txt: document.body.innerText.slice(0, 400), imgs: document.images.length };
    })()`);
    await sleep(400);
    await br.screenshot(arm.out);
    results.push({ arm: arm.name, out: arm.out, value: r.value, error: r.error || null });
  } finally {
    try { await br.close(); } catch (e) {}
    try { await srv.close(); } catch (e) {}
  }
}
console.log(JSON.stringify(results, null, 1));
