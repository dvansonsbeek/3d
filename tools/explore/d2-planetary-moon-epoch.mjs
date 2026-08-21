// STAGE D2 — A2 COMPLETION: the DERIVED planetary-Moon terms, EPOCH-PHASED
// (plan §12i item 10, A2 completion block; method pre-registered there).
//
// MEASURED OUTCOME (2026-08-21): extraction SUCCEEDS — V−E +0.849″ sin
// (JPL target +0.85), E−J −0.681″ (target −0.69; epoch-phasing fixed
// A2-bare's −0.56), content 0.896″ λ / 0.074″ β. JPL out-of-sample:
// all-phase λ 3.12 → 3.03″ (sign-flip control 3.47″), syzygy fleet
// 3.99 → 3.82″ improving in every era. STATUS: BANKED, NOT SHIPPED —
// the pre-registered centerline criterion failed (2.22 → 2.68″, the A1
// correlated-subsample effect on the 13 tracked events, measured: they
// sit −1.58″ below the +1.37″ fleet mean; the era split refutes anchor
// double-counting). Full record: plan §12i A2 block.
// Resolves both queued A2 refinements:
//  (i) epoch-realistic ICs at t0: planet phases from the engine graph
//      (the validated Phase-C extraction), EMB from framework sun λ/ϖ/e,
//      and the MOON placed at its true epoch Delaunay phases
//      (Ω₀ = L′−F, ω₀ = F−Mp, ν₀ from Kepler(Mp, e)) — the mixed
//      V−E±Mp / ±2D terms need the Moon's real phase;
//  (ii) PER-SYSTEM ARGUMENT RATES: the fit uses arguments built from the
//      FULL run's OWN measured angle series (the A2-bare method that
//      produced the clean 0.92″ extraction) — real-polynomial arguments
//      leak catastrophically (measured here: absorber D 41″, planetary
//      rows contaminated to 7.8″) because the systems' lunar rates
//      differ slightly from the sky's. Epoch-phasing makes the run-own
//      phases REAL at t0, so the fitted cos/sin transfer to the
//      instrument polynomials (rate-mismatch phase drift reported and
//      checked ≤ a few degrees over the window).
//  FRAME: the Moon's λ/β are measured in each system's OWN of-date EMB
//      orbital plane — in a fixed frame the full system's EMB-plane
//      precession (absent in base) leaks into β and the F-argument rows.
// Twin systems both carry J2 (full = planets+J2, base = J2 only): the
// differential is J2-clean planetary content.
// Absorber rows (main-problem args, plain + T-modulated) soak up the
// residual rate-drift leakage and are DISCARDED at shipping.
// Usage: node tools/explore/d2-planetary-moon-epoch.mjs [years=120] [dt=0.01]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const D1 = require(ROOT + 'tools/explore/derive-meeus-amplitudes.js');
const SG = require(ROOT + 'tools/lib/scene-graph.js');
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);

const model = createModel(DEFAULT_CONSTANTS);
const D2R = Math.PI / 180, R2D = 180 / Math.PI, DAY = 86400, AS = 3600;
const YEARS = parseFloat(process.argv[2] || '120');
const DT = parseFloat(process.argv[3] || '0.01');
const HERE = fileURLToPath(new URL('.', import.meta.url));

// window 1960–2080 covers the 960-LCG JPL validation epochs (1970–2049)
const JD0 = model.time.jdFromYear(1960);

// ── real planet longitudes at t0 from the engine graph (Phase-C method) ──
SG.computePlanetPosition('venus', JD0);
const g = SG._getGraphForProbe();
const wp = (n) => n.getWorldPosition();
const sunW = wp(g.sunNodes.pivot), earthW = wp(g.earthNodes.pivot);
const lamG = (v) => Math.atan2(v[2] - sunW[2], v[0] - sunW[0]) * R2D;
const lamEg = lamG(earthW);
const lamE = (model.eclipse.sunLonDegAtJD(JD0) + 180) % 360;
const lamPlanet = {};
for (const k of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
  lamPlanet[k] = ((lamE - (lamG(wp(g.planetNodeMap[k].planet.pivot)) - lamEg)) + 720) % 360;
}

