// ═══════════════════════════════════════════════════════════════════════════
// PATH C — STAGE 0: lunar-argument rate & T² decomposition (headless)
//
// Decisive derivation for the framework-native Moon campaign
// (docs/hidden/IP-framework-native-moon.md §Stage 0).
//
// 0a. Decompose the "Meeus vs Integrator" +1.4°/cy M′/F drift:
//     prime hypothesis = frame convention (Meeus arguments are
//     ecliptic-of-date; the framework invariant rates are ICRF; the
//     difference is general precession p ≈ 50.29″/yr = 1.397°/cy —
//     which the framework generates natively as 360°/(H/13)).
// 0b. Compare framework-generated T² coefficients (finite differences
//     of the deep-time chain) against Meeus's empirical T² terms.
//
// Run: node tools/explore/framework-moon-argument-decomposition.js
// ═══════════════════════════════════════════════════════════════════════════

const DT = require('../lib/deep-time');

const J2000_JD  = 2451545.0;
const SI_TROP_D = 365.2421897;          // SI tropical year, days (framework year coordinate)
const JUL_CY_D  = 36525;                // Julian century, days (Meeus T unit)
const D2AS      = 3600;                 // degrees → arcsec

// ─── Meeus Ch. 47 fundamental arguments (deg; T in Julian centuries TT) ────
const MEEUS = {
  Lp: { j2000: 218.3164477, rate: 481267.88123421, t2: -0.0015786, t3: 1/538841,  t4: -1/65194000 },
  D:  { j2000: 297.8501921, rate: 445267.1114034,  t2: -0.0018819, t3: 1/545868,  t4: -1/113065000 },
  M:  { j2000: 357.5291092, rate:  35999.0502909,  t2: -0.0001536, t3: 1/24490000, t4: 0 },
  Mp: { j2000: 134.9633964, rate: 477198.8675055,  t2:  0.0087414, t3: 1/69699,   t4: -1/14712000 },
  F:  { j2000:  93.2720950, rate: 483202.0175233,  t2: -0.0036539, t3: -1/3526000, t4: 1/863310000 },
};
const meeusArg = (a, T) => a.j2000 + a.rate*T + a.t2*T*T + a.t3*T*T*T + a.t4*T*T*T*T;
const wrap180  = (d) => { let x = ((d % 360) + 360) % 360; return x > 180 ? x - 360 : x; };

// ─── Framework chain helpers ───────────────────────────────────────────────
// year (SI-tropical, J2000-anchored) → t_Ma (positive = past)
const yearToTMa = (y) => (2000.0 - y) / 1e6;

// Advance (deg) of a precession element between year y0 and y1, integrating
// 360/T(t) with T from a chain function returning SECONDS. Trapezoid, step yrs.
// TIME UNIT: one step-year = one SI tropical year of SI seconds (a fixed time
// coordinate — do NOT use epoch-dependent year lengths here, that aliases the
// sidereal/tropical distinction into the fast carriers at the 4e-5 level).
const YEAR_S = SI_TROP_D * 86400;
function advanceDeg(periodSecondsAtAge, y0, y1, stepYears = 25) {
  const n = Math.max(2, Math.ceil(Math.abs(y1 - y0) / stepYears));
  const h = (y1 - y0) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const y = y0 + i * h;
    const T_s = periodSecondsAtAge(yearToTMa(y));
    const rate = 360 * (YEAR_S / T_s);           // deg per step-year at this epoch
    sum += (i === 0 || i === n) ? rate / 2 : rate;
  }
  return sum * h;
}

// Framework general precession (equinox motion): 360° per axial-precession
// period = H(t)/13 years. Positive = of-date longitudes gain vs ICRF.
function precessionAdvanceDeg(y0, y1, stepYears = 25) {
  const n = Math.max(2, Math.ceil(Math.abs(y1 - y0) / stepYears));
  const h = (y1 - y0) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const y = y0 + i * h;
    const H = DT.meanHAtAge(yearToTMa(y));
    const rate = 360 * 13 / H;                    // deg per year
    sum += (i === 0 || i === n) ? rate / 2 : rate;
  }
  return sum * h;
}

// Sidereal-month advance (for L′): 360° per sidereal month.
const smAdvanceDeg = (y0, y1, step) => advanceDeg(DT.meanMoonSiderealMonthAtAge, y0, y1, step);

