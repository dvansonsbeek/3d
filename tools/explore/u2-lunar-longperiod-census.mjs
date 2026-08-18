// THE LONG-PERIOD LUNAR CENSUS — the physical core of the "common
// source" finding (plan §12i / the unification exploration).
//
// Every ELP/MPP02 planetary-perturbation term with period > 50 yr, from
// the in-repo series (11,314 longitude T0 terms), answering "what is the
// Bond cycle in the Moon?" with the real spectrum. RESULT of the first
// run: the Moon carries the SAME planetary critical arguments the ΔT
// stack's structural annotations claim — +2J−5S (the J–S great
// inequality) at 872.5 yr / 0.151″ in the Jose window; l−15V+9T+4Ma at
// 2480 yr / 0.032″ in the Hallstatt window; the Mars-family 4T−8Ma+3J
// at 2103 yr / 0.876″ (the Moon's 2nd-largest long-period term); the
// Bond window itself holds only mas-level terms — CONSISTENT with the
// tidal-recurrence result (u2-tidal-recurrence-spectrum.mjs) that the
// Bond clock is not lunar. Amplitude hierarchy: the Moon feels these
// arguments as direct gravity (arcsec class); ΔT feels them enlarged
// ~10⁴–10⁵ through resonant amplifiers — same source, different gain.
// Meeus's truncation keeps only A1 (273 yr, 14.25″) because the next
// long-period term is 0.88″, below the series' ~1″ floor.
//
//   node tools/explore/u2-lunar-longperiod-census.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const RATES = [   // deg/day, J2000 mean motions (ELP argument order)
  12.190749117502,   // D
  13.229350240,      // F
  13.064992953,      // l  (Moon anomaly)
  0.98560028,        // l' (Sun anomaly)
  4.09233445,        // Mercury
  1.60213034,        // Venus
  0.98560911,        // EMB (T)
  0.52402068,        // Mars
  0.08308676,        // Jupiter
  0.03346063,        // Saturn
  0.01173129,        // Uranus
  0.00598103,        // Neptune
  13.17643980,       // zeta (W1 + precession)
];
const NAMES = ['D', 'F', 'l', "l'", 'Me', 'V', 'T', 'Ma', 'J', 'S', 'U', 'N', 'ζ'];

const lines = readFileSync(join(ROOT, 'data/lunar-series/elp-mpp02/elp_pert.longT0'), 'utf8')
  .split('\n').slice(1).filter((s) => s.trim());
const terms = [];
for (const line of lines) {
  const p = line.trim().split(/\s+/).map(Number);
  if (p.length < 15) continue;
  const mult = p.slice(0, 13);
  const amp = p[13];
  const rate = mult.reduce((s, m, i) => s + m * RATES[i], 0);
  const periodYr = Math.abs(rate) < 1e-12 ? Infinity : 360 / Math.abs(rate) / 365.25;
  if (periodYr < 50) continue;
  const arg = mult.map((m, i) => m ? `${m > 0 ? '+' : ''}${m}${NAMES[i]}` : '').filter(Boolean).join('');
  terms.push({ periodYr, ampArcsec: amp * 206264.806, arg });
}
terms.sort((a, b) => b.ampArcsec - a.ampArcsec);
console.log(`ELP/MPP02 longitude T0 terms with period > 50 yr: ${terms.length}`);
console.log('\ntop 25 by amplitude:  period (yr) | amp (arcsec) | argument');
for (const t of terms.slice(0, 25)) {
  console.log(`  ${t.periodYr === Infinity ? '     const' : t.periodYr.toFixed(1).padStart(9)} | ${t.ampArcsec.toFixed(4).padStart(9)} | ${t.arg}`);
}
console.log('\nΔT-stack period windows (±12%):');
for (const [name, P] of [['Bond', 1466], ['Hallstatt', 2430], ['Jose5', 897], ['Jose4', 716], ['resonator T0', 3916]]) {
  const hits = terms.filter((t) => t.periodYr !== Infinity && Math.abs(t.periodYr - P) / P < 0.12);
  console.log(`  ${name.padEnd(13)} ${String(P).padStart(5)} yr: ${hits.length} lunar terms` +
    (hits.length ? ' — ' + hits.slice(0, 4).map((h) => `${h.periodYr.toFixed(0)} yr @ ${h.ampArcsec.toFixed(4)}″ (${h.arg})`).join('; ') : ''));
}
for (const [lo, hi] of [[50, 300], [300, 1000], [1000, 5000], [5000, 1e9]]) {
  const sel = terms.filter((t) => t.periodYr >= lo && t.periodYr < hi && t.periodYr !== Infinity);
  const rss = Math.sqrt(sel.reduce((s, t) => s + t.ampArcsec ** 2, 0));
  console.log(`band ${lo}–${hi === 1e9 ? '∞' : hi} yr: ${sel.length} terms, RSS ${rss.toFixed(3)}″, max ${sel.length ? Math.max(...sel.map((t) => t.ampArcsec)).toFixed(3) : 0}″`);
}
