/**
 * The Keplerian planet chain — THE shared implementation (P5/K2 → K4.7b).
 * Engine-D-driven elements → heliocentric positions; lives ONCE here, consumed
 * by tools/lib/keplerian-chain.js (Node binding: fs artifact loader + the
 * model's AU) and by the browser scene (src/script.js) through the embedded
 * chain artifact.
 *
 * SOURCE-OF-TRUTH DOCTRINE (plan 02 §P5): engine D is the truth because it is
 * causally ours. The ONLY inputs are (1) the J2000 Horizons state vectors —
 * the anchor, the numbers left to nature — and (2) element evolution measured
 * by the model's own N-body pipeline (the governed artifact
 * data/nbody-secular-frequencies.json: era-typed window rates, the K4.7
 * multi-mode secular tables, the K4.5/K4.7b derived periodic layer;
 * regenerated from the constants whenever they change, so a changed planet
 * mass propagates engine → artifact → here). No Meeus/JPL/Laskar series or
 * rates enter this module, ever; external ephemerides are anchors and
 * comparison surfaces only. The model's planet positions MAY DIFFER from
 * JPL — that difference is published model content, not a defect.
 *
 * PURITY: every function is pure; the artifact object and the model's AU are
 * passed in by the caller (the two engines bind their own single homes).
 * Units/frames: AU and years internally where named; ecliptic-J2000 frame
 * throughout (the HZ seed frame); angles degrees in the public API.
 * MATCHED PAIR: this file is hashed as an input of the governed artifact —
 * terms and evaluation form ship together (the ~1162-minute-class rule).
 */

'use strict';

/** @typedef {{aAU:number,e:number,inclEclipticDeg:number,ascNodeEclipticDeg:number,
 *             lonPeriEclipticDeg:number,meanLonEclipticDeg:number,
 *             meanMotionDegPerYr?:number,argPeriDeg?:number,meanAnomalyDeg?:number}} KcElements */
/** @typedef {{omegaRadPerYr:number,cos:number,sin:number}} KcCosSinTerm */
/** @typedef {{omegaRadPerYr:number,re:number,im:number}} KcComplexTerm */
/** @typedef {{comps:Array<{planet:string,sLam?:number,sPom?:number}>,cos:number,sin:number}} KcPoissonCosSinTerm */
/** @typedef {{comps:Array<{planet:string,sLam?:number,sPom?:number}>,re:number,im:number}} KcPoissonComplexTerm */
/** @typedef {{off:number,slope?:number}} KcAffine */
/** @typedef {{windowAffine?:Object<string,KcAffine>,mlonArcsec?:KcCosSinTerm[],aPpm?:KcCosSinTerm[],
 *             z?:KcComplexTerm[],zeta?:KcComplexTerm[],
 *             poissonMlonArcsec?:KcPoissonCosSinTerm[],poissonZ?:KcPoissonComplexTerm[]}} KcPeriodicTerms */
/** @typedef {{anchor:KcElements,periRateArcsecCy:number,meanMotionDegPerYr:(number|null),
 *             windowRates?:{meanMotionDegPerYr?:number,nodeRateArcsecCy?:number,eccDotPerCy?:number,inclDotArcsecCy?:number},
 *             secularModes?:({z:KcComplexTerm[],zeta:KcComplexTerm[]}|null),
 *             periodicTerms?:(KcPeriodicTerms|undefined)}} KcPlanetChain */

const D2R = Math.PI / 180;

// The anchor epoch of the HZ state vectors: J2000.0 (JD 2451545.0), carried
// in this module's `year` coordinate as 2000.0 by convention. PRECISION NOTE
// (K3): JD 2451545.0 is Jan 1, 12:00 TT — when the chain meets a scene
// calendar, the epoch maps through the model's OWN JD→year machinery (the
// linear-vs-calendar JD→year trap), never a hand-made offset; a half-day
// slip is 2° of Mercury mean longitude.
const ANCHOR_EPOCH_YEAR = 2000;
const ANCHOR_EPOCH_JD = 2451545.0;

