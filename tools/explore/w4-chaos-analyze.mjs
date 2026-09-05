#!/usr/bin/env node
// W4 — THE CHAOS CONFOUND, STAGE 2: beat-spread analysis (plan 04 §4).
//
// Reads the clone ensemble (w4-chaos-ensemble.mjs) and NAFFs each clone
// (shelling the unchanged naff-frequencies.mjs), then measures how far the
// g-beats — g₂−g₅ (the 405-kyr ruler) above all — spread across clones
// whose only difference is a ~0.6-km kick on Mercury. Absolute frequency
// biases (integrator step, window) are SHARED across clones and cancel in
// the spread; the spread is pure chaotic divergence.
//
// Extrapolation: clones diverge exponentially on the Lyapunov time
// (~5 Myr) until the chaotic-zone width saturates, so a 4-Myr spread is a
// LOWER estimate of the asymptotic width; the honest 2.5-Gyr statement
// combines (a) the measured clone spread, diffusively stretched
// √(T/span), (b) the literature's saturation ranges (Laskar 2004/2011;
// Zeebe & Lantink 2024 σ₁₂; Spalding 2018's %-level-over-Gyr), and
// (c) THE ROCK'S OWN CHAOS DIAGNOSTICS at 2.46 Ga (Lantink 2022 Table-1
// internal ratios, μ-independent): g₂−g₁ 643 vs 688 kyr today (g₁ drifted
// ~6 %), g₁−g₅ 982 vs 978 (0.4 %), g₄−g₃ broken by the resonance
// transition — measured drifts to condition the g₂−g₅ estimate on.
//
//   node tools/explore/w4-chaos-analyze.mjs [clones=6] [terms=8]

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
createRequire(ROOT + 'package.json');

const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const CLONES = parseInt(KV.clones || '6', 10);
const TERMS = KV.terms || '8';
const ARCSEC_PER_RAD = 648000 / Math.PI;
// Laskar 2004 Table 3 — reference labels only.
const LG = { g1: 5.5965, g2: 7.4555, g3: 17.3711, g4: 17.9159, g5: 4.2575 };

const lead = (modes, ref) => {
  // the mode nearest the reference frequency (clone mode tables list by amplitude)
  let best = null;
  for (const m of modes) { const f = m.omegaRadPerYr * ARCSEC_PER_RAD; if (best === null || Math.abs(f - ref) < Math.abs(best - ref)) best = f; }
  return best;
};

const g = [];   // per clone: {g1..g5}
for (let k = 0; k <= CLONES; k++) {
  const dump = `tools/explore/w4-clone-${k}.local.json`;
  const out = `tools/explore/w4-modes-${k}.local.json`;
  if (!existsSync(ROOT + dump)) { console.log(`missing ${dump} — run w4-chaos-ensemble.mjs first`); process.exit(1); }
  if (!existsSync(ROOT + out)) execFileSync('node', [ROOT + 'tools/explore/naff-frequencies.mjs', `file=${ROOT}${dump}`, `terms=${TERMS}`, `out=${ROOT}${out}`], { stdio: ['ignore', 'ignore', 'inherit'] });
  const M = JSON.parse(readFileSync(ROOT + out, 'utf8')).modes;
  g.push({
    g1: lead(M.mercury.z, LG.g1), g2: lead(M.venus.z, LG.g2), g3: lead(M.earth.z, LG.g3),
    g4: lead(M.mars.z, LG.g4), g5: lead(M.jupiter.z, LG.g5),
  });
  console.log(`clone ${k}: g1 ${g[k].g1.toFixed(4)} · g2 ${g[k].g2.toFixed(4)} · g3 ${g[k].g3.toFixed(4)} · g4 ${g[k].g4.toFixed(4)} · g5 ${g[k].g5.toFixed(4)} ″/yr`);
}

const spanYears = JSON.parse(readFileSync(ROOT + 'tools/explore/w4-clone-0.local.json', 'utf8')).years;
const beats = { 'g2-g5 (405-kyr ruler)': (c) => c.g2 - c.g5, 'g1-g5': (c) => c.g1 - c.g5, 'g2-g1': (c) => c.g2 - c.g1, 'g4-g3': (c) => c.g4 - c.g3 };
console.log(`\nbeat spread across ${CLONES + 1} clones over ${(spanYears / 1e6).toFixed(0)} Myr (″/yr; ppm of the beat):`);
const T_ROCK = 2.48e9;
for (const [name, f] of Object.entries(beats)) {
  const v = g.map(f);
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (v.length - 1));
  const range = Math.max(...v) - Math.min(...v);
  const diff = sd * Math.sqrt(T_ROCK / spanYears);   // diffusive stretch to the rock epoch
  console.log(`  ${name.padEnd(22)} mean ${mean.toFixed(4)} · clone σ ${sd.toExponential(2)} (${(1e6 * sd / Math.abs(mean)).toFixed(0)} ppm) · range ${range.toExponential(2)} · diffusive σ at 2.48 Ga ≈ ${(100 * diff / Math.abs(mean)).toFixed(2)} %`);
}

console.log(`
Reading:
 · The g₂−g₅ diffusive percentage above is the ensemble's own 2.48-Ga
   chaos term for the 405-kyr ruler (lower estimate below saturation;
   literature saturation: Zeebe/Spalding %-class over Gyr).
 · Conditioning on the rock: Lantink 2022's own μ-independent internal
   ratios measure g₁ drifted ~6 % and g₁−g₅ only 0.4 % at 2.46 Ga — if
   the ensemble's beat drifts are correlated the g₂−g₅ term should be
   read against those, not in isolation.
 · The μ bound restated marginal over chaos: fold the g₂−g₅ percentage in
   quadrature with the measurement error of μ(2.48 Ga) = 1.00 ± 0.07
   (w2b count-bracket). Labeled: the ensemble is theory-vs-theory; the
   Lantink internal ratios are rock measurements.`);
