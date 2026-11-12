'use strict';
// Plan 31 A §2.1 — THE PRE-BUILD MEASUREMENT (2026-11-11; the record doc 111 §1.42 a cites; the plan's
// status block in holisticuniverse). Read-only against the chain. The SHIPPED form is the coupled
// two-vector state in packages/physics/src/earth/laplace-plane.cjs; this script is the test-particle
// closed form the measurement was made with, kept as the record — supersede, never edit.
//
// The Laplace-plane tilt of the lunar orbit along the cited Earth–Moon history and what it does to the
// composed lunisolar precession clock. Test-particle Laplace plane (Tremaine, Touma & Namouni 2009 eq. 23):
//   tan 2φ = sin 2ε / (cos 2ε + 2 (r_L/a)^5),   r_L^5 = J2 R² a_p³ (M_E/M_S) (1 − e_p²)^{3/2}
// φ the tilt of the Laplace plane from the EQUATOR (0 inside, ε far outside). The lunar torque's precession of the
// spin about the ECLIPTIC pole then carries the regime factor g = sin 2φ / sin 2ε (derived: the lunar ring averaged
// about the Laplace pole; the component of the spin's rotation about the ecliptic pole is sin φ / sin ε of it, the
// rate ∝ cos φ) — g → 1 outside, → 0 inside; its small-tilt limit is EXACTLY the coupled result
// (3/4)(n_s²/n)·L_M/L_spin: the solar torque on the lunar ring transmitted to the Earth.
// J2 of date: hydrostatic, ∝ ω² (the same scaling Farhat et al. 2022 use) — an assumption of the measurement.
//
//   node tools/explore/plan31a-laplace-plane-measure.cjs
const path = require('path');
const DT = require(path.join(__dirname, '..', 'lib', 'deep-time.js'));
const ART = require(path.join(__dirname, '..', '..', 'data', 'astrogeo22-earth-moon.json'));

const D2R = Math.PI / 180;
const J2_0 = 0.00108262668;           // earthJ2 (constants)
const R_KM = 6378.1366;               // the artifact's R⊕
const AU_KM = 149597870.7;            // IAU 2012
const GM_S = 132712440041.27942, GM_E = 398600.435507, GM_M = 4902.800118; // DE440, km³/s²
const E_EARTH = 0.01671022;
const I_M0 = 5.1453964;               // the J2000 lunar inclination (to the ecliptic ≈ the Laplace plane today)
const FS = DT.PRECESSION_SOLAR_SHARE_J2000;
const P0 = DT.precessionRateJ2000ArcsecPerYr();
const LOD0 = DT.LOD_NOW_H13_S, A0 = DT.A_MOON_NOW_M;
const JULIAN_YEAR_S = 365.25 * 86400;

function laplace(aKm, epsDeg, j2) {
  const rL5 = j2 * R_KM * R_KM * AU_KM ** 3 * (GM_E / GM_S) * Math.pow(1 - E_EARTH * E_EARTH, 1.5);
  const rL = Math.pow(rL5, 0.2);
  const e2 = 2 * epsDeg * D2R;
  const x = 2 * rL5 / aKm ** 5;
  const phi2 = Math.atan2(Math.sin(e2), Math.cos(e2) + x); // 2φ
  const g = Math.sin(phi2) / Math.sin(e2);
  return { rL, phiDeg: phi2 / 2 / D2R, g };
}

