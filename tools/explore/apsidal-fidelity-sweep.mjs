#!/usr/bin/env node
// APSIDAL-FIDELITY SWEEP — which integrator lever moves Earth's secular
// apsidal rate ϖ̇(J2000) toward the era-validated value?
//
// THE TENSION (owner doctrine, two-route convergence — memory
// feedback_two_route_convergence): the era Keplerian chain reads Earth's
// inertial apsidal rate 11.616 ″/yr (111,569-yr cycle; canonical
// Meeus-class), while the production deep run's banked z-series reads
// 11.55 ″/yr (112,127) — a real 0.5 % integrator-fidelity deficit that
// the anomalistic year (−1.5 s) and the hypersensitive apsidal beat
// (~550 yr) inherit. The two routes must converge BY PHYSICS, not by
// anchoring. This sweep measures, per configuration, the D4e-style
// one-source route's numbers next to the chain targets.
//
// LEVERS (the production run is WH dt=2 d order 2, 1PN, Sun + 8 planets,
// EMB as a point mass, DE440 masses):
//   R0  baseline (reproduces the production configuration)
//   R1  dt = 1 d          (numerical convergence)
//   R2  dt = 0.5 d        (confirms the direction)
//   R3  + Ceres, Vesta, Pallas as massive bodies
//   R4  + the LUNAR QUADRUPOLE on the Sun↔EMB interaction — the standard
//       point-mass-plus-correction treatment (Quinn, Tremaine & Duncan
//       1991 class) instead of an infeasible 20-Myr separate Moon: the
//       EM system, ring-averaged over the lunar orbit (coplanar form),
//       adds δΦ(r) = −GM_sun·q̃·a_EM²/(4 r³) with q̃ = m_E m_M/(m_E+m_M)²
//       — an extra attraction a = −(3/4)·GM_sun·q̃·a_EM²·r⃗/r⁵ on Earth.
//       Analytic expectation ~0.1 ″/yr of prograde ϖ̇ — the right order
//       for the 0.06 ″/yr deficit; the run MEASURES it.
//   R5  R3 + R4 combined (the production-rerun candidate)
//
// SCORES (tier A, default ±25 kyr — the ϖ̇ score needs only kyr windows;
// ~1–4 min per run): the banked-series-style secular ϖ̇(J2000) — Earth's
// z boxcar-smoothed 1 kyr and resampled at 500 yr EXACTLY like the
// production banking, arg rate over ±2/±5/±10 kyr — plus the implied
// anomalistic year and apsidal beat (the Predictions-panel numbers), the
// chain targets on the same line, and conservation diagnostics.
// Tier B (years ≥ 400000): adds a coarse NAFF g-line table (Earth +
// Venus z; ecliptic ζ s-lines) and the g2−g5 beat — NB at 1 Myr the NAFF
// g2 resolution is ~0.1 ″/yr; the FINE g2 verdict needs the 20-Myr
// production re-run and is deliberately out of this sweep's scope.
//
// DECISION RULE (pre-registered in plan 02): a lever earns the 20-Myr
// production re-run only if ϖ̇ AND the beat structure move toward the
// targets TOGETHER; one improving while the other worsens = compensating
// error. No lever moving them = a documented fidelity boundary; the
// two-route tension stays displayed.
//
//   node tools/explore/apsidal-fidelity-sweep.mjs run=R0 [years=50000] [sample=200]

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makeWH } from './nbody-wh.mjs';
import { HZ, ASTEROIDS, HZ_EARTH399, HZ_MOON301, GM_MOON, GM_EARTH_ALONE } from './j2000-state.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TL = createRequire(ROOT + 'package.json')(ROOT + 'tools/lib/constants.js');

const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const RUN = (KV.run || 'R0').toUpperCase();
let YEARS = parseFloat(KV.years || '50000');
let SAMPLE_DAYS = parseFloat(KV.sample || '200');
const D2R = Math.PI / 180, DAY = 86400;
const GM_S = TL.GM_SUN, GM_EM = TL.GM_EARTH_MOON_SYSTEM;

