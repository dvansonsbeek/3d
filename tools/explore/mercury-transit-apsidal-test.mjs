#!/usr/bin/env node
// Mercury transit timings as a FRAME-FREE test of the apsidal rate.
//
// A transit is the Sun–Mercury–Earth alignment; its instant depends on where
// Mercury's apsidal line physically points and on nothing about any observer's
// coordinate axes. So the question "does Mercury's perihelion advance at the
// Newtonian 531.5 ″/cy, or 43 ″/cy faster?" can be put to the transit record
// without an equator, an equinox or an ecliptic-of-date entering anywhere.
//
// Model: two-body Kepler orbits for Mercury and the Earth–Moon barycentre from
// the Standish (JPL "approx_pos") J2000-ecliptic elements with their secular
// rates; light-time to Mercury and to the Sun; geocentric mid-transit = minimum
// Sun–Mercury separation. The ONLY thing varied is Mercury's ϖ rate:
//   δ = 0        Standish rate 0.16047689 °/cy = 577.7 ″/cy (Newton + GR, fixed J2000 frame)
//   δ = −42.98   the same orbit with the relativistic term removed (the "531" apsis)
// Everything else (a, e, i, Ω, L, n) is identical in both runs; a linear
// (ΔL₀ + Δn·T) is fitted per hypothesis so that epoch/mean-motion errors of the
// approximate elements cannot masquerade as an apsidal signal.
//
// "Observed" column: the NASA/GSFC Mercury-transit catalogue (Espenak),
// ephemeris-computed geocentric greatest-transit instants. These are NOT raw
// timings — they are the DE-ephemeris prediction that the modern observed
// contacts confirm to seconds (2016/2019). The raw-data statement of the same
// test is Morrison & Ward 1975, MNRAS 173, 183: ~2,400 observed internal-contact
// times 1677–1973 give an excess of the observed over the Newtonian perihelion
// motion of +41.9 ± 0.5 ″/cy, the excess being a free parameter of their fit.
//
// The discriminating signature: shifting ϖ at fixed mean longitude changes the
// true longitude by ≈ 2e·cos M · δϖ, and cos M has opposite signs at the
// November transits (near perihelion) and the May transits (near aphelion) —
// so a wrong apsidal rate makes the two families drift APART with time,
// something no ΔL₀/Δn (or ΔT error) can absorb.
//
// MEASURED (53 transits 1631–2019): Newton + GR RMS 87 s, residual drift
// November −9 / May +17 s/cy (the two-body noise floor); Newton-only RMS 244 s,
// drift November +67 / May −159 s/cy — the families walk apart as predicted.
// The scan over δ minimises at δ ≈ +0.1 ″/cy (apsidal rate 577.8 ″/cy);
// δ = −43 raises the RMS 2.8×. From 1800 only, the bowl is shallow (min at
// +18, RMS 82 → 69 s): a two-body model's unmodelled perturbations (±5-min
// outliers 1832, 1891) limit a two-century window to ~±15 ″/cy on the rate;
// Newton-only stays excluded there (177 vs 82 s, drifts +97/−246 s/cy).
// The ±0.5 precision belongs to Morrison & Ward's raw-contact fit, not to
// this instrument. Doc 13 §1.8 "Transits, measured".
//
//   node tools/explore/mercury-transit-apsidal-test.mjs [fromYear=1631]

const D2R = Math.PI / 180, AS = 3600, C_AU_S = 499.004784;   // light-time for 1 au, s
const JD2000 = 2451545.0;

// Standish Table 1 (1800–2050), mean ecliptic & equinox of J2000; rates per Julian century
const EL = {
  mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], i: [7.00497902, -0.00594749],
             L: [252.25032350, 149472.67411175], w: [77.45779628, 0.16047689], O: [48.33076593, -0.12534081] },
  emb:     { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], i: [-0.00001531, -0.01294668],
             L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], O: [0, 0] },
};
const RATE_STANDISH_ASCY = 0.16047689 * AS;   // 577.72 ″/cy
const GR_ASCY = 42.98;

function kepler(M, e) { let E = M + e * Math.sin(M); for (let k = 0; k < 30; k++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-13) break; } return E; }
function helio(el, T, dwAscy = 0, dL0 = 0, dnDegCy = 0) {
  const a = el.a[0] + el.a[1] * T, e = el.e[0] + el.e[1] * T, i = (el.i[0] + el.i[1] * T) * D2R;
  const L = el.L[0] + (el.L[1] + dnDegCy) * T + dL0;
  const w = el.w[0] + (el.w[1] + dwAscy / AS) * T, O = (el.O[0] + el.O[1] * T) * D2R;
  let M = ((L - w) % 360) * D2R; const E = kepler(M, e);
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const om = (w - (el.O[0] + el.O[1] * T)) * D2R;   // argument of perihelion
  const cO = Math.cos(O), sO = Math.sin(O), co = Math.cos(om), so = Math.sin(om), ci = Math.cos(i), si = Math.sin(i);
  return [ (co * cO - so * sO * ci) * xp + (-so * cO - co * sO * ci) * yp,
           (co * sO + so * cO * ci) * xp + (-so * sO + co * cO * ci) * yp,
           (so * si) * xp + (co * si) * yp ];
}
const norm = (v) => Math.hypot(v[0], v[1], v[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (norm(a) * norm(b)))));