function row(tMa, iL = I_M0) {
  const aM = DT.meanMoonDistanceMetresAtAge(tMa);
  const lod = DT.meanLodSecondsAtAge(tMa);
  const eps = DT.meanObliquityCitedDegAtAge(tMa);
  if (aM === null || lod === null || eps === null) return null;
  const aKm = aM / 1000, aRE = aKm / R_KM;
  const wr = LOD0 / lod;                      // ω/ω₀
  const j2 = J2_0 * wr * wr;
  const L = laplace(aKm, eps, j2);
  const L0 = laplace(A0 / 1000, DT.meanObliquityCitedDegAtAge(0), J2_0);
  const gN = L.g / L0.g;                      // normalised: 1 at J2000
  const inclF = (1 - 1.5 * Math.sin(iL * D2R) ** 2) / (1 - 1.5 * Math.sin(I_M0 * D2R) ** 2);
  const lf = (A0 / aM) ** 3;                  // (a₀/a)³
  const cosR = DT.precessionObliquityFactorAtAge(tMa);
  const ecl = wr * P0 * (FS + (1 - FS) * lf) * cosR;           // the former ecliptic form
  const tilt = wr * P0 * (FS + (1 - FS) * lf * gN * inclF) * cosR;
  const solar = wr * P0 * FS * cosR;                            // the lunar term gone (the pure equatorial limit)
  const Tsid = DT.meanSiderealYearSecondsAtAge(tMa) / JULIAN_YEAR_S;
  const trop = (psi) => 1 / (1 / Tsid + psi / 1296000);        // Julian years
  const solarDays = (yrs) => yrs * JULIAN_YEAR_S / lod;
  // lunar node / perigee of date: the solar term scaled from J2000 (∝ a^{-3/2} T_sid²), the J2 term of date
  const n = Math.sqrt((GM_E + GM_M) / aKm ** 3);               // rad/s
  const nodeS = DT.MOON_NODAL_J2000_S * Math.pow(aM / A0, -1.5) * (Tsid / (DT.meanSiderealYearSecondsAtAge(0) / JULIAN_YEAR_S)) ** 2;
  const apsS = DT.MOON_APSIDAL_J2000_S * Math.pow(aM / A0, -1.5) * (Tsid / (DT.meanSiderealYearSecondsAtAge(0) / JULIAN_YEAR_S)) ** 2;
  const nodeJ2 = 2 * Math.PI / (1.5 * n * j2 * (R_KM / aKm) ** 2 * Math.cos(iL * D2R));
  const apsJ2 = 2 * Math.PI / (0.75 * n * j2 * (R_KM / aKm) ** 2 * (5 * Math.cos(iL * D2R) ** 2 - 1));
  const fa = ART.columns.ageMa.indexOf(Math.round(tMa));
  const farhat = fa >= 0 ? ART.columns.precessionArcsecPerYr[fa] : null;
  return { tMa, aRE, lodH: lod / 3600, eps, j2Ratio: wr * wr, rL_RE: L.rL / R_KM, aOverRL: aKm / L.rL, phiDeg: L.phiDeg, g: L.g, gN,
    ecl, tilt, solar, farhat,
    Tp_ecl: 1296000 / ecl, Tp_tilt: 1296000 / tilt, Tp_solar: 1296000 / solar, Tp_farhat: farhat ? 1296000 / farhat : null,
    trop_ecl_d: solarDays(trop(ecl)), trop_tilt_d: solarDays(trop(tilt)), sid_d: solarDays(Tsid),
    nodeS_yr: nodeS / JULIAN_YEAR_S, nodeJ2_yr: nodeJ2 / JULIAN_YEAR_S, apsS_yr: apsS / JULIAN_YEAR_S, apsJ2_yr: apsJ2 / JULIAN_YEAR_S,
    node_both_yr: 1 / (JULIAN_YEAR_S / nodeS + JULIAN_YEAR_S / nodeJ2), aps_both_yr: 1 / (JULIAN_YEAR_S / apsS + JULIAN_YEAR_S / apsJ2) };
}

