/* 复习日志读数：把浏览器 localStorage 的 vet_review_log_v1 导出成 JSON 后，算验收三项。
   用法：
     node _tests/_mem_retention_readout.mjs path/to/vet_review_log_v1.json
   数据格式：数组，条目至少含 { gap, ok, readMs, writeCov }（dock 判分时写入）。
   输出：stdout JSON；不修改输入。
   注意：这是本地/单用户日志读数，不是跨用户 d7 报表；跨用户看 _mem_d7_readout.mjs。
*/
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('用法: node _tests/_mem_retention_readout.mjs <vet_review_log_v1.json>');
  process.exit(2);
}
const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(rows)) throw new Error('输入必须是数组');

function median(a) {
  const x = a.filter((v) => typeof v === 'number' && isFinite(v)).sort((p, q) => p - q);
  if (!x.length) return null;
  const m = Math.floor(x.length / 2);
  return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2;
}
const read = rows.map((r) => Number(r && r.readMs)).filter((v) => isFinite(v) && v > 0);
const cov = rows.map((r) => Number(r && r.writeCov)).filter((v) => isFinite(v) && v >= 0);
const d7 = rows.filter((r) => r && Number(r.gap) >= 7 && Number(r.gap) < 15 && typeof r.ok === 'boolean');
const d7pass = d7.filter((r) => r.ok).length;
const out = {
  n: rows.length,
  readMs: { n: read.length, median: median(read), unit: 'ms', target: '≤360000' },
  writeCov: { n: cov.length, median: median(cov), target: '≥0.6' },
  d7: { n: d7.length, pass: d7pass, rate: d7.length ? Math.round(d7pass / d7.length * 1000) / 10 : null, target: 'n≥30 且 rate≥70%' },
  verdict: {
    d7: d7.length < 30 ? '累计中：d7 样本 ' + d7.length + '/30' : (d7pass / d7.length >= 0.7 ? '达标' : '未达标'),
    readMs: read.length ? (median(read) <= 360000 ? '达标' : '未达标') : '无样本',
    writeCov: cov.length ? (median(cov) >= 0.6 ? '达标' : '未达标') : '无样本'
  }
};
console.log(JSON.stringify(out, null, 2));
