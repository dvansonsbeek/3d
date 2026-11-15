/**
 * The eclipse formula of date (plan 33) — the finders' condition in CLOSED FORM on the model's
 * own arguments of date, and the ONE home of the shadow geometry the finders classify with.
 *
 * Meeus Ch. 54 writes the k-th syzygy as a Julian Day from the synodic month and a polynomial in
 * T, corrects it by a series in D, M, M′, F, reads γ off F and the type off γ against the shadow
 * radii. Every one of those inputs is a quantity this model carries OF DATE: the mean elongation
 * from the cumulative counts (moon/arguments — the k-th mean new Moon is D = 360k, the full Moon
 * 360k + 180°), the periodic corrections from the truncated series with its amplitudes of date
 * (the E factor, sin i_L, the m-family — doc 111 §1.43, §1.45), the node and perigee of date, the
 * Moon's distance from the cited history, the Sun's from the N-body series, ΔT from the one
 * bridge. So the formula here is Meeus generalised to every epoch, not copied:
 *
 *   1. the MEAN syzygy — Newton on the unwrapped mean elongation D(t) = 360k + offset;
 *   2. the TRUE syzygy — the series' elongation λ_M − λ_S brought to the offset (secant from the
 *      mean instant; the finders bisect the same condition, so the two instants agree to the
 *      bisection's own 1/86,400 d);
 *   3. GREATEST eclipse — the least distance from the shadow axis: t* = t₀ − β·β̇/(λ̇² + β̇²) on the
 *      rates at the syzygy, then ONE parabolic refinement on the distance function, the finders'
 *      own convention (NASA's greatest eclipse: σ for the lunar side, γ for the solar);
 *   4. γ and the TYPE — the SAME functions the finders call (this module's), on the Moon's distance
 *      of date and the Sun's: Danjon's enlarged shadow for the lunar side, the topocentric
 *      total/annular rule for the solar;
 *   5. the CIVIL instant — TT → UT through the injected bridge (phase/deep-calendar, doc 111 §1.36);
 *   6. the RECURRENCES of date (the corollary) — the smallest integer month counts after which the
 *      node, the anomaly or the season nearly repeats: the shift of the argument per cycle, ranked,
 *      primitive pairs (step 0's measurement); today the tritos, the Saros, the inex and the
 *      Metonic by construction, at the Earth–Moon genesis the eclipse year itself.
 *
 * STANDING (plan 33 §0): inside the NASA Five Millennium Canon's span (−1999…+3000) the formula is
 * gated to minutes and names dates — the regime tag 'certified'. Beyond a few hundred thousand
 * years the Moon's phase in its orbit is reproducible, not certifiable (doc 111 §1.36): there the
 * formula's dates are the model's and its STATISTICS (eclipses per year, seasons, the limits) are
 * the prediction — the tag 'reproducible', and every surface says so.
 *
 * Every function here is pure in its inputs; the model, the browser and the Node twin inject
 * their own series, Sun, bridge and chain (the three-twins rule). The finders import the geometry
 * from here: moving it changed no double (the fixtures stood).
 */

'use strict';

/** Danjon's rule — the Earth's radius enlarged by 1/85 (an opaque atmospheric layer of ~75 km),
 *  the convention of the NASA Five Millennium Canon the lunar finder is gated on. Chauvenet's 1/50
 *  (Meeus Ch. 54's ×1.02 on the radii) shipped until the plan-32 follow-up (doc 111 §1.41 b). */
const DANJON_EARTH_RADIUS_FACTOR = 1 + 1 / 85;

/** The certified window — the NASA Five Millennium Canon's span in engine years (the lunar canon
 *  −1999…+3000 the recall campaign walks; the solar canon's audit sits inside it). A formula
 *  instant inside it is gated to minutes against a dated record; beyond it the instant is the
 *  model's, reproducible, not certified. */
const CANON_WINDOW_YEARS = Object.freeze({ min: -1999, max: 3000 });

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * @typedef {{ rEarthMetres: number, moonDiameterKm: number, sunDiameterKm: number, j2000JD: number, julianCenturyDays: number }} EclipseConstants
 */

/**
 * The lunar shadow's angular geometry at the Moon's distance — Danjon's enlarged umbra and
 * penumbra and the three class limits on the Moon's angular distance σ from the shadow axis.
 * The finders' `_shadowGeometry`, verbatim (bit-identical doubles).
 * @param {number} moonDistanceKm @param {number} sunDistanceKm @param {EclipseConstants} K
 * @returns {{moonR: number, umbraR: number, penumR: number, totalMax: number, partialMax: number, penumMax: number}} degrees
 */
function lunarShadowGeometry(moonDistanceKm, sunDistanceKm, K) {
  const R_EARTH_KM = K.rEarthMetres / 1000;
  const R_MOON_KM = K.moonDiameterKm / 2;
  const R_SUN_KM = K.sunDiameterKm / 2;
  const R_SHADOW_KM = R_EARTH_KM * DANJON_EARTH_RADIUS_FACTOR;
  const umbraApex_rad = Math.atan((R_SUN_KM - R_SHADOW_KM) / sunDistanceKm);
  const penumbraApex_rad = Math.atan((R_SUN_KM + R_SHADOW_KM) / sunDistanceKm);
  const D_MOON_KM = moonDistanceKm;
  const moonR = Math.atan(R_MOON_KM / D_MOON_KM) * R2D;
  const umbraR = Math.atan((R_SHADOW_KM - D_MOON_KM * Math.tan(umbraApex_rad)) / D_MOON_KM) * R2D;
  const penumR = Math.atan((R_SHADOW_KM + D_MOON_KM * Math.tan(penumbraApex_rad)) / D_MOON_KM) * R2D;
  return {
    moonR, umbraR, penumR,
    totalMax: umbraR - moonR,
    partialMax: umbraR + moonR,
    penumMax: penumR + moonR,
  };
}

