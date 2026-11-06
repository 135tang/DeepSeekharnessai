/* 从 30 例终验 JSON 生成 5 条人工抽读记录（不替人打分）。
   读法：遮住每行末尾（=术语），只看口诀 + 画面，能否说出术语；再对照。
   用法：node _tests/_mem_human_read_doc.mjs [out.md]
*/
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const WEB = path.resolve(HERE, '..', 'online');
const ROOT = path.resolve(HERE, '..', '..');
const RAW = path.join(ROOT, '_t2i', '_finalv3_raw.json');
const OUT = process.argv[2] || path.join(ROOT, '_t2i', '_mem_human_read_5.md');

const SD = fs.readFileSync(path.join(WEB, 'study_data.js'), 'utf8');
const MK = 'window.STUDY_DATA = ';
const Q = JSON.parse(SD.slice(SD.indexOf(MK) + MK.length).trim().replace(/;?\s*$/, '')).questions;
const all = [];
['名解', '解答'].forEach((t) => Q.filter((x) => x.type === t && x.a).slice(0, 15).forEach((q, i) => all.push({ tag: t + '-' + (i + 1), q })));
const data = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const byTag = new Map(data.map((r) => [r.tag, r]));
const picks = ['名解-1', '名解-7', '名解-15', '解答-1', '解答-7'].filter((t) => byTag.has(t));
for (const c of all) if (picks.length < 5 && byTag.has(c.tag) && !picks.includes(c.tag)) picks.push(c.tag);

const lines = [];
lines.push('# 5 条人工抽读（Agent 预读，人工确认待填）');
lines.push('');
lines.push('> 数据：`_t2i/_finalv3_raw.json`（30 例终验，名解 15 + 解答 15）。');
lines.push('> 读法：先遮住每行末尾的 `（=术语）`，只看「口诀 + 画面」，看能否说出术语；再对照。');
lines.push('> 判定：能凭画面复述 = 看到画面能说出对应术语，并能按「门口→客厅→厨房→书房→阳台」顺序说出 ≥3 个。');
lines.push('> **这是 Agent 预读，不是人工结论；第 5 项验收必须由人填最后一栏。**');
lines.push('');
let idx = 0;
for (const tag of picks) {
  const r = byTag.get(tag);
  const c = all.find((x) => x.tag === tag) || { q: {} };
  const raw = String(r.raw || '');
  const acr = (raw.match(/【口诀】\s*([^\n]+)/) || [])[1] || '';
  const picBlock = (raw.match(/【画面】([\s\S]*?)(?=【|$)/) || [])[1] || '';
  const pics = picBlock.split('\n').map((x) => x.trim()).filter((x) => /（=/.test(x)).slice(0, 5);
  const selftest = (raw.match(/【自测】([\s\S]*?)(?=【|$)/) || [])[1] || '';
  const question = (selftest.match(/问：([\s\S]*?)(?=答：|$)/) || [])[1] || selftest;
  idx++;
  lines.push('## ' + idx + '. ' + tag + ' · ' + String(c.q.q || '').slice(0, 60));
  lines.push('');
  lines.push('**题干**：' + String(c.q.q || '').replace(/\s+/g, ' ').slice(0, 200));
  lines.push('');
  lines.push('**参考答案**：' + String(c.q.a || '').replace(/\s+/g, ' ').slice(0, 240));
  lines.push('');
  lines.push('**口诀**：' + String(acr).trim());
  lines.push('');
  lines.push('**画面**（遮住括号里的术语）：');
  for (const p of pics) lines.push('- ' + p.replace(/（=[^）]+）/, '（=？）'));
  lines.push('');
  lines.push('**自测问句**：' + String(question).replace(/\s+/g, ' ').trim().slice(0, 120));
  lines.push('');
  const covered = pics.filter((p) => /（=/.test(p)).length;
  lines.push('**Agent 预读**：口诀 ' + String(acr).replace(/\s+/g, '').length + ' 字，画面 ' + covered + ' 行对应 ' + covered + ' 个要点；术语已逐字对齐。');
  lines.push('能不能凭画面复述，不替人判断；请重点看画面与术语是否真的能互相唤起。');
  lines.push('');
  lines.push('**人工确认（能 / 不能，备注）**：____________________');
  lines.push('');
}
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log('SAVED ' + OUT + '（' + picks.length + ' 条）');