// ── lab constants (mirroring d2-derived-sun conventions) ─────────────────
const labC = require(ROOT + 'tools/lib/constants.js');
const GM_S = 1.327124e11;
const GM_EM = P.GM_EM;
const MASS_RATIO_EM = labC.MASS_RATIO_EARTH_MOON ?? 81.30056816;
const GM_M = GM_EM / (1 + MASS_RATIO_EM);
const GM_E = GM_EM - GM_M;
const GM_HELIO = GM_S + GM_EM;
const T_SID_YR_S = (labC.meanSiderealYearSeconds ?? 31558149.7635);

function keplerPosVel(gm, a, e, inc, Om, w, nu) {
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const h = Math.sqrt(gm * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu);
  const vxp = -gm / h * Math.sin(nu), vyp = gm / h * (e + Math.cos(nu));
  const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(inc), si = Math.sin(inc);
  const R = [cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si,
    sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si,
    sw * si, cw * si, ci];
  const rot = (x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
  return { r: rot(xp, yp, 0), v: rot(vxp, vyp, 0) };
}

// ── EMB epoch phase from the framework sun ───────────────────────────────
const y0 = model.time.yearFromJD(JD0);
const periE = model.earth.perihelionLongitudeDeg(y0);
const eccE = model.earth.eccentricity(y0);
const nuE = ((lamE - periE) % 360) * D2R;

// ── MOON epoch phase from the instrument Delaunay polynomials ────────────
const Tj = (JD0 - 2451545.0) / 36525;
const degW = (v) => ((v % 360) + 360) % 360;
const Lp0 = degW(218.3164477 + (481267.88123421 - 0.0015786 * Tj) * Tj);
const D0 = degW(297.8501921 + (445267.1114034 - 0.0018819 * Tj) * Tj);
const Mp0 = degW(134.9633964 + (477198.8675055 + 0.0087414 * Tj) * Tj);
const F0 = degW(93.2720950 + (483202.0175233 - 0.0036539 * Tj) * Tj);
const { eIC, iIC, aIC } = D1.calibrate(undefined, true);
const Om0 = degW(Lp0 - F0) * D2R;         // mean node
const w0 = degW(F0 - Mp0) * D2R;          // argument of perigee
let Ekep = Mp0 * D2R;                     // Kepler: M → E → ν
for (let it = 0; it < 12; it++) Ekep = Mp0 * D2R + eIC * Math.sin(Ekep);
const nu0 = 2 * Math.atan2(Math.sqrt(1 + eIC) * Math.sin(Ekep / 2), Math.sqrt(1 - eIC) * Math.cos(Ekep / 2));
console.log(`t0 JD ${JD0.toFixed(2)} (1960): planet λ ` + Object.entries(lamPlanet).map(([k, v]) => `${k.slice(0, 2)} ${v.toFixed(1)}°`).join(' ')
  + ` | moon L′ ${Lp0.toFixed(1)} D ${D0.toFixed(1)} Mp ${Mp0.toFixed(1)} F ${F0.toFixed(1)}`);

function buildSystem(withPlanets) {
  const gms = [GM_S, GM_E, GM_M];
  const a_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
  const emb = keplerPosVel(GM_HELIO, a_EMB, eccE, 0, 0, periE * D2R, nuE);
  const rel = keplerPosVel(GM_EM, aIC, eIC, iIC, Om0, w0, nu0);
  const states = [
    { r: [0, 0, 0], v: [0, 0, 0] },
    { r: emb.r.map((x, k) => x - rel.r[k] * GM_M / GM_EM), v: emb.v.map((x, k) => x - rel.v[k] * GM_M / GM_EM) },
    { r: emb.r.map((x, k) => x + rel.r[k] * GM_E / GM_EM), v: emb.v.map((x, k) => x + rel.v[k] * GM_E / GM_EM) },
  ];
  if (withPlanets) {
    for (const p of P.PLANETS) {
      const a = Math.cbrt((GM_S + p.gm) * Math.pow(p.T_days * DAY / (2 * Math.PI), 2));
      const lam = lamPlanet[p.key];
      const nu = ((lam * D2R) - (p.Om + p.w));
      states.push(keplerPosVel(GM_S + p.gm, a, p.e, p.inc, p.Om, p.w, nu));
      gms.push(p.gm);
    }
  }
  const Mtot = gms.reduce((s, x) => s + x, 0);
  const rB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.r[k], 0) / Mtot);
  const vB = [0, 1, 2].map((k) => states.reduce((s, st, i) => s + gms[i] * st.v[k], 0) / Mtot);
  const n = states.length;
  const Y = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    Y[3 * i + k] = states[i].r[k] - rB[k];
    Y[3 * n + 3 * i + k] = states[i].v[k] - vB[k];
  }
  return { Y, gms, n };
}

