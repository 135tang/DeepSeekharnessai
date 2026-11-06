/* 记忆卡留存链路探针（本地 online/，不依赖线上部署）
   验证三件事：
     1) 口诀/画面/自测在「属性换行」时仍能渲染（原来的 pick 只认 [：:] 后同一行）；
     2) 卡片自测只显示问句，不再把「答：…」直接露出来；
     3) 复习 dock 判分后真的会 POST /api/metrics/recall，且 d7 gap 映射为 checkpoint=d7。
   用法：node _tests/_mem_retention_probe.mjs
   输出：_t2i/_mem_retention_probe.json
*/
import fs from 'node:fs';
import path from 'node:path';
import { Server, Browser, findEdge, sleep, ONLINE } from './lib/harness.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, '_t2i', '_mem_retention_probe.json');
const rawFile = path.join(ROOT, '_t2i', '_finalv3_raw.json');
const sample = JSON.parse(fs.readFileSync(rawFile, 'utf8')).find((x) => x.tag === '名解-1') || JSON.parse(fs.readFileSync(rawFile, 'utf8'))[0];

const srv = new Server();
await srv.listen();
/* index.html 加载的是哈希副本；用源码覆盖，保证测的是当前工作区 */
srv.set('/ai.26128752.js', fs.readFileSync(path.join(ONLINE, 'ai.js'), 'utf8'));

const br = await new Browser(await findEdge()).start();
const result = { at: new Date().toISOString(), ok: false, checks: {}, detail: {} };
try {
  await br.navigate(srv.origin + '/?memtest=1&v=' + Date.now(), 5000);
  await sleep(3500);
  const boot = await br.evaluate(`(function(){
    return { gate: !!window.__memGate, mount: typeof window.memReviewMount, qs: (window.STUDY_DATA && STUDY_DATA.questions || []).length };
  })()`);
  result.detail.boot = boot.value;
  if (!boot.value || !boot.value.gate || boot.value.mount !== 'function') throw new Error('app_not_ready');

  /* ---- 1/2. 卡片渲染：口诀/画面/自测 + 不泄答案 ---- */
  const card = await br.evaluate(`(function(){
    var q = STUDY_DATA.questions.filter(function(x){return x.type==='名解' && x.a;})[0];
    var raw = ${JSON.stringify(sample.raw)};
    var html = window.__memGate.cards(raw, q);
    var box = document.createElement('div'); box.innerHTML = html;
    var quizCard = box.querySelector('.mem4-quiz');
    var selfText = quizCard ? String(quizCard.textContent||'') : '';
    var selfB = quizCard ? (quizCard.querySelector('.mem4-b') ? String(quizCard.querySelector('.mem4-b').textContent||'') : '') : '';
    var clean = window.fmtAI(raw);
    return { html: html.slice(0, 1200), selfB: selfB, selfText: selfText.slice(0, 300),
      hasAcr: /🔑 口诀/.test(html), hasPic: /🎬 画面/.test(html),
      acr: (function(){var m=html.match(/🔑 口诀<\\/div><div class="mem4-b">([^<]*)/);return m?m[1]:'';})(),
      cleanHasExtra: /【判断题】|【填空题】|【单选题】/.test(clean),
      cleanSelfSplit: /问：[^<]*<br>\\s*答：/.test(clean) || /问：[^\\n]*\\n\\s*答：/.test(clean) };
  })()`);
  result.detail.card = card.value;
  const c = card.value || {};
  result.checks.cardAcr = !!c.hasAcr && !!c.acr && c.acr.length >= 2;
  result.checks.cardPic = !!c.hasPic;
  result.checks.cardHidesAnswer = !/答[：:]/.test(String(c.selfB || ''));
  result.checks.cleanNoExtraSections = !c.cleanHasExtra;
  result.checks.selfTestAnswerSplit = !!c.cleanSelfSplit;

  /* ---- 3. dock 判分 → metrics 事件 ---- */
  const tel = await br.evaluate(`(function(){
    var cap = [];
    var oldFetch = window.fetch;
    window.fetch = function(u, o){
      try { if (String(u).indexOf('/api/metrics/recall') >= 0 && o && o.body) cap.push(JSON.parse(o.body)); } catch(e) {}
      return Promise.resolve(new Response('{"ok":true}', {status:200, headers:{'Content-Type':'application/json'}}));
    };
    var q = STUDY_DATA.questions.filter(function(x){return x.type==='名解' && x.a;})[0];
    var id = window.uidKey(q);
    var today = new Date().toISOString().slice(0,10);
    var past = new Date(Date.now() - 8*86400000).toISOString();
    localStorage.setItem('vet_review_done_v1', JSON.stringify({}));
    var rv = {}; rv[id] = { due: today, nextIndex: 1, lastRecallAt: past, source: 'ai_explain' };
    localStorage.setItem('vet_review_done_v1', JSON.stringify(rv));
    localStorage.removeItem('vet_oblig_v1');
    localStorage.removeItem('vet_review_log_v1');
    localStorage.removeItem('vet_metrics_queue_v1');
    var oldDock = document.getElementById('mem-review-dock'); if (oldDock) oldDock.remove();
    window.memReviewMount();
    var item = document.querySelector('.mem-rv-item[data-rv-id="' + id + '"]');
    if (!item) return { mounted: false, due: Object.keys(rv).length, id: id };
    var ta = item.querySelector('.mem-rv-write'); if (ta) ta.value = String(q.a || '');
    var ok = item.querySelector('.mem-rv-ok'); if (ok) ok.click();
    return { mounted: true, id: id, qid: String(q.q||'').slice(0,40), cap: cap, event: (cap.filter(function(x){return x && x.qid === id;}).pop() || null) };
  })()`);
  result.detail.telemetry = tel.value;
  const t = tel.value || {};
  const ev = t.event || ((t.cap || []).filter((x) => x && x.qid === t.id).pop()) || null;
  result.detail.event = ev;
  result.checks.dockMounted = !!t.mounted;
  result.checks.metricsPosted = !!ev;
  result.checks.checkpointD7 = !!ev && ev.checkpoint === 'd7';
  result.checks.passTrue = !!ev && ev.pass === true;
  result.checks.qidMatch = !!ev && !!t.id && ev.qid === t.id;

  result.ok = Object.values(result.checks).every(Boolean);
} catch (e) {
  result.error = String((e && e.stack) || e).slice(0, 800);
} finally {
  try { await br.close(); } catch (e) {}
  try { await srv.close(); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1), 'utf8');
  console.log(JSON.stringify(result, null, 1));
  process.exit(result.ok ? 0 : 1);
}
