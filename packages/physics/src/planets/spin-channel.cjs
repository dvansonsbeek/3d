/**
 * THE PLANETS' SPIN CHANNEL — the ONE home (plan 06 Phase 7, ex-K8b-3).
 *
 * The Earth channel composes its precession rate from the solar and lunar
 * torques on the model's own recession history (earth/precession-composed).
 * This module is the same question for the seven planets: the precession
 * constant from the planet's OWN quadrupole and spin, with its regular
 * satellites folded in the Ward & Hamilton (2004, AJ 128, 2501) way,
 *
 *     α = (3/2) (n²/ω) (1 − e²)^(−3/2) (J₂ + q) / (λ + l)
 *     q = ½ Σ (m_i/M)(a_i/R)²          the satellites' effective quadrupole
 *     l = Σ (m_i/M)(a_i/R)² (n_i/ω)    the satellites' normalized angular momentum
 *
 * and the spin integrated on the planet's OWN orbit-plane history,
 *
 *     dŝ/dt = α (ŝ·n̂)(ŝ×n̂),
 *
 * with n̂(t) from the planet's deep ζ mode table anchored at the chain's
 * J2000 plane (the same construction as the Earth obliquity hybrid,
 * earth/deep-orbital-history). The initial spin is the IAU J2000 pole
 * (angular-momentum sense: the pole times the sign of the rotation rate),
 * so the J2000 obliquity is DERIVED, not an input — its agreement with the
 * IAU tilt is the first check of every planet's row.
 *
 * What the numbers mean (plan 06 Phase 7 record): where a planet's C/MR²
 * was itself inferred from the measured precession rate (Mars, Venus,
 * Mercury — 'spin-inferred'), this channel's rate is a CLOSURE of that
 * inference through the model's own orbit (a, e, n); where C/MR² comes from
 * gravity-constrained interior models (Jupiter, Saturn), the rate is a
 * prediction, checked against the literature range and against the
 * engine's own nodal line (Saturn's s8). Uranus and Neptune carry the
 * interior-model class with no measured rate to close against.
 *
 * Time here is `year` (Julian years from J2000 on the chain's TT axis —
 * the engine year). Samples are grown from J2000 outward on a fixed step
 * and never revised, so every value is pure in `year` (visit-order
 * independent — the sampler-purity lesson). Beyond ±MAX_SPAN_YR the
 * channel returns null: the ζ tables are the deep tier's, and the domain
 * is the model's.
 */

'use strict';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const ARCSEC_PER_RAD = R2D * 3600;
const DAYS_PER_JULIAN_YEAR = 365.25;
/** the integration step (yr): the shortest free precession period in the set is Venus's ~29 kyr */
const STEP_YR = 25;
/** the reachable span (yr): the deep ζ tables' domain for the obliquity hybrid */
const MAX_SPAN_YR = 10_000_000;

/** @typedef {{ name?: string, gmKm3S2: number, semiMajorAxisKm: number, orbitalPeriodDays: number, retrograde?: boolean }} SpinSatellite */

/**
 * The precession constant from the planet's own torques.
 * @param {{
 *   j2: number, j2ReferenceRadiusKm: number, momentOfInertiaFactor: number,
 *   rotationRateDegPerDay: number, satellites: ReadonlyArray<SpinSatellite>,
 *   gmPlanetSystemKm3S2: number, meanMotionRadPerYr: number, eccentricity: number,
 * }} p
 * @returns {{ alphaArcsecPerYr: number, alphaRadPerYr: number, q: number, l: number,
 *   spinRadPerYr: number, spinRetrograde: boolean, gmPlanetAloneKm3S2: number }}
 */
