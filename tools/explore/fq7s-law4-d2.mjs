// ECCENTRICITY UNIFICATION — PHASE 0, instrument B: Law 4 under the H/3
// amplitude (plan §2 D2).
//
// Law 4: K = A_Earth·√m_E·a^1.5 / (sin ε̄·√d), and every planet's amplitude
// A_p = K·sin ε̄_p·√d_p / (√m_p·a_p^1.5). Each planet's e then oscillates
// with its wobble period W_p at phase φ_p, giving a PRESENT-DAY rate
//   ė_p = −A_p · (2π/W_p) · sin φ_p   (law-of-cosines form, first order)
// which is a directly testable number: compare with (i) Meeus Table 31.A /
// Simon 1994 secular ė per planet and (ii) the slope of the JPL cache
// (data/planet_eccentricity_cache.json) over ±1 kyr.
// Under the unification A_Earth moves 0.001356 → base/2 = 0.007693 (×5.67),
// so K and every A_p scale by the same factor unless Law 4 is re-based.
//
// Usage: node tools/explore/fq7s-law4-d2.mjs

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../package.json', import.meta.url).pathname);
const TL = require('./tools/lib/constants.js');
const { DEFAULT_CONSTANTS: C } = require('@essrt/physics');

const D2R = Math.PI / 180;
const A_old = TL.eccentricityAmplitude, A_new = C.earth.eccentricityBase / 2;
const scale = A_new / A_old;
console.log(`Earth amplitude ${A_old.toFixed(6)} → ${A_new.toFixed(6)} (×${scale.toFixed(2)}); K ${TL.eccentricityAmplitudeK.toExponential(4)} → ${(TL.eccentricityAmplitudeK * scale).toExponential(4)}`);

// reference secular rates per century (Meeus Table 31.A, mean elements of date)
const MEEUS_EDOT = { mercury: 0.000020407, venus: -0.000047765, earth: -0.000042037, mars: 0.000090484, jupiter: 0.000163225, saturn: -0.000346641, uranus: -0.000027293, neptune: 0.000006033 };
// JPL cache slope over ±1 kyr (e vs year), per planet
const cache = JSON.parse(readFileSync(new URL('./../../data/planet_eccentricity_cache.json', import.meta.url), 'utf8'));
const jplSlope = (name) => {
  const rec = cache[name]; if (!rec) return NaN;
  const ys = rec.years, es = rec.eccentricity || rec.ecc || rec.e || rec.values;
  if (!es) return NaN;
  const pts = ys.map((y, i) => [y, es[i]]).filter(([y]) => y >= -1000 && y <= 1000 || (ys[ys.length - 1] < 0 && y >= -2000));
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  return sxy / sxx * 100;   // per century
};
console.log('\nplanet    A_old       ė model(K_old)   ė model(K_new)   Meeus 31.A     JPL cache slope   |model/Meeus| old → new');
for (const k of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const p = TL.planets[k];
  const A = p.orbitalEccentricityAmplitude, W = p.wobblePeriod, ph = p.eccentricityPhaseJ2000 * D2R;
  // law-of-cosines e = sqrt(base² + A² − 2 base A cos θ): de/dt = (base A sin θ / e)·θ̇
  const e = Math.sqrt(p.orbitalEccentricityBase ** 2 + A ** 2 - 2 * p.orbitalEccentricityBase * A * Math.cos(ph));
  const thDot = 2 * Math.PI / (W / 100);   // per century (sign convention: model's wobble sense)
  const edOld = p.orbitalEccentricityBase * A * Math.sin(ph) / e * thDot;
  const edNew = edOld * scale;
  const ref = MEEUS_EDOT[k];
  const capName = k[0].toUpperCase() + k.slice(1);
  const js = jplSlope(capName);
  console.log(`${k.padEnd(9)} ${A.toExponential(2)}   ${edOld.toExponential(2).padStart(10)}       ${edNew.toExponential(2).padStart(10)}       ${ref.toExponential(2).padStart(10)}     ${(Number.isFinite(js) ? js.toExponential(2) : 'n/a').padStart(10)}        ${Math.abs(edOld / ref).toFixed(2)} → ${Math.abs(edNew / ref).toFixed(2)}`);
}
console.log('\n(|model/Meeus| = 1 would mean Law 4 predicts the planet\'s present eccentricity rate; the model\'s wobble sense may flip the sign)');