// The asteroid seeds/GMs, the Earth-399/Moon-301 seeds and the Earth/Moon
// GM split all come from the ONE home (j2000-state.mjs; the GM split is
// DERIVED there from GM_EARTH_MOON_SYSTEM + MASS_RATIO_EARTH_MOON —
// owner correction: use the values we already have).

const CFG = {
  R0: { dt: 2 },
  R1: { dt: 1 },
  R2: { dt: 0.5 },
  R3: { dt: 2, asteroids: true },
  R4: { dt: 2, lunar: true },
  R5: { dt: 2, asteroids: true, lunar: true },
  // The METHOD-MATCHED RK4 TRIPLE (owner: "we have to be more sure") —
  // ground-truth validation of the quadrupole against a REAL separate
  // Moon, feasible at era scale: same RK4, same dt, same windows, same
  // recipe; the ONLY variable is the Moon treatment. Newton-only (GR
  // cancels in the A/B — the validation is the DIFFERENTIAL ΔRM−RN vs
  // ΔRQ−RN, not the absolute).
  RN: { rk4: true, dt: 0.05 },                 // EMB point mass (control)
  RQ: { rk4: true, dt: 0.05, lunar: true },    // + the quadrupole (refined coefficient)
  RM: { rk4: true, dt: 0.05, realMoon: true }, // Earth(399) + Moon(301) as bodies; EMB reconstructed
}[RUN];
if (!CFG) { console.error(`unknown run ${RUN}`); process.exit(1); }
if (CFG.rk4) { if (!KV.years) YEARS = 6000; if (!KV.sample) SAMPLE_DAYS = 50; }
if (KV.dt) CFG.dt = parseFloat(KV.dt);          // step override (convergence checks)
if (KV.quadfactor) CFG.quadFactor = parseFloat(KV.quadfactor);   // calibrated-coefficient trials

const baseNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const names = CFG.realMoon
  ? [...baseNames, 'moon']                      // 'earth' slot = body 399; the Moon appended
  : CFG.asteroids ? [...baseNames, 'ceres', 'pallas', 'vesta'] : baseNames;

// ── the lunar quadrupole (R4/R5): Earth-only extra force ──
const EARTH_I0 = 2;   // 0-based planet index in `names`
const R_EM = TL.MASS_RATIO_EARTH_MOON;              // m_E / m_M (the model's home)
const Q_TILDE = R_EM / ((R_EM + 1) * (R_EM + 1));   // m_E·m_M/(m_E+m_M)²
const A_EM_KM = TL.moonDistance;                    // mean Earth–Moon distance (km, the model's home)
// Refinement factors on the coplanar-ring form (the production-candidate
// coefficient): the lunar orbit's inclination to the ecliptic tilts the
// averaged ring, (1 − 3/2·sin² i_m); its eccentricity widens it,
// ⟨r²⟩ = a²·(1 + 3/2·e_m²). Both from the model's own constants homes.
const I_M_RAD = TL.moonEclipticInclinationJ2000 * D2R;
const E_M = TL.moonOrbitalEccentricity;
const RING_FACTOR = (1 - 1.5 * Math.sin(I_M_RAD) ** 2) * (1 + 1.5 * E_M * E_M);
// quadfactor= replaces the analytic ring factor with a MEASURED effective
// coefficient (calibrated against the real-Moon run RM — model-internal
// ground truth, the triple's ΔRM/ΔRQ_raw; never an external reference).
const EFF_FACTOR = CFG.quadFactor ?? RING_FACTOR;
const QUAD_K = (3 / 4) * Q_TILDE * A_EM_KM * A_EM_KM * EFF_FACTOR;
const lunarQuad = (r, v, t, GMS, i) => {
  if (i !== EARTH_I0) return [0, 0, 0];
  const r2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
  const k = -GMS * QUAD_K / (r2 * r2 * Math.sqrt(r2));
  return [k * r[0], k * r[1], k * r[2]];
};