function computePlanetPrecessionConstant(p) {
  const spinRadPerDay = Math.abs(p.rotationRateDegPerDay) * D2R;
  const spinRetrograde = p.rotationRateDegPerDay < 0;
  let gmSats = 0;
  for (const s of p.satellites) gmSats += s.gmKm3S2;
  const gmAlone = p.gmPlanetSystemKm3S2 - gmSats;
  let q = 0, l = 0;
  for (const s of p.satellites) {
    const x = (s.gmKm3S2 / gmAlone) * (s.semiMajorAxisKm / p.j2ReferenceRadiusKm) ** 2;
    const nSatRadPerDay = (2 * Math.PI / s.orbitalPeriodDays) * (s.retrograde ? -1 : 1);
    q += 0.5 * x;
    l += x * (nSatRadPerDay / spinRadPerDay);
  }
  const spinRadPerYr = spinRadPerDay * DAYS_PER_JULIAN_YEAR;
  const n = p.meanMotionRadPerYr;
  const eFactor = Math.pow(1 - p.eccentricity * p.eccentricity, -1.5);
  const alphaRadPerYr = 1.5 * (n * n / spinRadPerYr) * eFactor * (p.j2 + q) / (p.momentOfInertiaFactor + l);
  return {
    alphaArcsecPerYr: alphaRadPerYr * ARCSEC_PER_RAD,
    alphaRadPerYr,
    q,
    l,
    spinRadPerYr,
    spinRetrograde,
    gmPlanetAloneKm3S2: gmAlone,
  };
}

/** @param {number[]} a @param {number[]} b */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {number[]} a @param {number[]} b */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {number[]} a */
const unit = (a) => { const r = Math.hypot(a[0], a[1], a[2]); return [a[0] / r, a[1] / r, a[2] / r]; };

/**
 * The IAU pole (ICRF equatorial RA/Dec) as an ecliptic-J2000 unit vector.
 * @param {number} raDeg @param {number} decDeg @param {number} obliquityJ2000Deg
 * @returns {number[]}
 */
function poleEclipticJ2000(raDeg, decDeg, obliquityJ2000Deg) {
  const ra = raDeg * D2R, dec = decDeg * D2R, eps = obliquityJ2000Deg * D2R;
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  return [x, y * Math.cos(eps) + z * Math.sin(eps), -y * Math.sin(eps) + z * Math.cos(eps)];
}

/**
 * The planet's orbit normal n̂(t) in ecliptic J2000 from its deep ζ table,
 * DC-anchored at the chain's J2000 plane (the Earth hybrid's ζ convention:
 * ζ = sin(i/2)·e^{iΩ}; the anchor is the coordinate the modes wander around).
 * @param {ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>} zetaModes
 * @param {number} anchorInclEclipticDeg @param {number} anchorAscNodeEclipticDeg
 * @returns {(tYr: number) => number[]}
 */
function createOrbitNormalEvaluator(zetaModes, anchorInclEclipticDeg, anchorAscNodeEclipticDeg) {
  const s2 = Math.sin(anchorInclEclipticDeg / 2 * D2R);
  const anchor = [s2 * Math.cos(anchorAscNodeEclipticDeg * D2R), s2 * Math.sin(anchorAscNodeEclipticDeg * D2R)];
  const sum = (/** @type {number} */ t) => {
    let re = 0, im = 0;
    for (const m of zetaModes) {
      const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t);
      re += m.re * c - m.im * s;
      im += m.re * s + m.im * c;
    }
    return [re, im];
  };
  const s0 = sum(0);
  const R = [anchor[0] - s0[0], anchor[1] - s0[1]];
  return (t) => {
    const [x, y] = sum(t);
    const q = x + R[0], p = y + R[1];
    const i = 2 * Math.asin(Math.min(1, Math.hypot(q, p)));
    const Om = Math.atan2(p, q);
    return [Math.sin(i) * Math.sin(Om), -Math.sin(i) * Math.cos(Om), Math.cos(i)];
  };
}

/**
 * @param {{
 *   key: string,
 *   spin: { j2: number, j2ReferenceRadiusKm: number, momentOfInertiaFactor: number,
 *     momentOfInertiaFactorClass?: string, rotationRateDegPerDay: number,
 *     poleRaJ2000Deg: number, poleDecJ2000Deg: number, cassiniLocked?: boolean,
 *     satellites: ReadonlyArray<SpinSatellite> },
 *   zetaModes: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   anchorInclEclipticDeg: number, anchorAscNodeEclipticDeg: number,
 *   semiMajorAxisAU: number, eccentricity: number, massFractionOfSun: number,
 *   gmSunKm3S2: number, obliquityJ2000Deg: number,
 * }} deps — spin from the astro-reference planetSpinPhysical block; the ζ
 *   table and the J2000 anchor elements from the governed artifacts; the
 *   mass fraction (planet system / Sun) for the two-body mean motion
 *   n = 2π√((1 + μ)/a³); the J2000 obliquity of the ecliptic for the pole
 *   conversion.
 */
