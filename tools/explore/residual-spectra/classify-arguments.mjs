// Plan 32 — the argument classifier for the Sun, cardinal and lunar series: is a residual line an
// integer combination of the NAMED astronomical arguments (the lunar D, M′, F; the Sun's anomaly;
// the planets' mean longitudes; the lunar node and perigee), allowing for the series' own sampling
// comb (yearly for the cardinal instants, the synodic month for eclipses, 10 days for the dense
// Sun windows)? A match within HALF the series' resolution names the line's physics; a line with no
// match is the kind the plan is looking for. Periods are the J2000 mean values (days), standard.
//   node tools/explore/residual-spectra/classify-arguments.mjs <sweep.json> [idPrefix …]

import { readFileSync } from 'node:fs';

const YEAR = 365.25;
const P = {   // mean periods, days (J2000)
  D: 29.530588853,        // the Moon's elongation (synodic month)
  Mp: 27.554549878,       // the Moon's anomaly M′ (anomalistic month)
  F: 27.212220817,        // the argument of latitude (draconic month)
  M: 365.259636,          // the Sun's anomaly (anomalistic year)
  L: 365.256363,          // the Earth's mean longitude (sidereal year)
  V: 224.70069, Ma: 686.97985, J: 4332.589, S: 10759.22,
  Om: 6798.38,            // the lunar node (retrograde)
  peri: 3232.6054,        // the lunar perigee
};
const f = Object.fromEntries(Object.entries(P).map(([k, d]) => [k, YEAR / d]));   // cycles per Julian year

/** The candidate terms per family: [label, frequency (cycles/yr)] */
function terms(family) {
  const out = [];
  const add = (label, freq) => out.push([label, Math.abs(freq)]);
  if (family === 'sun') {
    add('annual (M)', f.M); add('semi-annual (2M)', 2 * f.M);
    // the Earth–Moon barycentre terms of the Sun's geocentric longitude
    add('D (the barycentre term)', f.D); add('D − M′', f.D - f.Mp); add('D + M′', f.D + f.Mp); add('D − M', f.D - f.M); add('D + M', f.D + f.M); add('2D', 2 * f.D); add('M′', f.Mp);
    add('the lunar node Ω (nutation)', f.Om); add('2Ω', 2 * f.Om); add('the lunar perigee', f.peri);
    // planetary perturbation arguments iV − jE, iE − jMars, iE − jJ, iE − jS, and the planets' own
    for (let i = 1; i <= 8; i++) for (let j = 0; j <= 13; j++) if (i + j <= 13) add(`${i}V − ${j}E`, i * f.V - j * f.L);
    for (let i = 1; i <= 4; i++) for (let j = 1; j <= 8; j++) add(`${i}E − ${j}Mars`, i * f.L - j * f.Ma);
    for (let i = 0; i <= 3; i++) for (let j = 1; j <= 4; j++) add(`${i}E − ${j}J`, i * f.L - j * f.J);
    for (let i = 0; i <= 2; i++) for (let j = 1; j <= 3; j++) add(`${i}E − ${j}S`, i * f.L - j * f.S);
    add('J − S', f.J - f.S); add('2J − 5S (the great inequality)', 2 * f.J - 5 * f.S);
  } else if (family === 'lunar') {
    for (let a = -4; a <= 4; a++) for (let b = -3; b <= 3; b++) for (let c = -4; c <= 4; c++) {
      if (a === 0 && b === 0 && c === 0) continue;
      if (Math.abs(a) + Math.abs(b) + Math.abs(c) > 6) continue;
      const lab = [[a, 'M′'], [b, 'M'], [c, 'F']].filter(([k]) => k !== 0).map(([k, n]) => `${k === 1 ? '' : k === -1 ? '−' : k}${n}`).join(' + ').replace(/\+ −/g, '− ');
      add(lab, a * f.Mp + b * f.M + c * f.F);
    }
    add('the lunar node Ω', f.Om); add('the lunar perigee', f.peri);
    for (let i = 1; i <= 5; i++) for (let j = 1; j <= 8; j++) add(`${i}V − ${j}E`, i * f.V - j * f.L);
    add('E − J', f.L - f.J); add('2E − 2J', 2 * (f.L - f.J));
  }
  return out;
}