/** Full osculating elements from a heliocentric ecliptic-J2000 state vector.
 *  @param {number[]} rKm  heliocentric position, km
 *  @param {number[]} vKmS heliocentric velocity, km/s
 *  @param {number} muKm3S2 GM_Sun + GM_planet
 *  @param {number} auKm   the model's AU in km (caller's single home)
 *  @returns {{aAU:number,e:number,inclEclipticDeg:number,ascNodeEclipticDeg:number,
 *             argPeriDeg:number,lonPeriEclipticDeg:number,meanAnomalyDeg:number,
 *             meanLonEclipticDeg:number,meanMotionDegPerYr:number}} */
function computeOsculatingElements(rKm, vKmS, muKm3S2, auKm) {
  const r = rKm, v = vKmS, mu = muKm3S2;
  const rn = Math.hypot(r[0], r[1], r[2]);
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const hn = Math.hypot(h[0], h[1], h[2]);
  const ev = [0, 1, 2].map((c) =>
    (v[(c + 1) % 3] * h[(c + 2) % 3] - v[(c + 2) % 3] * h[(c + 1) % 3]) / mu - r[c] / rn);
  const e = Math.hypot(ev[0], ev[1], ev[2]);
  const aKm = 1 / (2 / rn - v2 / mu);
  const incl = Math.acos(h[2] / hn);
  const Om = Math.atan2(h[0], -h[1]);                       // ascending node
  // argument of perihelion
  const nodeU = [Math.cos(Om), Math.sin(Om), 0];
  let argw = Math.acos(Math.max(-1, Math.min(1, (nodeU[0] * ev[0] + nodeU[1] * ev[1]) / e)));
  if (ev[2] < 0) argw = 2 * Math.PI - argw;
  // true anomaly → eccentric → mean
  let nu = Math.acos(Math.max(-1, Math.min(1, (ev[0] * r[0] + ev[1] * r[1] + ev[2] * r[2]) / (e * rn))));
  const rv = r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  if (rv < 0) nu = 2 * Math.PI - nu;
  const E = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(nu), e + Math.cos(nu));
  const M = E - e * Math.sin(E);
  const nRadS = Math.sqrt(mu / (aKm * aKm * aKm));          // rad/s
  const meanMotionDegPerYr = nRadS * 86400 * 365.25 / D2R;
  const wrap = (/** @type {number} */ x) => ((x % 360) + 360) % 360;
  const lonPeri = wrap((Om + argw) / D2R);
  return {
    aAU: aKm / auKm,
    e,
    inclEclipticDeg: incl / D2R,
    ascNodeEclipticDeg: wrap(Om / D2R),
    argPeriDeg: wrap(argw / D2R),
    lonPeriEclipticDeg: lonPeri,
    meanAnomalyDeg: wrap(M / D2R),
    meanLonEclipticDeg: wrap(lonPeri + M / D2R),
    meanMotionDegPerYr,
  };
}

/** Solve Kepler's equation E − e·sinE = M (radians), Newton iteration.
 *  @param {number} meanAnomalyRad @param {number} e @returns {number} */
function solveKeplerRad(meanAnomalyRad, e) {
  let E = e < 0.8 ? meanAnomalyRad : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - meanAnomalyRad) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-14) break;
  }
  return E;
}

/** Heliocentric ecliptic-J2000 position from elements-of-date.
 *  @param {{aAU:number,e:number,inclEclipticDeg:number,ascNodeEclipticDeg:number,
 *           lonPeriEclipticDeg:number,meanLonEclipticDeg:number}} el
 *  @returns {{xAU:number,yAU:number,zAU:number,rAU:number}} */