function integrate(withPlanets, years, dt) {
  const { Y, gms, n } = buildSystem(withPlanets);
  const deriv = P.makeDeriv(gms, n, true);          // J2 ON in both systems
  const h = dt * DAY;
  const steps = Math.round(years * 365.25 / dt);
  const sampleEvery = Math.max(1, Math.round(0.25 / dt));
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
  const fE = GM_E / GM_EM, fM = GM_M / GM_EM;
  const jV = withPlanets ? 3 + P.PLANET_KEYS.indexOf('venus') : -1;
  const jJ = withPlanets ? 3 + P.PLANET_KEYS.indexOf('jupiter') : -1;
  const jMa = withPlanets ? 3 + P.PLANET_KEYS.indexOf('mars') : -1;
  const jSa = withPlanets ? 3 + P.PLANET_KEYS.indexOf('saturn') : -1;
  const S = { t: [], lam: [], bet: [], lamS: [], lamV: [], lamJ: [], lamMa: [], lamSa: [], w: [] };
  for (let s = 0; s <= steps; s++) {
    if (s % sampleEvery === 0) {
      // own-plane frame: the system's of-date EMB orbital plane normal
      const ex = fE * Y[3] + fM * Y[6] - Y[0], ey = fE * Y[4] + fM * Y[7] - Y[1], ez = fE * Y[5] + fM * Y[8] - Y[2];
      const evx = fE * Y[3 * n + 3] + fM * Y[3 * n + 6] - Y[3 * n], evy = fE * Y[3 * n + 4] + fM * Y[3 * n + 7] - Y[3 * n + 1], evz = fE * Y[3 * n + 5] + fM * Y[3 * n + 8] - Y[3 * n + 2];
      let nx = ey * evz - ez * evy, ny = ez * evx - ex * evz, nz = ex * evy - ey * evx;
      const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn;
      // in-plane basis: X = ex_inertial projected into the plane, Yb = n × X
      let Xx = 1 - nx * nx, Xy = -nx * ny, Xz = -nx * nz;
      const Xn = Math.hypot(Xx, Xy, Xz); Xx /= Xn; Xy /= Xn; Xz /= Xn;
      const Yx = ny * Xz - nz * Xy, Yy = nz * Xx - nx * Xz, Yz = nx * Xy - ny * Xx;
      const proj = (vx, vy, vz) => [vx * Xx + vy * Xy + vz * Xz, vx * Yx + vy * Yy + vz * Yz, vx * nx + vy * ny + vz * nz];
      const rm = proj(Y[6] - Y[3], Y[7] - Y[4], Y[8] - Y[5]);          // moon − earth
      const rs = proj(Y[0] - Y[3], Y[1] - Y[4], Y[2] - Y[5]);          // sun − earth
      S.t.push(s * dt);
      S.lam.push(Math.atan2(rm[1], rm[0]));
      S.bet.push(Math.atan2(rm[2], Math.hypot(rm[0], rm[1])));
      S.lamS.push(Math.atan2(rs[1], rs[0]));
      // planets HELIOCENTRIC (the lab convention): circulating arguments;
      // geocentric planet − geocentric sun is bounded for inner planets and
      // degenerates the LSQ (measured: 3e6″ cancellation pairs).
      // VE_run = lamV − lamS carries a π offset ((lV−lE)−π) — flipped at ship time.
      if (jV > 0) {
        S.lamV.push(Math.atan2(Y[3 * jV + 1] - Y[1], Y[3 * jV] - Y[0]));
        S.lamJ.push(Math.atan2(Y[3 * jJ + 1] - Y[1], Y[3 * jJ] - Y[0]));
        S.lamMa.push(Math.atan2(Y[3 * jMa + 1] - Y[1], Y[3 * jMa] - Y[0]));
        S.lamSa.push(Math.atan2(Y[3 * jSa + 1] - Y[1], Y[3 * jSa] - Y[0]));
      }
      // lunar perigee angle (Laplace vector, in-plane) for Mp_run
      const vm = proj(Y[3 * n + 6] - Y[3 * n + 3], Y[3 * n + 7] - Y[3 * n + 4], Y[3 * n + 8] - Y[3 * n + 5]);
      const hx = rm[1] * vm[2] - rm[2] * vm[1], hy = rm[2] * vm[0] - rm[0] * vm[2], hz = rm[0] * vm[1] - rm[1] * vm[0];
      const rn = Math.hypot(rm[0], rm[1], rm[2]);
      S.w.push(Math.atan2((vm[2] * hx - vm[0] * hz) / GM_EM - rm[1] / rn, (vm[1] * hz - vm[2] * hy) / GM_EM - rm[0] / rn));
    }
    deriv(Y, k1);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
    deriv(tmp, k2);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
    deriv(tmp, k3);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
    deriv(tmp, k4);
    for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  for (const k of ['lam', 'lamS', 'lamV', 'lamJ', 'lamMa', 'lamSa', 'w']) if (S[k].length) S[k] = P.unwrap(S[k]);
  return S;
}

console.log(`integrating base(J2) + full(planets+J2), ${YEARS} yr @ dt ${DT} ...`);
const tc = Date.now();
const B = integrate(false, YEARS, DT);
const F = integrate(true, YEARS, DT);
console.log(`done ${((Date.now() - tc) / 1000).toFixed(0)} s (${B.t.length} samples)`);

// differentials in arcsec, quadratic-detrended
const N = B.t.length;
function detrend2(v, t) {
  let s0 = N, s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < N; i++) { const x = t[i] / 36525, x2 = x * x;
    s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2; b0 += v[i]; b1 += v[i] * x; b2 += v[i] * x2; }
  const M = [[s0, s1, s2, b0], [s1, s2, s3, b1], [s2, s3, s4, b2]];
  for (let c = 0; c < 3; c++) {
    let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < 3; r++) { const f = M[r][c] / M[c][c]; for (let cc = c; cc < 4; cc++) M[r][cc] -= f * M[c][cc]; }
  }
  const c2 = M[2][3] / M[2][2], c1 = (M[1][3] - M[1][2] * c2) / M[1][1], c0 = (M[0][3] - M[0][1] * c1 - M[0][2] * c2) / M[0][0];
  return v.map((y, i) => { const x = t[i] / 36525; return y - (c0 + c1 * x + c2 * x * x); });
}
const dLam = detrend2(B.t.map((_, i) => (F.lam[i] - B.lam[i]) * R2D * AS), B.t);
const dBet = detrend2(B.t.map((_, i) => (F.bet[i] - B.bet[i]) * R2D * AS), B.t);
const rms = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
console.log(`planetary differential (own-plane): λ raw RMS ${rms(dLam).toFixed(2)}″ · β raw RMS ${rms(dBet).toFixed(2)}″`);

