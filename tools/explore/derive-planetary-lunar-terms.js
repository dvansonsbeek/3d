/**
 * derive-planetary-lunar-terms.js — the PLANETARY laboratory (D5 companion /
 * A1 resolution): extend the D1 Sun–Earth–Moon integrator with Venus and
 * Jupiter (5 point masses) and isolate the PLANETARY contribution to the
 * Moon's longitude by differencing two runs with identical lunar ICs:
 *
 *     Δλ(t) = λ_moon[5-body] − λ_moon[3-body]
 *
 * The main lunar problem cancels exactly; what remains is the physics of
 * Meeus's "additional terms":
 *   A1 (3958e-6°, 119.75 + 131.849·T — the ~273-yr "Venus" term):
 *       is it ONE line (then its rate should emerge as a clean peak) or a
 *       BLEND of Venus-family lines (then a multiplet — explaining why no
 *       lattice identity exists)?
 *   A2 (318e-6°, the Jupiter–perigee argument 2Lp − M′ − 2λ_J): amplitude
 *       derived from gravity.
 *   Lp − F (1962e-6°): attributed to Earth's FLATTENING — a point-mass run
 *       must NOT reproduce it (falsification check of the J2 attribution).
 *
 * Masses: Venus/Jupiter from IAU solar-mass ratios (observed constants, same
 * status as the D1 Earth/Moon ratio); orbits from framework periods and
 * J2000 eccentricities; coplanar v1 (planetary inclinations ≤ 3.4° are a
 * second-order effect on these longitude terms).
 *
 * Usage: node tools/explore/derive-planetary-lunar-terms.js [years=600] [dtDays=0.02]
 */

const C = require('../lib/constants');

const YEARS = parseFloat(process.argv[2] || '600');
const DT = parseFloat(process.argv[3] || '0.02');
const DAY = 86400;
const AU_KM = 149597870.7;
const d2r = Math.PI / 180;

// ── constants (D1 conventions) ─────────────────────────────────────────────
const T_SID_YR_S = 365.256363004 * DAY;
const GM_EM = C.GM_EARTH_MOON_SYSTEM;
const GM_HELIO = 4 * Math.PI * Math.PI * Math.pow(AU_KM, 3) / (T_SID_YR_S * T_SID_YR_S);
const GM_S = GM_HELIO - GM_EM;
const MR = C.MASS_RATIO_EARTH_MOON;
const GM_E = GM_EM * MR / (MR + 1);
const GM_M = GM_EM / (MR + 1);
const GM_V = GM_S / 408523.719;      // IAU 2015 nominal Sun/Venus mass ratio
const GM_J = GM_S / 1047.3486;       // IAU Sun/Jupiter mass ratio
const eM = 0.054900489;
const eS = 0.0167102;
const INC = (C.moonEclipticInclinationJ2000 ?? 5.145) * Math.PI / 180;
const aM0 = C.moonDistance;

const T_V = C.planets.venus.solarYearInput;      // days
const T_J = C.planets.jupiter.solarYearInput;
const e_V = C.planets.venus.orbitalEccentricityJ2000;
const e_J = C.planets.jupiter.orbitalEccentricityJ2000;

console.log(`5-body planetary laboratory: ${YEARS} yr at dt=${DT} d`);
console.log(`GM_V = GM_S/408523.7, GM_J = GM_S/1047.35; T_V ${T_V} d e_V ${e_V}; T_J ${T_J} d e_J ${e_J}`);

// ── Kepler → state (from the D1 lab) ───────────────────────────────────────
function keplerPosVel(gm, a, e, inc, Om, w, nu) {
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const h = Math.sqrt(gm * p);
  const xp = r * Math.cos(nu), yp = r * Math.sin(nu);
  const vxp = -gm / h * Math.sin(nu), vyp = gm / h * (e + Math.cos(nu));
  const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(inc), si = Math.sin(inc);
  const R = [cO*cw - sO*sw*ci, -cO*sw - sO*cw*ci, sO*si,
             sO*cw + cO*sw*ci, -sO*sw + cO*cw*ci, -cO*si,
             sw*si, cw*si, ci];
  const rot = (x, y, z) => [R[0]*x + R[1]*y + R[2]*z, R[3]*x + R[4]*y + R[5]*z, R[6]*x + R[7]*y + R[8]*z];
  return { r: rot(xp, yp, 0), v: rot(vxp, vyp, 0) };
}