// ═══ Section A — J2000 instantaneous rates ═════════════════════════════════
console.log('══════════════════════════════════════════════════════════════════════');
console.log('  PATH C STAGE 0a — J2000 rate decomposition');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Meeus of-date rates (deg / Julian cy) → derived elements
const lpR = MEEUS.Lp.rate, mpR = MEEUS.Mp.rate, fR = MEEUS.F.rate;
const periRate_meeus = lpR - mpR;   // ϖ̇ of-date, deg/cy  (+4069.0137)
const nodeRate_meeus = lpR - fR;    // Ω̇ of-date, deg/cy  (−1934.1363)

// Framework rates at J2000 (both formulations), converted to deg / Julian cy
const degPerJulCy = (T_s) => 360 * (JUL_CY_D * 86400) / T_s;
const T_per_scene = DT.meanLunarPerigeePrecessionAtAge(0);
const T_nod_scene = DT.meanLunarNodePrecessionAtAge(0);
const T_per_icrf  = DT.meanApsidalPrecessionSecondsICRFAtAge(0);
const T_nod_icrf  = DT.meanNodalPrecessionSecondsICRFAtAge(0);
const T_sm        = DT.meanMoonSiderealMonthAtAge(0);

const pFw_degCy  = 360 * 13 / DT.meanHAtAge(0) * 100 * (SI_TROP_D ? 1 : 1); // deg per 100 SI yr
const pIau_degCy = 5028.796195 / 3600;                                       // IAU 2006, deg/Julian cy

const rows = [];
const addRow = (name, meeusDegCy, fwDegCy) => rows.push({
  element: name,
  meeus_degCy: meeusDegCy.toFixed(4),
  framework_degCy: fwDegCy.toFixed(4),
  gap_degCy: (fwDegCy - meeusDegCy).toFixed(4),
  gap_asYr: ((fwDegCy - meeusDegCy) * D2AS / 100).toFixed(2),
});
addRow('perigee ϖ̇ (scene anchor chain)', periRate_meeus, degPerJulCy(T_per_scene));
addRow('perigee ϖ̇ (ICRF invariant)',     periRate_meeus, degPerJulCy(T_per_icrf));
addRow('node |Ω̇| (scene anchor chain)',  Math.abs(nodeRate_meeus), degPerJulCy(T_nod_scene));
addRow('node |Ω̇| (ICRF invariant)',      Math.abs(nodeRate_meeus), degPerJulCy(T_nod_icrf));
addRow('sidereal-month n (L′ carrier)',   lpR, degPerJulCy(T_sm));
console.table(rows);

console.log(`General precession p:  framework 360×13/H = ${pFw_degCy.toFixed(4)} deg/cy  (${(pFw_degCy*36).toFixed(2)}″/yr)`);
console.log(`                       IAU 2006           = ${pIau_degCy.toFixed(4)} deg/cy  (50.29″/yr)`);
console.log('If a gap above ≈ ±p, that element\'s drift is the ICRF↔of-date frame convention.\n');

// ═══ Section B — drift-table replication (raw ICRF vs p-corrected) ═════════
console.log('══════════════════════════════════════════════════════════════════════');
console.log('  PATH C STAGE 0a — M′/F drift vs Meeus (integrator anchored at J2000)');
console.log('  raw = ICRF-frame advance; p-corr = + framework precession advance');
console.log('══════════════════════════════════════════════════════════════════════\n');

const EPOCHS = [
  { y: 2024.05, label: '~2024' },
  { y: 1950.0,  label: '1950' },
  { y: 1582.8,  label: '1582' },
  { y: 1000.0,  label: '1000 CE' },
  { y: 1.0,     label: '1 CE' },
  { y: -134.7,  label: '-135 (Babylonian)' },
  { y: -583.6,  label: '-584 (Thales)' },
];