// apparent Sun–Mercury separation (rad) at TT Julian day jd, with light-time
function separation(jd, dw, dL0, dn) {
  const T = (jd - JD2000) / 36525;
  const rE = helio(EL.emb, T);
  // Sun: light-time ~ 499 s → Earth position retarded by that amount
  const rEs = helio(EL.emb, (jd - C_AU_S * norm(rE) / 86400 - JD2000) / 36525);
  const sunDir = [-rEs[0], -rEs[1], -rEs[2]];
  let tau = 0, rel;
  for (let k = 0; k < 4; k++) { const rM = helio(EL.mercury, (jd - tau / 86400 - JD2000) / 36525, dw, dL0, dn); rel = sub(rM, rE); tau = C_AU_S * norm(rel); }
  return angle(rel, sunDir);
}
// minimum separation near jd0 (golden-section over ±0.6 d)
function midTransitJD(jd0, dw, dL0, dn) {
  let lo = jd0 - 0.6, hi = jd0 + 0.6; const g = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = separation(x1, dw, dL0, dn), f2 = separation(x2, dw, dL0, dn);
  for (let k = 0; k < 60; k++) { if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = separation(x1, dw, dL0, dn); } else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = separation(x2, dw, dL0, dn); } }
  return (lo + hi) / 2;
}