// ── generic N-body ─────────────────────────────────────────────────────────
function makeSystem(includePlanets, moonIC) {
  // bodies: [Sun, Earth, Moon, (Venus, Jupiter)]
  const gms = [GM_S, GM_E, GM_M];
  const a_EMB = Math.cbrt(GM_HELIO * Math.pow(T_SID_YR_S / (2 * Math.PI), 2));
  const emb = keplerPosVel(GM_HELIO, a_EMB, eS, 0, 0, 0, 0);
  const rel = keplerPosVel(GM_EM, moonIC.a, moonIC.e, moonIC.i, 0, 0, 0);
  const states = [];
  states.push({ r: [0, 0, 0], v: [0, 0, 0] });                                   // Sun (heliocentric start)
  states.push({ r: emb.r.map((x, k) => x - rel.r[k] * GM_M / GM_EM),
                v: emb.v.map((x, k) => x - rel.v[k] * GM_M / GM_EM) });          // Earth
  states.push({ r: emb.r.map((x, k) => x + rel.r[k] * GM_E / GM_EM),
                v: emb.v.map((x, k) => x + rel.v[k] * GM_E / GM_EM) });          // Moon
  if (includePlanets) {
    const aV = Math.cbrt(GM_S * Math.pow(T_V * DAY / (2 * Math.PI), 2));
    const aJ = Math.cbrt(GM_S * Math.pow(T_J * DAY / (2 * Math.PI), 2));
    // phases: perihelion start, distinct longitudes (perihelion azimuths 90°/230°
    // — arbitrary but FIXED so both extractions see the same geometry)
    states.push(keplerPosVel(GM_S + GM_V, aV, e_V, 0, 90 * d2r, 0, 0));          // Venus
    states.push(keplerPosVel(GM_S + GM_J, aJ, e_J, 0, 230 * d2r, 0, 0));         // Jupiter
    gms.push(GM_V, GM_J);
  }
  // shift to barycenter
  const Mtot = gms.reduce((s, g) => s + g, 0);
  const rB = [0, 1, 2].map(k => states.reduce((s, st, i) => s + gms[i] * st.r[k], 0) / Mtot);
  const vB = [0, 1, 2].map(k => states.reduce((s, st, i) => s + gms[i] * st.v[k], 0) / Mtot);
  const n = states.length;
  const Y = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    Y[3 * i + k] = states[i].r[k] - rB[k];
    Y[3 * n + 3 * i + k] = states[i].v[k] - vB[k];
  }
  return { Y, gms, n };
}

function makeDeriv(gms, n) {
  return (Y, dY) => {
    for (let i = 0; i < 3 * n; i++) { dY[i] = Y[3 * n + i]; dY[3 * n + i] = 0; }
    for (let A = 0; A < n; A++) for (let B = A + 1; B < n; B++) {
      const ia = 3 * A, ib = 3 * B;
      const dx = Y[ib] - Y[ia], dy = Y[ib + 1] - Y[ia + 1], dz = Y[ib + 2] - Y[ia + 2];
      const r2 = dx * dx + dy * dy + dz * dz, ir3 = 1 / (r2 * Math.sqrt(r2));
      dY[3 * n + ia]     += gms[B] * dx * ir3; dY[3 * n + ia + 1] += gms[B] * dy * ir3; dY[3 * n + ia + 2] += gms[B] * dz * ir3;
      dY[3 * n + ib]     -= gms[A] * dx * ir3; dY[3 * n + ib + 1] -= gms[A] * dy * ir3; dY[3 * n + ib + 2] -= gms[A] * dz * ir3;
    }
  };
}

const unwrap = (arr) => { let off = 0; const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) { const dd = arr[i] - arr[i - 1];
    if (dd < -Math.PI) off += 2 * Math.PI; else if (dd > Math.PI) off -= 2 * Math.PI;
    out.push(arr[i] + off); } return out; };

function linFit(t, y) {
  let st = 0, sy = 0, stt = 0, sty = 0; const n = t.length;
  for (let i = 0; i < n; i++) { st += t[i]; sy += y[i]; stt += t[i] * t[i]; sty += t[i] * y[i]; }
  const b = (n * sty - st * sy) / (n * stt - st * st);
  return { a: (sy - b * st) / n, b };
}

