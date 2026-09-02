#!/usr/bin/env node
// HOW MUCH WOULD A DERIVED EARTH-ORBIT VECTOR MOVE THE ECLIPSE CHAIN?
//
// The eclipse chain (packages/physics createModel → frameworkSunDeps) reads
// Earth's eccentricity from the H/3 line and the perihelion from the H/16 law.
// Both match the measured J2000 value and slope, so over the historical window
// they differ from a derived secular vector mainly through the CURVATURE ë
// (measured: H/3 law −3.8e-8/cy², derived vector −2.5e-7, Simon −2.5e-7) and
// through the perihelion. This script evaluates, year by year over the eclipse
// window, Δe and Δϖ between the derived vector (NAFF mode table) and the
// shipped laws, and converts them to the equation-of-centre difference in the
// Sun's longitude (ΔC ≈ 2Δe·sin M + 2e·cos M·ΔM, ΔM = −Δϖ) and to eclipse
// TIMING (the Sun moves 148 ″/h: 1 ″ ≈ 24 s). This is the size of the
// theory-vs-OBSERVATION test the eclipse record can then make: Babylon −135
// and the audit-26 set are located to km / minutes.
//
// MEASURED (1-Myr GR mode table, anchored mode):
//   J2000 curvature of e: shipped H/3 law ë = −3.8e-8/cy²; derived vector −2.6e-7; Simon et
//   al. 1994 (e = 0.0167086342 − 0.0004203654 t − 0.0000126734 t², t in kyr) −2.5e-7 — the
//   shipped law's curvature is ~7× too small against the secular dynamics (both ours and the
//   classical series). Consequence over the eclipse window (level + slope removed):
//   Δe −4.2e-5 at year 0, −9.5e-5 at −1000, −2.6e-4 at −3000 → equation-of-centre
//   differences ≈ 20 ″ (≈ 8 min) at Babylon −135, ≈ 60 ″ (26 min) at −1000.
//   The ϖ column from a 1-Myr table is NOT trustworthy (its ϖ̈ gives 296 ″ at year 0
//   where Simon's ϖ̈ = 2·53.3 ″/kyr² gives ≈ 21 ″); the e-curvature is the robust number.
//   CORRECTION (measured in the eclipse chain, createModel opts.laws hook +
//   ECLIPSE_AUDIT_LAWS=curvature:-2.5e-7): the "8 minutes" above used the SUN's rate
//   (148 ″/h), which is the right conversion for cardinal points and transits but NOT for
//   eclipses — an eclipse instant is set by the Moon−Sun RELATIVE motion (≈ 0.51 ″/s), so
//   20 ″ of solar longitude moves an eclipse by ≈ 40 s ≈ 20 km. Measured: Babylon −135
//   198 → 209 km (ΔUT and framework UT unchanged at the minute), Plutarch 34 → 23,
//   Lu −708 106 → 90, Nabonidus 74 → 81, Ibn Yunus 1004 90 → 66; verdict counts and the
//   Stephenson lunar/solar residuals unchanged. The eclipse record CANNOT discriminate the
//   curvature at its ~100-km scatter; the cardinal-point instants could (8 min at −135) but
//   no ancient equinox/solstice timing reaches that precision. So the e-law curvature is,
//   today, a theory-vs-theory question (H/3 line vs the secular dynamics), not an
//   observational one — recorded as such in doc 109 §7.
//
//   node tools/explore/ecc-law-eclipse-sensitivity.mjs [modes=…naff-modes-ecliptic-1000000-gr.local.json] [from=-3000] [to=2100] [mode=anchored|raw]

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const OE = require(ROOT + 'tools/lib/orbital-engine.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const MODES = JSON.parse(readFileSync(KV.modes || ROOT + 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json', 'utf8'));
const FROM = parseFloat(KV.from || '-3000'), TO = parseFloat(KV.to || '2100');
const R2D = 180 / Math.PI, AS = 3600;