// Element-level drift: framework perigee ϖ and node Ω vs Meeus-implied
// of-date elements (ϖ = L′−M′, Ω = L′−F). The scene chain anchors are ICRF;
// "+p" adds the framework's own general-precession advance (360°/(H/13)) to
// convert ICRF → of-date. This is exactly the sim's M′/F drift with sign
// flipped (M′ = L′−ϖ), since the sim's L′ carrier is of-date and clean.
const drift = [];
for (const { y, label } of EPOCHS) {
  const jd = J2000_JD + (y - 2000.0) * SI_TROP_D;
  const T  = (jd - J2000_JD) / JUL_CY_D;

  const peri_meeus = meeusArg(MEEUS.Lp, T) - meeusArg(MEEUS.Mp, T);   // of-date ϖ (unwrapped)
  const node_meeus = meeusArg(MEEUS.Lp, T) - meeusArg(MEEUS.F,  T);   // of-date Ω (unwrapped)
  const peri_a = MEEUS.Lp.j2000 - MEEUS.Mp.j2000;
  const node_a = MEEUS.Lp.j2000 - MEEUS.F.j2000;

  const advPeri = advanceDeg(DT.meanLunarPerigeePrecessionAtAge, 2000.0, y);
  const advNode = advanceDeg(DT.meanLunarNodePrecessionAtAge, 2000.0, y);
  const advP    = precessionAdvanceDeg(2000.0, y);

  const peri_raw = peri_a + advPeri;            // ICRF-rate advance (perigee advances)
  const node_raw = node_a - advNode;            // node regresses
  const peri_p   = peri_a + advPeri + advP;     // + framework precession → of-date
  const node_p   = node_a - advNode + advP;

  const cy = (y - 2000.0) / 100;
  const perCy = (d) => Math.abs(cy) > 0.01 ? ` (${(d/cy).toFixed(3)}/cy)` : '';
  drift.push({
    epoch: label,
    'ϖ raw−Meeus':  wrap180(peri_raw - peri_meeus).toFixed(3) + perCy(peri_raw - peri_meeus),
    'ϖ +p−Meeus':   wrap180(peri_p   - peri_meeus).toFixed(3) + perCy(peri_p - peri_meeus),
    'Ω raw−Meeus':  wrap180(node_raw - node_meeus).toFixed(3) + perCy(node_raw - node_meeus),
    'Ω +p−Meeus':   wrap180(node_p   - node_meeus).toFixed(3) + perCy(node_p - node_meeus),
  });
}
console.table(drift);
console.log('Reading: "raw" should show the ±1.4°/cy frame drift (the sim\'s M′/F meter,');
console.log('opposite sign); "+p" adds framework general precession — if it collapses the');
console.log('linear term, the drift is the frame convention, closed natively. The residual');
console.log('growing as T² at deep epochs is the Stage-0b secular gap.\n');

// ═══ Section C — T² comparison (framework chain vs Meeus empirical) ════════
console.log('══════════════════════════════════════════════════════════════════════');
console.log('  PATH C STAGE 0b — secular T² terms: framework chain vs Meeus');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Framework rate of an element (deg / Julian cy) at year y
const rateAt = (fn, y) => degPerJulCy(fn(yearToTMa(y)));
// d(rate)/dT via central difference over ±ΔY years → T² coefficient = ½·d(rate)/dT
function t2Coeff(fn, dYears = 5000) {
  const dT = dYears / 100;                       // in Julian centuries (≈ SI cy here)
  const dRate = (rateAt(fn, 2000 + dYears) - rateAt(fn, 2000 - dYears)) / (2 * dT);
  return dRate / 2;                              // deg/cy²
}
const t2_sm    = t2Coeff(DT.meanMoonSiderealMonthAtAge);       // L′ carrier (tidal ṅ)
const t2_peri  = t2Coeff(DT.meanLunarPerigeePrecessionAtAge);  // ϖ̈/2
const t2_node  = t2Coeff(DT.meanLunarNodePrecessionAtAge);     // Ω̈/2
// Meeus-implied element T² (of-date): ϖ = L′−M′, Ω = L′−F
const t2_peri_meeus = MEEUS.Lp.t2 - MEEUS.Mp.t2;   // −0.0103200 deg/cy²
const t2_node_meeus = MEEUS.Lp.t2 - MEEUS.F.t2;    // +0.0020753 deg/cy²
// Of-date includes accumulated-precession T²: p_A = 5028.796195·T + 1.1054348·T² ″
const t2_pA = 1.1054348 / 3600;                    // deg/cy², adds to of-date element T²

console.table([
  { term: "L′ carrier (n_sid, tidal)", framework_asCy2: (t2_sm*D2AS).toFixed(2),
    meeus_asCy2: (MEEUS.Lp.t2*D2AS).toFixed(2),
    note: 'Meeus = tidal (−12.9) + planetary (+7.2); framework supplies tidal only' },
  { term: 'perigee ϖ (element)', framework_asCy2: (t2_peri*D2AS).toFixed(2),
    meeus_asCy2: (t2_peri_meeus*D2AS).toFixed(2),
    note: `of-date adds p_A T² ${(t2_pA*D2AS).toFixed(2)}″; rest = solar-perturbation secular (e_E(t), n̄ ratio)` },
  { term: 'node Ω (element)', framework_asCy2: (t2_node*D2AS).toFixed(2),
    meeus_asCy2: (t2_node_meeus*D2AS).toFixed(2),
    note: 'same channels as ϖ' },
]);
console.log('Meeus argument T² for reference: M′ = +31.47″/cy², F = −13.15″/cy², L′ = −5.68″/cy².');
console.log('Framework chain currently carries ONLY the tidal channel (T ∝ T_yr²/T_sm).\n');