function runSystem(includePlanets, moonIC, years, dt) {
  const { Y, gms, n } = makeSystem(includePlanets, moonIC);
  const deriv = makeDeriv(gms, n);
  const h_s = dt * DAY;
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), Yt = new Float64Array(6 * n);
  const sampleEvery = Math.max(1, Math.round(0.25 / dt));
  const nSteps = Math.round(years * 365.25 / dt);
  const S = { t: [], lam: [], lamS: [], lamV: [], lamJ: [], w: [], Om: [] };
  for (let s = 0; s <= nSteps; s++) {
    if (s % sampleEvery === 0) {
      const rx = Y[6] - Y[3], ry = Y[7] - Y[4], rz = Y[8] - Y[5];      // Moon rel Earth
      const vx = Y[3 * n + 6] - Y[3 * n + 3], vy = Y[3 * n + 7] - Y[3 * n + 4], vz = Y[3 * n + 8] - Y[3 * n + 5];
      S.t.push(s * dt);
      S.lam.push(Math.atan2(ry, rx));
      S.lamS.push(Math.atan2(Y[1] - Y[4], Y[0] - Y[3]));               // Sun rel Earth
      if (includePlanets) {
        S.lamV.push(Math.atan2(Y[10] - Y[1], Y[9] - Y[0]));            // Venus rel Sun
        S.lamJ.push(Math.atan2(Y[13] - Y[1], Y[12] - Y[0]));           // Jupiter rel Sun
      }
      // osculating perigee/node for argument fits
      const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx;
      const rn = Math.hypot(rx, ry, rz);
      const ex = (vy * hz - vz * hy) / GM_EM - rx / rn;
      const ey = (vz * hx - vx * hz) / GM_EM - ry / rn;
      S.w.push(Math.atan2(ey, ex));
      S.Om.push(Math.atan2(hx, -hy));
    }
    deriv(Y, k1);
    for (let i = 0; i < 6 * n; i++) Yt[i] = Y[i] + 0.5 * h_s * k1[i];
    deriv(Yt, k2);
    for (let i = 0; i < 6 * n; i++) Yt[i] = Y[i] + 0.5 * h_s * k2[i];
    deriv(Yt, k3);
    for (let i = 0; i < 6 * n; i++) Yt[i] = Y[i] + h_s * k3[i];
    deriv(Yt, k4);
    for (let i = 0; i < 6 * n; i++) Y[i] += h_s / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  for (const k of ['lam', 'lamS', 'lamV', 'lamJ', 'w', 'Om']) S[k] = S[k].length ? unwrap(S[k]) : S[k];
  return S;
}

// ── run both systems with IDENTICAL Moon ICs ───────────────────────────────
const moonIC = { a: 386320.70, e: 0.0770447, i: 5.2917 * d2r };   // D1-calibrated osculating ICs
const t0 = Date.now();
const S3 = runSystem(false, moonIC, YEARS, DT);
const S5 = runSystem(true, moonIC, YEARS, DT);
console.log(`integrations done in ${((Date.now() - t0) / 1000).toFixed(1)} s (${S3.t.length} samples each)`);

// planetary Δλ, quadratic-detrended (the secular carrier content is already
// derived via the e_S scan; here we want the PERIODIC planetary terms)
const T = S3.t;
const N = T.length;
const dl = new Float64Array(N);
for (let i = 0; i < N; i++) dl[i] = (S5.lam[i] - S3.lam[i]) / d2r;   // deg
{ // quadratic detrend
  let s0=N, s1=0, s2=0, s3=0, s4=0, b0=0, b1=0, b2=0;
  for (let i = 0; i < N; i++) { const x = T[i] / 36525; const x2 = x*x;
    s1 += x; s2 += x2; s3 += x2*x; s4 += x2*x2; b0 += dl[i]; b1 += dl[i]*x; b2 += dl[i]*x2; }
  // solve 3x3 normal equations
  const M = [[s0,s1,s2,b0],[s1,s2,s3,b1],[s2,s3,s4,b2]];
  for (let c = 0; c < 3; c++) {
    let piv = c; for (let r = c+1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c+1; r < 3; r++) { const f = M[r][c]/M[c][c]; for (let cc = c; cc < 4; cc++) M[r][cc] -= f*M[c][cc]; }
  }
  const c2 = M[2][3]/M[2][2], c1 = (M[1][3]-M[1][2]*c2)/M[1][1], c0 = (M[0][3]-M[0][1]*c1-M[0][2]*c2)/M[0][0];
  for (let i = 0; i < N; i++) { const x = T[i]/36525; dl[i] -= c0 + c1*x + c2*x*x; }
  console.log(`secular (detrended): dλ/dT ${c1.toFixed(4)} °/cy, T² ${c2.toFixed(4)} °/cy² (carrier content — cf. e_S-scan derivation)`);
}