/**
 * The lunar type and magnitudes from the least distance σ (degrees) — the finders' rule.
 * @param {number} sigmaDeg @param {ReturnType<typeof lunarShadowGeometry>} G
 * @returns {{type: 'Total' | 'Partial' | 'Penumbral' | null, magnitudeUmbral: number, magnitudePenumbral: number}}
 */
function lunarTypeAt(sigmaDeg, G) {
  /** @type {'Total' | 'Partial' | 'Penumbral' | null} */
  let type = null;
  if (sigmaDeg <= G.totalMax) type = 'Total';
  else if (sigmaDeg <= G.partialMax) type = 'Partial';
  else if (sigmaDeg <= G.penumMax) type = 'Penumbral';
  const magnitudeUmbral = type ? Math.max(0, (G.partialMax - sigmaDeg) / (2 * G.moonR)) : 0;
  const magnitudePenumbral = type ? Math.max(0, (G.penumMax - sigmaDeg) / (2 * G.moonR)) : 0;
  return { type, magnitudeUmbral, magnitudePenumbral };
}

/**
 * The solar geometry at conjunction (Meeus Ch. 54's geocentric form with the topocentric Moon):
 * the finders' `_solarGeometry`, verbatim.
 * @param {number} moonDistanceKm @param {number} sunDistanceKm @param {EclipseConstants} K
 * @returns {{moonAppR_geo: number, moonAppR_topo: number, parallax: number, sunAppR: number, partialLim: number, centralLim: number, isTotal: boolean}} degrees
 */
function solarShadowGeometry(moonDistanceKm, sunDistanceKm, K) {
  const R_EARTH_KM = K.rEarthMetres / 1000;
  const R_MOON_KM = K.moonDiameterKm / 2;
  const R_SUN_KM = K.sunDiameterKm / 2;
  const sunAppR = Math.atan(R_SUN_KM / sunDistanceKm) * R2D;
  const D_MOON_KM = moonDistanceKm;
  const moonAppR_geo = Math.atan(R_MOON_KM / D_MOON_KM) * R2D;
  const moonAppR_topo = Math.atan(R_MOON_KM / (D_MOON_KM - R_EARTH_KM)) * R2D;
  const parallax = Math.atan(R_EARTH_KM / D_MOON_KM) * R2D;
  return {
    moonAppR_geo, moonAppR_topo, parallax, sunAppR,
    partialLim: sunAppR + moonAppR_geo + parallax,
    centralLim: parallax - Math.abs(moonAppR_topo - sunAppR),
    isTotal: moonAppR_topo > sunAppR,
  };
}

/**
 * The solar type from |β| at greatest eclipse — the finders' rule.
 * @param {number} absBetaDeg @param {ReturnType<typeof solarShadowGeometry>} G
 * @returns {'Total' | 'Annular' | 'Partial' | null}
 */
function solarTypeAt(absBetaDeg, G) {
  if (absBetaDeg <= G.centralLim) return G.isTotal ? 'Total' : 'Annular';
  if (absBetaDeg <= G.partialLim) return 'Partial';
  return null;
}

/** Wrap to (−180, 180]. @param {number} d @returns {number} */
function wrap180(d) {
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
}

/**
 * The Moon's angular distance σ from the shadow axis: cos σ = cos β · cos Δλ, Δλ the wrapped
 * elongation from the anti-Sun (the finders' `axisDistanceDeg`).
 * @param {number} dLonDeg wrapped to (−180, 180] @param {number} betaDeg @returns {number} degrees
 */
function axisDistanceDeg(dLonDeg, betaDeg) {
  const dLon = dLonDeg * D2R;
  const beta = betaDeg * D2R;
  const cosSigma = Math.cos(beta) * Math.cos(dLon);
  return Math.acos(Math.max(-1, Math.min(1, cosSigma))) / D2R;
}

/**
 * The geocentric γ in Earth radii — the perpendicular distance from the Earth's centre to the
 * Sun–Moon line (the finders' `gammaAtJd`, on the same ecliptic vectors).
 * @param {number} sunLonDeg @param {number} moonLonDeg @param {number} moonBetaDeg
 * @param {number} moonDistanceKm @param {number} sunDistanceKm @param {number} rEarthKm
 * @returns {number} Earth radii (unsigned)
 */