/** The best matches of a line against a family's terms, each term's frequency reduced by the
 *  sampling comb(s) (integer multiples of `combs[i]` cycles/yr added or removed). */
function match(fLine, family, combs, tol) {
  const hits = [];
  for (const [label, ft] of terms(family)) {
    const tryF = (fr, note) => { const d = Math.abs(fr - fLine); if (d <= tol) hits.push({ d, label: `${label}${note}`, period: 1 / fr }); };
    tryF(ft, '');
    for (const [cName, fc] of combs) {
      const n = Math.round(ft / fc);
      for (const k of [n - 1, n, n + 1]) { if (k === 0) continue; tryF(Math.abs(ft - k * fc), ` (aliased by ${cName}, ${k}×)`); }
    }
    // two combs at once (eclipses: the synodic month, then the eclipse season)
    if (combs.length === 2) {
      const [, f1] = combs[0], [n2, f2] = combs[1];
      const k1 = Math.round(ft / f1);
      for (const a of [k1 - 1, k1, k1 + 1]) { const r = Math.abs(ft - a * f1); const k2 = Math.round(r / f2); for (const b of [k2 - 1, k2, k2 + 1]) if (b !== 0) tryF(Math.abs(r - b * f2), ` (aliased by the synodic month ${a}× and ${n2} ${b}×)`); }
    }
  }
  hits.sort((x, y) => x.d - y.d);
  // one entry per distinct label stem
  const seen = new Set(), out = [];
  for (const h of hits) { const stem = h.label.split(' (aliased')[0]; if (seen.has(stem)) continue; seen.add(stem); out.push(h); if (out.length >= 3) break; }
  return out;
}

const sweep = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const only = process.argv.slice(3);
for (const [id, r] of Object.entries(sweep)) {
  if (only.length && !only.some((p) => id.startsWith(p))) continue;
  const a = r.analysis;
  let family = null, combs = [];
  if (id.startsWith('cardinal')) { family = 'sun'; combs = [['the yearly sampling', 1 / (365.2422 / YEAR)]]; }
  else if (id.startsWith('sun-horizons-yearly')) { family = 'sun'; combs = [['the yearly means', 1]]; }
  else if (id.startsWith('sun-horizons')) { family = 'sun'; combs = [['the 10-d sampling', YEAR / 10]]; }
  else if (id.startsWith('lunar')) { family = 'lunar'; combs = [['the synodic month', f.D], ['the eclipse season', 2 * (f.F - f.D)]]; }
  if (!family) continue;
  const tol = 0.5 / a.span;
  console.log(`\n== ${id}  (span ${a.span.toFixed(0)} yr, tolerance ${(tol).toExponential(2)} /yr)`);
  const list = a.candidates.length ? a.candidates : a.peaks;
  for (const c of list.slice(0, 14)) {
    const longFamily = c.period > a.span / 6;
    const hits = longFamily ? [] : match(c.f, family, combs, tol);
    const what = longFamily ? `a long-period family at the span's scale (${(a.span / c.period).toFixed(2)} cycles) — a smooth curvature's Fourier terms, not a line` : hits.length ? hits.map((h) => `${h.label} → ${h.period.toFixed(4)} yr`).join(' | ') : '— NO named argument within the tolerance';
    console.log(`   ${c.period.toFixed(4).padStart(10)} yr  amp ${c.amplitude.toFixed(3).padStart(7)} ${r.meta.unit.split(' ')[0]}  ${c.standsInBothHalves && c.standsInInterior ? 'stands' : 'unstable'}  ${what}`);
  }
}