const f = (x, d = 3) => x === null || x === undefined ? '—' : (Math.abs(x) >= 1e5 ? x.toExponential(3) : x.toFixed(d));
const EDGE = 4428.98;
const ages = [0, 400, 1000, 1400, 2000, 2460, 3000, 3500, 4000, 4100, 4200, 4229, 4300, 4350, 4380, 4400, 4410, 4420, 4425, 4428, EDGE];
console.log('age Ma | a R⊕ | LOD h | ε̄ ° | J2/J2₀ | r_L R⊕ | a/r_L | φ ° | g | g/g₀ | ψ̇ ecl | ψ̇ tilt | ψ̇ solar-only | Farhat col | T_p ecl yr | T_p tilt yr | T_p solar yr | T_p Farhat yr');
for (const t of ages) {
  const r = row(t); if (!r) { console.log(t, 'null'); continue; }
  console.log([f(r.tMa, 2), f(r.aRE, 3), f(r.lodH, 3), f(r.eps, 3), f(r.j2Ratio, 3), f(r.rL_RE, 2), f(r.aOverRL, 3), f(r.phiDeg, 4), f(r.g, 5), f(r.gN, 5),
    f(r.ecl, 3), f(r.tilt, 3), f(r.solar, 3), f(r.farhat, 3), f(r.Tp_ecl, 2), f(r.Tp_tilt, 2), f(r.Tp_solar, 1), f(r.Tp_farhat, 2)].join(' | '));
}
console.log('\n--- the year and the lunar orbit of date (solar days of date; years Julian) ---');
console.log('age Ma | sidereal yr d | tropical (ecl) d | tropical (tilt) d | node: solar yr | node: J2 yr | node: both yr | perigee: solar yr | perigee: J2 yr | perigee: both yr');
for (const t of [0, 1000, 2460, 4000, 4229, 4300, 4400, 4420, EDGE]) {
  const r = row(t); if (!r) continue;
  console.log([f(r.tMa, 2), f(r.sid_d, 2), f(r.trop_ecl_d, 2), f(r.trop_tilt_d, 2), f(r.nodeS_yr, 2), f(r.nodeJ2_yr, 3), f(r.node_both_yr, 3), f(r.apsS_yr, 2), f(r.apsJ2_yr, 3), f(r.aps_both_yr, 3)].join(' | '));
}
console.log('\n--- crossings (scan at 0.01 Myr near the edge, 1 Myr elsewhere) ---');
let first1pct = null, firstHalfPct = null, cross = { 10: null, 15: null, 17: null, rL: null, rL2: null, rL3: null };
for (let t = 0; t <= EDGE; t += (t >= 4300 ? 0.01 : 1)) {
  const r = row(Math.min(t, EDGE)); if (!r) continue;
  const dev = Math.abs(r.tilt / r.ecl - 1);
  if (first1pct === null && dev > 0.01) first1pct = { t: r.tMa, aRE: r.aRE };
  if (firstHalfPct === null && dev > 0.005) firstHalfPct = { t: r.tMa, aRE: r.aRE };
  for (const k of [10, 15, 17]) if (cross[k] === null && r.aRE < k) cross[k] = r.tMa;
  if (cross.rL === null && r.aOverRL < 1) cross.rL = { t: r.tMa, aRE: r.aRE };
  if (cross.rL2 === null && r.aOverRL < 2) cross.rL2 = { t: r.tMa, aRE: r.aRE };
  if (cross.rL3 === null && r.aOverRL < 3) cross.rL3 = { t: r.tMa, aRE: r.aRE };
}
console.log('first age (from today) where |tilt/ecl − 1| > 0.5 %:', JSON.stringify(firstHalfPct));
console.log('first age (from today) where |tilt/ecl − 1| > 1 %:', JSON.stringify(first1pct));
console.log('a crosses 10 / 15 / 17 R⊕ at Ma:', cross[10], cross[15], cross[17]);
console.log('a = r_L / 2 r_L / 3 r_L at:', JSON.stringify(cross.rL), JSON.stringify(cross.rL2), JSON.stringify(cross.rL3));
console.log('\n--- the inclination to the Laplace plane: the clock at the edge and at 4,400 Ma under i_L = 0, 5.145, 10, 23° ---');
for (const iL of [0, I_M0, 10, 23]) {
  const a = row(EDGE, iL), b = row(4400, iL), c = row(2460, iL);
  console.log(`i_L ${f(iL, 3)}°: T_p tilt edge ${f(a.Tp_tilt, 2)} yr, 4400 Ma ${f(b.Tp_tilt, 2)} yr, 2460 Ma ${f(c.Tp_tilt, 2)} yr (ecl form: ${f(a.Tp_ecl, 2)}, ${f(b.Tp_ecl, 2)}, ${f(c.Tp_ecl, 2)})`);
}
console.log('\n--- the former ecliptic form vs Farhat\'s own precession column (ratio ecl/Farhat; tilt/Farhat) ---');
for (const t of [0, 1000, 2460, 4000, 4300, 4400, 4420, 4428]) { const r = row(t); console.log(t, 'Ma:', f(r.ecl / r.farhat, 4), f(r.tilt / r.farhat, 4)); }
console.log('\n--- the coupled (rigid-lock) bound: the lunar orbit\'s angular momentum loads the precession, valid where a ≪ r_L ---');
const G_KM = 6.6743e-20; // km³ kg⁻¹ s⁻²
for (const t of [0, 2460, 4000, 4300, 4400, 4420, 4425, 4428, EDGE]) {
  const r = row(t); const aKm = r.aRE * R_KM; const lod = r.lodH * 3600;
  const Ls = DT.iEarthAtAge(t) * (2 * Math.PI / lod);                     // kg m² s⁻¹
  const mM = GM_M / G_KM, mE = GM_E / G_KM;
  const LM = (mM * mE / (mE + mM)) * Math.sqrt((GM_E + GM_M) * aKm) * 1e6; // kg m² s⁻¹ (km²→m²)
  const lock = (r.solar * Ls + (1296000 / r.nodeS_yr) * Math.cos(r.eps * D2R) * LM) / (Ls + LM); // ″/yr
  console.log(`${f(t, 2)} Ma: L_M/L_spin ${f(LM / Ls, 3)}; ψ̇ tilt ${f(r.tilt, 2)} ″/yr (T_p ${f(r.Tp_tilt, 1)} yr); ψ̇ lock ${f(lock, 2)} (T_p ${f(1296000 / lock, 1)} yr); ecliptic form T_p ${f(r.Tp_ecl, 2)}`);
}
console.log('\nJ2000 check: r_L', f(row(0).rL_RE, 3), 'R⊕; g(0) =', row(0).g.toFixed(6), '(1 − g₀ =', (1 - row(0).g).toExponential(2), 'of the lunar term, inside the IAU anchor by construction once normalised)');