// ═══ Section D — the e_E(t) channel: does it explain the element T²? ═══════
console.log('══════════════════════════════════════════════════════════════════════');
console.log('  PATH C STAGE 0b — e_E(t) solar-perturbation channel derivation');
console.log('══════════════════════════════════════════════════════════════════════\n');
// Mechanism: the solar disturbing strength scales as (1−e_E²)^(−3/2) (time-
// averaged (a′/r′)³). Leading order, an element rate X follows
//   Ẍ/Ẋ = d ln(strength)/dt = 3·e·ė/(1−e²)
// so the element T² coefficient = Ẋ · 3eė/(1−e²) / 2, times a sensitivity
// factor s = ∂ln Ẋ/∂ln(strength) (s=1 leading order; the apsidal m-series is
// Clairaut-amplified so s_ϖ > 1 is expected; the nodal series converges fast
// so s_Ω ≈ 1).
const CC = require('../lib/constants');
const e0   = 0.016708634;                 // observed e_E at J2000
const eDotObs = -0.000042037;             // observed ė (Meeus/Laskar), per Julian cy
// framework H/16 law ė (numerical):
const bE = CC.eccentricityBase, aE = CC.eccentricityAmplitude, H0 = CC.holisticyearLength ?? CC.H;
const eFw = (y) => Math.sqrt(bE*bE + aE*aE - 2*bE*aE*Math.cos(2*Math.PI*(y - CC.balancedYear)*16/H0));
const eDotFw = (eFw(2050) - eFw(1950));   // per century
const chan = (rateDegCy, eDot) => rateDegCy * (3 * e0 * eDot / (1 - e0*e0)) / 2;  // T² coeff, deg/cy²

const t2_peri_obs = chan(periRate_meeus, eDotObs);
const t2_node_obs = chan(nodeRate_meeus, eDotObs);   // Ω̇ negative → coeff positive
const t2_peri_fw  = chan(periRate_meeus, eDotFw);
const t2_node_fw  = chan(nodeRate_meeus, eDotFw);
// tidal m-ratio channel for completeness: ϖ̇ ∝ n′²/n ⇒ dlnϖ̇/dt = −ṅ/n
const nMoonAsCy = MEEUS.Lp.rate * D2AS;    // ″/cy
const t2_tidalRatio = periRate_meeus * (25.86 / nMoonAsCy) / 2;  // deg/cy², sign +

console.table([
  { channel: 'e_E leading order, OBSERVED ė (−4.204e-5/cy)',
    'ϖ T² ″/cy²': (t2_peri_obs*D2AS).toFixed(2), 'Ω T² ″/cy²': (t2_node_obs*D2AS).toFixed(2) },
  { channel: 'e_E leading order, FRAMEWORK H/16 ė (' + eDotFw.toExponential(2) + '/cy)',
    'ϖ T² ″/cy²': (t2_peri_fw*D2AS).toFixed(2), 'Ω T² ″/cy²': (t2_node_fw*D2AS).toFixed(2) },
  { channel: 'tidal m-ratio channel (ṅ/n, for completeness)',
    'ϖ T² ″/cy²': (t2_tidalRatio*D2AS).toFixed(2), 'Ω T² ″/cy²': '~0.02' },
  { channel: 'MEEUS EMPIRICAL (target)',
    'ϖ T² ″/cy²': (t2_peri_meeus*D2AS).toFixed(2), 'Ω T² ″/cy²': (t2_node_meeus*D2AS).toFixed(2) },
]);
console.log(`Implied sensitivities (target / observed-ė leading order):`);
console.log(`  s_Ω = ${(t2_node_meeus/t2_node_obs).toFixed(3)}   ← ≈1 ⇒ node T² IS the e_E channel at leading order`);
console.log(`  s_ϖ = ${(t2_peri_meeus/t2_peri_obs).toFixed(3)}   ← Clairaut-amplified apsidal sensitivity (m-series);`);
console.log(`         compare the classical rate amplification observed/leading-m² ≈ 2.0`);
console.log(`Framework H/16 e-law at J2000: e = ${eFw(2000).toFixed(7)} (✓ anchors IAU) but ė = ${eDotFw.toExponential(2)}/cy`);
console.log(`— phase sits near the cycle extremum, ~5× below the observed secular ė, which is`);
console.log(`dominated by the multi-planet 100/405-kyr Laskar nodes (richer than one H/16 line).`);
console.log(`⇒ Full nativity of the T² needs the framework's richer eccentricity composite (L1`);
console.log(`lattice bands); Stage-1 interim: anchor ė₀ (one observed constant) + structural s.`);
