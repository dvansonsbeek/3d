/**
 * derive-moon-correction-content.js — D5 patch-content analysis: what physics
 * do the fitted MOON_CORRECTION patches absorb?
 *
 * The 3-term MOON_CORRECTION (RA/Dec sinusoids at arguments D, M′, M_sun,
 * fitted against JPL DE440) has a suspicious signature: its largest
 * coefficient raCosD = −0.005654° is 99.3% of the annual aberration constant
 * κ = 20.49552″ = 0.0056932°. Hypothesis: the patches are OPTICAL corrections
 * (annual aberration + lunar light-time — DE440 apparent-place content the
 * geometric scene lacks), not missing gravity.
 *
 * Test (numeric, framework-native): over ~19 years,
 *   1. take the model's Moon direction (RA/Dec) and the Earth velocity
 *      (numerical derivative of the geocentric Sun vector — framework Sun),
 *   2. compute the classical aberration displacement û′ = norm(û + v/c) and
 *      the lunar light-time displacement −(d/c)·d(û)/dt,
 *   3. project the predicted Δ(RA)/Δ(Dec) series onto the EXACT basis the
 *      patch uses (sin/cos of Meeus D, M′, M_sun polynomial arguments),
 *   4. compare predicted coefficients against the fitted MOON_CORRECTION.
 *
 * Sign convention: the patch is SUBTRACTED from the model RA/Dec to match
 * DE440. If DE440 reference places include aberration while the scene is
 * geometric, then patch ≈ −(aberration + light-time) projections.
 *
 * Usage: node tools/explore/derive-moon-correction-content.js [years=19]
 */

const C = require('../lib/constants');
const SG = require('../lib/scene-graph');

const YEARS = parseFloat(process.argv[2] || '19');
const d2r = Math.PI / 180;
const c_km_s = C.speedOfLight;                       // framework physical constant
const AU_KM = C.currentAUDistance;

// framework Sun (Meeus Ch.25 form — same source the eclipse machinery uses)
function sunGeoVec(jd) {
  const T = (jd - C.j2000JD) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * d2r;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const Ceq = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const lam = (L0 + Ceq) * d2r;
  const v = M + Ceq * d2r;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(v)) * AU_KM;
  const eps = (23.439291 - 0.0130042 * T) * d2r;
  return [R * Math.cos(lam), R * Math.sin(lam) * Math.cos(eps), R * Math.sin(lam) * Math.sin(eps)];  // equatorial frame
}

// Earth velocity (km/s) = −d/dt of the geocentric Sun vector
function earthVel(jd) {
  const h = 0.02;                                    // days
  const a = sunGeoVec(jd - h), b = sunGeoVec(jd + h);
  return [-(b[0] - a[0]), -(b[1] - a[1]), -(b[2] - a[2])].map(x => x / (2 * h * 86400));
}

// Moon unit vector + distance from the model (equatorial frame)
function moonDir(jd) {
  const p = SG.computePlanetPosition('moon', jd);
  const ra = SG.thetaToRaDeg(p.ra) * d2r, dec = SG.phiToDecDeg(p.dec) * d2r;
  return { u: [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)],
           ra, dec, dKm: p.distAU * AU_KM };
}

function raDecOf(u) {
  const r = Math.hypot(u[0], u[1], u[2]);
  return { ra: Math.atan2(u[1], u[0]), dec: Math.asin(u[2] / r) };
}

// ── sample predicted optical displacements ─────────────────────────────────
const jd0 = C.j2000JD - (YEARS / 2) * 365.25;
const STEP = 0.5;                                    // days
const Nn = Math.round(YEARS * 365.25 / STEP);
const rows = [];
for (let i = 0; i <= Nn; i++) {
  const jd = jd0 + i * STEP;
  const m = moonDir(jd);
  const v = earthVel(jd);
  // annual aberration: û′ = normalize(û + v/c)
  const ab = [m.u[0] + v[0] / c_km_s, m.u[1] + v[1] / c_km_s, m.u[2] + v[2] / c_km_s];
  const abRD = raDecOf(ab);
  // lunar light-time: apparent = position at t − d/c
  const dtLT = (m.dKm / c_km_s) / 86400;             // days
  const mLT = moonDir(jd - dtLT);
  const dRA_ab = (abRD.ra - m.ra), dDec_ab = (abRD.dec - m.dec);
  const dRA_lt = (mLT.ra - m.ra), dDec_lt = (mLT.dec - m.dec);
  const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  // patch argument polynomials (EXACTLY as MOON_CORRECTION applies them)
  const dJD = jd - C.j2000JD;
  rows.push({
    D: (297.850 + 12.19074912 * dJD) * d2r,
    Mp: (134.963 + 13.06499295 * dJD) * d2r,
    Ms: (357.529 + 0.98560028 * dJD) * d2r,
    dRA: wrap(dRA_ab + dRA_lt) / d2r, dDec: wrap(dDec_ab + dDec_lt) / d2r,
    dRA_ab: wrap(dRA_ab) / d2r, dDec_ab: wrap(dDec_ab) / d2r,
  });
}
console.log(`sampled ${rows.length} epochs over ${YEARS} yr (κ check: 2π·AU/(c·T_yr)/√(1−e²) = ${(2 * Math.PI * AU_KM / (c_km_s * 365.25636 * 86400) / Math.sqrt(1 - 0.016710 ** 2) / d2r * 3600).toFixed(3)}″)`);