const seedOf = (k) => k === 'moon' ? HZ_MOON301
  : (k === 'earth' && CFG.realMoon) ? HZ_EARTH399
    : ASTEROIDS[k] ? ASTEROIDS[k].s : HZ[k];
const gmOf = (k) => k === 'moon' ? GM_MOON
  : (k === 'earth' && CFG.realMoon) ? GM_EARTH_ALONE
    : ASTEROIDS[k] ? ASTEROIDS[k].gm : (k === 'earth' ? GM_EM : GM_S / TL.massRatioDE440[k]);

// ── build the barycentric initial state ──
const gms = [GM_S, ...names.map(gmOf)];
const n = gms.length, Mtot = gms.reduce((s, x) => s + x, 0);
const st = [{ r: [0, 0, 0], v: [0, 0, 0] }, ...names.map((k) => ({ r: seedOf(k).slice(0, 3), v: seedOf(k).slice(3, 6) }))];
const rB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.r[c], 0) / Mtot);
const vB = [0, 1, 2].map((c) => st.reduce((s, q, i) => s + gms[i] * q.v[c], 0) / Mtot);
const Y0 = new Float64Array(6 * n);
for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { Y0[3 * i + c] = st[i].r[c] - rB[c]; Y0[3 * n + 3 * i + c] = st[i].v[c] - vB[c]; }

// osculating heliocentric elements for one body (ecliptic-J2000 readout)
function osculZ(Q, V, gmi) {
  const mu = GM_S + gmi;
  const hv = [Q[1] * V[2] - Q[2] * V[1], Q[2] * V[0] - Q[0] * V[2], Q[0] * V[1] - Q[1] * V[0]];
  const rn = Math.hypot(...Q);
  const ev = [0, 1, 2].map((c) => (V[(c + 1) % 3] * hv[(c + 2) % 3] - V[(c + 2) % 3] * hv[(c + 1) % 3]) / mu - Q[c] / rn);
  return { zq: ev[0], zp: ev[1], e: Math.hypot(...ev) };   // e-vector x/y in the ecliptic ≈ e·(cos ϖ, sin ϖ) for low inc
}

// ── integrate both directions, sample Earth's (and Venus's) e-vector ──
const t0ms = Date.now();
const S = { t: [], eq: [], ep: [], vq: [], vp: [] };
const EIDX = names.indexOf('earth') + 1, VIDX = names.indexOf('venus') + 1;
const MIDX = CFG.realMoon ? names.indexOf('moon') + 1 : -1;

function sampleBodies(helioOf, tYr, acc) {
  // earth track: the EMB — reconstructed from Earth+Moon in RM, direct otherwise
  let re, ve;
  if (CFG.realMoon) {
    const hE = helioOf(EIDX), hM = helioOf(MIDX);
    const wE = GM_EARTH_ALONE / GM_EM, wM = GM_MOON / GM_EM;
    re = [0, 1, 2].map((c) => wE * hE.r[c] + wM * hM.r[c]);
    ve = [0, 1, 2].map((c) => wE * hE.v[c] + wM * hM.v[c]);
  } else {
    const hE = helioOf(EIDX); re = hE.r; ve = hE.v;
  }
  const hv = helioOf(VIDX);
  const ze = osculZ(re, ve, GM_EM), zv = osculZ(hv.r, hv.v, gms[VIDX]);
  acc.t.push(tYr); acc.eq.push(ze.zq); acc.ep.push(ze.zp); acc.vq.push(zv.zq); acc.vp.push(zv.zp);
}

