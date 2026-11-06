/* 同批原文渲染配对：30 条模型原文完全不变，只比较「改前渲染」与「改后渲染」。
   改前 = _t2i/_mem_recall_20261107/ai.js.baseline；改后 = online/ai.js。
   回答两个问题：
     1) 口诀/画面/自测在属性换行时是否还能显示（原 pick 只认同一行）；
     2) 卡片自测是否还把「答：…」直接露出，以及多写的判断题/填空题/单选题是否被截掉。
   用法：node _tests/_mem_render_ab.mjs
   输出：_t2i/_mem_render_ab.json
*/
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, '..', '..');
const BASE = path.join(ROOT, '_t2i', '_mem_recall_20261107', 'ai.js.baseline');
const CUR = path.join(ROOT, 'vetquiz-web', 'online', 'ai.js');
const RAW = path.join(ROOT, '_t2i', '_finalv3_raw.json');
const OUT = path.join(ROOT, '_t2i', '_mem_render_ab.json');

function cleanOf(src) {
  const i = src.indexOf('function memStructClean(');
  const j = src.indexOf('\nfunction ', i + 10);
  return new Function(src.slice(i, j < 0 ? src.length : j) + '\nreturn memStructClean;')();
}
const cleanOld = cleanOf(fs.readFileSync(BASE, 'utf8'));
const cleanNew = cleanOf(fs.readFileSync(CUR, 'utf8'));

function pickOld(t, re) { const m = re.exec(t); return m ? String(m[1]).replace(/[【】]/g, '').trim().slice(0, 120) : ''; }
const OLD = {
  pic: (t) => pickOld(t, /(?:画面句|画面)[：:]?\s*([^\n]{4,140})/),
  acr: (t) => pickOld(t, /(?:口诀|首字连|谐音)[：:]?\s*([^\n]{2,60})/),
  quiz: (t) => pickOld(t, /(?:自测题|自测)[：:]?\s*([^\n]{4,160})/)
};
const NEW = {
  pic: (t) => pickOld(t, /(?:画面句|画面)[】\s：:]*([^【\n][^\n]{3,139})/),
  acr: (t) => pickOld(t, /(?:口诀(?!表)|首字连|谐音)[】\s：:]*([^【\n][^\n]{1,59})/),
  quiz: (t) => { let q = pickOld(t, /(?:自测题|自测)[】\s：:]*([^【\n][^\n]{3,159})/); return q ? String(q).split(/答[：:]/)[0].trim() : ''; }
};

const data = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const rows = [];
for (const r of data) {
  const raw = String(r.raw || '');
  const old = { acr: OLD.acr(raw), pic: OLD.pic(raw), quiz: OLD.quiz(raw), clean: String(cleanOld(raw)) };
  const nw = { acr: NEW.acr(raw), pic: NEW.pic(raw), quiz: NEW.quiz(raw), clean: String(cleanNew(raw)) };
  rows.push({
    tag: r.tag,
    old: { acr: old.acr, pic: old.pic, quiz: old.quiz, quizLeaks: /答[：:]/.test(old.quiz), extra: (old.clean.match(/【(?:判断题|填空题|单选题|多选题|选择题)】/g) || []).length, split: /\n\s*答：/.test(old.clean) },
    new: { acr: nw.acr, pic: nw.pic, quiz: nw.quiz, quizLeaks: /答[：:]/.test(nw.quiz), extra: (nw.clean.match(/【(?:判断题|填空题|单选题|多选题|选择题)】/g) || []).length, split: /\n\s*答：/.test(nw.clean) }
  });
}
const agg = (k) => {
  const rs = rows.map((x) => x[k]);
  return {
    n: rs.length,
    acrVisible: rs.filter((x) => x.acr && x.acr !== '表').length,
    picVisible: rs.filter((x) => x.pic).length,
    quizVisible: rs.filter((x) => x.quiz).length,
    quizLeaks: rs.filter((x) => x.quizLeaks).length,
    extraSections: rs.reduce((a, x) => a + x.extra, 0),
    selfTestSplit: rs.filter((x) => x.split).length
  };
};
const out = { at: new Date().toISOString(), n: rows.length, old: agg('old'), new: agg('new'), rows };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');

console.log('== 同批原文渲染配对（' + rows.length + ' 例）==');
console.log('  指标                改前    改后');
const line = (name, a, b, better) => {
  const ok = better === 'up' ? b >= a : b <= a;
  console.log('  ' + name.padEnd(16) + String(a).padStart(6) + String(b).padStart(8) + (ok ? '  ✅' : '  ⚠️'));
};
line('口诀可见', out.old.acrVisible, out.new.acrVisible, 'up');
line('画面可见', out.old.picVisible, out.new.picVisible, 'up');
line('自测可见', out.old.quizVisible, out.new.quizVisible, 'up');
line('自测泄答案', out.old.quizLeaks, out.new.quizLeaks, 'down');
line('多余题型段', out.old.extraSections, out.new.extraSections, 'down');
line('问/答分行', out.old.selfTestSplit, out.new.selfTestSplit, 'up');
console.log('\nSAVED ' + OUT);
