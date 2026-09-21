// LAYER B — THE EARTH OSCULATING e/ϖ CHANNEL, DERIVED (plan 06 layer B,
// the eclipse Sun onto the series).
//
// QUESTION: the one-source series is the SECULAR Earth orbit (its J2000
// element ≡ La2004's); the eclipse Sun's equation of centre needs the
// OSCULATING elements of date — secular + the short/long-period planetary
// perturbations of e and ϖ. Today only the K law's Standish anchor carries
// that channel (as a constant, its 1800–2050 window mean: +105″ in ϖ,
// +7.8e-6 in e). Measured: with the series Sun and the shipped completion
// the all-phase JPL Sun sd is 3.26″ (K Sun: 1.58″), the centerline mean
// 6.21″ (K: 2.86″). The D2 lab's twin systems cannot supply the channel
// (their constant annual content is an initial-condition artifact — 19″
// vs the real Sun's 4.6″, measured 2026-09-21).
//
// THIS INSTRUMENT derives the channel from the model's OWN seed: the
// Horizons J2000 heliocentric state (j2000-state.mjs HZ — the same seed
// the planet chains and the secular series come from), integrated as a
// nine-body system (Sun + eight planetary-system barycenters, EMB as
// 'earth') ±110 yr around J2000 with the lab's RK4 derivative, sampled
// daily. Osculating EMB elements (mu = GM☉ + GM_EM, ecliptic-J2000, the
// osculAt convention) minus the model's secular elements of the same
// epoch (the chain, J2000 frame) = Δz(t). The Sun channel is then
//   δL(t) = EoC(e_series + Δe, L − (ϖ_series,date + Δϖ) − 180)
//         − EoC(e_series,         L −  ϖ_series,date       − 180)
// with the finder's own EoC expansion (e³) and mean longitude — fully
// derived, no JPL input.
//
// VALIDATION (JPL enters here only, as the check): at the 1,600 cached
// all-phase epochs, residual = series Sun − (JPL − ΔψcosE) − shipped
// completion; report its sd before and after subtracting δL, and the
// correlation. Expected if the physics is right: sd 3.26″ → ≲1.6″.
//
// Outputs (beside this script, .local.json): d2-earth-osc-channel.local.json
//   { jd0, strideDays, dPomArcsec[], dE[], dLArcsec[] } daily 1890–2110.
// Usage: node tools/explore/d2-earth-osculating-channel.mjs [dtDays=0.1]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { HZ, NAMES, gmOf, GM_SUN, GM_EM } from './j2000-state.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const HERE = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const P = require(ROOT + 'tools/explore/derive-planetary-lunar-terms.js');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
const { CHAIN_ARTIFACT } = require(ROOT + 'packages/physics/src/planets/chain-artifact.js');
const OSM = require(ROOT + 'tools/lib/deep-orbital-history.js').createOneSourceMovement();
const { createModel, DEFAULT_CONSTANTS } = await import(new URL('../../packages/physics/src/index.js', import.meta.url).href);
const { createSunPlanetaryCompletion } = await import(new URL('../../packages/physics/src/eclipse/sun-planetary-completion.cjs', import.meta.url).href).then((m) => m.default ?? m);

const C = DEFAULT_CONSTANTS;
const model = createModel(undefined, { secularSeriesArtifact: JSON.parse(readFileSync(ROOT + 'data/nbody-secular-series.json', 'utf8')) });
const D2R = Math.PI / 180, R2D = 180 / Math.PI, AS = 3600;
const DAY = 86400;
const DT = parseFloat(process.argv[2] || '0.1');
const SPAN_YR = 110;
const J2000 = 2451545.0;