function runDirWH(sign) {
  const sim = makeWH({ gms, Y0: Float64Array.from(Y0), dt: sign * CFG.dt * DAY, gr: true, order: 2, extraForces: CFG.lunar ? [lunarQuad] : [] });
  const steps = Math.round(YEARS / 2 * 365.25 / CFG.dt), every = Math.max(1, Math.round(SAMPLE_DAYS / CFG.dt));
  const acc = { t: [], eq: [], ep: [], vq: [], vp: [] };
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) sampleBodies((i) => sim.helio(i), sign * s * CFG.dt / 365.25, acc);
    sim.step();
  }
  console.log(`  ${sign > 0 ? 'forward' : 'backward'} ±${YEARS / 2} yr done, |ΔE/E| ${Math.abs((sim.energy() - E0) / E0).toExponential(1)}`);
  return acc;
}

// RK4 path (the method-matched triple): plain Newtonian all-pairs on the
// barycentric state, optional quadrupole on the EMB slot — the SAME
// stepper for RN/RQ/RM so the Moon treatment is the only variable.
function runDirRK4(sign) {
  const nb = gms.length, Y = Float64Array.from(Y0);
  const K1 = new Float64Array(6 * nb), K2 = new Float64Array(6 * nb), K3 = new Float64Array(6 * nb), K4 = new Float64Array(6 * nb), TMP = new Float64Array(6 * nb);
  const deriv = (Yv, K) => {
    for (let i = 0; i < 3 * nb; i++) { K[i] = Yv[3 * nb + i]; K[3 * nb + i] = 0; }
    for (let i = 0; i < nb; i++) for (let j = i + 1; j < nb; j++) {
      const dx = Yv[3 * j] - Yv[3 * i], dy = Yv[3 * j + 1] - Yv[3 * i + 1], dz = Yv[3 * j + 2] - Yv[3 * i + 2];
      const d2 = dx * dx + dy * dy + dz * dz, id3 = 1 / (d2 * Math.sqrt(d2));
      K[3 * nb + 3 * i] += gms[j] * dx * id3; K[3 * nb + 3 * i + 1] += gms[j] * dy * id3; K[3 * nb + 3 * i + 2] += gms[j] * dz * id3;
      K[3 * nb + 3 * j] -= gms[i] * dx * id3; K[3 * nb + 3 * j + 1] -= gms[i] * dy * id3; K[3 * nb + 3 * j + 2] -= gms[i] * dz * id3;
    }
    if (CFG.lunar) {
      const rx = Yv[3 * EIDX] - Yv[0], ry = Yv[3 * EIDX + 1] - Yv[1], rz = Yv[3 * EIDX + 2] - Yv[2];
      const r2 = rx * rx + ry * ry + rz * rz;
      const k = -GM_S * QUAD_K / (r2 * r2 * Math.sqrt(r2));
      K[3 * nb + 3 * EIDX] += k * rx; K[3 * nb + 3 * EIDX + 1] += k * ry; K[3 * nb + 3 * EIDX + 2] += k * rz;
    }
  };
  const h = sign * CFG.dt * DAY;
  const steps = Math.round(YEARS / 2 * 365.25 / CFG.dt), every = Math.max(1, Math.round(SAMPLE_DAYS / CFG.dt));
  const acc = { t: [], eq: [], ep: [], vq: [], vp: [] };
  const helioOf = (i) => ({
    r: [Y[3 * i] - Y[0], Y[3 * i + 1] - Y[1], Y[3 * i + 2] - Y[2]],
    v: [Y[3 * nb + 3 * i] - Y[3 * nb], Y[3 * nb + 3 * i + 1] - Y[3 * nb + 1], Y[3 * nb + 3 * i + 2] - Y[3 * nb + 2]],
  });
  for (let s = 0; s <= steps; s++) {
    if (s % every === 0) sampleBodies(helioOf, sign * s * CFG.dt / 365.25, acc);
    deriv(Y, K1); for (let i = 0; i < 6 * nb; i++) TMP[i] = Y[i] + 0.5 * h * K1[i];
    deriv(TMP, K2); for (let i = 0; i < 6 * nb; i++) TMP[i] = Y[i] + 0.5 * h * K2[i];
    deriv(TMP, K3); for (let i = 0; i < 6 * nb; i++) TMP[i] = Y[i] + h * K3[i];
    deriv(TMP, K4); for (let i = 0; i < 6 * nb; i++) Y[i] += h / 6 * (K1[i] + 2 * K2[i] + 2 * K3[i] + K4[i]);
  }
  console.log(`  ${sign > 0 ? 'forward' : 'backward'} ±${YEARS / 2} yr done (RK4)`);
  return acc;
}