// ΔT (s), Espenak–Meeus polynomials (NASA eclipse site), for UT → TT of the catalogue instants
function deltaT(y) {
  if (y < 1700) { const t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t * t + t * t * t / 7129; }
  if (y < 1800) { const t = y - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t ** 3 - t ** 4 / 1174000; }
  if (y < 1860) { const t = y - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t ** 3 - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7; }
  if (y < 1900) { const t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
  if (y < 1920) { const t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { const t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
  if (y < 1961) { const t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
  if (y < 1986) { const t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (y < 2005) { const t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  const t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t;
}
function jdUT(y, m, d, hh, mm) { // Gregorian calendar (catalogue dates are Gregorian)
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mmm = m + 12 * a - 3;
  return d + Math.floor((153 * mmm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045 - 0.5 + (hh + mm / 60) / 24;
}

// NASA/GSFC catalogue (Espenak): geocentric greatest transit, UT
const CAT = `1631 Nov 07 07:20
1644 Nov 09 00:57
1651 Nov 03 00:52
1661 May 03 16:54
1664 Nov 04 18:32
1674 May 07 00:16
1677 Nov 07 12:11
1690 Nov 10 05:43
1697 Nov 03 05:42
1707 May 05 23:32
1710 Nov 06 23:22
1723 Nov 09 16:59
1736 Nov 11 10:30
1740 May 02 23:02
1743 Nov 05 10:30
1753 May 06 06:13
1756 Nov 07 04:10
1769 Nov 09 21:46
1776 Nov 02 21:36
1782 Nov 12 15:16
1786 May 04 05:41
1789 Nov 05 15:19
1799 May 07 12:50
1802 Nov 09 08:58
1815 Nov 12 02:33
1822 Nov 05 02:25
1832 May 05 12:25
1835 Nov 07 20:08
1845 May 08 19:37
1848 Nov 09 13:48
1861 Nov 12 07:19
1868 Nov 05 07:14
1878 May 06 19:00
1881 Nov 08 00:57
1891 May 10 02:22
1894 Nov 10 18:35
1907 Nov 14 12:07
1914 Nov 07 12:03
1924 May 08 01:41
1927 Nov 10 05:46
1940 Nov 11 23:21
1953 Nov 14 16:54
1957 May 06 01:14
1960 Nov 07 16:53
1970 May 09 08:16
1973 Nov 10 10:32
1986 Nov 13 04:07
1993 Nov 06 03:57
1999 Nov 15 21:41
2003 May 07 07:52
2006 Nov 08 21:41
2016 May 09 14:57
2019 Nov 11 15:20`.split('\n').map((l) => { const [y, mon, d, hm] = l.split(/\s+/); const [hh, mm] = hm.split(':').map(Number); const m = mon === 'May' ? 5 : 11; const y0 = +y; const jd = jdUT(y0, m, +d, hh, mm) + deltaT(y0 + (m - 1) / 12) / 86400; return { y: y0, season: mon, jdTT: jd }; });

const FROM = parseFloat(process.argv[2] || '1631');
const rows = CAT.filter((r) => r.y >= FROM);

// residual set for an apsidal-rate offset δ (″/cy), with (ΔL0, Δn) fitted by least squares
function residuals(dw) {
  const raw = rows.map((r) => ({ ...r, T: (r.jdTT - JD2000) / 36525, oc: (r.jdTT - midTransitJD(r.jdTT, dw, 0, 0)) * 86400 }));
  // sensitivity of the mid-time to ΔL0 (deg) and Δn (deg/cy), numerically, per transit → linear LS
  const sL = rows.map((r) => (midTransitJD(r.jdTT, dw, 1e-4, 0) - midTransitJD(r.jdTT, dw, 0, 0)) * 86400 / 1e-4);
  const sN = rows.map((r, k) => sL[k] * raw[k].T);
  // solve min Σ (oc − a·sL − b·sN)²
  let Sll = 0, Sln = 0, Snn = 0, Sol = 0, Son = 0;
  for (let k = 0; k < rows.length; k++) { Sll += sL[k] ** 2; Sln += sL[k] * sN[k]; Snn += sN[k] ** 2; Sol += raw[k].oc * sL[k]; Son += raw[k].oc * sN[k]; }
  const det = Sll * Snn - Sln * Sln, a = (Sol * Snn - Son * Sln) / det, b = (Sll * Son - Sln * Sol) / det;
  const res = raw.map((r, k) => ({ ...r, res: r.oc - a * sL[k] - b * sN[k] }));
  const rms = Math.sqrt(res.reduce((s, r) => s + r.res ** 2, 0) / res.length);
  return { res, rms, dL0: a, dn: b };
}

const f = (v, d = 1, w = 9) => v.toFixed(d).padStart(w);
console.log(`Mercury transits ${rows[0].y}–${rows[rows.length - 1].y} (${rows.length} events; catalogue UT → TT via Espenak–Meeus ΔT)`);
console.log(`apsidal rate: Standish ${RATE_STANDISH_ASCY.toFixed(2)} ″/cy (J2000 frame, Newton + GR); alternative = that − ${GR_ASCY} = ${(RATE_STANDISH_ASCY - GR_ASCY).toFixed(2)} ″/cy\n`);

const H = { 'Newton + GR (δ = 0)': residuals(0), [`Newton only (δ = −${GR_ASCY})`]: residuals(-GR_ASCY) };
console.log('year  season   O−C after (ΔL0, Δn) fit, seconds:   Newton+GR    Newton-only');
const A = H['Newton + GR (δ = 0)'].res, B = H[`Newton only (δ = −${GR_ASCY})`].res;
for (let k = 0; k < A.length; k++) console.log(`${A[k].y}   ${A[k].season}    ${f(A[k].res, 0, 32)} ${f(B[k].res, 0, 14)}`);
for (const [nm, h] of Object.entries(H)) {
  const nov = h.res.filter((r) => r.season === 'Nov'), may = h.res.filter((r) => r.season === 'May');
  const slope = (v) => { const n = v.length, mx = v.reduce((s, r) => s + r.T, 0) / n, my = v.reduce((s, r) => s + r.res, 0) / n; let sxy = 0, sxx = 0; for (const r of v) { sxy += (r.T - mx) * (r.res - my); sxx += (r.T - mx) ** 2; } return sxy / sxx; };
  console.log(`\n${nm}: RMS ${h.rms.toFixed(1)} s   (fitted ΔL0 ${(h.dL0 * 3600).toFixed(1)}″, Δn ${(h.dn * 3600).toFixed(1)}″/cy)   residual drift: November ${slope(nov).toFixed(1)} s/cy · May ${slope(may).toFixed(1)} s/cy`);
}

// scan δ: which apsidal rate does the transit record want?
console.log('\nscan of the apsidal-rate offset δ (″/cy) — RMS of the fitted residuals:');
let best = null; const scan = [];
for (let dw = -70; dw <= 20; dw += 2) { const r = residuals(dw); scan.push([dw, r.rms]); if (!best || r.rms < best.rms) best = { dw, rms: r.rms }; }
console.log(scan.map(([dw, rms]) => `${dw >= 0 ? '+' : ''}${dw}:${rms.toFixed(0)}s`).join('  '));
// parabola through the minimum for a finer estimate
const i = scan.findIndex(([dw]) => dw === best.dw), p = scan[Math.max(0, i - 1)], q = scan[i], r = scan[Math.min(scan.length - 1, i + 1)];
const denom = (p[0] - q[0]) * (p[0] - r[0]) * (q[0] - r[0]);
const aa = (r[0] * (q[1] - p[1]) + q[0] * (p[1] - r[1]) + p[0] * (r[1] - q[1])) / denom;
const bb = (r[0] ** 2 * (p[1] - q[1]) + q[0] ** 2 * (r[1] - p[1]) + p[0] ** 2 * (q[1] - r[1])) / denom;
const dwBest = -bb / (2 * aa);
console.log(`best δ ≈ ${dwBest.toFixed(1)} ″/cy → apsidal rate ${(RATE_STANDISH_ASCY + dwBest).toFixed(1)} ″/cy; the Newton-only apsis (δ = −${GR_ASCY}) is excluded by the residual drift above.`);
console.log('Raw-data statement of this test: Morrison & Ward 1975 (MNRAS 173, 183) — ~2,400 observed internal contacts 1677–1973: excess over Newtonian +41.9 ± 0.5 ″/cy.');