const E = MODES.modes.earth;
const zAt = (t) => { let re = 0, im = 0; for (const m of E.z) { const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t); re += m.re * c - m.im * s; im += m.re * s + m.im * c; } return [re, im]; };
// derived vector: e = |z|, ϖ (fixed J2000 ecliptic) = arg z; of-date = + accumulated framework precession (H/13)
const pAspy = 1296000 / (TL.H / 13);
const derived = (year) => { const t = year - 2000; const [re, im] = zAt(t); return { e: Math.hypot(re, im), w: ((Math.atan2(im, re) * R2D + pAspy * t / AS) % 360 + 360) % 360 }; };
// shipped laws (the same the package chain uses): H/3 line for e, the perihelion law for ϖ of date
const shipped = (year) => ({ e: OE.computeEccentricityEarth(year), w: OE.calcEarthPerihelionPredictive(year) });
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
// J2000-ANCHORED comparison (mode=anchored, default): a truncated mode table has
// its own level/slope error at J2000 (the 1-Myr table reads e 0.015985 where the
// measured value both shipped laws match is 0.016710). Both laws already carry
// the MEASURED level and slope, so the physics a derived vector can add over the
// eclipse window is the curvature and beyond. The anchored form removes the
// level and slope differences at J2000 (e: value + rate; ϖ: value + rate) and
// shows what is left. mode=raw shows the unanchored difference for reference.
const MODE = KV.mode || 'anchored';
const s0 = shipped(2000), d0 = derived(2000);
const sl = (f, k) => (f(2050)[k] - f(1950)[k]) / 100;   // per year
const dE = sl(derived, 'e') - sl(shipped, 'e'), dW = wrap(derived(2050).w - derived(1950).w) / 100 - wrap(shipped(2050).w - shipped(1950).w) / 100;
const derivedA = (year) => { const d = derived(year), t = year - 2000; return MODE === 'raw' ? { e: d.e, w: (d.w + s0.w - d0.w + 360) % 360 } : { e: d.e - (d0.e - s0.e) - dE * t, w: (d.w + (s0.w - d0.w) - dW * t + 720) % 360 }; };

console.log(`derived vector: ${MODES.source.replace(/.*\//, '')} (${MODES.terms} terms, ${MODES.spanYears.toFixed(0)} yr)  vs shipped H/3 e-law + perihelion law; window ${FROM}…${TO}; mode=${MODE}`);
console.log(`  J2000 slopes: ė shipped ${(sl(shipped, 'e') * 100).toExponential(3)}/cy, derived ${(sl(derived, 'e') * 100).toExponential(3)}/cy; ϖ̇ shipped ${(wrap(shipped(2050).w - shipped(1950).w) / 100 * 100 * AS).toFixed(1)} ″/cy, derived ${(wrap(derived(2050).w - derived(1950).w) / 100 * 100 * AS).toFixed(1)} ″/cy${MODE === 'anchored' ? ' — level and slope differences removed below' : ''}`);
console.log('  year      e_ship     e_deriv       Δe       ϖ_ship   ϖ_deriv     Δϖ″   max|ΔC| ″   ≈ timing');
let worst = { y: 0, dC: 0 };
for (let y = FROM; y <= TO; y += 250) {
  const s = shipped(y), d = derivedA(y);
  const de = d.e - s.e, dw = wrap(d.w - s.w) / R2D;   // rad
  // equation-of-centre difference, maximised over the mean anomaly: |ΔC|max ≈ 2|Δe| + 2e|Δϖ|
  const dC = (2 * Math.abs(de) + 2 * s.e * Math.abs(dw)) * R2D * AS;
  if (dC > worst.dC) worst = { y, dC };
  console.log(`${String(y).padStart(6)}   ${s.e.toFixed(6)}   ${d.e.toFixed(6)}   ${de.toExponential(2).padStart(9)}   ${s.w.toFixed(3).padStart(8)}  ${d.w.toFixed(3).padStart(8)}  ${(dw * R2D * AS).toFixed(1).padStart(7)}   ${dC.toFixed(1).padStart(8)}   ${(dC / 148 * 60).toFixed(1).padStart(6)} min`);
}
console.log(`\nlargest equation-of-centre difference in the window: ${worst.dC.toFixed(1)} ″ at ${worst.y} → ≈ ${(worst.dC / 148 * 60).toFixed(1)} min of solar-longitude timing.`);
console.log('reading: the eclipse audit locates Babylon −135 and the audit-26 events to km / minutes, so a difference of this size IS testable there — that is the theory-vs-observation test a derived vector must pass before it can replace the H/3 line. Requires an eccentricity/perihelion override hook in createModel (not present today).');