function gammaEarthRadii(sunLonDeg, moonLonDeg, moonBetaDeg, moonDistanceKm, sunDistanceKm, rEarthKm) {
  const sunLonR = sunLonDeg * D2R;
  const moonLonR = moonLonDeg * D2R;
  const moonBetR = moonBetaDeg * D2R;
  const D_moon = moonDistanceKm;
  const D_sun = sunDistanceKm;
  const sX = D_sun * Math.cos(sunLonR), sY = D_sun * Math.sin(sunLonR);
  const cb = Math.cos(moonBetR);
  const mX = D_moon * cb * Math.cos(moonLonR);
  const mY = D_moon * cb * Math.sin(moonLonR);
  const mZ = D_moon * Math.sin(moonBetR);
  const dX = mX - sX, dY = mY - sY, dZ = mZ;
  const dLen = Math.sqrt(dX * dX + dY * dY + dZ * dZ);
  const ux = dX / dLen, uy = dY / dLen, uz = dZ / dLen;
  const proj = mX * ux + mY * uy + mZ * uz;
  const perpX = mX - proj * ux, perpY = mY - proj * uy, perpZ = mZ - proj * uz;
  return Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ) / rEarthKm;
}

/**
 * @typedef {{ synodicDays: number, draconicDays: number, anomalisticDays: number, siderealMonthDays: number,
 *   tropicalYearDays: number, siderealYearDays: number, solarDayDays: number }} PeriodsOfDate
 *   every period in SI days (86,400 s); solarDayDays = LOD/86,400 — the solar day of date in SI days
 */

/**
 * @typedef {{ synodicMonths: number, cycles: number, shiftDegPerCycle: number, spanDays: number,
 *   spanSolarDays: number, spanYears: number, name: string | null }} Recurrence
 *   synodicMonths the integer month count n; cycles the count of the second period (half-integer
 *   for the node when the cycle closes at the OPPOSITE node — the inex, the tritos); the shift of
 *   the argument per cycle in degrees; the span in SI days, in solar days of date and in tropical
 *   years of date; today's name where the pair is today's.
 */

/** Today's named pairs (synodic months / the second period's count) — the labels the of-date
 *  pairs carry only where they are these pairs exactly (plan 30 L(d): the names are today's
 *  coincidences). */
const TODAYS_RECURRENCE_NAMES = Object.freeze({
  node: Object.freeze({ '135/146.5': 'tritos', '223/242': 'Saros', '358/388.5': 'inex', '669/726': 'exeligmos' }),
  anomaly: Object.freeze({ '223/239': 'Saros', '669/717': 'exeligmos' }),
  year: Object.freeze({ '235/19': 'Metonic', '940/76': 'Callippic' }),
});

/**
 * The recurrences of date — for every month count n ≤ maxN the nearest count k of the second
 * period (the node: half-integer allowed — a cycle closing at the opposite node; the anomaly and
 * the season: integer), the shift of the argument per cycle 360·(n·P_syn − k·P)/P, filtered to
 * |shift| ≤ the tolerance, reduced to PRIMITIVE pairs (a multiple of a kept pair with the same
 * ratio is dropped), the shortest first. The tolerances are the ones that select today's named
 * cycles and nothing shorter (step 0's measurement): the node 1° (the tritos 0.52°, the Saros
 * 0.48°, the inex 0.04°; the next shorter pair 88/95.5 reads 1.00°), the season 1° (the Metonic
 * alone, 0.09°), the anomaly 3.5° (the Saros's 223/239 reads 2.82°).
 * @param {PeriodsOfDate} P
 * @param {{maxSynodicMonths?: number, nodeTolDeg?: number, anomalyTolDeg?: number, yearTolDeg?: number, keep?: number}} [opts]
 * @returns {{node: Recurrence[], anomaly: Recurrence[], year: Recurrence[]}}
 */
function recurrencesOfDate(P, opts) {
  const maxN = (opts && opts.maxSynodicMonths) || 1200;
  const keep = (opts && opts.keep) || 6;
  const tol = { node: (opts && opts.nodeTolDeg) || 1.0, anomaly: (opts && opts.anomalyTolDeg) || 3.5, year: (opts && opts.yearTolDeg) || 1.0 };
  /** @type {Array<['node' | 'anomaly' | 'year', number, boolean]>} */
  const families = [['node', P.draconicDays, true], ['anomaly', P.anomalisticDays, false], ['year', P.tropicalYearDays, false]];
  /** @type {{node: Recurrence[], anomaly: Recurrence[], year: Recurrence[]}} */
  const out = { node: [], anomaly: [], year: [] };
  for (const [key, period, half] of families) {
    /** @type {Recurrence[]} */
    const all = [];
    for (let n = 1; n <= maxN; n++) {
      const span = n * P.synodicDays;
      const k = half ? Math.round(2 * span / period) / 2 : Math.round(span / period);
      if (k <= 0) continue;
      const shift = 360 * (span - k * period) / period;
      if (Math.abs(shift) > tol[key]) continue;
      const label = `${n}/${k}`;
      all.push({
        synodicMonths: n, cycles: k, shiftDegPerCycle: shift, spanDays: span,
        spanSolarDays: span / P.solarDayDays, spanYears: span / P.tropicalYearDays,
        name: /** @type {Record<string, string>} */ (TODAYS_RECURRENCE_NAMES[key])[label] || null,
      });
    }
    // primitive: by |shift| ascending, a pair whose month count is a multiple of a kept pair's with
    // the same ratio is the kept pair repeated (the exeligmos is three Saros, the Callippic four
    // Metonic cycles) — kept out of the list; the kept pairs are then ordered by length
    all.sort((a, b) => Math.abs(a.shiftDegPerCycle) - Math.abs(b.shiftDegPerCycle));
    /** @type {Recurrence[]} */
    const kept = [];
    for (const x of all) {
      if (kept.some((y) => x.synodicMonths % y.synodicMonths === 0 && Math.abs(x.cycles / y.cycles - x.synodicMonths / y.synodicMonths) < 1e-9)) continue;
      kept.push(x);
    }
    out[key] = kept.sort((a, b) => a.synodicMonths - b.synodicMonths).slice(0, keep);
  }
  return out;
}