function createPlanetSpinChannel(deps) {
  const {
    key, spin, zetaModes, anchorInclEclipticDeg, anchorAscNodeEclipticDeg,
    semiMajorAxisAU, eccentricity, massFractionOfSun, gmSunKm3S2, obliquityJ2000Deg,
  } = deps;
  // the two-body mean motion in the model's own AU–year system: n² a³ = GM_sun (1 + μ)
  const meanMotionRadPerYr = 2 * Math.PI * Math.sqrt((1 + massFractionOfSun) / Math.pow(semiMajorAxisAU, 3));
  const constant = computePlanetPrecessionConstant({
    j2: spin.j2,
    j2ReferenceRadiusKm: spin.j2ReferenceRadiusKm,
    momentOfInertiaFactor: spin.momentOfInertiaFactor,
    rotationRateDegPerDay: spin.rotationRateDegPerDay,
    satellites: spin.satellites,
    gmPlanetSystemKm3S2: gmSunKm3S2 * massFractionOfSun,
    meanMotionRadPerYr,
    eccentricity,
  });
  if (!Number.isFinite(constant.alphaRadPerYr)) {
    // a NaN α would integrate to NaN samples that read as the J2000 value
    // through the envelope's min/max — refuse loudly instead
    throw new Error(`createPlanetSpinChannel(${key}): the precession constant is not finite — check J2, C/MR², the rotation rate, the satellite table and gmSunKm3S2`);
  }
  const orbitNormalAt = createOrbitNormalEvaluator(zetaModes, anchorInclEclipticDeg, anchorAscNodeEclipticDeg);
  const n0 = orbitNormalAt(0);
  // the J2000 spin: the IAU pole in the angular-momentum sense
  const pole = poleEclipticJ2000(spin.poleRaJ2000Deg, spin.poleDecJ2000Deg, obliquityJ2000Deg);
  const s0 = constant.spinRetrograde ? [-pole[0], -pole[1], -pole[2]] : pole;
  const obliquityJ2000 = Math.acos(Math.max(-1, Math.min(1, dot(s0, n0)))) * R2D;
  // the closed-form J2000 pole precession on the orbit normal: ψ̇ = −α cos ε
  const spinPrecessionRateArcsecPerYrJ2000 = -constant.alphaArcsecPerYr * Math.cos(obliquityJ2000 * D2R);
  const axialPrecessionPeriodYearsJ2000 = 1296000 / Math.abs(spinPrecessionRateArcsecPerYrJ2000);
  const cassiniLocked = spin.cassiniLocked === true;

  /** @param {number[]} s @param {number} t */
  const deriv = (s, t) => {
    const n = orbitNormalAt(t);
    const k = constant.alphaRadPerYr * dot(s, n);
    const c = cross(s, n);
    return [k * c[0], k * c[1], k * c[2]];
  };
  /** one RK4 step of the spin equation @param {number[]} s @param {number} t @param {number} h */
  const rk4 = (s, t, h) => {
    const k1 = deriv(s, t);
    const k2 = deriv([s[0] + h / 2 * k1[0], s[1] + h / 2 * k1[1], s[2] + h / 2 * k1[2]], t + h / 2);
    const k3 = deriv([s[0] + h / 2 * k2[0], s[1] + h / 2 * k2[1], s[2] + h / 2 * k2[2]], t + h / 2);
    const k4 = deriv([s[0] + h * k3[0], s[1] + h * k3[1], s[2] + h * k3[2]], t + h);
    return unit([
      s[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      s[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      s[2] + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    ]);
  };

  // append-only trajectories from J2000, one per direction: sample i sits at t = ±i·STEP_YR
  /** @typedef {{ eps: number[], last: number[] }} Track */
  /** @returns {Track} */
  const mkTrack = () => ({ eps: [obliquityJ2000], last: s0.slice() });
  const fwd = mkTrack(), bwd = mkTrack();
  /** @param {Track} tr @param {number} sign @param {number} count */
  const grow = (tr, sign, count) => {
    while (tr.eps.length <= count) {
      const i = tr.eps.length - 1;
      const t = sign * i * STEP_YR;
      const h = sign * STEP_YR;
      const s = rk4(tr.last, t, h);
      const n = orbitNormalAt(t + h);
      tr.eps.push(Math.acos(Math.max(-1, Math.min(1, dot(s, n)))) * R2D);
      tr.last = s;
    }
  };
  /** the sample arrays bracketing t, or null outside the domain @param {number} tYr */
  const bracket = (tYr) => {
    if (!Number.isFinite(tYr) || Math.abs(tYr) > MAX_SPAN_YR) return null;
    const tr = tYr < 0 ? bwd : fwd;
    const sign = tYr < 0 ? -1 : 1;
    const x = Math.abs(tYr) / STEP_YR;
    const i = Math.floor(x);
    grow(tr, sign, i + 1);
    return { tr, i, f: x - i, sign };
  };

  /** obliquity to the planet's own orbit of date, degrees (angular-momentum sense: Venus ≈ 177°, Uranus ≈ 98°) @param {number} year */
  const obliquityDegAtYear = (year) => {
    if (cassiniLocked) return obliquityJ2000;
    const b = bracket(year - 2000);
    if (!b) return null;
    return b.tr.eps[b.i] + b.f * (b.tr.eps[b.i + 1] - b.tr.eps[b.i]);
  };
  /**
   * the pole's precession rate about the orbit normal of date, ″/yr — the
   * spin equation's own rate, ψ̇ = −α cos ε(t), exact at the instant (the
   * orbit plane's own precession is NOT in it: this is the rate the
   * observers' constants quote, about the instantaneous orbit normal)
   * @param {number} year
   */
  const spinPrecessionRateArcsecPerYrAtYear = (year) => {
    if (cassiniLocked) return null;
    const eps = obliquityDegAtYear(year);
    return eps === null ? null : -constant.alphaArcsecPerYr * Math.cos(eps * D2R);
  };
  /** the obliquity envelope over [year − spanYr, year + spanYr] on the sample grid @param {number} year @param {number} spanYr */
  const obliquityEnvelopeDeg = (year, spanYr) => {
    if (cassiniLocked) return { minDeg: obliquityJ2000, meanDeg: obliquityJ2000, maxDeg: obliquityJ2000 };
    const lo = bracket(year - 2000 - spanYr), hi = bracket(year - 2000 + spanYr);
    if (!lo || !hi) return null;
    let mn = Infinity, mx = -Infinity, sum = 0, cnt = 0;
    for (let t = year - 2000 - spanYr; t <= year - 2000 + spanYr; t += STEP_YR) {
      const b = bracket(t);
      if (!b) continue;
      const e = b.tr.eps[b.i];
      if (e < mn) mn = e;
      if (e > mx) mx = e;
      sum += e; cnt++;
    }
    return { minDeg: mn, meanDeg: sum / cnt, maxDeg: mx };
  };

  return Object.freeze({
    key,
    cassiniLocked,
    momentOfInertiaFactor: spin.momentOfInertiaFactor,
    momentOfInertiaFactorClass: spin.momentOfInertiaFactorClass || 'unstated',
    alphaArcsecPerYr: constant.alphaArcsecPerYr,
    satelliteQuadrupole: constant.q,
    satelliteAngularMomentum: constant.l,
    spinRetrograde: constant.spinRetrograde,
    meanMotionRadPerYr,
    obliquityJ2000Deg: obliquityJ2000,
    spinPrecessionRateArcsecPerYrJ2000: cassiniLocked ? null : spinPrecessionRateArcsecPerYrJ2000,
    axialPrecessionPeriodYearsJ2000: cassiniLocked ? null : axialPrecessionPeriodYearsJ2000,
    obliquityDegAtYear,
    spinPrecessionRateArcsecPerYrAtYear,
    obliquityEnvelopeDeg,
    stepYr: STEP_YR,
    maxSpanYr: MAX_SPAN_YR,
  });
}

module.exports = { computePlanetPrecessionConstant, createPlanetSpinChannel, poleEclipticJ2000, createOrbitNormalEvaluator };