const E0 = CFG.rk4 ? 0 : makeWH({ gms, Y0: Float64Array.from(Y0), dt: CFG.dt * DAY, gr: true, order: 2 }).energy();
console.log(`${RUN}: ${CFG.rk4 ? 'RK4 (Newton)' : 'WH order 2, 1PN'}, dt ${CFG.dt} d, ${names.length} bodies${CFG.lunar ? ' + lunar quadrupole (q̃=' + Q_TILDE.toFixed(6) + ', a_EM=' + A_EM_KM + ' km, effective factor ' + EFF_FACTOR.toFixed(5) + ')' : ''}${CFG.realMoon ? ' (Earth 399 + Moon 301 as bodies; EMB reconstructed)' : ''}`);
const runDir = CFG.rk4 ? runDirRK4 : runDirWH;
const fwd = runDir(1), bwd = runDir(-1);
for (const k of Object.keys(S)) S[k] = [...bwd[k].slice(1).reverse(), ...fwd[k]];
console.log(`  ${S.t.length} samples, ${((Date.now() - t0ms) / 1000).toFixed(0)} s`);

// ── the banked-series-style secular ϖ̇(J2000): boxcar 1 kyr → 500-yr
//    resample → arg rate — EXACTLY the production banking recipe ──
function bankedRate(tArr, q, p, halfWinYr) {
  const N = tArr.length, dtS = tArr[1] - tArr[0];
  const half = Math.max(1, Math.round(1000 / 2 / dtS));
  const box = (arr, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - half); j <= Math.min(N - 1, i + half); j++) { s += arr[j]; c++; } return s / c; };
  const nodes = [];
  for (let ty = -halfWinYr; ty <= halfWinYr; ty += 500) {
    const i = Math.round((ty - tArr[0]) / dtS);
    nodes.push({ ty, ang: Math.atan2(box(p, i), box(q, i)) * 180 / Math.PI });
  }
  let acc = nodes[0].ang; const un = [acc];
  for (let i = 1; i < nodes.length; i++) { let d = nodes[i].ang - nodes[i - 1].ang; while (d > 180) d -= 360; while (d < -180) d += 360; acc += d; un.push(acc); }
  return (un[un.length - 1] - un[0]) / (nodes[nodes.length - 1].ty - nodes[0].ty) * 3600;   // ″/yr
}

console.log(`\n${RUN} — Earth secular ϖ̇(J2000), banked-series recipe (″/yr):`);
const rows = [];
const WINS = YEARS / 2 <= 3500 ? [1000, 1500, 2000] : [2000, 5000, 10000];
for (const w of WINS) {
  if (w > YEARS / 2 - 1200) continue;
  const r = bankedRate(S.t, S.eq, S.ep, w);
  rows.push([w, r]);
  const beat = 1296000 / r;
  const sidYr = 365.256363004 / 365.25;                       // sidereal year, Julian years
  const anomD = 360 / (360 / sidYr - r / 3600) * 365.25;      // implied anomalistic, days
  console.log(`  ±${(w / 1000).toFixed(0)} kyr:  ϖ̇ ${r.toFixed(4)}  ·  beat ${beat.toFixed(0)} yr  ·  implied anomalistic ${anomD.toFixed(6)} d`);
}
console.log('  TARGETS (chain route): ϖ̇ 11.6161 · beat 111,569 yr · anomalistic 365.259636 d');
console.log('  production banked series (the deep route today): ϖ̇ ≈ 11.549 · beat ≈ 112,180');