/**
 * @typedef {Object} EclipseFormulaDeps
 * @property {(jdUT: number) => number} moonLonDegAt - the truncated series' ecliptic longitude (the finders' own)
 * @property {(jdUT: number) => number} moonBetaDegAt - the truncated series' ecliptic latitude
 * @property {(jdUT: number) => number} moonDistanceKmAt - the truncated series' distance
 * @property {(jdUT: number) => number} sunLonDegAt - the finders' Sun (mean geometric longitude of date)
 * @property {(jdUT: number) => number} deltaTSecondsAt - the engine's ΔT at a UT JD (the one bridge, UT → TT)
 * @property {(jdTT: number) => number} jdUTFromTT - the one bridge's inverse, TT → UT (phase/deep-calendar's ΔT at a TT instant)
 * @property {(jdTT: number) => number | null} meanElongationUnwrappedDegAt - the mean elongation L′ − L_sun of date, UNWRAPPED (moon/arguments); null beyond the chains
 * @property {(jdTT: number) => {Lp: number, D: number, M: number, Mp: number, F: number}} argsAt - the arguments of date, degrees (moon/arguments)
 * @property {() => number} getSunDistanceKm - live (epoch-mutable), the finders' own
 * @property {(jdTT: number) => (PeriodsOfDate & { moonDistanceKm: number, inclinationDeg: number, laplaceTiltDeg: number }) | null} periodsOfDateAt - the chain's periods of date, the mean Moon distance, the orbit's inclination to the ecliptic of date and the Laplace plane's tilt from the ecliptic (the regime's marker); null beyond the histories
 * @property {() => {min: number, max: number}} jdTTDomain - the navigable domain's TT edges (the Newton seed is clamped inside it)
 * @property {EclipseConstants} constants
 * @property {{min: number, max: number}} [certifiedWindowYears] - the certified window in engine years (default: the canon's)
 */

/** @typedef {'lunar' | 'solar'} EclipseKind */

/**
 * @typedef {Object} EclipseOfDate
 * @property {number} k - the mean syzygy count from J2000 (Meeus's k: integer, the full Moon at k + ½ counted on its own axis)
 * @property {EclipseKind} kind
 * @property {number} jdSyzygyTT - the TRUE syzygy (opposition or conjunction in longitude), TT
 * @property {number} jdSyzygyUT
 * @property {number} jdTT - GREATEST eclipse (the least distance from the shadow axis), TT
 * @property {number} jdUT
 * @property {number} deltaTSeconds - ΔT at the instant (the civil bridge)
 * @property {number} betaDeg - the Moon's ecliptic latitude at greatest eclipse
 * @property {number} moonDistanceKm - at greatest eclipse
 * @property {number} sunDistanceKm
 * @property {{D: number, M: number, Mp: number, F: number}} argsDeg - the arguments of date at the syzygy
 * @property {number} nodeDistanceDeg - the Moon's distance from the nearer node at the syzygy (|F| folded to 0…90°)
 * @property {string | null} type - 'Total' | 'Partial' | 'Penumbral' (lunar) · 'Total' | 'Annular' | 'Partial' (solar) · null = no eclipse
 * @property {number} gamma - lunar: the signed least distance in Earth radii on the fundamental plane (the canon's γ); solar: γ in Earth radii (unsigned, the finders')
 * @property {number} [sigmaDeg] - lunar: the least angular distance from the shadow axis
 * @property {number} [magnitudeUmbral] - lunar
 * @property {number} [magnitudePenumbral] - lunar
 * @property {number} [moonSunRatio] - solar: the topocentric Moon over the Sun
 * @property {ReturnType<typeof lunarShadowGeometry> | ReturnType<typeof solarShadowGeometry>} geometry
 * @property {'certified' | 'reproducible'} regime
 */