// fitted fundamentals from the 5-body run
const fLam = linFit(T, S5.lam), fLamS = linFit(T, S5.lamS), fW = linFit(T, S5.w), fOm = linFit(T, S5.Om);
const fV = linFit(T, S5.lamV), fJ = linFit(T, S5.lamJ);

// LSQ of a single sin+cos pair at angle series θ(i) → amplitude
function ampAt(thetaFn) {
  let ss = 0, sc = 0, scs = 0, s2s = 0, s2c = 0, bs = 0, bc = 0;
  for (let i = 0; i < N; i++) {
    const th = thetaFn(i), s = Math.sin(th), c = Math.cos(th);
    s2s += s * s; s2c += c * c; scs += s * c; bs += dl[i] * s; bc += dl[i] * c;
  }
  const det = s2s * s2c - scs * scs;
  const as = (bs * s2c - bc * scs) / det, ac = (bc * s2s - bs * scs) / det;
  return { amp: Math.hypot(as, ac), phase: Math.atan2(ac, as) / d2r, as, ac };
}

console.log('\n── targeted extractions (deg amplitude; Meeus in 1e-6 deg units) ──');
// A2: 2Lp − M′ − 2λ_J = Lp + ϖ − 2λ_J
const a2 = ampAt(i => (fLam.a + fLam.b * T[i]) + (fW.a + fW.b * T[i]) - 2 * (fJ.a + fJ.b * T[i]));
console.log(`A2 (Lp + ϖ − 2λ_J):        amp ${(a2.amp * 1e6).toFixed(0).padStart(6)}e-6°   (Meeus 318)`);
// Lp − F ≡ node-referenced term (J2 attribution — expect ~0 in point-mass run)
const lpf = ampAt(i => (fOm.a + fOm.b * T[i]));                       // Lp − F = Ω-referenced
console.log(`Lp − F (Ω argument):       amp ${(lpf.amp * 1e6).toFixed(0).padStart(6)}e-6°   (Meeus 1962 — J2 physics, expect ~0 here)`);
// A1 candidates
const a1meeus = ampAt(i => (119.75 + 131.849 * (T[i] / 36525)) * d2r);
console.log(`A1 at Meeus rate 131.849:  amp ${(a1meeus.amp * 1e6).toFixed(0).padStart(6)}e-6°   (Meeus 3958)`);
const a1cls = ampAt(i => 18 * (fV.a + fV.b * T[i]) - 16 * (fLamS.a + fLamS.b * T[i]) - ((fLam.a + fLam.b * T[i]) - (fW.a + fW.b * T[i])));
console.log(`A1 at 18V − 16E − M′:      amp ${(a1cls.amp * 1e6).toFixed(0).padStart(6)}e-6°`);

// ── periodogram of the slow band (periods 60–1200 yr) ──────────────────────
console.log('\n── slow-band periodogram (rates 30–600 °/cy; peak table) ──');
const peaks = [];
for (let rate = 30; rate <= 600; rate += 0.5) {
  const r = ampAt(i => rate * (T[i] / 36525) * d2r);
  peaks.push({ rate, amp: r.amp });
}
peaks.sort((a, b) => b.amp - a.amp);
const shown = [];
for (const p of peaks) {
  if (shown.some(q => Math.abs(q.rate - p.rate) < 8)) continue;
  shown.push(p);
  if (shown.length >= 8) break;
}
shown.sort((a, b) => a.rate - b.rate);
for (const p of shown) {
  console.log(`  rate ${p.rate.toFixed(1).padStart(6)} °/cy  (period ${(36000 / p.rate).toFixed(0).padStart(5)} yr)   amp ${(p.amp * 1e6).toFixed(0).padStart(6)}e-6°${Math.abs(p.rate - 131.849) < 8 ? '   ← A1 band' : ''}`);
}
console.log('\nInterpretation: a single dominant peak at ~131.8 °/cy with amp ~3958e-6');
console.log('would mean A1 is ONE physical line; a multiplet of comparable peaks means');
console.log('A1 is a BLEND (fitted effective rate — no lattice identity exists).');