// ── PER-SYSTEM run-own arguments: linear models from the FULL run ────────
const lin = (arr) => P.linFit(F.t, arr);
const fLam = lin(F.lam), fLamS = lin(F.lamS), fW = lin(F.w);
const fV = lin(F.lamV), fJ = lin(F.lamJ), fMa = lin(F.lamMa), fSa = lin(F.lamSa);
const runArg = (i) => {
  const t = B.t[i];
  const L = fLam.a + fLam.b * t, LS = fLamS.a + fLamS.b * t, W = fW.a + fW.b * t;
  const Tc = (JD0 + t - 2451545.0) / 36525;
  return {
    D: L - LS, Mp: L - W,
    // annual (EMB anomaly) from the real polynomial — the year rate is
    // matched to ~1e-7, so real-arg drift is negligible for the absorbers
    M: (357.5291092 + (35999.0502909 - 0.0001536 * Tc) * Tc) * D2R,
    VE: (fV.a + fV.b * t) - LS, EJ: LS - (fJ.a + fJ.b * t),
    EMa: LS - (fMa.a + fMa.b * t), ESa: LS - (fSa.a + fSa.b * t),
    T: t / 36525,
  };
};
// rate check: run-arg rates vs the real instrument polynomials (rad/day)
const realRates = { D: (445267.1114034 / 36525) * D2R, Mp: (477198.8675055 / 36525) * D2R,
  VE: ((58517.815676 - 36000.769780) / 36525) * D2R, EJ: ((36000.769780 - 3036.302389) / 36525) * D2R,
  EMa: ((36000.769780 - 19141.696300) / 36525) * D2R, ESa: ((36000.769780 - 1223.511013) / 36525) * D2R };