// ── project onto the patch basis (6 args per coordinate, joint LSQ) ────────
function project(series, useAb) {
  const basis = rows.map(r => [Math.sin(r.D), Math.cos(r.D), Math.sin(r.Mp), Math.cos(r.Mp), Math.sin(r.Ms), Math.cos(r.Ms)]);
  const K = 6, G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K);
  for (let i = 0; i < rows.length; i++) {
    const y = series(rows[i]);
    for (let k = 0; k < K; k++) {
      b[k] += y * basis[i][k];
      for (let j = k; j < K; j++) G[k][j] += basis[i][k] * basis[i][j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const M = G.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < K; col++) {
    let piv = col; for (let r = col + 1; r < K; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = col + 1; r < K; r++) { const f = M[r][col] / M[col][col]; for (let cc = col; cc <= K; cc++) M[r][cc] -= f * M[col][cc]; }
  }
  const x = new Float64Array(K);
  for (let col = K - 1; col >= 0; col--) {
    let s = M[col][K]; for (let cc = col + 1; cc < K; cc++) s -= M[col][cc] * x[cc];
    x[col] = s / M[col][col];
  }
  return x;
}

const mc = C.MOON_CORRECTION;
const names = ['sinD', 'cosD', 'sinMp', 'cosMp', 'sinMs', 'cosMs'];
const fitRA = { sinD: mc.raSinD, cosD: mc.raCosD, sinMp: mc.raSinMp, cosMp: mc.raCosMp, sinMs: mc.raSinMs, cosMs: mc.raCosMs };
const fitDec = { sinD: mc.decSinD, cosD: mc.decCosD, sinMp: mc.decSinMp, cosMp: mc.decCosMp, sinMs: mc.decSinMs, cosMs: mc.decCosMs };

// predicted patch = −(optical displacement) [patch is subtracted from model]
const predRA = project(r => -r.dRA);
const predDec = project(r => -r.dDec);
const predRA_ab = project(r => -r.dRA_ab);
const predDec_ab = project(r => -r.dDec_ab);

console.log('\n── RA coefficients (deg): predicted −(aberration+light-time) vs fitted MOON_CORRECTION ──');
console.log('  term     predicted     (ab only)      fitted        pred/fit');
for (let k = 0; k < 6; k++) {
  const f = fitRA[names[k]];
  console.log(`  ${names[k].padEnd(6)} ${predRA[k].toFixed(6).padStart(11)}  ${predRA_ab[k].toFixed(6).padStart(11)}  ${f.toFixed(6).padStart(11)}   ${(f !== 0 ? (predRA[k] / f * 100).toFixed(1) + '%' : '—').padStart(8)}`);
}
console.log('\n── Dec coefficients (deg) ──');
console.log('  term     predicted     (ab only)      fitted        pred/fit');
for (let k = 0; k < 6; k++) {
  const f = fitDec[names[k]];
  console.log(`  ${names[k].padEnd(6)} ${predDec[k].toFixed(6).padStart(11)}  ${predDec_ab[k].toFixed(6).padStart(11)}  ${f.toFixed(6).padStart(11)}   ${(f !== 0 ? (predDec[k] / f * 100).toFixed(1) + '%' : '—').padStart(8)}`);
}
const rms = (pred, fit) => {
  let sp = 0, sf = 0;
  for (let k = 0; k < 6; k++) { sp += (pred[k] - fit[names[k]]) ** 2; sf += fit[names[k]] ** 2; }
  return Math.sqrt(sp / sf);
};
console.log(`\nresidual/​fitted RMS: RA ${(rms(predRA, fitRA) * 100).toFixed(1)}%   Dec ${(rms(predDec, fitDec) * 100).toFixed(1)}%`);
console.log('Small residual ⇒ the patches ARE optics (aberration + light-time), derivable');
console.log('from the framework speed of light — D5 reclassification: optical, not gravity.');
