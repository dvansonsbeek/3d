#!/usr/bin/env node
// THE BEAT CORRESPONDENCES WITH A NULL — the numerology control (item 3).
//
// The lattice's surviving perihelion/node evidence is that certain BEATS of the
// secular frequencies fall on 8H/N (doc 108: g3 − g5 = 95.3 kyr vs 8H/28 = 95.8).
// The question is not "does a beat match" but "how often would it match by
// chance". This script takes the model's own secular frequencies (the NAFF mode
// table from the N-body), forms every beat |fᵢ ± fⱼ| of the leading g's and s's,
// counts those whose period lies within a tolerance of some 8H/N (integer N in
// [1, NMAX]), and compares the count with the same procedure on random frequency
// sets drawn uniformly in the same band. Output: the observed count, the null
// distribution (mean, sd, p-value), and the list of matched beats.
//
// Tolerance: relative |P − 8H/N| / P ≤ TOL. With N up to NMAX the lattice's grid
// is dense at short periods, so matches at high N are cheap — the null accounts
// for that automatically because the random sets face the same grid.
//
// MEASURED (1-Myr WH mode tables, 2 terms per planet, 20 distinct frequencies):
//   FIRST VERSION (ecliptic-frame s's incl. the ≈0 libration artefacts, log-uniform null):
//     316/650 beats matched at 1 %, null 147 ± 51, P = 0.0008 — a false positive: the ≈0
//     "frequencies" make X±0 count twice for every X, and a log-uniform null lacks the
//     clustering of real g/s sets.
//   CORRECTED (|f| ≥ 0.3 ″/yr; null A = ±7 % jitter of the real set):
//     1 % rule, N ≤ 100: 208/380 matched, null A 197.3 ± 7.1 (z 1.5, P 0.075), null B 162 ± 30
//     0.5 % rule, N ≤ 70: 88/380 matched,  null A 93.0 ± 7.5 (z −0.7, P 0.79)
//   FINAL (physical s's from the invariable-plane table, 24 frequencies):
//     1 % rule, N ≤ 100: 265/552 matched, null A 260.2 ± 8.3 (z 0.6, P 0.27)
//     0.5 % rule, N ≤ 70: 123/552 matched, null A 125.4 ± 8.5 (z −0.3, P 0.62)
//   VERDICT: the beat correspondences of the model's own secular frequencies with 8H/N are
//   at the level a random-but-similar frequency set produces. The specific beats doc 108
//   names (g3 − g5 = 8H/28 etc.) are members of a population in which ~half of all beats
//   land within 1 % of some 8H/N by construction of the grid. Numerology control: negative.
//
//   node tools/explore/lattice-beat-null-test.mjs [modes=…naff-modes-ecliptic-1000000-gr.local.json] [smodes=…naff-modes-invariable-1000000.local.json|0] [tol=0.01] [nmax=100] [trials=20000] [terms=2] [fmin=0.3] [jitter=0.07]

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TL = createRequire(ROOT + 'package.json')(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const MODES = JSON.parse(readFileSync(KV.modes || ROOT + 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json', 'utf8'));
// the s-frequencies must come from the INVARIABLE-plane readout (in the J2000
// ecliptic the outer nodes librate and read ≈ 0 — artefacts, not frequencies)
const MODES_S = KV.smodes === '0' ? MODES : JSON.parse(readFileSync(KV.smodes || ROOT + 'tools/explore/naff-modes-invariable-1000000.local.json', 'utf8'));
const TOL = parseFloat(KV.tol || '0.01'), NMAX = parseInt(KV.nmax || '100', 10), TRIALS = parseInt(KV.trials || '20000', 10), TERMS = parseInt(KV.terms || '2', 10);
const FMIN = parseFloat(KV.fmin || '0.3');   // ″/yr: below this a "frequency" is unresolved at 1 Myr (resolution 0.36) — dropped
const JITTER = parseFloat(KV.jitter || '0.07');   // structure-preserving null: each real frequency × (1 ± U(0, JITTER))
const H = TL.H, R2D = 180 / Math.PI;

// leading TERMS frequencies of z (ecliptic table) and ζ (invariable table) per planet, ″/yr
const freqs = [];
for (const [k, m] of Object.entries(MODES.modes)) m.z.slice(0, TERMS).forEach((f, i) => freqs.push({ name: `${k}.g${i + 1}`, f: f.omegaRadPerYr * R2D * 3600 }));
for (const [k, m] of Object.entries(MODES_S.modes)) m.zeta.slice(0, TERMS).forEach((f, i) => freqs.push({ name: `${k}.s${i + 1}`, f: f.omegaRadPerYr * R2D * 3600 }));
// drop unresolved/near-zero entries, then dedupe near-equal frequencies (the same mode seen from several planets) at 1 %
const uniq = [];
for (const q of freqs) if (Math.abs(q.f) >= FMIN && !uniq.some((u) => Math.abs(u.f - q.f) <= 0.01 * Math.abs(u.f))) uniq.push(q);
const fmin = Math.min(...uniq.map((u) => Math.abs(u.f))), fmax = Math.max(...uniq.map((u) => Math.abs(u.f)));
console.log(`${uniq.length} distinct secular frequencies from the model's own N-body (${MODES.source.replace(/.*\//, '')}): ` + uniq.map((u) => `${u.name} ${u.f.toFixed(3)}`).join(' · '));

const beats = (F) => { const out = []; for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) { const d = Math.abs(F[i] - F[j]), s = Math.abs(F[i] + F[j]); if (d > 1e-6) out.push({ i, j, sign: '−', f: d }); out.push({ i, j, sign: '+', f: s }); } return out; };
const matchLattice = (fArcsecPerYr) => { const P = 1296000 / fArcsecPerYr; const N = Math.round(8 * H / P); if (N < 1 || N > NMAX) return null; const P8 = 8 * H / N; return Math.abs(P - P8) / P <= TOL ? { N, P, P8 } : null; };
const count = (F) => beats(F).filter((b) => matchLattice(b.f)).length;

const Fobs = uniq.map((u) => u.f);
const obs = count(Fobs), nBeats = beats(Fobs).length;
console.log(`\nobserved: ${obs} of ${nBeats} beats within ${(100 * TOL).toFixed(1)} % of an 8H/N (N ≤ ${NMAX})`);
for (const b of beats(Fobs)) { const m = matchLattice(b.f); if (m) console.log(`   ${uniq[b.i].name} ${b.sign} ${uniq[b.j].name}: ${b.f.toFixed(4)} ″/yr → ${m.P.toFixed(0)} yr ≈ 8H/${m.N} = ${m.P8.toFixed(0)} yr (${(100 * (m.P - m.P8) / m.P).toFixed(2)} %)`); }

// two nulls: (A) structure-preserving — each real frequency jittered by ×(1 ± U(0, JITTER)),
// keeping the clustering of real g/s sets; (B) log-uniform random sets in the same band.
const seed = 12345; let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
function nullTest(label, draw) {
  let ge = 0, sum = 0, sum2 = 0;
  for (let tr = 0; tr < TRIALS; tr++) { const c = count(draw()); sum += c; sum2 += c * c; if (c >= obs) ge++; }
  const mu = sum / TRIALS, sd = Math.sqrt(sum2 / TRIALS - mu * mu);
  console.log(`null ${label} (${TRIALS} sets of ${uniq.length}): mean ${mu.toFixed(2)} matches, sd ${sd.toFixed(2)}, z = ${((obs - mu) / sd).toFixed(2)}, P(count ≥ ${obs}) = ${(ge / TRIALS).toFixed(4)}`);
}
console.log('');
nullTest(`A, jitter ±${(100 * JITTER).toFixed(0)} % (structure-preserving)`, () => uniq.map((u) => u.f * (1 + (2 * rnd() - 1) * JITTER)));
nullTest('B, log-uniform in the band', () => uniq.map((u) => Math.sign(u.f) * Math.exp(Math.log(fmin) + rnd() * (Math.log(fmax) - Math.log(fmin)))));
console.log(`reading: null A is the fair one (same clustering, only the exact values destroyed). If its P is not small, the beat correspondences at this tolerance are what any similar frequency set produces against a dense 8H/N grid. Tighten tol= or lower nmax= to see how the verdict depends on the rule.`);