// ── the nine-body system from the seed, barycentric ─────────────────────
const bodies = ['sun', ...NAMES];
const gms = bodies.map((b) => (b === 'sun' ? GM_SUN : gmOf(b)));
const n = bodies.length;
function seedState() {
  const st = bodies.map((b) => (b === 'sun' ? [0, 0, 0, 0, 0, 0] : HZ[b].slice()));
  const M = gms.reduce((s, g) => s + g, 0);
  const cm = [0, 1, 2, 3, 4, 5].map((k) => st.reduce((s, x, i) => s + gms[i] * x[k], 0) / M);
  const Y = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    Y[3 * i + k] = st[i][k] - cm[k];
    Y[3 * n + 3 * i + k] = st[i][3 + k] - cm[3 + k];
  }
  return Y;
}
const iE = bodies.indexOf('earth');
function osculEMB(Y) {
  const r = [0, 1, 2].map((k) => Y[3 * iE + k] - Y[k]);
  const v = [0, 1, 2].map((k) => Y[3 * n + 3 * iE + k] - Y[3 * n + k]);
  const mu = GM_SUN + GM_EM, rn = Math.hypot(...r);
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const ex = (v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn;
  const ey = (v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn;
  const ez = (v[0] * h[1] - v[1] * h[0]) / mu - r[2] / rn;
  return { e: Math.hypot(ex, ey, ez), pomDeg: Math.atan2(ey, ex) * R2D };
}
function integrate(sign) {
  const Y = seedState();
  const deriv = P.makeDeriv(gms, n, false);
  const h = sign * DT * DAY;
  const steps = Math.round(SPAN_YR * 365.25 / DT);
  const sampleEvery = Math.max(1, Math.round(1 / DT));
  const k1 = new Float64Array(6 * n), k2 = new Float64Array(6 * n), k3 = new Float64Array(6 * n), k4 = new Float64Array(6 * n), tmp = new Float64Array(6 * n);
  const out = [];
  for (let s = 0; s <= steps; s++) {
    if (s % sampleEvery === 0) out.push({ days: sign * s * DT, ...osculEMB(Y) });
    deriv(Y, k1);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k1[i];
    deriv(tmp, k2);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + 0.5 * h * k2[i];
    deriv(tmp, k3);
    for (let i = 0; i < 6 * n; i++) tmp[i] = Y[i] + h * k3[i];
    deriv(tmp, k4);
    for (let i = 0; i < 6 * n; i++) Y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return out;
}
console.log(`nine-body real-state integration ±${SPAN_YR} yr @ dt ${DT} d (${n} bodies) ...`);
const t0 = Date.now();
const back = integrate(-1).reverse();
const fwd = integrate(+1);
const samples = [...back.slice(0, -1), ...fwd];
console.log(`done ${((Date.now() - t0) / 1000).toFixed(0)} s (${samples.length} daily samples)`);

// ── Δz against the model's secular elements (chain, J2000 frame) ────────
const chains = KC.buildPlanetChainsFromArtifact ? KC.buildPlanetChainsFromArtifact(CHAIN_ARTIFACT) : KC.buildPlanetChains(CHAIN_ARTIFACT);
const wrap = (d) => ((d + 540) % 360) - 180;
const yearOf = (days) => 2000 + days / 365.25;
const S = model.eclipse.frameworkSunDeps;
const eoc = (e, M) => (2 * e - e * e * e / 4) * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M) + (13 / 12) * e * e * e * Math.sin(3 * M);
const rows = samples.map((s) => {
  const y = yearOf(s.days);
  const sec = KC.computePlanetElementsAtYear(y, chains.earth, chains);
  const dPom = wrap(s.pomDeg - sec.lonPeriEclipticDeg);      // deg, J2000 frame
  const dE = s.e - sec.e;
  const L = S.meanLongitudeDegAt(y);
  const eS = OSM.e(y), pS = OSM.periOfDateDeg(y);
  const dL = (eoc(eS + dE, (L - (pS + dPom + 180)) * D2R) - eoc(eS, (L - (pS + 180)) * D2R)) * R2D * AS;
  return { jd: J2000 + s.days, y, dPomAs: dPom * AS, dE, dLAs: dL };
});
const at2000 = rows.reduce((b, r) => (Math.abs(r.days ?? r.jd - J2000) < Math.abs(b.jd - J2000) ? r : b), rows[0]);
console.log(`sanity at J2000: Δϖ ${at2000.dPomAs.toFixed(2)}″  Δe ${at2000.dE.toExponential(2)}  (the chain anchor IS the osculating J2000 element → expect ≈ 0)`);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const rms = (a) => Math.sqrt(mean(a.map((x) => x * x)));
const win = rows.filter((r) => r.y >= 1900 && r.y <= 2100);
console.log(`1900–2100 window: ⟨Δϖ⟩ ${mean(win.map((r) => r.dPomAs)).toFixed(1)}″  rms ${rms(win.map((r) => r.dPomAs)).toFixed(1)}″ · ⟨Δe⟩ ${mean(win.map((r) => r.dE)).toExponential(2)}  rms ${rms(win.map((r) => r.dE)).toExponential(2)} · δL rms ${rms(win.map((r) => r.dLAs)).toFixed(2)}″`);
console.log(`  (Standish − Laskar J2000 conventions: +105″, +7.8e-6 — the window mean above is the derived counterpart)`);
for (const y of [1900, 1950, 2000, 2024, 2050, 2100]) {
  const r = rows.reduce((b, x) => (Math.abs(x.y - y) < Math.abs(b.y - y) ? x : b), rows[0]);
  console.log(`  ${y}: Δϖ ${r.dPomAs.toFixed(1).padStart(7)}″  Δe ${r.dE.toExponential(2).padStart(9)}  δL ${r.dLAs.toFixed(2).padStart(6)}″`);
}

// ── JPL validation (the 1,600-epoch all-phase cache; shipped completion as N3 wires it) ──
const CACHE = HERE + 'd2-sun-jpl-cache.local.json';
if (!existsSync(CACHE)) { console.log('no JPL cache — validation skipped'); }
else {
  const _H = C.foundational.holisticyearLength;
  const _mSY = Math.round(C.foundational.inputmeanlengthsolaryearindays * (_H / 8)) / (_H / 8);
  const dpc = (f) => 360 * 36525 * f;
  const shipped = createSunPlanetaryCompletion({
    embWobbleArcsec: (C.moonReference.moonDistance / (1 + C.physicalConstants.MASS_RATIO_EARTH_MOON) / C.physicalConstants.currentAUDistance) * (648000 / Math.PI),
    carrierRatesDegPerCy: {
      planets: ['mercury', 'venus', null, 'mars', 'jupiter', 'saturn'].map((k) => (k ? dpc(1 / C.planetOrbitalElements[k].solarYearInput) : dpc(1 / _mSY))),
      moonElongation: dpc(1 / C.moonReference.moonSiderealMonthInput - 1 / C.yearLengthRef.siderealYear),
    },
  });
  const BRIDGE = C.earthOrbital.deltaTStart / 86400;
  const Nnut = C.physicalConstants.nutationLeadingTermsArcsec;
  const cache = JSON.parse(readFileSync(CACHE, 'utf8'));
  const jd0 = rows[0].jd, stride = rows[1].jd - rows[0].jd;
  const dLAt = (jd) => { const i = (jd - jd0) / stride, i0 = Math.floor(i), f = i - i0; return rows[i0].dLAs * (1 - f) + rows[i0 + 1].dLAs * f; };
  const r0 = [], r1 = [];
  for (const [jd, jplSun] of cache.rows) {
    const jb = jd + BRIDGE;
    const om = (Nnut.omegaNodeJ2000Deg - 360 * (jb - J2000) / C.moonReference.moonNodalPrecessionDaysInputICRF) * D2R;
    const dPsiDeg = (Nnut.psiOmega * Math.sin(om)) / 3600;
    const raw = wrap(model.eclipse.sunLonDegAtJD(jb) - (jplSun - dPsiDeg)) * AS - shipped.sunPlanetaryCompletionDeg((jb - J2000) / 36525) * AS;
    r0.push(raw);
    r1.push(raw - dLAt(jb));
  }
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
  let sxy = 0, sxx = 0, syy = 0;
  const m0 = mean(r0), md = mean(r0.map((x, i) => x - r1[i]));
  for (let i = 0; i < r0.length; i++) { const a = r0[i] - m0, b = (r0[i] - r1[i]) - md; sxy += a * b; sxx += b * b; syy += a * a; }
  console.log(`\nJPL VALIDATION — series Sun + shipped completion, all-phase n ${r0.length} (1900–2100):`);
  console.log(`  residual sd BEFORE the derived channel: ${sd(r0).toFixed(2)}″   (K-Sun reference 1.58″)`);
  console.log(`  residual sd AFTER  subtracting δL:      ${sd(r1).toFixed(2)}″`);
  console.log(`  correlation(residual, δL) ${(sxy / Math.sqrt(sxx * syy)).toFixed(3)}  slope ${(sxy / sxx).toFixed(3)}  (expect ≈ +1, ≈ 1)`);
}

writeFileSync(HERE + 'd2-earth-osc-channel.local.json', JSON.stringify({
  jd0: rows[0].jd, strideDays: rows[1].jd - rows[0].jd,
  dPomArcsec: rows.map((r) => +r.dPomAs.toFixed(4)), dE: rows.map((r) => +r.dE.toExponential(6)), dLArcsec: rows.map((r) => +r.dLAs.toFixed(4)),
}));
console.log('dumped → d2-earth-osc-channel.local.json');