const runRates = { D: fLam.b - fLamS.b, Mp: fLam.b - fW.b, VE: fV.b - fLamS.b, EJ: fLamS.b - fJ.b, EMa: fLamS.b - fMa.b, ESa: fLamS.b - fSa.b };
// NOTE the D/Mp rows of the rate check read ~−0.33°/d: the lab Moon's own
// month is 28.02 d (3-body mean-motion reduction on the calibrated aIC;
// lamS is exact, w close). EXPECTED and harmless — D1/A1 shipped the same
// way: fitted cos/sin are response coefficients w.r.t. the ANGLES, and the
// k-combos re-expressed on the real polynomials carry the real frequencies
// (the A1 JPL out-of-sample confirmed the transfer). The check is
// decision-grade only for the SLOW planetary args (VE/EJ/EMa/ESa), where
// annual-band leakage could misassign tones — those must stay ≤ a few °.
console.log(`absolute run rates °/d: lam ${(fLam.b * R2D).toFixed(4)} (real 13.1764) · lamS ${(fLamS.b * R2D).toFixed(4)} (real 0.9856) · w ${(fW.b * R2D).toFixed(4)} (real 0.1114)`);
console.log('run-arg rate check (Δphase over the full window, °; D/Mp: lab-month offset, expected):');
for (const k of Object.keys(realRates)) {
  const dphi = (runRates[k] - realRates[k]) * YEARS * 365.25 * R2D;
  console.log(`  ${k.padEnd(4)} ${dphi.toFixed(2)}°`);
}

/** planetary candidates (SHIPPABLE rows) — name, run-argFn */
const PLAN = [
  ['V-E', (a) => a.VE], ['2(V-E)', (a) => 2 * a.VE], ['3(V-E)', (a) => 3 * a.VE],
  ['E-J', (a) => a.EJ], ['2(E-J)', (a) => 2 * a.EJ],
  ['E-Ma', (a) => a.EMa], ['2(E-Ma)', (a) => 2 * a.EMa], ['E-Sa', (a) => a.ESa],
  ['V-E+2D', (a) => a.VE + 2 * a.D], ['V-E-2D', (a) => a.VE - 2 * a.D],
  ['E-J+2D', (a) => a.EJ + 2 * a.D], ['E-J-2D', (a) => a.EJ - 2 * a.D],
  ['V-E+Mp', (a) => a.VE + a.Mp], ['V-E-Mp', (a) => a.VE - a.Mp],
  ['E-J+Mp', (a) => a.EJ + a.Mp], ['E-J-Mp', (a) => a.EJ - a.Mp],
  ['E-Ma+Mp', (a) => a.EMa + a.Mp], ['E-Ma-Mp', (a) => a.EMa - a.Mp],
];
/** main-problem absorbers on run args (leakage sinks) — DISCARDED at shipping.
 *  Includes the ANNUAL (M) family: the EMB e/ϖ secular drift between systems
 *  leaks EoC-coupled content — the Phase-C secular-perihelion channel. */
