'use strict';
// Plan 31 B — §2 item 2, the early recession's TIME: the cited history's own da/dt over its first 1, 3 and 10
// samples, the constant-dissipation law's factor it implies (da/dt = K a^{−11/2}, Zahnle et al. 2015 / the Darwin
// form at constant Q), the Roche-zone-to-first-sample crossing time on it, and the hand-off numbers at 3, 4 and
// 5 R⊕ by the model's own conservation chain (L_EM constant; I_E the chain's J2000 moment). MEASUREMENT ONLY.
//   node tools/explore/plan31b-early-recession-measure.cjs
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/astrogeo22-earth-moon.json'), 'utf8'));
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const R_E = H.earthRadiusKm * 1e3;
const GM_E = 398600.435507e9, GM_M = 4902.800118e9, G = 6.67430e-11;
const M_E = GM_E / G, M_M = GM_M / G, MU = M_E * M_M / (M_E + M_M);
const I_E = DT.iEarthAtAge(0);
const c = H.columns, n = c.ageMa.length;
const f = (x, d = 3) => x === null || x === undefined || Number.isNaN(x) ? '—' : x.toFixed(d);

// the first samples (the deep end of the table)
console.log('The cited history (AstroGeo22), its last rows — age Ma, a R⊕ (min … max):');
for (let k = n - 12; k < n; k++) console.log(`  ${c.ageMa[k]}  ${f(c.aEarthRadii[k], 3)}  (${f(c.aMinEarthRadii[k], 2)} … ${f(c.aMaxEarthRadii[k], 2)})  LOD ${f(c.lodHours[k], 3)} h`);
console.log(`  the first sample: ${c.ageMa[n - 1]} Ma, a ${f(c.aEarthRadii[n - 1], 3)} R⊕ (its band's lower edge ${c.aMinEarthRadii[n - 1]} R⊕ = the Roche zone); the domain's past edge ${DT.NAVIGABLE_PAST_YEARS ? (DT.NAVIGABLE_PAST_YEARS / 1e6).toFixed(3) + ' Ma' : '4,428.98 Ma'}`);

// the first segment's slope: da/dt over the first m samples (a linear fit of a against age, in R⊕ per Myr)
console.log('\nThe first segment: da/dt from the last m samples, the law da/dt = K a^{−11/2} read off it, and the Roche-zone crossing time');
const roche = 3.0, aFirst = c.aEarthRadii[n - 1];
for (const m of [1, 3, 10]) {
  // the mean slope over the last m intervals (m+1 samples), in R⊕/Myr (positive outward with time: age decreases)
  const k0 = n - 1 - m;
  const slope = (c.aEarthRadii[k0] - c.aEarthRadii[n - 1]) / (c.ageMa[n - 1] - c.ageMa[k0]);   // R⊕ per Myr
  const aMid = 0.5 * (c.aEarthRadii[k0] + c.aEarthRadii[n - 1]);
  const K = slope * Math.pow(aMid, 5.5);                                                        // R⊕^6.5 / Myr
  // t from a1 to a2 on da/dt = K a^{-5.5}: t = (a2^6.5 − a1^6.5) / (6.5 K)
  const tRoche = (Math.pow(aFirst, 6.5) - Math.pow(roche, 6.5)) / (6.5 * K);
  const t4 = (Math.pow(aFirst, 6.5) - Math.pow(4, 6.5)) / (6.5 * K), t5 = (Math.pow(aFirst, 6.5) - Math.pow(5, 6.5)) / (6.5 * K);
  console.log(`  m = ${String(m).padStart(2)}: slope ${f(slope, 3)} R⊕/Myr at ā ${f(aMid, 2)} R⊕ → K ${f(K, 1)} R⊕^6.5/Myr → Roche (3 R⊕) → ${f(aFirst, 2)} R⊕ in ${f(tRoche * 1e6, 0)} yr; 4 R⊕ → first sample ${f(t4 * 1e6, 0)} yr; 5 R⊕ → ${f(t5 * 1e6, 0)} yr`);
}
// the dissipation factor as k₂/Q-class scaling against today's: today's da/dt = 3.8 cm/yr at 60.3 R⊕
const todayKms = 0.0382 / 1e3 / R_E * 1e6;   // R⊕ per Myr (38.2 mm/yr, LLR)
const kToday = todayKms * Math.pow(c.aEarthRadii[0], 5.5);
{
  const k0 = n - 4, slope = (c.aEarthRadii[k0] - c.aEarthRadii[n - 1]) / (c.ageMa[n - 1] - c.ageMa[k0]), aMid = 0.5 * (c.aEarthRadii[k0] + c.aEarthRadii[n - 1]);
  console.log(`  today's rate 38.2 mm/yr at ${f(c.aEarthRadii[0], 2)} R⊕ reads K_today ${f(kToday, 1)}; the first segment (m = 3) reads K ${f(slope * Math.pow(aMid, 5.5), 1)} — the early dissipation is ${f(slope * Math.pow(aMid, 5.5) / kToday, 3)} of today's (today's ocean resonance is anomalously high; the magma-ocean Earth's k₂/Q low)`);
}

// the hand-off numbers by conservation: L_EM = L_orbit(a) + I_E ω
console.log('\nThe hand-off state by the conservation chain (L_EM constant; the Earth\'s J2000 moment of inertia; a circular orbit):');
const lOrbit = (aR) => MU * Math.sqrt((GM_E + GM_M) * aR * R_E);
const L0 = lOrbit(c.aEarthRadii[0]) + I_E * (2 * Math.PI / (DT.meanLodSecondsAtAge(0)));
console.log(`  L_EM today ${L0.toExponential(3)} kg m²/s (orbit ${lOrbit(c.aEarthRadii[0]).toExponential(3)}, spin ${(L0 - lOrbit(c.aEarthRadii[0])).toExponential(3)})`);
for (const aR of [3, 4, 5, aFirst]) {
  const lSpin = L0 - lOrbit(aR), omega = lSpin / I_E, lod = 2 * Math.PI / omega / 3600;
  const month = 2 * Math.PI / Math.sqrt((GM_E + GM_M) / Math.pow(aR * R_E, 3)) / 3600;
  const tLock = 100 * Math.pow(aR / 6, 6);   // Peale: t ∝ a⁶, "locked within a century at 6 R⊕"
  const angDeg = 2 * Math.atan(1737.4e3 / (aR * R_E)) * 180 / Math.PI;
  console.log(`  a = ${f(aR, 2)} R⊕: day ${f(lod, 2)} h, month ${f(month, 2)} h (${f(month / lod, 2)} days), the Moon ${f(angDeg, 1)}° across, lock within ~${f(tLock, 1)} yr`);
}
console.log(`  the chain's own LOD at the edge (${f(DT.meanLodSecondsAtAge(4428.98) / 3600, 3)} h) against the cited ${f(c.lodHours[n - 1], 3)} h at the first sample`);