/** @param {EclipseFormulaDeps} deps */
function createEclipseFormula(deps) {
  const K = deps.constants;
  const R_EARTH_KM = K.rEarthMetres / 1000;
  const WINDOW = deps.certifiedWindowYears || CANON_WINDOW_YEARS;
  const MIN_DAYS = 1 / 1440;

  /** @param {EclipseKind} kind @returns {number} the elongation at the syzygy, degrees */
  const offsetOf = (kind) => (kind === 'lunar' ? 180 : 0);
  /** The engine year of a TT instant (Julian years from J2000 — doc 111 §1.31's one axis). @param {number} jdTT */
  const engineYearOf = (jdTT) => 2000 + (jdTT - K.j2000JD) / (K.julianCenturyDays / 100);
  /** @param {number} jdUT */
  const jdTTFromUT = (jdUT) => jdUT + deps.deltaTSecondsAt(jdUT) / 86400;
  /** @param {number} jdTT @returns {'certified' | 'reproducible'} */
  const regimeAtTT = (jdTT) => {
    const y = engineYearOf(jdTT);
    return y >= WINDOW.min && y <= WINDOW.max ? 'certified' : 'reproducible';
  };

  /** The MEAN elongation, unwrapped, clamped into the navigable domain's TT edges (the chains are
   *  defined there; a Newton step that leaves the domain lands on its edge and continues).
   *  @param {number} jdTT @returns {{jd: number, D: number} | null} */
  const meanD = (jdTT) => {
    const dom = deps.jdTTDomain();
    const jd = Math.max(dom.min, Math.min(dom.max, jdTT));
    const D = deps.meanElongationUnwrappedDegAt(jd);
    return D === null || !Number.isFinite(D) ? null : { jd, D };
  };

  /** The real-valued mean syzygy count at a TT instant: (D − offset)/360.
   *  @param {number} jdTT @param {EclipseKind} kind @returns {number | null} */
  function meanSyzygyCountAt(jdTT, kind) {
    const m = meanD(jdTT);
    return m === null ? null : (m.D - offsetOf(kind)) / 360;
  }

  /**
   * The MEAN syzygy: the TT instant where the unwrapped mean elongation reaches 360k + offset —
   * Newton with the local mean rate (a central difference over ±1 day; the mean elongation is
   * near-linear, the rate drifts from 12.19 °/d today to 397 °/d at the Earth–Moon genesis), the
   * seed any instant inside the domain (the step is clamped to the domain's edges, where D is
   * monotone, so the walk converges from anywhere).
   * @param {number} k @param {EclipseKind} kind @param {number} [jdTTSeed]
   * @returns {{jdTT: number, jdUT: number} | null}
   */
  function meanSyzygy(k, kind, jdTTSeed) {
    const target = 360 * k + offsetOf(kind);
    // The unwrapped count's RESOLUTION: 1e12° at 400 Ma, 5e14° at the genesis (0.06° per ulp — a
    // few minutes of mean instant there). It is the SEED of the true solve, which runs on the
    // series' wrapped longitudes; the count itself (k) stays exact to 1e-4 at the edge.
    const tol = Math.max(1e-6, 16 * Number.EPSILON * Math.abs(target));
    let m = meanD(Number.isFinite(jdTTSeed) ? /** @type {number} */ (jdTTSeed) : K.j2000JD);
    if (m === null) return null;
    for (let it = 0; it < 24; it++) {
      const diff = target - m.D;
      if (Math.abs(diff) <= tol) break;
      // the mean rate of date, 360° per synodic month (the count integrates the chain's own months)
      const P = deps.periodsOfDateAt(m.jd);
      const rate = P ? 360 / P.synodicDays : 360 / 29.530588853;
      const next = meanD(m.jd + diff / rate);
      if (next === null) return null;
      if (next.jd === m.jd) return null;   // the clamp held the step at the domain's edge: the target lies beyond it
      m = next;
    }
    if (Math.abs(m.D - target) > tol) return null;
    return { jdTT: m.jd, jdUT: deps.jdUTFromTT(m.jd) };
  }

  /** The series' elongation from the syzygy offset, wrapped — the finders' zero-crossing function.
   *  @param {number} jdUT @param {number} offset @returns {number} degrees */
  const elongationResidual = (jdUT, offset) => wrap180(deps.moonLonDegAt(jdUT) - deps.sunLonDegAt(jdUT) - offset);

  /** The series' elongation residual carries a NOISE FLOOR of ~1e-7° — the ΔT bridge's Newton
   *  terminates at 1e-9 d (phase/deep-calendar), 1e-7° at 13 °/d — so a solve on it stops there
   *  (0.7 ms today, 0.02 ms at the genesis), never at the double's own floor: a secant whose two
   *  points both sit in the noise reads a random slope and leaves (measured: NaN after 40 steps). */
  const RESIDUAL_FLOOR_DEG = 2e-7;

  /**
   * The TRUE syzygy: the series' elongation brought to the offset by a fixed-slope Newton walk from
   * the mean instant — the slope the local elongation rate measured ONCE over one degree of mean
   * elongation (the periodic part's rate is ≤ 15 % of the mean rate, so the walk converges
   * linearly, ~8 steps to the floor; the finders bisect the same condition to 1/86,400 d).
   * @param {number} k @param {EclipseKind} kind @param {number} [jdTTSeed]
   * @returns {{k: number, jdMeanTT: number, jdMeanUT: number, jdTT: number, jdUT: number} | null}
   */
  function syzygy(k, kind, jdTTSeed) {
    const mean = meanSyzygy(k, kind, jdTTSeed);
    if (mean === null) return null;
    const off = offsetOf(kind);
    const P = deps.periodsOfDateAt(mean.jdTT);
    // The Newton slope is the MEAN elongation rate of date per UT day: 360° per synodic month (SI
    // days) times the solar day of date in SI days (the UT axis counts solar days — 5.5 h at the
    // genesis, where the Moon moves 397° per SI day and 91° per UT day). Measured over one degree of
    // mean elongation on the series instead, the slope read 68 for 397 at the genesis edge: a Julian
    // Day of 2.5e12 has a 47-s ulp and one degree is four of them (doc 111 §1.37's grain).
    const slope = P ? (360 / P.synodicDays) * P.solarDayDays : 360 / 29.530588853;
    let x = mean.jdUT, f = elongationResidual(x, off);
    // The Julian Day's own GRAIN at depth: 1.5e-5 d at 400 Ma, 1.2e-4 d (10 s) at −2 Gyr, 5.5e-4 d
    // (47 s) at the genesis on the UT axis — the walk cannot settle below it, nor can the finders'
    // bisection; the floor and the acceptance carry it (the elongation moved per ulp of the instant).
    const grainDays = Math.abs(x) * Number.EPSILON;
    const floorDeg = Math.max(RESIDUAL_FLOOR_DEG, 2 * slope * grainDays);
    // half a month in UT days (the SI month over the solar day of date: 3.95 UT days at the genesis): a
    // walk past it has left its syzygy — the periodic correction there reaches 8° of the 91°-per-UT-day
    // elongation, a tenth of a UT day
    const leash = P ? P.synodicDays / P.solarDayDays / 2 : 15;
    for (let it = 0; it < 40; it++) {
      const step = f / slope;
      x -= step;
      if (Math.abs(x - mean.jdUT) > leash) return null;
      f = elongationResidual(x, off);
      if (Math.abs(f) <= floorDeg || Math.abs(step) < grainDays) break;
    }
    if (Math.abs(f) > floorDeg) {
      // The walk did not settle: the residual is a noisy staircase on the axis's grain (the genesis
      // edge, where the bridge's jitter is a few ulps of TT — 0.4–0.8° of elongation per step). The
      // finders' own method stands in: bracket the sign change and bisect to the grain — the zero
      // crossing it lands on is the one the finders land on, within the jitter.
      let lo = x, hi = x, flo = f, fhi = f;
      const span = Math.max(4 * Math.abs(f) / slope, 4 * grainDays);
      for (let it = 0; it < 12 && flo * fhi > 0; it++) { lo -= span; hi += span; flo = elongationResidual(lo, off); fhi = elongationResidual(hi, off); }
      if (flo * fhi > 0 || Math.abs(hi - mean.jdUT) > leash) return null;
      if (flo > 0) { [lo, hi] = [hi, lo]; }   // lo is the negative side
      for (let it = 0; it < 80 && Math.abs(hi - lo) > grainDays; it++) {
        const mid = 0.5 * (lo + hi), fm = elongationResidual(mid, off);
        if (fm < 0) lo = mid; else hi = mid;
      }
      x = 0.5 * (lo + hi); f = elongationResidual(x, off);
    }
    // A residual above 1e-4° (0.5 s today) plus the grain's share is a failed solve, never an answer.
    // The share is 32 ulp of elongation: the UT → TT bridge's own residual, a difference of three
    // 1e12-day numbers, cannot be evaluated below ~1e-3 d at the genesis edge, so the TT instant of
    // a UT instant jitters by a few TT ulps there — 0.4° of lunar longitude, ~3 min of syzygy (the
    // finders inherit the same jitter; the edge's eclipse instants are reproducible to it, not beyond).
    if (!Number.isFinite(x) || Math.abs(f) > 1e-4 + 32 * slope * grainDays) return null;
    return { k, jdMeanTT: mean.jdTT, jdMeanUT: mean.jdUT, jdTT: jdTTFromUT(x), jdUT: x };
  }

  /**
   * The eclipse of the k-th syzygy: greatest eclipse, γ, the type, the regime.
   * @param {number} k @param {EclipseKind} kind @param {number} [jdTTSeed]
   * @returns {EclipseOfDate | null} null where the syzygy cannot be solved (outside the domain)
   */
  function eclipseAt(k, kind, jdTTSeed) {
    const s = syzygy(k, kind, jdTTSeed);
    if (s === null) return null;
    const off = offsetOf(kind);
    const sunDistanceKm = deps.getSunDistanceKm();
    const t0 = s.jdUT;
    // the rates at the syzygy: central differences over ±1 min in UT days — or ±64 ulp of the Julian
    // Day where the axis's grain is coarser (47 s per ulp at the genesis: a 1-min stencil is one ulp,
    // and the bridge's jitter there is a few ulps of TT — the stencil must span many of them)
    const H = Math.max(MIN_DAYS, 64 * Math.abs(t0) * Number.EPSILON);
    const lonDot = (elongationResidual(t0 + H, off) - elongationResidual(t0 - H, off)) / (2 * H);
    const beta0 = deps.moonBetaDegAt(t0);
    const betaDot = (deps.moonBetaDegAt(t0 + H) - deps.moonBetaDegAt(t0 - H)) / (2 * H);
    // the closed form of the least distance: t* = t₀ − β·β̇/(λ̇² + β̇²) (the syzygy itself where the
    // rates cannot be read — a stencil inside the clock's jitter)
    const rates2 = lonDot * lonDot + betaDot * betaDot;
    const tStar = rates2 > 0 && Number.isFinite(rates2) ? t0 - beta0 * betaDot / rates2 : t0;
    // the distance function the finders minimise — σ (lunar) or γ (solar)
    /** @param {number} jd @returns {number} */
    const lunarDist = (jd) => axisDistanceDeg(elongationResidual(jd, off), deps.moonBetaDegAt(jd));
    /** @param {number} jd @returns {number} */
    const solarDist = (jd) => gammaEarthRadii(deps.sunLonDegAt(jd), deps.moonLonDegAt(jd), deps.moonBetaDegAt(jd), deps.moonDistanceKmAt(jd), sunDistanceKm, R_EARTH_KM);
    const dist = kind === 'lunar' ? lunarDist : solarDist;
    // ONE parabolic refinement on the distance function at t* ± 1 min (the finders' step; the grain's
    // stencil at depth)
    let jdG = tStar, dG = dist(tStar);
    {
      const yL = dist(tStar - H), yR = dist(tStar + H);
      const denom = yL - 2 * dG + yR;
      if (Math.abs(denom) > 1e-15) {
        const delta = 0.5 * (yL - yR) / denom;
        if (Math.abs(delta) < 1) {
          const jdR = tStar + delta * H, dR = dist(jdR);
          if (dR < dG) { jdG = jdR; dG = dR; }
        }
      }
    }
    const jdTT = jdTTFromUT(jdG);
    const betaDeg = deps.moonBetaDegAt(jdG);
    const moonDistanceKm = deps.moonDistanceKmAt(jdG);
    const args = deps.argsAt(s.jdTT);
    const Ff = ((args.F % 180) + 180) % 180;
    const nodeDistanceDeg = Math.min(Ff, 180 - Ff);
    const base = {
      k, kind, jdSyzygyTT: s.jdTT, jdSyzygyUT: s.jdUT, jdTT, jdUT: jdG,
      deltaTSeconds: (jdTT - jdG) * 86400,
      betaDeg, moonDistanceKm, sunDistanceKm,
      argsDeg: { D: args.D, M: args.M, Mp: args.Mp, F: args.F },
      nodeDistanceDeg,
      regime: regimeAtTT(jdTT),
    };
    if (kind === 'lunar') {
      const G = lunarShadowGeometry(moonDistanceKm, sunDistanceKm, K);
      const t = lunarTypeAt(dG, G);
      // the canon's γ: the least distance on the fundamental plane in Earth radii, signed by β
      const gamma = Math.sign(betaDeg) * moonDistanceKm * Math.sin(dG * D2R) / R_EARTH_KM;
      return { ...base, type: t.type, gamma, sigmaDeg: dG, magnitudeUmbral: t.magnitudeUmbral, magnitudePenumbral: t.magnitudePenumbral, geometry: G };
    }
    const G = solarShadowGeometry(moonDistanceKm, sunDistanceKm, K);
    return { ...base, type: solarTypeAt(Math.abs(betaDeg), G), gamma: dG, moonSunRatio: G.moonAppR_topo / G.sunAppR, geometry: G };
  }

  /**
   * Every syzygy of a kind in a UT range, eclipse or not (the type null where the Moon misses the
   * shadow) — the formula's enumeration, the finders' range scan in closed form.
   * @param {number} jdUTStart @param {number} jdUTEnd @param {EclipseKind} kind
   * @returns {EclipseOfDate[]}
   */
  function syzygiesInRange(jdUTStart, jdUTEnd, kind) {
    /** @type {EclipseOfDate[]} */
    const out = [];
    const k0 = meanSyzygyCountAt(jdTTFromUT(jdUTStart), kind), k1 = meanSyzygyCountAt(jdTTFromUT(jdUTEnd), kind);
    if (k0 === null || k1 === null) return out;
    let seed = jdTTFromUT(jdUTStart);
    for (let k = Math.floor(k0) - 1; k <= Math.ceil(k1) + 1; k++) {
      const e = eclipseAt(k, kind, seed);
      if (e === null) continue;
      seed = e.jdSyzygyTT;
      if (e.jdUT >= jdUTStart && e.jdUT <= jdUTEnd) out.push(e);
    }
    return out;
  }

  /** The eclipses (type ≠ null) of a kind in a UT range. @param {number} jdUTStart @param {number} jdUTEnd @param {EclipseKind} kind */
  function eclipsesInRange(jdUTStart, jdUTEnd, kind) {
    return syzygiesInRange(jdUTStart, jdUTEnd, kind).filter((e) => e.type !== null);
  }

  /**
   * The first eclipse of a kind at or after a UT instant, within maxSyzygies syzygies.
   * @param {number} jdUT @param {EclipseKind} kind @param {{maxSyzygies?: number}} [opts]
   * @returns {EclipseOfDate | null}
   */
  function nextEclipseAfter(jdUT, kind, opts) {
    const max = (opts && opts.maxSyzygies) || 60;
    const k0 = meanSyzygyCountAt(jdTTFromUT(jdUT), kind);
    if (k0 === null) return null;
    let seed = jdTTFromUT(jdUT);
    for (let k = Math.floor(k0) - 1; k <= Math.floor(k0) + max; k++) {
      // a syzygy the solve refuses is skipped (the one before the domain's edge at the genesis
      // landing, a walk the clock's jitter would not settle): the next one is still the next
      const e = eclipseAt(k, kind, seed);
      if (e === null) continue;
      seed = e.jdSyzygyTT;
      if (e.jdUT >= jdUT && e.type !== null) return e;
    }
    return null;
  }

  /**
   * The statistics of eclipses at an epoch on the MEAN elements of date — what the formula
   * predicts where it names no date (plan 33 §0). On the node distance F uniform over the
   * syzygies: the least distance σ_min = |β|/√(1 + r²) with β = i·sin F and r = β̇/λ̇ = i·P_syn/P_drac,
   * so an eclipse of a class needs |sin F| ≤ s = σ_lim·√(1 + r²)/i and the share of syzygies is
   * (2/π)·asin(min(1, s)); the solar side reads |β| at greatest eclipse, |β|/(1 + r²). The
   * eclipse year is the Sun's return to the node, 1/T_ecl = 1/T_sid + 1/T_node with
   * 1/T_node = 1/P_drac − 1/P_sid (the node's regression); the seasons per year 2·T_trop/T_ecl.
   * Mean elements, named as such: a BAND on the surfaces, never a count of dated events. Inside the
   * Laplace-plane regime (the tilt > 1°, inside ~3.6 Ga — doc 111 §1.42) the node the series
   * carries regresses about the Laplace plane, whose line on the ecliptic is the equinox line, so
   * the seasons follow the equinoxes rather than a regressing ecliptic node: the estimate is
   * flagged `approximate` there and the surfaces say so.
   * @param {number} jdTT
   * @returns {{ eclipseYearDays: number, nodeRegressionDays: number, seasonsPerYear: number, synodicMonthsPerYear: number,
   *   inclinationDeg: number, laplaceTiltDeg: number, approximate: boolean,
   *   lunar: { limitDeg: {penumbral: number, partial: number, total: number}, sinFLimit: {penumbral: number, partial: number, total: number}, perYear: {any: number, umbral: number, total: number} },
   *   solar: { limitDeg: {partial: number, central: number}, sinFLimit: {partial: number, central: number}, perYear: {any: number, central: number} } } | null}
   */
  function statisticsAt(jdTT) {
    const P = deps.periodsOfDateAt(jdTT);
    if (P === null) return null;
    const sunDistanceKm = deps.getSunDistanceKm();
    const i = P.inclinationDeg;
    const r = i * D2R * P.synodicDays / P.draconicDays;
    const sigmaFactor = Math.sqrt(1 + r * r), betaFactor = 1 + r * r;
    const monthsPerYear = P.tropicalYearDays / P.synodicDays;
    /** @param {number} s */
    const share = (s) => (2 / Math.PI) * Math.asin(Math.max(0, Math.min(1, s)));
    const GL = lunarShadowGeometry(P.moonDistanceKm, sunDistanceKm, K);
    const GS = solarShadowGeometry(P.moonDistanceKm, sunDistanceKm, K);
    const lunarS = { penumbral: GL.penumMax * sigmaFactor / i, partial: GL.partialMax * sigmaFactor / i, total: Math.max(0, GL.totalMax) * sigmaFactor / i };
    const solarS = { partial: GS.partialLim * betaFactor / i, central: Math.max(0, GS.centralLim) * betaFactor / i };
    const nodeRegressionDays = 1 / (1 / P.draconicDays - 1 / P.siderealMonthDays);
    const eclipseYearDays = 1 / (1 / P.siderealYearDays + 1 / nodeRegressionDays);
    return {
      eclipseYearDays, nodeRegressionDays,
      seasonsPerYear: 2 * P.tropicalYearDays / eclipseYearDays,
      synodicMonthsPerYear: monthsPerYear,
      inclinationDeg: i,
      laplaceTiltDeg: P.laplaceTiltDeg,
      approximate: P.laplaceTiltDeg > 1,
      lunar: {
        limitDeg: { penumbral: GL.penumMax, partial: GL.partialMax, total: GL.totalMax },
        sinFLimit: lunarS,
        perYear: { any: share(lunarS.penumbral) * monthsPerYear, umbral: share(lunarS.partial) * monthsPerYear, total: share(lunarS.total) * monthsPerYear },
      },
      solar: {
        limitDeg: { partial: GS.partialLim, central: GS.centralLim },
        sinFLimit: solarS,
        perYear: { any: share(solarS.partial) * monthsPerYear, central: share(solarS.central) * monthsPerYear },
      },
    };
  }

  /** The recurrences of date at a TT instant (recurrencesOfDate on the chain's periods there).
   *  @param {number} jdTT @param {Parameters<typeof recurrencesOfDate>[1]} [opts] */
  function recurrencesAt(jdTT, opts) {
    const P = deps.periodsOfDateAt(jdTT);
    return P === null ? null : recurrencesOfDate(P, opts);
  }

  return {
    meanSyzygyCountAt, meanSyzygy, syzygy, eclipseAt, syzygiesInRange, eclipsesInRange, nextEclipseAfter,
    statisticsAt, recurrencesAt,
    /** @param {number} jdTT */ regimeAt: regimeAtTT,
    /** The arguments of date the formula runs on (degrees, wrapped) — the gate's regressor. @param {number} jdTT */
    argumentsAt: (jdTT) => deps.argsAt(jdTT),
    /** The periods of date the recurrences and the statistics run on (SI days), with the mean Moon distance, the inclination and the Laplace tilt of date. @param {number} jdTT */
    periodsAt: (jdTT) => deps.periodsOfDateAt(jdTT),
    /** The series' elongation from the syzygy offset at a UT instant, wrapped (the formula's own residual: 0 at the true syzygy; at the MEAN syzygy it is the periodic correction of date). @param {number} jdUT @param {EclipseKind} kind */
    elongationResidualDegAt: (jdUT, kind) => elongationResidual(jdUT, offsetOf(kind)),
    certifiedWindowYears: WINDOW,
  };
}

module.exports = {
  createEclipseFormula, recurrencesOfDate,
  lunarShadowGeometry, lunarTypeAt, solarShadowGeometry, solarTypeAt, axisDistanceDeg, gammaEarthRadii, wrap180,
  DANJON_EARTH_RADIUS_FACTOR, CANON_WINDOW_YEARS, TODAYS_RECURRENCE_NAMES,
};