const ABS_L = [
  ['Mp', (a) => a.Mp], ['2D-Mp', (a) => 2 * a.D - a.Mp], ['2D', (a) => 2 * a.D], ['2Mp', (a) => 2 * a.Mp],
  ['2D-2Mp', (a) => 2 * (a.D - a.Mp)], ['2D+Mp', (a) => 2 * a.D + a.Mp], ['D', (a) => a.D],
  ['M', (a) => a.M], ['2M', (a) => 2 * a.M],
  ['Mp-M', (a) => a.Mp - a.M], ['Mp+M', (a) => a.Mp + a.M],
  ['2D-Mp-M', (a) => 2 * a.D - a.Mp - a.M], ['2D-Mp+M', (a) => 2 * a.D - a.Mp + a.M],
  ['2D-M', (a) => 2 * a.D - a.M],
];
function jointFit(y, plan, abs) {
  const K = plan.length * 2 + abs.length * 4;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < N; i++) {
    const a = runArg(i);
    let c = 0;
    for (const [, fn] of plan) { const th = fn(a); row[c++] = Math.cos(th); row[c++] = Math.sin(th); }
    for (const [, fn] of abs) { const th = fn(a), ct = Math.cos(th), st = Math.sin(th);
      row[c++] = ct; row[c++] = st; row[c++] = a.T * ct; row[c++] = a.T * st; }
    for (let k = 0; k < K; k++) {
      const rk = row[k]; b[k] += rk * y[i]; const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b);
  for (let c = 0; c < K; c++) {
    let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
    [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
    for (let r = c + 1; r < K; r++) {
      const f = Gm[r][c] / Gm[c][c];
      for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc];
      x[r] -= f * x[c];
    }
  }
  const out = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * out[cc];
    out[c] = s / Gm[c][c];
  }
  let ss = 0;
  for (let i = 0; i < N; i += 4) {
    const a = runArg(i);
    let f = 0, c = 0;
    for (const [, fn] of plan) { const th = fn(a); f += out[c++] * Math.cos(th) + out[c++] * Math.sin(th); }
    for (const [, fn] of abs) { const th = fn(a), ct = Math.cos(th), st = Math.sin(th);
      f += out[c++] * ct + out[c++] * st + out[c++] * a.T * ct + out[c++] * a.T * st; }
    ss += (y[i] - f) ** 2;
  }
  return { x: out, resid: Math.sqrt(ss / Math.ceil(N / 4)) };
}

console.log('\nλ joint fit (planetary on run-own args + absorbers)...');
const fitL = jointFit(dLam, PLAN, ABS_L);
console.log('  PLANETARY λ terms (A2-bare/JPL targets: V−E +0.81/+0.85 · E−J −0.56/−0.69):');
const tableL = [];
let rssL = 0;
for (let c = 0; c < PLAN.length; c++) {
  const co = fitL.x[2 * c], si = fitL.x[2 * c + 1], am = Math.hypot(co, si);
  rssL += am * am;
  if (am >= 0.03) { console.log(`    ${PLAN[c][0].padEnd(9)} cos ${co.toFixed(3).padStart(7)}  sin ${si.toFixed(3).padStart(7)}  amp ${am.toFixed(3)}`); tableL.push({ name: PLAN[c][0], cos: co, sin: si, amp: am }); }
}
console.log(`  planetary λ content RMS ${Math.sqrt(rssL / 2).toFixed(3)}″ · fit residual ${fitL.resid.toFixed(3)}″`);
console.log('  absorber λ amps (leak diagnostic, NOT shipped):');
for (let c = 0; c < ABS_L.length; c++) {
  const o = PLAN.length * 2 + 4 * c;
  const am = Math.hypot(fitL.x[o], fitL.x[o + 1]), amT = Math.hypot(fitL.x[o + 2], fitL.x[o + 3]);
  if (am >= 0.03 || amT >= 0.03) console.log(`    ${ABS_L[c][0].padEnd(9)} amp ${am.toFixed(3)}″  T-mod ${amT.toFixed(3)}″/cy`);
}

