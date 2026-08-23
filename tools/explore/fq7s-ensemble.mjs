// FQ-7-SUN S5 — the ensemble average of the twin-extraction members.
//
// Three 10-body twins at different t0 epochs (1800/400 yr interior,
// 1850/200 yr, 1950/200 yr), each extracted on the deep catalog with
// family absorbers at 0.02″ member cutoff. IC-realization phase noise
// averages toward zero across members; systematic (physical) content
// survives. Missing rows count as zero (shrinkage on noise rows —
// intended). The 0.05″ ship cutoff applies AFTER averaging. Pure
// derivation — JPL untouched.
//
// Usage: node tools/explore/fq7s-ensemble.mjs

import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
const HERE = fileURLToPath(new URL('.', import.meta.url));

const MEMBERS = ['fq7s-m1800.local.json', 'fq7s-m1850.local.json', 'fq7s-m1950.local.json'];
const acc = new Map();
for (const f of MEMBERS) {
  const t = JSON.parse(readFileSync(HERE + f, 'utf8'));
  for (const r of t.terms) {
    const key = r.kl.join(',') + '|' + r.kM.join(',');
    const e = acc.get(key) || { kl: r.kl, kM: r.kM, name: r.name, cos: 0, sin: 0, n: 0 };
    e.cos += r.cos; e.sin += r.sin; e.n++;
    acc.set(key, e);
  }
}
const M = MEMBERS.length;
const terms = [];
for (const e of acc.values()) {
  const cos = e.cos / M, sin = e.sin / M;
  const amp = Math.hypot(cos, sin);
  if (amp >= 0.05) terms.push({ name: e.name, kl: e.kl, kM: e.kM, cos: +cos.toFixed(4), sin: +sin.toFixed(4), amp, presentIn: e.n });
}
terms.sort((a, b) => b.amp - a.amp);
console.log(`ensemble: ${terms.length} terms ≥ 0.05″ (members ${MEMBERS.length}); leaders:`);
for (const t of terms.slice(0, 12)) console.log(`  ${t.name.padEnd(14)} ${t.amp.toFixed(3)}″  (${t.presentIn}/${M})`);
const spread = terms.filter((t) => t.presentIn < M).length;
console.log(`rows not present in all members: ${spread}`);
writeFileSync(HERE + 'fq7s-ensemble-table.local.json', JSON.stringify({
  members: MEMBERS, pass2Rms: 0, terms,
}, null, 1));
console.log('wrote tools/explore/fq7s-ensemble-table.local.json');