// ── Tier B: coarse NAFF g-lines (only worth it at years ≥ 400000) ──
if (YEARS >= 400000) {
  const t = Float64Array.from(S.t), N = t.length, span = t[N - 1] - t[0];
  const win = new Float64Array(N); let wsum = 0;
  for (let i = 0; i < N; i++) { win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1))); wsum += win[i]; }
  const STRIDE = Math.max(1, Math.ceil(N / 40000));
  const amp = (zr, zi, w) => { let ar = 0, ai = 0, ws = 0; for (let i = 0; i < N; i += STRIDE) { const ph = -w * t[i], c = Math.cos(ph), s = Math.sin(ph); ar += win[i] * (zr[i] * c - zi[i] * s); ai += win[i] * (zr[i] * s + zi[i] * c); ws += win[i]; } return Math.hypot(ar, ai) / ws; };
  const refine = (zr, zi, w0, dw) => { let a = w0 - dw, b = w0 + dw; const g = (Math.sqrt(5) - 1) / 2; let x1 = b - g * (b - a), x2 = a + g * (b - a), f1 = amp(zr, zi, x1), f2 = amp(zr, zi, x2); for (let k = 0; k < 80; k++) { if (f1 > f2) { b = x2; x2 = x1; f2 = f1; x1 = b - g * (b - a); f1 = amp(zr, zi, x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + g * (b - a); f2 = amp(zr, zi, x2); } } return (a + b) / 2; };
  const naff = (zr0, zi0, nt) => { const out = []; const zr = Float64Array.from(zr0), zi = Float64Array.from(zi0); const dw = 2 * Math.PI / (4 * span), wcap = 2 * Math.PI / 5000; for (let k = 0; k < nt; k++) { let best = { w: 0, a: -1 }; for (let w = -wcap; w <= wcap; w += dw) { const a = amp(zr, zi, w); if (a > best.a) best = { w, a }; } const w = refine(zr, zi, best.w, dw); let ar = 0, ai = 0; for (let i = 0; i < N; i++) { const ph = -w * t[i], c = Math.cos(ph), s = Math.sin(ph); ar += win[i] * (zr[i] * c - zi[i] * s); ai += win[i] * (zr[i] * s + zi[i] * c); } ar /= wsum; ai /= wsum; for (let i = 0; i < N; i++) { const c = Math.cos(w * t[i]), s = Math.sin(w * t[i]); zr[i] -= ar * c - ai * s; zi[i] -= ar * s + ai * c; } out.push({ asy: w / D2R * 3600, ampl: Math.hypot(ar, ai) }); } return out; };
  console.log('\n  coarse NAFF (resolution ~' + (1296000 / span / 3600 * 2 * Math.PI).toFixed(2) + ' ″/yr class — the fine g2 verdict needs the 20-Myr re-run):');
  const eM = naff(S.eq, S.ep, 5), vM = naff(S.vq, S.vp, 5);
  const near = (asy) => { const L = { g1: 5.5965, g2: 7.4555, g3: 17.3711, g4: 17.9159, g5: 4.2575 }; let b = null; for (const [k, v] of Object.entries(L)) if (b === null || Math.abs(v - asy) < Math.abs(L[b] - asy)) b = k; return b; };
  console.log('  Earth z:  ' + eM.map((m) => `${m.asy.toFixed(3)}″/yr(${near(m.asy)},a${m.ampl.toFixed(4)})`).join(' '));
  console.log('  Venus z:  ' + vM.map((m) => `${m.asy.toFixed(3)}″/yr(${near(m.asy)},a${m.ampl.toFixed(4)})`).join(' '));
  const g2e = vM.map((m) => m.asy).find((a) => Math.abs(a - 7.4555) < 1) ?? null;
  const g5e = eM.map((m) => m.asy).find((a) => Math.abs(a - 4.2575) < 1) ?? null;
  if (g2e !== null && g5e !== null) console.log(`  g2−g5 beat: ${(1296000 / (g2e - g5e) / 1000).toFixed(1)} kyr (La2004: 405.7)`);
}