function computeHeliocentricEclipticFromElements(el) {
  const Mdeg = el.meanLonEclipticDeg - el.lonPeriEclipticDeg;
  const E = solveKeplerRad(((Mdeg % 360) + 360) % 360 * D2R, el.e);
  const xp = el.aAU * (Math.cos(E) - el.e);
  const yp = el.aAU * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const w = (el.lonPeriEclipticDeg - el.ascNodeEclipticDeg) * D2R;
  const Om = el.ascNodeEclipticDeg * D2R;
  const inc = el.inclEclipticDeg * D2R;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), ci = Math.cos(inc), si = Math.sin(inc);
  const xAU = (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp;
  const yAU = (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp;
  const zAU = (sw * si) * xp + (cw * si) * yp;
  return { xAU, yAU, zAU, rAU: Math.hypot(xAU, yAU, zAU) };
}

/** Poisson argument θ (radians) at `year`: Σ comps of s_lam·λ̄ + s_pom·ϖ over
 *  the referenced planets — λ̄ from the linear skeleton, ϖ(t) from the
 *  multi-mode secular sum (d'Alembert-complete arguments; K4.7b — RECORD
 *  ONLY: the era solve measured Poisson columns negative, no terms are
 *  exported; the machinery stands as the campaign record).
 *  @param {number} year @param {Object<string,KcPlanetChain>} allChains
 *  @param {Array<{planet:string,sLam?:number,sPom?:number}>} comps
 *  @returns {number} */
function computePoissonArgRad(year, allChains, comps) {
  let th = 0;
  for (const c of comps) {
    const ch = allChains[c.planet], a = ch.anchor;
    if (c.sLam) th += c.sLam * (a.meanLonEclipticDeg + (ch.meanMotionDegPerYr ?? a.meanMotionDegPerYr ?? 0) * (year - ANCHOR_EPOCH_YEAR)) * D2R;
    if (c.sPom) {
      // secular-only ϖ(t): the periodic terms are stripped BY CONSTRUCTION —
      // a runtime chain carrying poissonZ terms would otherwise recurse
      // through this very argument.
      const el = computePlanetElementsAtYear(year, { ...ch, periodicTerms: undefined });
      th += c.sPom * el.lonPeriEclipticDeg * D2R;
    }
  }
  return th;
}

/** Elements-of-date for one planet.
 *  @param {number} year decimal year (epoch parameter first, per naming rule)
 *  @param {KcPlanetChain} planetChain
 *  @param {Object<string,KcPlanetChain>=} allChains  full chain set — required
 *         only when planetChain.periodicTerms carries Poisson-argument terms
 *  @returns {KcElements} elements at `year` */
function computePlanetElementsAtYear(year, planetChain, allChains) {
  const dt = year - ANCHOR_EPOCH_YEAR;
  const a = planetChain.anchor;
  const n = planetChain.meanMotionDegPerYr ?? a.meanMotionDegPerYr ?? 0;
  const r = planetChain.windowRates || {};   // K2.1 era-typed drifts (legacy linear path)
  const wrap = (/** @type {number} */ x) => ((x % 360) + 360) % 360;
  const out = {
    aAU: a.aAU,
    meanLonEclipticDeg: wrap(a.meanLonEclipticDeg + n * dt),
    e: 0, inclEclipticDeg: 0, ascNodeEclipticDeg: 0, lonPeriEclipticDeg: 0,
  };
  const SM = planetChain.secularModes;
  if (SM) {
    // K4.7 — THE MULTI-MODE SECULAR SKELETON (same physics for all planets):
    // z(t) = Σ modes + constant remainder; the linear-drift tangent was
    // measured leaving the eigenmode-rotation curvature as an unfixable
    // residual (Saturn ~700µ sagitta over ±2.5 kyr). The constant remainder
    // z₀ − Σmodes(0) is the content a 1-Myr NAFF cannot resolve
    // (ultra-long modes + short-period at the anchor) — itself physical.
    const sum = (/** @type {KcComplexTerm[]} */ modes, /** @type {number} */ t2) => {
      let re = 0, im = 0;
      for (const m of modes) { const c = Math.cos(m.omegaRadPerYr * t2), s = Math.sin(m.omegaRadPerYr * t2); re += m.re * c - m.im * s; im += m.re * s + m.im * c; }
      return [re, im];
    };
    const [zk, zh] = sum(SM.z, dt), [zk0, zh0] = sum(SM.z, 0);
    const k0 = zk + (a.e * Math.cos(a.lonPeriEclipticDeg * D2R) - zk0);
    const h0 = zh + (a.e * Math.sin(a.lonPeriEclipticDeg * D2R) - zh0);
    out.e = Math.hypot(k0, h0);
    out.lonPeriEclipticDeg = wrap(Math.atan2(h0, k0) / D2R);
    const [zq, zp] = sum(SM.zeta, dt), [zq0, zp0] = sum(SM.zeta, 0);
    const s2a = Math.sin(a.inclEclipticDeg / 2 * D2R);
    const q0 = zq + (s2a * Math.cos(a.ascNodeEclipticDeg * D2R) - zq0);
    const p0 = zp + (s2a * Math.sin(a.ascNodeEclipticDeg * D2R) - zp0);
    out.inclEclipticDeg = 2 * Math.asin(Math.hypot(q0, p0)) / D2R;
    out.ascNodeEclipticDeg = wrap(Math.atan2(p0, q0) / D2R);
  } else {
    // legacy linear path (frozen-element gating; pre-K4.7 artifacts)
    out.e = a.e + ((r.eccDotPerCy || 0) / 100) * dt;
    out.inclEclipticDeg = a.inclEclipticDeg + ((r.inclDotArcsecCy || 0) / 3600 / 100) * dt;
    out.ascNodeEclipticDeg = wrap(a.ascNodeEclipticDeg + ((r.nodeRateArcsecCy || 0) / 3600 / 100) * dt);
    out.lonPeriEclipticDeg = wrap(a.lonPeriEclipticDeg + (planetChain.periRateArcsecCy / 3600 / 100) * dt);
  }
  // K4.5 — the DERIVED periodic layer: engine-extracted/era-solved terms in
  // the mean longitude, the semi-major axis, and the nonsingular z-vector
  // (z = k + i·h = e·e^{iϖ}), plus the era-typed in-window affine (anchor-
  // snapshot vs window content). All quantities measured from the model's
  // own N-body runs (k45-residual-naff / k45e-amplitude-solve are the
  // record) — nothing observation-fitted.
  const P = planetChain.periodicTerms;
  if (P) {
    const w = P.windowAffine || {};
    // K4.7b — the semi-major-axis channel: heliocentric osculating elements
    // slosh TOGETHER at the synodic periods (largely the Sun's giant-planet
    // reflex, physical on both sides of any comparison); fitting λ̄/z wobbles
    // while freezing a at the anchor leaves an element-INCONSISTENT set — the
    // reconstructed position needs all channels or none (measured: U/N δa/a
    // residual 3000–3800 ppm at the J/S synodics, k47b spectrum).
    if (P.aPpm || w.a) {
      let dA = w.a ? w.a.off + (w.a.slope || 0) * dt : 0;
      for (const tm of P.aPpm || []) dA += tm.cos * Math.cos(tm.omegaRadPerYr * dt) + tm.sin * Math.sin(tm.omegaRadPerYr * dt);
      out.aAU = a.aAU * (1 + dA * 1e-6);
    }
    let dMlon = w.mlon ? w.mlon.off + (w.mlon.slope || 0) * dt : 0;
    for (const tm of P.mlonArcsec || []) dMlon += tm.cos * Math.cos(tm.omegaRadPerYr * dt) + tm.sin * Math.sin(tm.omegaRadPerYr * dt);
    // K4.7b — Poisson-argument terms (record only; none currently exported)
    for (const tm of P.poissonMlonArcsec || []) {
      const th = computePoissonArgRad(year, allChains || {}, tm.comps);
      dMlon += tm.cos * Math.cos(th) + tm.sin * Math.sin(th);
    }
    out.meanLonEclipticDeg = wrap(out.meanLonEclipticDeg + dMlon / 3600);
    let k0 = out.e * Math.cos(out.lonPeriEclipticDeg * D2R) + (w.k ? w.k.off + (w.k.slope || 0) * dt : 0);
    let h0 = out.e * Math.sin(out.lonPeriEclipticDeg * D2R) + (w.h ? w.h.off + (w.h.slope || 0) * dt : 0);
    for (const tm of P.z || []) {
      const c = Math.cos(tm.omegaRadPerYr * dt), s = Math.sin(tm.omegaRadPerYr * dt);
      k0 += tm.re * c - tm.im * s; h0 += tm.re * s + tm.im * c;
    }
    for (const tm of P.poissonZ || []) {
      const th = computePoissonArgRad(year, allChains || {}, tm.comps);
      const c = Math.cos(th), s = Math.sin(th);
      k0 += tm.re * c - tm.im * s; h0 += tm.re * s + tm.im * c;
    }
    out.e = Math.hypot(k0, h0);
    out.lonPeriEclipticDeg = wrap(Math.atan2(h0, k0) / D2R);
    // K4.5c — the out-of-plane channel: ζ = q + i·p = sin(i/2)·e^{iΩ}
    if (P.zeta || w.q || w.p) {
      let q0 = Math.sin(out.inclEclipticDeg / 2 * D2R) * Math.cos(out.ascNodeEclipticDeg * D2R) + (w.q ? w.q.off + (w.q.slope || 0) * dt : 0);
      let p0 = Math.sin(out.inclEclipticDeg / 2 * D2R) * Math.sin(out.ascNodeEclipticDeg * D2R) + (w.p ? w.p.off + (w.p.slope || 0) * dt : 0);
      for (const tm of P.zeta || []) {
        const c = Math.cos(tm.omegaRadPerYr * dt), s = Math.sin(tm.omegaRadPerYr * dt);
        q0 += tm.re * c - tm.im * s; p0 += tm.re * s + tm.im * c;
      }
      out.inclEclipticDeg = 2 * Math.asin(Math.hypot(q0, p0)) / D2R;
      out.ascNodeEclipticDeg = wrap(Math.atan2(p0, q0) / D2R);
    }
  }
  return out;
}

/** The chain's canonical constructor from a PARSED governed artifact (K2.1 →
 *  K4.6c): anchors (the engine-extracted t=0 elements), era-typed window
 *  rates, the K4.7 secular mode tables, and the K4.5/K4.7b periodic layer.
 *  @param {*} art  the governed engine-D artifact, parsed (deep JSON —
 *         shape enforced by the generator's assertions, not retyped here)
 *  @param {{skeletonOnly?:boolean}=} opts  skeletonOnly omits the periodic
 *         layer — REQUIRED by the extraction/solve instruments, which
 *         measure the residual AGAINST the skeleton; a terms-bearing chain
 *         there would extract its own output.
 *  @returns {Object<string,KcPlanetChain>} */
function buildPlanetChainsFromArtifactData(art, opts = {}) {
  if (!art.windowElementRates || !art.j2000AnchorElements) {
    throw new Error('artifact predates K2.1 — regenerate: node tools/verify/nbody-secular.js --write');
  }
  /** @type {Object<string,KcPlanetChain>} */
  const chains = {};
  for (const key of Object.keys(art.j2000AnchorElements)) {
    const n = art.windowElementRates[key].meanMotionDegPerYr;
    chains[key] = {
      anchor: { ...art.j2000AnchorElements[key], meanMotionDegPerYr: n },
      periRateArcsecCy: art.windowRatesArcsecCy.gr[key],
      meanMotionDegPerYr: n,
      windowRates: art.windowElementRates[key],
      secularModes: art.secularModes ? art.secularModes[key] : null,   // K4.7 multi-mode skeleton
    };
    if (!opts.skeletonOnly && art.periodicTerms && art.periodicTerms[key]) {
      chains[key].periodicTerms = art.periodicTerms[key];
    }
  }
  return chains;
}

module.exports = {
  ANCHOR_EPOCH_YEAR,
  ANCHOR_EPOCH_JD,
  computeOsculatingElements,
  solveKeplerRad,
  computeHeliocentricEclipticFromElements,
  computePoissonArgRad,
  computePlanetElementsAtYear,
  buildPlanetChainsFromArtifactData,
};