console.log('\nβ joint fit (planetary β candidates + main-β absorbers)...');
let bestB = [];
{
  const cands = [
    ['V-E+F', (a, Fr) => a.VE + Fr], ['V-E-F', (a, Fr) => a.VE - Fr],
    ['E-J+F', (a, Fr) => a.EJ + Fr], ['E-J-F', (a, Fr) => a.EJ - Fr],
  ];
  // F_run from the real F polynomial (β tones are ~0.1″ — real-arg drift acceptable at this size)
  const Fr = (i) => { const T = (JD0 + B.t[i] - 2451545.0) / 36525; return (93.2720950 + (483202.0175233 - 0.0036539 * T) * T) * D2R; };
  // absorb main β terms (F, Mp±F, 2D−F classes) on real F + run Mp/D args, plain + T-mod
  const absB = [
    (i) => Fr(i), (i) => runArg(i).Mp - Fr(i), (i) => runArg(i).Mp + Fr(i),
    (i) => 2 * runArg(i).D - Fr(i), (i) => 2 * runArg(i).D - runArg(i).Mp - Fr(i), (i) => 2 * runArg(i).D - runArg(i).Mp + Fr(i),
  ];
  const K = cands.length * 2 + absB.length * 4;
  const G = Array.from({ length: K }, () => new Float64Array(K));
  const b2 = new Float64Array(K), row = new Float64Array(K);
  for (let i = 0; i < N; i++) {
    const a = runArg(i); const Fv = Fr(i);
    let c = 0;
    for (const [, fn] of cands) { const th = fn(a, Fv); row[c++] = Math.cos(th); row[c++] = Math.sin(th); }
    for (const fn of absB) { const th = fn(i), ct = Math.cos(th), st = Math.sin(th);
      row[c++] = ct; row[c++] = st; row[c++] = a.T * ct; row[c++] = a.T * st; }
    for (let k = 0; k < K; k++) {
      const rk = row[k]; b2[k] += rk * dBet[i]; const Gk = G[k];
      for (let j = k; j < K; j++) Gk[j] += rk * row[j];
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < k; j++) G[k][j] = G[j][k];
  const Gm = G.map((r) => Array.from(r)); const x = Array.from(b2);
  for (let c = 0; c < K; c++) {
    let piv = c; for (let r = c + 1; r < K; r++) if (Math.abs(Gm[r][c]) > Math.abs(Gm[piv][c])) piv = r;
    [Gm[c], Gm[piv]] = [Gm[piv], Gm[c]]; [x[c], x[piv]] = [x[piv], x[c]];
    for (let r = c + 1; r < K; r++) {
      const f = Gm[r][c] / Gm[c][c];
      for (let cc = c; cc < K; cc++) Gm[r][cc] -= f * Gm[c][cc];
      x[r] -= f * x[c];
    }
  }
  const out = new Float64Array(K);
  for (let c = K - 1; c >= 0; c--) {
    let s = x[c]; for (let cc = c + 1; cc < K; cc++) s -= Gm[c][cc] * out[cc];
    out[c] = s / Gm[c][c];
  }
  let rssB = 0;
  for (let c = 0; c < cands.length; c++) {
    const co = out[2 * c], si = out[2 * c + 1], am = Math.hypot(co, si);
    rssB += am * am;
    if (am >= 0.03) { console.log(`    ${cands[c][0].padEnd(9)} cos ${co.toFixed(3).padStart(7)}  sin ${si.toFixed(3).padStart(7)}  amp ${am.toFixed(3)}`); bestB.push({ name: cands[c][0], cos: co, sin: si, amp: am }); }
  }
  console.log(`  planetary β content RMS ${Math.sqrt(rssB / 2).toFixed(3)}″`);
}

writeFileSync(HERE + 'd2-planetary-moon-terms.local.json', JSON.stringify({ jd0: JD0, years: YEARS, dt: DT, lon: tableL, lat: bestB }, null, 1));
console.log('\ndumped → d2-planetary-moon-terms.local.json');
