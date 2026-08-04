// ═══════════════════════════════════════════════════════════════════════════
// SCENE GRAPH ENGINE — Standalone position calculator for the solar system
// Replicates the Three.js hierarchy from script.js without any rendering.
//
// Usage:
//   const { computePlanetPosition } = require('./scene-graph');
//   const pos = computePlanetPosition('mars', 2451716.5);
//   // → { ra, dec, distAU, sunDistAU }  (ra/dec in radians)
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');
const OE = require('./orbital-engine');
const DT = require('./deep-time');
const MEEUS_LUNAR = JSON.parse(require('fs').readFileSync(
  require('path').resolve(__dirname, '..', '..', 'public', 'input', 'meeus-lunar-tables.json'), 'utf8'));

// ═══════════════════════════════════════════════════════════════════════════
// FRAMEWORK-NATIVE SUN ECLIPTIC LONGITUDE — analytical utility
// ═══════════════════════════════════════════════════════════════════════════
// Reproduces what the scene graph computes for Sun at any JD, without needing
// to run moveModel. Kepler + framework harmonics, no Meeus polynomial. Used
// by diagnostic tools and available for external consumers.
// See docs/hidden/IP-framework-native-sun-ecliptic-longitude.md.

// ─── Mode-aware phase cycles helper ────────────────────────────────────────
// In snapshot mode (DEEP_TIME_ENABLED=false): (year - anchor) × N / H_J2000
// In integrated mode: DT.cyclesBetweenYears (integrates ∫N/H(t)dt properly)
// Both agree at J2000; diverge at deep time per framework's H(t) drift.

// Euclidean gcd — used by the H-lattice filter in sunLongitudeCorrection.
function _gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b !== 0) { const t = b; b = a % b; a = t; } return a; }

function _phaseCycles(year, divisor_N) {
  if (DEEP_TIME_ENABLED) {
    return DT.cyclesBetweenYears(C.balancedYear, year, divisor_N);
  }
  return (year - C.balancedYear) * divisor_N / C.H;
}

// ─── Framework-native Sun ecliptic longitude (Kepler + framework harmonics) ─
// Returns Sun's ecliptic longitude in framework's ICRF (J2000-fixed) frame,
// in degrees [0, 360). Uses:
//   - Framework's tropical year (snapshot: fixed; integrated: mid-point of H(t) evolution)
//   - Framework's eccentricity harmonic (varies at H/16 perihelion cycle)
//   - Framework's perihelion precession (H/16)
//   - Kepler higher-order Equation of Center (to e⁴)
// NO Meeus polynomial. NO T²/T³ secular artifacts.
// Deep-time-safe: bounded at all epochs. Mode-aware via _phaseCycles.
function _frameworkSunLon(jd_ut) {
  const _d2r = Math.PI / 180;
  // Scene consistency: use jd_UT directly, no TT shift. Framework's scene Sun
  // advances linearly in UT time (2π per T_trop UT days). Applying ΔT would
  // put us at TT which mismatches scene by rate × ΔT (~12° drift at year 20000
  // where framework ΔT ≈ 1M seconds). Empirically verified: scene at Y=+20000
  // Jun 15 = 235.30°, no-ΔT formula = 235.22° (0.08° gap); with-ΔT was 246.65°.
  // Meeus's own _eclSunLon still applies ΔT internally (canonical for eclipse
  // detection where Sun-Moon geometry needs both bodies on the same TT clock).
  const year = C.jdToYear(jd_ut);

  // ── Mean longitude (linear rate; framework's tropical year) ────────────
  const days_from_j2000 = jd_ut - C.j2000JD;
  let T_tropical_days;
  if (DEEP_TIME_ENABLED) {
    // Midpoint approximation: (T_j2000 + T_now) / 2
    // At Devonian ~71 ppm drift → sub-arcsec Sun position error over span
    const t_Ma = (2000 - year) / 1e6;
    const T_now = DT.meanTropicalYearDaysAtAge(t_Ma);
    T_tropical_days = 0.5 * (C.meanSolarYearDays + (T_now || C.meanSolarYearDays));
  } else {
    T_tropical_days = C.meanSolarYearDays;
  }
  const L0_j2000_deg = 280.46646;   // Sun mean lon at J2000 (matches Meeus anchor)
  const L_deg = L0_j2000_deg + 360 * days_from_j2000 / T_tropical_days;

  // ── Perihelion longitude (H/16 cycle; framework's precession) ──────────
  // Sun's geocentric perihelion = Earth's heliocentric perihelion + 180°
  const perihelion_j2000_deg =
    (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + 180) % 360;
  const cyclesNow_16   = _phaseCycles(year, 16);
  const cyclesJ2000_16 = _phaseCycles(2000, 16);
  const perihelion_deg = perihelion_j2000_deg
                       + 360 * (cyclesNow_16 - cyclesJ2000_16);

  // ── Mean anomaly ───────────────────────────────────────────────────────
  const M_rad = (L_deg - perihelion_deg) * _d2r;

  // ── Eccentricity (framework's law of cosines, matches computeEccentricityEarth) ──
  // e(t) = √(base² + amp² − 2·base·amp·cos(θ)) where θ = (year - balancedYear)/H_16 × 2π
  // NOT the additive form. At J2000 gives e ≈ 0.01671 (IAU) via specific phase.
  const perihelionPhase_rad = 2 * Math.PI * _phaseCycles(year, 16);
  const _base = C.eccentricityBase;
  const _amp  = C.eccentricityAmplitude;
  const e = Math.sqrt(_base * _base + _amp * _amp
                    - 2 * _base * _amp * Math.cos(perihelionPhase_rad));

  // ── Equation of Center (Kepler higher-order, to e⁴) ────────────────────
  const e2 = e * e, e3 = e2 * e, e4 = e3 * e;
  const _rad2deg = 180 / Math.PI;
  const C_eq_deg = ((2 * e - e3 / 4) * Math.sin(M_rad)
                 + (1.25 * e2 - 11 / 24 * e4) * Math.sin(2 * M_rad)
                 + (13 / 12 * e3) * Math.sin(3 * M_rad)
                 + (103 / 96 * e4) * Math.sin(4 * M_rad)) * _rad2deg;

  // ── Sun ecliptic longitude ─────────────────────────────────────────────
  // Result is in the same frame as framework's kinematic Sun (RA/Dec output
  // of computeSunPositionFast converted via IAU obliquity). No extra H/5
  // precession offset — framework's kinematic Sun's inertial position does
  // not accumulate H/5 in its RA/Dec output at the precision this replaces.
  const lambda = L_deg + C_eq_deg;
  return ((lambda % 360) + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// Framework-native lunar fundamental arguments — mirror of src/script.js
// (_FW_MOON / _fwMoonArgs / _fwSunSecularDeviations / _moonArgsAt). One
// argument source everywhere: the fitting/verification world now runs the
// same skeleton as production (docs/66 §1). Pure-Meeus A/B reference via
// env MOON_ARGS_PURE_MEEUS=1 (matches the browser console flag flip).
// ═══════════════════════════════════════════════════════════════════════════
const MOON_ARGS_FRAMEWORK_NATIVE = !process.env.MOON_ARGS_PURE_MEEUS;

// D2 derived additional-argument rates (deg/cy, J2000 8H-lattice months —
// mirrors src/script.js FW_A2_RATE/FW_A3_RATE; record: tools/explore/derive-a1a2a3.js)
const _FW_A2_RATE = 2 * (360 * 36525 / C.moonTropicalMonth)
                  - (360 * 36525 / C.moonAnomalisticMonth)
                  - 2 * (360 * 36525 / C.planets.jupiter.solarYearInput);
const _FW_A3_RATE = 360 * 36525 / C.moonSiderealMonth;

// Jupiter orbital chain (mirrors src/script.js meanJupiterOrbitalCyclesBetween:
// Driver 2 — T_p(t) = T_p0·(1 − massloss·t)²) for the deep-time A2 argument.
const _JUP_PERIOD_J2000_S = C.planets.jupiter.solarYearInput * 86400;
const _meanJupiterOrbitalPeriodSecondsTools = (t_Ma) =>
  t_Ma === 0 ? _JUP_PERIOD_J2000_S
             : _JUP_PERIOD_J2000_S * Math.pow(1 - DT.SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6, 2);
const _mcJupiter = (a, b) => _moonChainCyclesTools(_meanJupiterOrbitalPeriodSecondsTools, a, b);

const _FW_MOON = (() => {
  const LP0 = 218.3164477, D0 = 297.8501921, M0 = 357.5291092,
        MP0 = 134.9633964, F0 = 93.2720950;
  const LPR = 481267.88123421, DR = 445267.1114034, MR = 35999.0502909,
        MPR = 477198.8675055,  FR = 483202.0175233;
  const WDOT = LPR - MPR;
  const NDOT = LPR - FR;
  const E0 = C.ASTRO_REFERENCE.earthEccentricityJ2000, EDOT0 = C.ASTRO_REFERENCE.earthEccentricityDotJ2000;
  const KAPPA = 3 * E0 * EDOT0 / (1 - E0 * E0);
  const S_W = 2.407, S_N = 1.018;   // both Meeus-effective (v4 frame attribution; physical 2.479/0.867)
  const T2_W = S_W * WDOT * KAPPA / 2;
  const T2_N = S_N * NDOT * KAPPA / 2;
  const EDDOT0 = C.ASTRO_REFERENCE.earthEccentricityDotDotJ2000;   // Taylor-check anchor (mirrors src/script.js _FW_MOON)
  const KAPPA_DOT = 3 * (EDOT0 * EDOT0 + E0 * EDDOT0) / (1 - E0 * E0)
                  + 6 * E0 * E0 * EDOT0 * EDOT0 / Math.pow(1 - E0 * E0, 2);
  const T3_W = WDOT * (S_W * S_W * KAPPA * KAPPA + S_W * KAPPA_DOT) / 6;
  const T3_N = NDOT * (S_N * S_N * KAPPA * KAPPA + S_N * KAPPA_DOT) / 6;
  const T2_LP_TIDAL     = (-25.86 / 3600) / 2;
  const T2_LP = T2_LP_TIDAL + (-0.0015786 - T2_LP_TIDAL);
  return { LP0, D0, M0, MP0, F0, LPR, DR, MR, WDOT, NDOT, T2_W, T2_N, T3_W, T3_N, T2_LP, T2_LP_TIDAL, S_W, S_N };
})();

/** Phase-aware channel-rate integral (mirror of src/script.js
 *  _fwChannelIntegral): ∫₀ᵀ [(g(e_E(t))/g₀)^s − 1] dt′ in Julian cy. */
function _fwChannelIntegralTools(T, s) {
  if (T === 0) return 0;
  const DTmod = require('./deep-time');
  const g0 = Math.pow(1 - Math.pow(DTmod._fwEarthEcc(0), 2), -1.5);
  const f = (t) => {
    const e = DTmod._fwEarthEcc(t * 100);
    return Math.pow(Math.pow(1 - e * e, -1.5) / g0, s) - 1;
  };
  const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 8000));
  const h = T / N;
  let sum = f(0) + f(T);
  for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
  return sum * h / 3;
}

const _FW_SUN_SEC = (() => {
  const trop = C.TROPICAL_YEAR_HARMONICS, anom = C.ANOMALISTIC_YEAR_HARMONICS;
  const PBAR = C.meanSolarYearDays, ABAR = C.meanAnomalisticYearDays, DBAR = ABAR - PBAR;
  const KL = -(360 / PBAR);
  const wbar = 360 * DBAR / ABAR;
  const KA = wbar * PBAR / (ABAR * DBAR);
  const KS = -wbar / DBAR;
  const dP = (y, set) => { const t = y - C.balancedYear; let s = 0;
    for (const [dv, sc, cc] of set) { const w = 2 * Math.PI / (C.H / dv);
      s += sc * Math.sin(w * t) + cc * Math.cos(w * t); } return s; };
  const intdP = (y, set) => { const t = y - C.balancedYear; let s = 0;
    for (const [dv, sc, cc] of set) { const w = 2 * Math.PI / (C.H / dv);
      s += (-sc * Math.cos(w * t) + cc * Math.sin(w * t)) / w; } return s; };
  return { int0T: intdP(2000, trop), int0A: intdP(2000, anom),
           slope0L: KL * dP(2000, trop),
           slope0P: KA * dP(2000, anom) + KS * dP(2000, trop),
           KL, KA, KS, dP, intdP, trop, anom };
})();

function _fwSunSecularDeviations(jd_tt) {
  const y = 2000 + (jd_tt - C.j2000JD) / C.inputMeanSolarYear;
  const S = _FW_SUN_SEC;
  const iT = S.intdP(y, S.trop) - S.int0T, iA = S.intdP(y, S.anom) - S.int0A;
  return {
    dLs:   S.KL * iT - S.slope0L * (y - 2000),
    dPeri: S.KA * iA + S.KS * iT - S.slope0P * (y - 2000),
  };
}

// ── Stage B deep-time branch (mirror of src/script.js _fwMoonArgsDeep) ─────
// Always-chains: secular phases from the factored-law month/precession chains
// under SG_DEEP_TIME=1 (the same functions that phase the deep-time layers).
// Snapshot mode (default) keeps the certified polynomial skeleton.
// SI-year coordinate: MUST mirror the browser's _jdToSIyear exactly, which
// divides by SI_TROPICAL_YEAR_DAYS = MEAN_TROPICAL_YEAR_J2000_S/86400
// (≈ 365.24189 — NOT the 365.2422 input constant).
const _SI_TROP_DAYS = DT.MEAN_TROPICAL_YEAR_J2000_S / 86400;
const _jdToSIyearTools = (jd) => C.startModelYearWithCorrection + (jd - C.startmodelJD) / _SI_TROP_DAYS;
// Cumulative month-cycle tables (mirror of src/script.js _moonCycleTable):
// fixed 10-yr grid over ±250 kyr, per-cell 3-point Simpson at build, linear
// interpolation on read; deterministic, call-order independent. The adaptive
// Simpson below stays as the out-of-range fallback.
const _MOON_CYCLE_TABLES_T = new Map();
const _MCT_MIN_T  = 2000 - 250000;
const _MCT_MAX_T  = 2000 + 250000;
const _MCT_STEP_T = 10;
function _moonCycleTableTools(periodFn) {
  let tab = _MOON_CYCLE_TABLES_T.get(periodFn);
  if (tab !== undefined) return tab;
  const N = Math.round((_MCT_MAX_T - _MCT_MIN_T) / _MCT_STEP_T);
  const cum = new Float64Array(N + 1);
  const j2000Idx = Math.round((2000 - _MCT_MIN_T) / _MCT_STEP_T);
  const f = (y) => {
    const t_Ma = (2000 - y) / 1e6;
    const T_p = periodFn(t_Ma);
    if (T_p === null) return null;
    const T_yr = DT.meanTropicalYearSecondsAtAge(t_Ma);
    return T_yr === null ? null : T_yr / T_p;
  };
  let ok = true;
  let fPrev = f(_MCT_MIN_T);
  for (let i = 1; i <= N; i++) {
    const fMid = f(_MCT_MIN_T + (i - 0.5) * _MCT_STEP_T);
    const fCur = f(_MCT_MIN_T + i * _MCT_STEP_T);
    if (fPrev === null || fMid === null || fCur === null) { ok = false; break; }
    cum[i] = cum[i - 1] + (fPrev + 4 * fMid + fCur) * (_MCT_STEP_T / 6);
    fPrev = fCur;
  }
  if (ok) {
    const c0 = cum[j2000Idx];
    for (let i = 0; i <= N; i++) cum[i] -= c0;
    tab = cum;
  } else {
    tab = null;
  }
  _MOON_CYCLE_TABLES_T.set(periodFn, tab);
  return tab;
}
function _moonCycleTableAtTools(tab, y) {
  const idx_f = (y - _MCT_MIN_T) / _MCT_STEP_T;
  const i = Math.floor(idx_f);
  return tab[i] + (idx_f - i) * (tab[i + 1] - tab[i]);
}

function _moonChainCyclesTools(periodFn, yearA, yearB) {
  const dy = yearB - yearA;
  if (dy === 0) return 0;
  if (yearA > _MCT_MIN_T && yearA < _MCT_MAX_T && yearB > _MCT_MIN_T && yearB < _MCT_MAX_T) {
    const tab = _moonCycleTableTools(periodFn);
    if (tab !== null) return _moonCycleTableAtTools(tab, yearB) - _moonCycleTableAtTools(tab, yearA);
  }
  let n = Math.max(32, Math.ceil(Math.abs(dy) / 1000));
  if (n > 1024) n = 1024;
  if (n % 2 === 1) n++;
  const h = dy / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const t_Ma = (2000 - (yearA + i * h)) / 1e6;
    const T_p = periodFn(t_Ma);
    const T_yr = DT.meanTropicalYearSecondsAtAge(t_Ma);
    if (T_p === null || T_yr === null) return null;
    sum += ((i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2)) * (T_yr / T_p);
  }
  return (sum * h) / 3;
}
// Named moon-chain wrappers (mirror of src/script.js meanMoon*Between family;
// used by both the deep-time argument branch and the layer integrator branch)
const _mcDraconic      = (a, b) => _moonChainCyclesTools(DT.meanNodalMonthAtAge, a, b);
const _mcTropical      = (a, b) => _moonChainCyclesTools(DT.meanTropicalMonthAtAge, a, b);
const _mcAnomalistic   = (a, b) => _moonChainCyclesTools(DT.meanAnomalisticMonthAtAge, a, b);
const _mcApsidalOfDate = (a, b) => {
  const t = _mcTropical(a, b), n = _mcAnomalistic(a, b);
  return (t === null || n === null) ? null : t - n;
};
const _mcNodalOfDate   = (a, b) => {
  const dr = _mcDraconic(a, b), t = _mcTropical(a, b);
  return (dr === null || t === null) ? null : dr - t;
};
// apsidal-meets-nodal pair: the two members carry equal-and-opposite signs
// with nothing between them, so ANY common integrator cancels exactly (the
// browser uses meanApsidalMeetsNodalAtAge; net-neutral here by construction)
const _mcApsidalMeetsNodal = _mcApsidalOfDate;

// D5 derived optics (mirrors src/script.js _sunGeoVecEqD5/_moonAberrationRaDec):
// annual aberration of the Moon direction from the framework speedOfLight +
// the Sun's velocity. FRAMEWORK-NATIVE Sun vector: e(T) from the anchored
// observed eccentricity + drift (ASTRO_REFERENCE), equation-of-center
// coefficients DERIVED from e via the Kepler series (2e − e³/4, (5/4)e²,
// (13/12)e³ — the same identity the D1 laboratory proved at 2 ppm), mean
// longitude rate = framework tropical year, mean anomaly rate = that minus
// the H/16 perihelion rate, R from currentAUDistance, ε from the framework
// obliquity (bounded at deep time). One J2000 anchor: the Sun's mean
// longitude (sunMeanLongitudeJ2000_deg, astro-reference.json).
function _sunGeoVecEqD5Tools(jd) {
  const T = (jd - C.j2000JD) / 36525;
  const d = jd - C.j2000JD;
  const rateL = 360 / C.meanSolarYearDays;                             // deg/day, framework tropical
  const ratePeri = 360 / ((C.H / 16) * C.meanSolarYearDays);           // deg/day, H/16 perihelion advance
  const L0 = C.ASTRO_REFERENCE.sunMeanLongitudeJ2000_deg + rateL * d;
  const M = ((L0 - (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + ratePeri * d)) + 180) * d2r;  // geocentric-perigee convention (Sun perigee = Earth perihelion + 180°)
  const e = C.ASTRO_REFERENCE.earthEccentricityJ2000 + C.ASTRO_REFERENCE.earthEccentricityDotJ2000 * T;
  const Ceq = ((2 * e - Math.pow(e, 3) / 4) * Math.sin(M)
            + 1.25 * e * e * Math.sin(2 * M)
            + (13 / 12) * Math.pow(e, 3) * Math.sin(3 * M)) / d2r;     // deg (Kepler EoC series)
  const lam = (L0 + Ceq) * d2r;
  const v = M + Ceq * d2r;
  const R = (1 - e * e) / (1 + e * Math.cos(v)) * C.currentAUDistance;
  const eps = OE.computeObliquityEarth(2000 + d / 365.2425) * d2r;
  return [R * Math.cos(lam), R * Math.sin(lam) * Math.cos(eps), R * Math.sin(lam) * Math.sin(eps)];
}
function _moonAberrationRaDecTools(jd, ra, dec) {
  const h = 0.02;
  const a = _sunGeoVecEqD5Tools(jd - h), b = _sunGeoVecEqD5Tools(jd + h);
  const s = 1 / (2 * h * 86400 * C.speedOfLight);
  const kx = -(b[0] - a[0]) * s, ky = -(b[1] - a[1]) * s, kz = -(b[2] - a[2]) * s;
  const cd = Math.cos(dec);
  const ux = cd * Math.cos(ra), uy = cd * Math.sin(ra), uz = Math.sin(dec);
  const wx = ux - kx, wy = uy - ky, wz = uz - kz;
  const wr = Math.sqrt(wx * wx + wy * wy + wz * wz);
  let dRA = Math.atan2(wy, wx) - ra;
  dRA = Math.atan2(Math.sin(dRA), Math.cos(dRA));
  return { dRA, dDec: Math.asin(Math.max(-1, Math.min(1, wz / wr))) - dec };
}

// UT→TT (mirror of src/script.js Phase 9.16): TT = UT + ΔT from the
// framework chain. Both the Meeus/args side AND the Moon-chain layers run on
// TT — one clock for the ring and the Moon at every epoch.
function _jdTTToolsFromUT(jd) {
  if (!DEEP_TIME_ENABLED) return jd;
  const t_Ma = -(jd - C.j2000JD) / 365.2425 / 1e6;
  const dT = DT.meanDeltaTSecondsAtAge(t_Ma);
  return Number.isFinite(dT) ? jd + dT / 86400 : jd;
}

// Bounded planetary Lp carrier mirror (src/script.js _fwLpPlanetaryCarrier):
// K_PL·∫₀ᵀ(e_E²−e_E²(J2000))dt′ — CHANNEL-ONLY normalization (v4 carrier
// split): K_PL derived lazily from the channel part of the record remainder
// (planetary +5.8665″ + the 0.077″ Meeus-tidal gap; k = −2332, inside the
// adiabatic −2370 ± 40); the figure+frame part (+1.30363″) lives in
// _fwLpObliquityCarrierTools below. No new constants.
// ATTRIBUTION (v4 K_PL budget, closed with zero free parameters — primary
// sources in astro-reference.json elpW1T2Decomposition_arcsecPerCy2, runnable
// at tools/explore/v4-kpl-budget.js): the remainder +7.247″/cy² = true
// planetary +5.8665 (e_E²-channel physics) + Earth-figure J2 +0.1925 +
// frame ṗ_A T² +1.11113 (equinox-of-date bridge; now DERIVED at 104% by the
// ṗ composition chain, v4-pdot-composer3.js) + 0.077 Meeus-era
// tidal-convention gap (Γ embedded −25.706 vs LLR −25.858).
let _fwLpKplTools = null;
function _fwLpPlanetaryCarrierTools(T) {
  if (T === 0) return 0;
  const DTmod = require('./deep-time');
  if (_fwLpKplTools === null) {
    const de2dT = Math.pow(DTmod._fwEarthEcc(50), 2) - Math.pow(DTmod._fwEarthEcc(-50), 2);
    // v4 carrier split: channel part only (planetary + Meeus-era tidal gap);
    // the figure+frame part moved to _fwLpObliquityCarrierTools. k = −2332,
    // inside the adiabatic −2370 ± 40 (E5).
    const _elp = C.ASTRO_REFERENCE.elpW1T2Decomposition_arcsecPerCy2;
    const _t2Obl = (_elp.earthFigureJ2 + _elp.generalPrecessionPA_T2_Lieske1976) / 3600;
    _fwLpKplTools = 2 * (_FW_MOON.T2_LP - _FW_MOON.T2_LP_TIDAL - _t2Obl) / de2dT;
  }
  const e0 = DTmod._fwEarthEcc(0), e0sq = e0 * e0;
  const f = (t) => { const e = DTmod._fwEarthEcc(t * 100); return e * e - e0sq; };
  const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 8000));
  const h = T / N;
  let sum = f(0) + f(T);
  for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
  return _fwLpKplTools * sum * h / 3;
}

// v4 carrier split — bounded obliquity-line carrier mirror (src/script.js
// _fwLpObliquityCarrier): the figure+frame remainder (+1.30363″/cy²) rides
// the framework obliquity cycle; C_OBL = 2·T2_OBL/ε̇₀; zero new fitted values.
let _fwLpOblTools = null;
function _fwLpObliquityCarrierTools(T) {
  if (T === 0) return 0;
  if (_fwLpOblTools === null) {
    const _elp = C.ASTRO_REFERENCE.elpW1T2Decomposition_arcsecPerCy2;
    const T2_OBL = (_elp.earthFigureJ2 + _elp.generalPrecessionPA_T2_Lieske1976) / 3600;
    const eps0 = OE.computeObliquityEarth(2000);
    const epsDot = OE.computeObliquityEarth(2050) - OE.computeObliquityEarth(1950);
    _fwLpOblTools = { eps0, C: 2 * T2_OBL / epsDot };
  }
  const f = (t) => OE.computeObliquityEarth(2000 + t * 100) - _fwLpOblTools.eps0;
  const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 2000));
  const h = T / N;
  let sum = f(0) + f(T);
  for (let i = 1; i < N; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
  return _fwLpOblTools.C * sum * h / 3;
}

let _fwArgsY0Tools = null;
function _fwMoonArgsDeepTools(jd) {
  const A = _FW_MOON;
  if (_fwArgsY0Tools === null) _fwArgsY0Tools = _jdToSIyearTools(C.j2000JD);
  const y = _jdToSIyearTools(jd);
  const Ntrop = _moonChainCyclesTools(DT.meanTropicalMonthAtAge, _fwArgsY0Tools, y);
  const Nanom = _moonChainCyclesTools(DT.meanAnomalisticMonthAtAge, _fwArgsY0Tools, y);
  const Ndrac = _moonChainCyclesTools(DT.meanNodalMonthAtAge, _fwArgsY0Tools, y);
  const Nperi = DT.cyclesBetweenYears(_fwArgsY0Tools, y, 16);
  if (Ntrop === null || Nanom === null || Ndrac === null || Nperi === null) return null;
  const wrap = (x) => ((x % 360) + 360) % 360;
  const dev = _fwSunSecularDeviations(jd);
  // Planetary Lp remainder — bounded e_E² carrier (see src comment)
  const Tj = (jd - C.j2000JD) / 36525;
  const Lp   = A.LP0 + 360 * Ntrop + _fwLpPlanetaryCarrierTools(Tj) + _fwLpObliquityCarrierTools(Tj);
  const w    = (A.LP0 - A.MP0) + 360 * (Ntrop - Nanom);            // of-date perigee, advance
  const om   = (A.LP0 - A.F0)  - 360 * (Ndrac - Ntrop);            // of-date node, regression
  const Lsun = (A.LP0 - A.D0) + 360 * (y - _fwArgsY0Tools) + dev.dLs;
  const ws   = (A.LP0 - A.D0 - A.M0) + 360 * Nperi + dev.dPeri;
  return { Lp: wrap(Lp), D: wrap(Lp - Lsun), M: wrap(Lsun - ws),
           Mp: wrap(Lp - w), F: wrap(Lp - om) };
}

function _fwMoonArgs(jd_tt) {
  // Always-chains in deep-time mode (Stage B; mirrors src — no toggle,
  // this is simply how deep-time mode works). Snapshot mode keeps the
  // certified polynomial skeleton.
  if (DEEP_TIME_ENABLED) {
    const dt = _fwMoonArgsDeepTools(jd_tt);
    if (dt !== null) return dt;
  }
  const A = _FW_MOON;
  const T = (jd_tt - C.j2000JD) / 36525;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const wrap = (x) => ((x % 360) + 360) % 360;
  // Polynomial tails clamped at |T| ≤ 100 cy (mirrors src/script.js — the
  // unclamped T⁴ tail reverses lunar motion at year ~1.99e6)
  const Tc = Math.max(-100, Math.min(100, T));
  const Tc2 = Tc * Tc, Tc3 = Tc2 * Tc, Tc4 = Tc3 * Tc;
  // D3 (v4): T³/T⁴ tails derived — see src/script.js note + tools/explore/v4-d3-tails.js
  const Lp = A.LP0 + A.LPR * T + A.T2_LP * Tc2 + Tc3 / 538841 - Tc4 / 65194000;
  // Phase-aware channel rate (mirror): rate = WDOT·(g/g₀)^s integrated exactly
  const w  = (A.LP0 - A.MP0) + A.WDOT * (T + _fwChannelIntegralTools(T, A.S_W));
  const om = (A.LP0 - A.F0)  + A.NDOT * (T + _fwChannelIntegralTools(T, A.S_N));
  const dev  = _fwSunSecularDeviations(jd_tt);
  const Lsun = (A.LP0 - A.D0) + (A.LPR - A.DR) * T + dev.dLs;
  const ws   = (A.LP0 - A.D0 - A.M0) + (A.LPR - A.DR - A.MR) * T + dev.dPeri;
  return {
    Lp: wrap(Lp),
    D:  wrap(Lp - Lsun),
    M:  wrap(Lsun - ws),
    Mp: wrap(Lp - w),
    F:  wrap(Lp - om),
  };
}

/** Argument dispatcher mirror: framework-native by default, pure Meeus
 *  polynomials when MOON_ARGS_PURE_MEEUS=1.
 *  8.2-1 S2 alignment: the polynomials are Meeus's EXACT FRACTIONS, verbatim
 *  from src/script.js _moonArgsAt. The previous decimal coefficients from
 *  meeus-lunar-tables.json contained two outright errors (Lp T⁴ off by
 *  0.056%, F T⁴ in the 5th figure) — the fraction form is the original and
 *  the two engines now evaluate identical expressions. */
function _moonArgsAtTools(jd_tt) {
  if (MOON_ARGS_FRAMEWORK_NATIVE) return _fwMoonArgs(jd_tt);
  const T = (jd_tt - C.j2000JD) / 36525;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const wrap = (x) => ((x % 360) + 360) % 360;
  return {
    Lp: wrap(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000),
    D:  wrap(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000),
    M:  wrap(357.5291092 +  35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000),
    Mp: wrap(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000),
    F:  wrap( 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000),
  };
}

/** Bounded Meeus E-factor mirror: e_E(t)/e_E(J2000) from the fully-derived
 *  framework H/3 fluctuation line (kills the polynomial blow-up at deep time). */
function _fwEFactorTools(d_days, T, T2) {
  if (!MOON_ARGS_FRAMEWORK_NATIVE) {
    const EC = MEEUS_LUNAR.eccentricityCorrection;
    return 1 + EC.e1 * T + EC.e2 * T2;
  }
  const DTmod = require('./deep-time');
  // Denominator is the J2000 anchor CONST, not _fwEarthEcc(0): under the
  // integrated phase (8.2-1 S1) cycles(2000→2000) carries the R3 drift
  // correction and is not exactly zero. Mirrors src/script.js _fwEFactor.
  return DTmod._fwEarthEcc(d_days / C.inputMeanSolarYear) / DTmod._FW_ECC_E0;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEEP-TIME MODE (Option B, mirrors browser DEEP_TIME_MODE_ENABLED)
// ═══════════════════════════════════════════════════════════════════════════
// When SG_DEEP_TIME=1, each computePlanetPosition / computeSunPositionFast
// call syncs a per-epoch snapshot of H, mSY, and derived quantities via
// meanHAtAge(t_Ma) / meanTropicalYearDaysAtAge(t_Ma). Object .speed values
// stay frozen at J2000 (matching browser scene-graph behavior); only the
// JD↔pos conversion and derived-year math pick up the epoch shift. Toggle
// OFF ⇒ bit-identical to prior J2000-only output. See doc
// IP-deep-time-scene-graph-fitpipeline.md §5-6.
// R1: deep time is ON by default, matching the browser scene — which IS the
// model. It used to default OFF, so Step 6a chained its event search with
// C.meanSolarYearDays while the scene used SI_TROPICAL_YEAR_DAYS: a 1.37e-6 d
// gap that put every measured year length 118 ms/yr out (measured directly as
// a linear ramp, −1.182 s at 1990 → +1.182 s at 2010), and 4–6 HOURS on the
// Babylonian eclipse set. Set SG_DEEP_TIME=0 to opt out (snapshot mode).
const DEEP_TIME_ENABLED = process.env.SG_DEEP_TIME !== '0';

// ═══════════════════════════════════════════════════════════════════════════
// MINIMAL MATRIX4 (column-major, matches Three.js convention)
// ═══════════════════════════════════════════════════════════════════════════

class Mat4 {
  constructor() { this.e = new Float64Array(16); this.e[0]=this.e[5]=this.e[10]=this.e[15]=1; }

  identity() { this.e.fill(0); this.e[0]=this.e[5]=this.e[10]=this.e[15]=1; return this; }

  copy(m) { for (let i=0;i<16;i++) this.e[i]=m.e[i]; return this; }

  // C = A * B  (this = a * b)
  multiplyMatrices(a, b) {
    const ae = a.e, be = b.e, te = this.e;
    const a11=ae[0],a21=ae[1],a31=ae[2],a41=ae[3];
    const a12=ae[4],a22=ae[5],a32=ae[6],a42=ae[7];
    const a13=ae[8],a23=ae[9],a33=ae[10],a43=ae[11];
    const a14=ae[12],a24=ae[13],a34=ae[14],a44=ae[15];
    const b11=be[0],b21=be[1],b31=be[2],b41=be[3];
    const b12=be[4],b22=be[5],b32=be[6],b42=be[7];
    const b13=be[8],b23=be[9],b33=be[10],b43=be[11];
    const b14=be[12],b24=be[13],b34=be[14],b44=be[15];
    te[0]=a11*b11+a12*b21+a13*b31+a14*b41;
    te[4]=a11*b12+a12*b22+a13*b32+a14*b42;
    te[8]=a11*b13+a12*b23+a13*b33+a14*b43;
    te[12]=a11*b14+a12*b24+a13*b34+a14*b44;
    te[1]=a21*b11+a22*b21+a23*b31+a24*b41;
    te[5]=a21*b12+a22*b22+a23*b32+a24*b42;
    te[9]=a21*b13+a22*b23+a23*b33+a24*b43;
    te[13]=a21*b14+a22*b24+a23*b34+a24*b44;
    te[2]=a31*b11+a32*b21+a33*b31+a34*b41;
    te[6]=a31*b12+a32*b22+a33*b32+a34*b42;
    te[10]=a31*b13+a32*b23+a33*b33+a34*b43;
    te[14]=a31*b14+a32*b24+a33*b34+a34*b44;
    te[3]=a41*b11+a42*b21+a43*b31+a44*b41;
    te[7]=a41*b12+a42*b22+a43*b32+a44*b42;
    te[11]=a41*b13+a42*b23+a43*b33+a44*b43;
    te[15]=a41*b14+a42*b24+a43*b34+a44*b44;
    return this;
  }

  premultiply(m) { return this.multiplyMatrices(m, this); }
  multiply(m) { return this.multiplyMatrices(this, m); }

  makeTranslation(x, y, z) {
    this.identity(); this.e[12]=x; this.e[13]=y; this.e[14]=z; return this;
  }

  makeRotationX(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[5]=c; this.e[9]=-s; this.e[6]=s; this.e[10]=c; return this;
  }
  makeRotationY(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[0]=c; this.e[8]=s; this.e[2]=-s; this.e[10]=c; return this;
  }
  makeRotationZ(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[0]=c; this.e[4]=-s; this.e[1]=s; this.e[5]=c; return this;
  }

  // Compose from position (x,y,z) and Euler XYZ rotation (rx,ry,rz in radians)
  // Matches Three.js Object3D default Euler order 'XYZ'
  // From Three.js src/math/Euler.js makRotationFromEuler case 'XYZ':
  compose(px, py, pz, rx, ry, rz) {
    const a=Math.cos(rx), b=Math.sin(rx);
    const c=Math.cos(ry), d=Math.sin(ry);
    const e=Math.cos(rz), f=Math.sin(rz);
    const ae=a*e, af=a*f, be=b*e, bf=b*f;
    const te = this.e;
    te[0]=c*e;       te[4]=-c*f;       te[8]=d;           te[12]=px;
    te[1]=af+be*d;   te[5]=ae-bf*d;    te[9]=-b*c;        te[13]=py;
    te[2]=bf-ae*d;   te[6]=be+af*d;    te[10]=a*c;        te[14]=pz;
    te[3]=0;         te[7]=0;          te[11]=0;           te[15]=1;
    return this;
  }

  // Invert a 4x4 matrix (general case)
  getInverse(m) {
    const me = m.e, te = this.e;
    const n11=me[0],n21=me[1],n31=me[2],n41=me[3];
    const n12=me[4],n22=me[5],n32=me[6],n42=me[7];
    const n13=me[8],n23=me[9],n33=me[10],n43=me[11];
    const n14=me[12],n24=me[13],n34=me[14],n44=me[15];
    const t11=n23*n34*n42-n24*n33*n42+n24*n32*n43-n22*n34*n43-n23*n32*n44+n22*n33*n44;
    const t12=n14*n33*n42-n13*n34*n42-n14*n32*n43+n12*n34*n43+n13*n32*n44-n12*n33*n44;
    const t13=n13*n24*n42-n14*n23*n42+n14*n22*n43-n12*n24*n43-n13*n22*n44+n12*n23*n44;
    const t14=n14*n23*n32-n13*n24*n32-n14*n22*n33+n12*n24*n33+n13*n22*n34-n12*n23*n34;
    const det=n11*t11+n21*t12+n31*t13+n41*t14;
    if (det === 0) { this.identity(); return this; }
    const d = 1/det;
    te[0]=t11*d;
    te[1]=(n24*n33*n41-n23*n34*n41-n24*n31*n43+n21*n34*n43+n23*n31*n44-n21*n33*n44)*d;
    te[2]=(n22*n34*n41-n24*n32*n41+n24*n31*n42-n21*n34*n42-n22*n31*n44+n21*n32*n44)*d;
    te[3]=(n23*n32*n41-n22*n33*n41-n23*n31*n42+n21*n33*n42+n22*n31*n43-n21*n32*n43)*d;
    te[4]=t12*d;
    te[5]=(n13*n34*n41-n14*n33*n41+n14*n31*n43-n11*n34*n43-n13*n31*n44+n11*n33*n44)*d;
    te[6]=(n14*n32*n41-n12*n34*n41-n14*n31*n42+n11*n34*n42+n12*n31*n44-n11*n32*n44)*d;
    te[7]=(n12*n33*n41-n13*n32*n41+n13*n31*n42-n11*n33*n42-n12*n31*n43+n11*n32*n43)*d;
    te[8]=t13*d;
    te[9]=(n14*n23*n41-n13*n24*n41-n14*n21*n43+n11*n24*n43+n13*n21*n44-n11*n23*n44)*d;
    te[10]=(n12*n24*n41-n14*n22*n41+n14*n21*n42-n11*n24*n42-n12*n21*n44+n11*n22*n44)*d;
    te[11]=(n13*n22*n41-n12*n23*n41-n13*n21*n42+n11*n23*n42+n12*n21*n43-n11*n22*n43)*d;
    te[12]=t14*d;
    te[13]=(n13*n24*n31-n14*n23*n31+n14*n21*n33-n11*n24*n33-n13*n21*n34+n11*n23*n34)*d;
    te[14]=(n14*n22*n31-n12*n24*n31-n14*n21*n32+n11*n24*n32+n12*n21*n34-n11*n22*n34)*d;
    te[15]=(n12*n23*n31-n13*n22*n31+n13*n21*n32-n11*n23*n32-n12*n21*n33+n11*n22*n33)*d;
    return this;
  }

  // Transform a point (x,y,z) by this matrix, return [x,y,z]
  transformPoint(x, y, z) {
    const e = this.e;
    return [
      e[0]*x + e[4]*y + e[8]*z + e[12],
      e[1]*x + e[5]*y + e[9]*z + e[13],
      e[2]*x + e[6]*y + e[10]*z + e[14],
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SPHERICAL COORDINATES (matches Three.js Spherical)
// ═══════════════════════════════════════════════════════════════════════════

function cartesianToSpherical(x, y, z) {
  const r = Math.sqrt(x*x + y*y + z*z);
  if (r === 0) return { r: 0, theta: 0, phi: 0 };
  return {
    r,
    theta: Math.atan2(x, z),   // Three.js: theta = atan2(x, z)
    phi: Math.acos(Math.min(1, Math.max(-1, y / r))),  // Three.js: phi = acos(y/r)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE GRAPH NODE
// ═══════════════════════════════════════════════════════════════════════════

// Each node represents a Three.js Object3D with:
//   position (x,y,z), rotation (x,y,z in radians), children
// The "local matrix" is composed from position + rotation.
// The "world matrix" = parent.worldMatrix * localMatrix.

class Node {
  constructor(name) {
    this.name = name;
    this.px = 0; this.py = 0; this.pz = 0;  // position
    this.rx = 0; this.ry = 0; this.rz = 0;  // rotation (radians)
    this.localMatrix = new Mat4();
    this.worldMatrix = new Mat4();
    this.children = [];
    this.parent = null;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  updateWorldMatrix() {
    this.localMatrix.compose(this.px, this.py, this.pz, this.rx, this.ry, this.rz);
    if (this.parent) {
      this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.localMatrix);
    } else {
      this.worldMatrix.copy(this.localMatrix);
    }
    for (const child of this.children) child.updateWorldMatrix();
  }

  getWorldPosition() {
    return [this.worldMatrix.e[12], this.worldMatrix.e[13], this.worldMatrix.e[14]];
  }

  worldToLocal(wx, wy, wz) {
    const inv = new Mat4().getInverse(this.worldMatrix);
    return inv.transformPoint(wx, wy, wz);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Replicate createPlanet's 3-level structure
// ═══════════════════════════════════════════════════════════════════════════
//
// In script.js, createPlanet(pd) builds:
//   containerObj (= orbitContainer) — applies orbitTiltA/B as rotation.x/z, orbitCenter as position
//     └─ orbitObj (= orbit)        — rotation.y = θ for circular orbits
//        └─ pivotObj (= pivot)     — position.x = a (semi-major axis)
//           └─ rotationAxis        — position = pivot.position, rotation.z = tilt, rotation.x = tiltb
//
// For circular orbits:  orbit.rotation.y = θ, pivot at (radius, 0, 0)
// For elliptic orbits:  orbit.rotation.y = 0, pivot.position = (a*cos(θ), 0, b*sin(θ))

function makeObjectNodes(name, def) {
  const d2r = Math.PI / 180;
  const container = new Node(name + '.container');
  container.rx = (def.orbitTilta || 0) * d2r;
  container.rz = (def.orbitTiltb || 0) * d2r;
  container.px = def.orbitCentera || 0;
  container.py = def.orbitCenterc || 0;
  container.pz = def.orbitCenterb || 0;

  const orbit = new Node(name + '.orbit');
  container.addChild(orbit);

  const a = def.orbitSemiMajor !== undefined ? def.orbitSemiMajor : def.orbitRadius;
  const b = def.orbitSemiMinor !== undefined ? def.orbitSemiMinor : def.orbitRadius;
  const isEllipse = a !== b;

  const pivot = new Node(name + '.pivot');
  if (!isEllipse) {
    pivot.px = a;  // will be rotated by orbit.ry
  }
  orbit.addChild(pivot);

  // rotationAxis is a SIBLING of pivot (both children of orbit), not a child of pivot.
  // It has the same position as pivot but additionally applies axial tilt.
  // This matches script.js createPlanet: orbit.add(pivot); orbit.add(rotationAxis);
  const rotAxis = new Node(name + '.rotationAxis');
  rotAxis.rz = (def.tilt || 0) * d2r;
  if (def.tiltb) rotAxis.rx = def.tiltb * d2r;
  if (!isEllipse) {
    rotAxis.px = a;  // same position as pivot
  }
  orbit.addChild(rotAxis);

  return { container, orbit, pivot, rotAxis, a, b, isEllipse, def };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD THE COMPLETE SCENE GRAPH
// ═══════════════════════════════════════════════════════════════════════════

// Pre-compute all the per-planet derived values we need
const H_J2000 = C.H;
const MSY_J2000 = C.meanSolarYearDays;
const d2r = Math.PI / 180;
const sDay_J2000 = 1 / MSY_J2000;
const correctionYears = C.correctionDays / MSY_J2000;
const startModelYearWithCorrection = C.startmodelYear + correctionYears;

// Per-JD epoch snapshot (Option B). When DEEP_TIME_ENABLED=false, always
// returns J2000 values; when true, memoizes a per-epoch snapshot of
// (H, mSY, sDay) keyed on t_Ma. The scene-setup speeds stay frozen at
// J2000; only downstream JD↔pos conversions and H-derived periods pick
// up the epoch shift. See IP-deep-time-scene-graph-fitpipeline.md §6.2.
let _epochCache = { t_Ma: 0, H: H_J2000, mSY: MSY_J2000, sDay: sDay_J2000 };

// ─── Scene time coordinate ↔ JD (R4) ───────────────────────────────────────
// `pos` is the count of tropical years since startmodelJD. Under deep time the
// year length varies, so the conversion must be the INTEGRAL of the rate:
//   jd(pos) = startmodelJD + ∫₀^pos meanTropicalYearDaysAtAge dy
// This REPLACES `pos = _epochCache.sDay × (jd − startmodelJD)` — the current
// rate times the whole elapsed span, which doubles the accumulated drift
// exactly for a drifting rate (Δt² growth: 3.313 d = 3.27° at the Step 6a
// window edge). Under SG_DEEP_TIME off the rate is constant, the linear form
// is exact, and it is kept bit-identical.
function _posFromJDTools(jd) {
  if (!DEEP_TIME_ENABLED) return sDay_J2000 * (jd - C.startmodelJD);
  const p = DT.posFromJD(jd);
  return p === null ? _epochCache.sDay * (jd - C.startmodelJD) : p;   // past tidal lock
}

function _jdFromPosTools(pos) {
  if (!DEEP_TIME_ENABLED) return C.startmodelJD + pos * MSY_J2000;
  const j = DT.jdFromPos(pos);
  return j === null ? C.startmodelJD + pos * _epochCache.mSY : j;
}

function _syncEpochForJD(jd) {
  if (!DEEP_TIME_ENABLED) return _epochCache;
  // Approximate year from JD using J2000 mSY (self-consistent iteration
  // not needed at Step 6a's 1-year granularity — drift <10 s at ±150 kyr).
  const yearApprox = 2000 + (jd - C.j2000JD) * sDay_J2000;
  const t_Ma = (2000 - yearApprox) / 1e6;
  if (Math.abs(t_Ma - _epochCache.t_Ma) < 1e-9) return _epochCache;
  const H_t = DT.meanHAtAge(t_Ma);
  // Use meanTropicalYearDaysAtAge (T_trop_s / 86400, SI-anchored). This is
  // what the browser sets sDay to under DEEP_TIME_MODE_ENABLED
  // (src/script.js:6179):
  //   sDay = DEEP_TIME_MODE_ENABLED ? (1 / tropDays) : (1 / meansolaryearlengthinDays);
  //   const tropDays = meanTropicalYearDaysAtAge(t_Ma);
  // NOT meanYearInDaysAtAge (T_trop_s / LOD_s_at_epoch). meansolaryearlengthinDays
  // does mutate to meanYearInDaysAtAge, but that's for display/report
  // consumers, NOT for the scene's pos calculation. Using SI-anchored
  // tropDays here matches browser scene rendering at all epochs.
  const mSY_t = DT.meanTropicalYearDaysAtAge(t_Ma);
  if (H_t === null || mSY_t === null) return _epochCache;   // stay on last-good if past tidal lock
  _epochCache = { t_Ma, H: H_t, mSY: mSY_t, sDay: 1 / mSY_t };
  return _epochCache;
}

// Backwards-compatible aliases — code that references bare `H`/`sDay`
// at scene-setup time picks up the J2000 values (setup happens once at
// module load). Runtime paths use `_epochCache.H` / `_epochCache.mSY`
// / `_epochCache.sDay` and go through `_syncEpochForJD(jd)` first.
const H = H_J2000;
const sDay = sDay_J2000;

// Ascending node frame corrections from ASTRO_REFERENCE (see constants.js)
const ascNodeToolCorrection = C.ASTRO_REFERENCE.ascNodeTiltCorrection;

// Per-planet variables computed from constants (replicating script.js lines 1687-1770)
function getPlanetSceneData(key) {
  const p = C.planets[key];
  if (!p) return null;
  const d = C.derived[key];

  // Perihelion ecliptic years (already in constants)
  const perihelionEclipticYears = p.perihelionEclipticYears;

  // lowestPoint (Type I only)
  const lowestPoint = 180 - p.ascendingNode;

  // Orbit center for PerihelionFromEarth layer
  const longPeri = p.longitudePerihelion;
  const angleCorr = p.angleCorrection;
  const periDist = d.perihelionDistance;
  const periFromEarthA = Math.cos((longPeri + angleCorr + 90) * d2r) * periDist;
  const periFromEarthB = Math.cos((90 - (longPeri + angleCorr - 90)) * d2r) * periDist;

  // Ascending node corrected for planet-level tilt placement
  const correctedAscNode = p.ascendingNode + (ascNodeToolCorrection[key] || 0);

  // RealPerihelion tilts (ecliptic inclination decomposed via corrected ascending node)
  const realPeriTiltA = Math.cos((-90 - correctedAscNode) * d2r) * -p.eclipticInclinationJ2000;
  const realPeriTiltB = Math.sin((-90 - correctedAscNode) * d2r) * -p.eclipticInclinationJ2000;

  // Speed for RealPerihelionAtSun — differs by type
  let realPeriSpeed, realPeriStartPos;
  if (p.type === 'I') {
    realPeriSpeed = -Math.PI * 2;
    realPeriStartPos = lowestPoint;
  } else if (p.type === 'II') {
    realPeriSpeed = -Math.PI * 2 + (2 * Math.PI * 2 / (H / d.solarYearCount));
    realPeriStartPos = p.startpos * 2;
  } else { // Type III
    realPeriSpeed = -Math.PI * 2;
    realPeriStartPos = p.startpos * 2;
  }

  // Elliptic orbit radius — sign differs for anti-phase planets (negative in script.js)
  let elipticOrbitRadius = d.elipticOrbit;
  if (p.antiPhase) elipticOrbitRadius = -elipticOrbitRadius;

  // Planet orbital speed (Mars is negative, all others positive)
  const planetSpeed = (key === 'mars')
    ? -Math.PI * 2 / (H / d.solarYearCount)
    : Math.PI * 2 / (H / d.solarYearCount);

  // Orbit radius in scene units
  const orbitRadiusScene = d.orbitDistance * 100;

  return {
    key, p, d, perihelionEclipticYears, lowestPoint,
    periFromEarthA, periFromEarthB,
    realPeriTiltA, realPeriTiltB,
    realPeriSpeed, realPeriStartPos,
    elipticOrbitRadius, planetSpeed, orbitRadiusScene,
  };
}

function buildSceneGraph() {
  // Root
  const root = new Node('startingPoint');

  // ─── EARTH CHAIN ───────────────────────────────────────────────
  const earthDef = {
    orbitTilta: 0, orbitTiltb: 0,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitRadius: -C.eccentricityAmplitude * 100,
    tilt: -C.earthtiltMean,
    startPos: 0,
    speed: -Math.PI * 2 / (H / 13),
    _dtCycleN: 13, _dtCycleSign: -1,   // Phase 9.12: H/13 axial precession, retrograde
  };
  const earthNodes = makeObjectNodes('earth', earthDef);

  // Apply the static 90° rotation to earth.container (line 4993)
  earthNodes.container.ry = Math.PI / 2;

  root.addChild(earthNodes.container);

  // Earth precession layers (each is a "virtual" object with speed + tilt)
  function makePrecessionNode(name, def) {
    const n = makeObjectNodes(name, def);
    return n;
  }

  const earthInclPrec = makePrecessionNode('earthInclinationPrecession', {
    orbitRadius: 0, orbitTilta: 0, orbitTiltb: 0,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 3) * 360,
    speed: Math.PI * 2 / (H / 3),
    _dtCycleN: 3, _dtCycleSign: +1,   // Phase 9.12: H/3 inclination precession, prograde
  });
  earthNodes.pivot.addChild(earthInclPrec.container);

  const earthEclipPrec = makePrecessionNode('earthEclipticPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: -C.earthInvPlaneInclinationAmplitude,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 5) * 360,
    speed: Math.PI * 2 / (H / 5),
    _dtCycleN: 5, _dtCycleSign: +1,   // Phase 9.12: H/5 ecliptic precession, prograde
  });
  earthInclPrec.pivot.addChild(earthEclipPrec.container);

  const earthObliqPrec = makePrecessionNode('earthObliquityPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: C.earthInvPlaneInclinationAmplitude,
    tilt: 0,
    startPos: -((C.balancedYear - startModelYearWithCorrection) / (H / 8) * 360),
    speed: -Math.PI * 2 / (H / 8),
    _dtCycleN: 8, _dtCycleSign: -1,   // Phase 9.12: H/8 obliquity precession, retrograde
  });
  earthEclipPrec.pivot.addChild(earthObliqPrec.container);

  const earthPeriPrec1 = makePrecessionNode('earthPerihelionPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: -C.earthRAAngle, orbitTiltb: 0,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 16) * 360,
    speed: Math.PI * 2 / (H / 16),
    _dtCycleN: 16, _dtCycleSign: +1,   // Phase 9.12: H/16 perihelion precession outer, prograde
  });
  earthObliqPrec.pivot.addChild(earthPeriPrec1.container);

  const earthPeriPrec2 = makePrecessionNode('earthPerihelionPrecession2', {
    orbitRadius: 0,
    orbitCentera: -C.eccentricityBase * 100, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: -((C.balancedYear - startModelYearWithCorrection) / (H / 16) * 360),
    speed: -Math.PI * 2 / (H / 16),
    _dtCycleN: 16, _dtCycleSign: -1,   // Phase 9.12: H/16 perihelion precession inner, retrograde

  });
  earthPeriPrec1.pivot.addChild(earthPeriPrec2.container);

  const barycenter = makePrecessionNode('barycenter', {
    orbitRadius: C.eccentricityAmplitude * 100,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: 0, speed: 0,
  });
  earthPeriPrec2.pivot.addChild(barycenter.container);

  // Sun (under barycenter)
  const sunDef = {
    orbitRadius: 100, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: -7.155,
    startPos: C.correctionSun,
    speed: Math.PI * 2,
    eccentricity: C.eocEccentricity,
    _eccentricityKey: 'earth',
    _eocDerived: true,  // Sun EoC = e_dynamic - e_base/2
    perihelionPhaseJ2000: -C.correctionSun * d2r - 2 * Math.PI * (C.startmodelJD - C.perihelionRefJD) / C.meanSolarYearDays + C.perihelionPhaseOffset * d2r,
    perihelionPrecessionRate: Math.PI * 2 / C.perihelionCycleLength, // perihelion advances at H/16 rate
  };
  const sunNodes = makeObjectNodes('sun', sunDef);
  barycenter.pivot.addChild(sunNodes.container);

  // ─── MOON CHAIN (under earth.pivot) ────────────────────────────
  const moonApsidalPrec = makePrecessionNode('moonApsidalPrecession', {
    orbitRadius: -(C.moonDistance / C.currentAUDistance) * (C.moonOrbitalEccentricity * 100),
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, // apsidal precession rotates perigee within the orbital plane — no plane tilt
    tilt: 0,
    startPos: C.moonStartposApsidal,
    speed: (Math.PI * 2) / (C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays),  // of-date perigee advance (pairs with the canceller; sum unchanged)
    _dtMoonIntegrator: _mcApsidalOfDate, _dtMoonSign: +1,   // Phase 9.13 mirror
  });
  earthNodes.pivot.addChild(moonApsidalPrec.container);

  const moonApsNodalPrec1 = makePrecessionNode('moonApsidalNodalPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: C.moonStartposApsidal - C.moonStartposNodal,
    speed: -(Math.PI * 2) / (C.moonApsidalMeetsNodalDays / C.meanSolarYearDays),
    _dtMoonIntegrator: _mcApsidalMeetsNodal, _dtMoonSign: -1,   // Phase 9.13 mirror (pair cancels)
  });
  moonApsidalPrec.pivot.addChild(moonApsNodalPrec1.container);

  const moonApsNodalPrec2 = makePrecessionNode('moonApsidalNodalPrecession2', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: -(C.moonStartposApsidal - C.moonStartposNodal),
    speed: (Math.PI * 2) / (C.moonApsidalMeetsNodalDays / C.meanSolarYearDays),
    _dtMoonIntegrator: _mcApsidalMeetsNodal, _dtMoonSign: +1,   // Phase 9.13 mirror (pair cancels)
  });
  moonApsNodalPrec1.pivot.addChild(moonApsNodalPrec2.container);

  const moonLunarLevel = makePrecessionNode('moonLunarLevelingCycle', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: -C.moonStartposApsidal,  // apsidal canceller (phase + rate)
    speed: -(Math.PI * 2) / (C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays),  // apsidal canceller (of-date pair)
    _dtMoonIntegrator: _mcApsidalOfDate, _dtMoonSign: -1,   // Phase 9.13 mirror (canceller)
  });
  moonApsNodalPrec2.pivot.addChild(moonLunarLevel.container);

  const moonNodalPrec = makePrecessionNode('moonNodalPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0,  // inclination tilt lives on the moon def (below this layer's spin) so the nodal spin regresses the plane
    orbitTiltb: 0,
    tilt: 0,
    startPos: C.moonStartposNodal,
    speed: -(Math.PI * 2) / (C.moonNodalPrecessionDaysICRF / C.meanSolarYearDays),  // of-date regression (6798.3303 d)
    _dtMoonIntegrator: _mcNodalOfDate, _dtMoonSign: -1,   // Phase 9.13 mirror
  });
  moonLunarLevel.pivot.addChild(moonNodalPrec.container);

  const moonDef = {
    orbitRadius: (C.moonDistance / C.currentAUDistance) * 100,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: Math.cos((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,  // 5.14° tilt lives here (below the nodal spin)
    orbitTiltb: Math.sin((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,
    tilt: -(C.moonEclipticInclinationJ2000 + C.moonObliquityEclipticJ2000),  // Cassini composition in the scene's own convention (mirrors src/script.js moon.tilt)
    startPos: C.moonStartposMoon,
    speed: (Math.PI * 2) / (1 / (C.meanSolarYearDays / C.moonNodalMonth)),  // draconitic (nodal-month) clock
    eccentricity: C.moonOrbitalEccentricity,
    lunarPerturbations: true,
    _dtMoonIntegrator: _mcDraconic, _dtMoonSign: +1,   // Phase 9.13 mirror (draconitic clock)
  };
  const moonNodes = makeObjectNodes('moon', moonDef);
  moonNodalPrec.pivot.addChild(moonNodes.container);

  // ─── PLANET CHAINS (under barycenter.pivot) ────────────────────
  const planetNodeMap = {};

  for (const key of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const pd = getPlanetSceneData(key);
    if (!pd) continue;

    // Layer 1: PerihelionDurationEcliptic1
    const eclip1 = makePrecessionNode(key + 'PerihelionDurationEcliptic1', {
      orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: Math.PI * 2 / pd.perihelionEclipticYears,
    });
    barycenter.pivot.addChild(eclip1.container);

    // Layer 2: PerihelionFromEarth
    const periFromE = makePrecessionNode(key + 'PerihelionFromEarth', {
      orbitRadius: 0,
      orbitCentera: pd.periFromEarthA, orbitCenterb: pd.periFromEarthB, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: Math.PI * 2,
    });
    eclip1.pivot.addChild(periFromE.container);

    // Layer 3: PerihelionDurationEcliptic2
    const eclip2 = makePrecessionNode(key + 'PerihelionDurationEcliptic2', {
      orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: -Math.PI * 2 / pd.perihelionEclipticYears,
    });
    periFromE.pivot.addChild(eclip2.container);

    // Layer 4: RealPerihelionAtSun
    // NOTE: Orbital plane tilt is applied at the PLANET container level (below the
    // annual rotation), not here. Placing it here causes the tilt's latitude effect
    // to oscillate annually in the tilted frame; at opposition dates (which recur at
    // the synodic period), the combined angle changes by exactly -2pi, making the
    // sampled latitude constant. Moving the tilt below the annual rotation ensures
    // the latitude varies with the planet's sidereal orbital angle.
    const realPeri = makePrecessionNode(key + 'RealPerihelionAtSun', {
      orbitRadius: pd.elipticOrbitRadius,
      orbitCentera: 100, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0,
      tilt: 0,
      startPos: pd.realPeriStartPos,
      speed: pd.realPeriSpeed,
    });
    eclip2.pivot.addChild(realPeri.container);

    // Planet itself — orbital plane tilt applied here (below annual rotation)
    const planetDef = {
      orbitRadius: pd.orbitRadiusScene,
      orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: pd.realPeriTiltA, orbitTiltb: pd.realPeriTiltB,
      tilt: 0,  // tilt only affects axial spin, not position
      startPos: pd.p.startpos,
      speed: pd.planetSpeed,
      eccentricity: pd.p.orbitalEccentricityJ2000,
    };
    // Add equation of center (variable speed) for planets
    const periRefMap = {
      mercury: C.ASTRO_REFERENCE.mercuryPerihelionRef_JD,
      venus: C.ASTRO_REFERENCE.venusPerihelionRef_JD,
      mars: C.ASTRO_REFERENCE.marsPerihelionRef_JD,
      jupiter: C.ASTRO_REFERENCE.jupiterPerihelionRef_JD,
      saturn: C.ASTRO_REFERENCE.saturnPerihelionRef_JD,
      uranus: C.ASTRO_REFERENCE.uranusPerihelionRef_JD,
      neptune: C.ASTRO_REFERENCE.neptunePerihelionRef_JD,
    };
    if (periRefMap[key]) {
      const periPrecRate = Math.PI * 2 / pd.perihelionEclipticYears;
      const pos_peri = (periRefMap[key] - C.startmodelJD) / C.meanSolarYearDays;
      // Type III: per-planet EoC fraction to correct for double-counting with geometric offset
      planetDef.eccentricity = pd.p.orbitalEccentricityJ2000 * (pd.p.eocFraction ?? 0.5);
      planetDef._eccentricityKey = key;
      planetDef._eocFraction = pd.p.eocFraction ?? 0.5;
      // Use absolute planet speed for perihelion phase (script.js uses positive speed)
      const absPlanetSpeed = Math.PI * 2 / (H / pd.d.solarYearCount);
      planetDef.perihelionPhaseJ2000 = -pd.p.startpos * d2r
        + (absPlanetSpeed - periPrecRate) * pos_peri;
      planetDef.perihelionPrecessionRate = periPrecRate;
    }
    const planetNodes = makeObjectNodes(key, planetDef);
    realPeri.pivot.addChild(planetNodes.container);

    planetNodeMap[key] = {
      eclip1, periFromE, eclip2, realPeri,
      planet: planetNodes,
      sceneData: pd,
    };
  }

  return {
    root, earthNodes, sunNodes, moonNodes, barycenter,
    earthInclPrec, earthEclipPrec, earthObliqPrec,
    earthPeriPrec1, earthPeriPrec2,
    moonApsidalPrec, moonApsNodalPrec1, moonApsNodalPrec2,
    moonLunarLevel, moonNodalPrec,
    planetNodeMap,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC ECLIPTIC INCLINATION — From invariable plane dynamics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the dynamic ecliptic inclination for a planet at a given time.
 *
 * Replicates the logic from script.js:
 *   computeInclinationEarth() — Earth's inv. plane inclination oscillation
 *   computePlanetInvPlaneInclinationDynamic() — planet's inv. plane oscillation
 *   updateDynamicInclinations() — normal vector dot product → ecliptic inclination
 *
 * @param {string} key — planet key (e.g. 'saturn')
 * @param {number} yearsSinceBalanced — years since the balanced year epoch
 * @returns {number} ecliptic inclination in degrees
 */
function computeDynamicEclipticInclination(key, yearsSinceBalanced) {
  const p = C.planets[key];
  const genPrecRate = 1 / (C.H / 13);

  // --- Earth's orbital plane ---
  // Inclination oscillation: ICRF perihelion rate (H/3 for Earth)
  const earthPrecYears = C.ASTRO_REFERENCE.earthInvPlanePrecessionYears;
  const earthPhaseRad = (yearsSinceBalanced / earthPrecYears) * 2 * Math.PI;
  const earthI = (C.earthInvPlaneInclinationMean
    - C.earthInvPlaneInclinationAmplitude * Math.cos(earthPhaseRad)) * d2r;

  // Earth Ω regresses at -H/5 (ecliptic precession rate), NOT at H/3.
  const earthAscNodePeriod = -C.H / 5;
  const earthOmegaRate = 360 / earthAscNodePeriod;
  const earthOmega = (C.ASTRO_REFERENCE.earthAscendingNodeInvPlane
    - earthOmegaRate * C.yearsFromBalancedToJ2000
    + earthOmegaRate * yearsSinceBalanced) * d2r;

  // --- Planet's orbital plane ---
  // Inclination oscillation: uses ICRF perihelion rate
  // ICRF rate = ecliptic rate - general precession
  const eclRate = 1 / p.perihelionEclipticYears;
  const icrfRate = (eclRate - genPrecRate) * 360;  // deg/yr
  const periICRFDeg = p.longitudePerihelion
    - icrfRate * C.yearsFromBalancedToJ2000
    + icrfRate * yearsSinceBalanced;

  const planetPhaseDeg = periICRFDeg - p.inclinationCycleAnchor;
  const antiPhaseSign = p.antiPhase ? -1 : 1;
  const planetI = (p.invPlaneInclinationMean
    + antiPhaseSign * p.invPlaneInclinationAmplitude * Math.cos(planetPhaseDeg * d2r)) * d2r;

  // Planet Ω advances at the asc-node period (-8H/N from the model's integer
  // assignment), NOT at the ecliptic perihelion period — they are different angles.
  const planetAscNodePeriod = p.ascendingNodeCyclesIn8H
    ? -(8 * C.H) / p.ascendingNodeCyclesIn8H
    : p.perihelionEclipticYears;
  const planetOmegaRate = 360 / planetAscNodePeriod;
  const planetOmegaDeg = p.ascendingNodeInvPlane
    - planetOmegaRate * C.yearsFromBalancedToJ2000
    + planetOmegaRate * yearsSinceBalanced;
  const planetOmega = planetOmegaDeg * d2r;

  // --- Dot product of normal vectors → angle between orbital planes ---
  const eNx = Math.sin(earthI) * Math.sin(earthOmega);
  const eNy = Math.sin(earthI) * Math.cos(earthOmega);
  const eNz = Math.cos(earthI);

  const pNx = Math.sin(planetI) * Math.sin(planetOmega);
  const pNy = Math.sin(planetI) * Math.cos(planetOmega);
  const pNz = Math.cos(planetI);

  const cosAngle = eNx * pNx + eNy * pNy + eNz * pNz;
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE MODEL — Update all rotations/positions for a given pos
// ═══════════════════════════════════════════════════════════════════════════

function moveModel(graph, pos) {
  // Compute dynamic eccentricities for all planets (oscillate at H/16)
  // Uses _epochCache.mSY so the pos→JD→year round-trip is consistent with
  // the caller's pos = _epochCache.sDay × (jd - C.startmodelJD).
  // pos IS the tropical-year count from startmodelJD, so the year is simply
  // startModelYearWithCorrection + pos. The previous form reconstructed the JD
  // as `startmodelJD + pos*mSY` and divided by mSY again — algebraically the
  // same under a CONSTANT rate, but it mixes conventions now that pos comes
  // from the integrated conversion, and its epoch-local mSY made the offset
  // (startmodelJD - balancedJD)/mSY drift with epoch.
  const currentYear = C.startModelYearWithCorrection + pos;
  const dynEcc = { earth: OE.computeEccentricity(currentYear, C.balancedYear, C.perihelionCycleLength, C.eccentricityBase, C.eccentricityAmplitude) };
  for (const [key, p] of Object.entries(C.planets)) {
    if (p.eccentricityPhaseJ2000 !== undefined) {
      const refYear = 2000 - (p.eccentricityPhaseJ2000 / 360) * C.perihelionCycleLength;
      dynEcc[key] = OE.computeEccentricity(currentYear, refYear, C.perihelionCycleLength, p.orbitalEccentricityBase, p.orbitalEccentricityAmplitude);
    }
  }

  // Update each "animated" object: orbit.ry = θ for circular, pivot.position for ellipse
  function animateObject(nodes, def) {
    let θ;
    // Phase 9.12 (B-full): Earth H-cycle precession objects tagged with
    // _dtCycleN / _dtCycleSign use integrated phase ∫1/H(t')dt' under
    // deep-time. Under toggle-off (or untagged), falls through to
    // J2000-snapshot form θ = speed × pos - startPos.
    // Mirrors src/script.js:48326-48337.
    if (DEEP_TIME_ENABLED && Number.isFinite(def._dtCycleN)) {
      const cycles = DT.cyclesBetweenYears(C.balancedYear, currentYear, def._dtCycleN);
      θ = (cycles !== null ? cycles : 0) * 2 * Math.PI * def._dtCycleSign;
    } else if (DEEP_TIME_ENABLED && def._dtMoonIntegrator) {
      // Phase 9.13 mirror (previously MISSING in tools — the moon layers ran
      // frozen J2000 speeds in deep-time mode while the browser ran the
      // chains; measured as a spurious ~9.6° Moon-vs-ring plane divergence
      // at +52 kyr in the moon-on-ring meter). Anchor + SI-year coordinate
      // mirror src/script.js moveModel (_mAnchor = STARTMODEL_YEAR_SI, UT).
      const _jdHere = _jdFromPosTools(pos);
      // TT clock (mirrors src/script.js): the Moon-chain layers run on the
      // SAME clock as the override arguments — the earlier UT convention made
      // the ring lag the Moon by precession-rate × ΔT at deep time.
      const _cyc = def._dtMoonIntegrator(C.startModelYearWithCorrection, _jdToSIyearTools(_jdTTToolsFromUT(_jdHere)));
      θ = (_cyc !== null ? _cyc : 0) * 2 * Math.PI * def._dtMoonSign - def.startPos * d2r;
    } else {
      θ = def.speed * pos - def.startPos * d2r;
    }
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      let e;
      if (def._eccentricityKey && dynEcc[def._eccentricityKey] !== undefined) {
        e = def._eocDerived
          ? dynEcc[def._eccentricityKey] - C.eccentricityBase / 2   // Sun: eoc = e_dynamic - e_base/2
          : dynEcc[def._eccentricityKey] * def._eocFraction;        // Planets: eoc = e_dynamic × fraction
      } else {
        e = def.eccentricity;                                        // Moon, Pluto, etc: static
      }
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
      nodes._meanAnomaly = M; // Store for parallax correction use
    }
    // Phase Z-B (2026-06): Sun longitude harmonics applied to SUN NODE only.
    // ────────────────────────────────────────────────────────────────────
    // The annual correction (~280" amplitude) closes the framework's
    // 200" Sun-vs-Meeus residual to ~7" (96% reduction). It is derived
    // from Earth-Sun geometry (framework eccentricityDerivedMean = 0.01545
    // vs Meeus IAU J2000 = 0.01671) and is NOT physically applicable to
    // planets — applying at the barycenter level rotates planets too,
    // degrading their baselines by 30-180" each.
    //
    // For Node-side scene-graph (this file), Sun-only is the correct fix:
    //   - No visualization concerns (the "black spot" visual bug only
    //     manifests in the browser scene)
    //   - Planet baselines stay pristine
    //   - Sun gets the full 96% Meeus improvement
    //
    // For src/script.js (browser scene), a different mechanism will be
    // needed to preserve visual integrity (e.g., barycenter-level + per-
    // planet inverse corrections, or accept the visual artifact in deep
    // zoom views). Mirror to script.js is deferred until that's resolved.
    //
    // Filter: only H-lattice-compliant terms.
    //   (a) year-multiples (integer year period),
    //   (b) small precession divisors 1..20 (Earth's Fibonacci named cycles
    //       H/3, H/5, H/8, H/13, H/16, etc.),
    //   (c) lunar precession divisors (auto-tracked from Meeus anchors via
    //       C.N_apsidalI, C.N_nodalI),
    //   (d) mid-range divisors that share a non-trivial prime factor with H
    //       (H = 3²·5·7451, so multiples of 3, 5, or 7451 qualify).
    // Everything else (gcd(d,H)=1 mid-range) is design-rule violating and
    // silently skipped.
    const SUN_HARM_ENABLED = process.env.SUN_HARMONICS_DISABLED !== '1';
    if (SUN_HARM_ENABLED && nodes === graph.sunNodes && C.SUN_LONGITUDE_HARMONICS) {
      // Recover JD via epoch-consistent mSY so pos→jd round-trip is exact.
      // Sun harmonic phase below uses C.H (J2000 fixed) because the table was
      // fitted against J2000 mSY.
      const jd = _jdFromPosTools(pos);
      const year = 2000 + (jd - C.j2000JD) / 365.25;
      const t = year - C.balancedYear;
      let corr = C.SUN_LONGITUDE_MEAN || 0;
      const H_round = Math.round(C.H);
      for (const h of C.SUN_LONGITUDE_HARMONICS) {
        const divisor = h[0];
        const isYearMultiple      = divisor >= H_round && divisor % H_round === 0;
        const isPrecessionDivisor = divisor > 0 && divisor <= 20;
        const isLunarPrecession   = divisor === C.N_nodalI || divisor === C.N_apsidalI;
        // Clause (d) "sharesFactorWithH" removed 2026-07-15 — admitted
        // mid-range fit artifacts (divisors 84, 92, 115, 122) not physically
        // motivated. See tools/fit/sun-longitude-harmonics.js for rationale.
        if (!isYearMultiple && !isPrecessionDivisor && !isLunarPrecession) continue;
        const phase = 2 * Math.PI * t / (C.H / divisor);
        corr += h[1] * Math.sin(phase) + h[2] * Math.cos(phase);
      }
      θ -= corr * d2r;
    }
    // Full Meeus Ch. 47 lunar perturbations (longitude + latitude, 60+60 terms)
    // Meeus formulas require T from standard J2000.0 (JD 2451545.0) in Julian centuries (36525 days)
    if (C.useVariableSpeed && def.lunarPerturbations) {
      // Recover JD via epoch-consistent mSY for pos→jd round-trip, then
      // UT→TT (mirrors src/script.js Phase 9.16): Meeus arguments are defined
      // in dynamical time — this shift was MISSING in the tools mirror (the
      // browser had it), which was the whole browser-vs-tools deep-time delta
      // (~4 yr of ΔT at +200 kyr → args differing by ~150° in ϖ).
      const d = _jdTTToolsFromUT(_jdFromPosTools(pos)) - C.j2000JD;
      const T = d / C.julianCenturyDays;
      const T2 = T * T, T3 = T2 * T, T4 = T3 * T;

      // Fundamental arguments via the shared dispatcher mirror (one argument
      // source with production; pure-Meeus A/B via MOON_ARGS_PURE_MEEUS=1)
      const _args = _moonArgsAtTools(C.j2000JD + d);
      const Lp = _args.Lp * d2r;
      const Dr = _args.D * d2r;
      const Mr = _args.M * d2r;
      const Mpr = _args.Mp * d2r;
      const Fr = _args.F * d2r;

      // Bounded E-factor (framework e_E ratio; pure-Meeus polynomial in A/B mode)
      const E = _fwEFactorTools(d, T, T2);
      const E2 = E * E;
      const AA = MEEUS_LUNAR.additionalArguments;
      // D2 derived rates (mirrors src/script.js FW_A2_RATE/FW_A3_RATE):
      // A3 = sidereal Lp rate (0.003 ppm); A2 = 2·Lp − M′ − 2·L_J (0.19 ppm);
      // A1 stays Meeus-observed (no credible lattice identity). In deep-time
      // mode A2/A3 are CHAIN-INTEGRATED through their identified content
      // (mirrors src/script.js): A3 = A3₀ + 360·(N_trop − N_p13),
      // A2 = A2₀ + 360·(N_trop + N_apsOfDate − 2·N_J); counts 0 at J2000.
      const A1 = (AA.A1[0] + AA.A1[1]*T) * d2r;
      let _a2Deg = AA.A2[0] + (MOON_ARGS_FRAMEWORK_NATIVE ? _FW_A2_RATE : AA.A2[1])*T;
      let _a3Deg = AA.A3[0] + (MOON_ARGS_FRAMEWORK_NATIVE ? _FW_A3_RATE : AA.A3[1])*T;
      if (DEEP_TIME_ENABLED && MOON_ARGS_FRAMEWORK_NATIVE) {
        const _yA0 = _jdToSIyearTools(C.j2000JD);
        const _yA  = _jdToSIyearTools(C.j2000JD + d);
        const _Nt   = _mcTropical(_yA0, _yA);
        const _Naps = _mcApsidalOfDate(_yA0, _yA);
        const _Np13 = DT.cyclesBetweenYears(_yA0, _yA, 13);
        const _Nj   = _mcJupiter(_yA0, _yA);
        if (_Nt !== null && _Naps !== null && _Np13 !== null && _Nj !== null) {
          _a3Deg = AA.A3[0] + 360 * (_Nt - _Np13);
          _a2Deg = AA.A2[0] + 360 * (_Nt + _Naps - 2 * _Nj);
        }
      }
      const A2 = _a2Deg * d2r;
      const A3 = _a3Deg * d2r;

      // Table 47.A longitude terms from centralized tables
      const ML = MEEUS_LUNAR.longitudeTerms.terms;
      let Sl = 0;
      for (let i = 0; i < ML.length; i++) {
        const r = ML[i];
        const arg = r[0]*Dr + r[1]*Mr + r[2]*Mpr + r[3]*Fr;
        let term = r[4] * Math.sin(arg);
        const absM = r[1] < 0 ? -r[1] : r[1];
        if (absM === 1) term *= E;
        else if (absM === 2) term *= E2;
        Sl += term;
      }
      const LC = MEEUS_LUNAR.longitudeCorrections;
      Sl += LC.A1*Math.sin(A1) + LC.LpMinusF*Math.sin(Lp - Fr) + LC.A2*Math.sin(A2);
      const eocHalf = C.moonOrbitalEccentricity / 2;
      Sl -= (2 * eocHalf / d2r * 1e6) * Math.sin(Mpr);
      Sl -= (1.25 * eocHalf * eocHalf / d2r * 1e6) * Math.sin(2*Mpr);
      θ += Sl * 1e-6 * d2r;

      // Table 47.B latitude terms from centralized tables
      const MB = MEEUS_LUNAR.latitudeTerms.terms;
      let Sb = 0;
      for (let i = 0; i < MB.length; i++) {
        const r = MB[i];
        const arg = r[0]*Dr + r[1]*Mr + r[2]*Mpr + r[3]*Fr;
        let term = r[4] * Math.sin(arg);
        const absM = r[1] < 0 ? -r[1] : r[1];
        if (absM === 1) term *= E;
        else if (absM === 2) term *= E2;
        Sb += term;
      }
      const BC = MEEUS_LUNAR.latitudeCorrections;
      Sb += BC.Lp*Math.sin(Lp) + BC.A3*Math.sin(A3);
      Sb += BC.A1minusF*Math.sin(A1 - Fr) + BC.A1plusF*Math.sin(A1 + Fr);
      Sb += BC.LpMinusMp*Math.sin(Lp - Mpr) + BC.LpPlusMp*Math.sin(Lp + Mpr);
      nodes._meeusLatDeg = Sb * 1e-6;

      // Full Meeus ecliptic longitude for post-hoc RA override
      const fullSl = Sl + (2 * eocHalf / d2r * 1e6) * Math.sin(Mpr)
                       + (1.25 * eocHalf * eocHalf / d2r * 1e6) * Math.sin(2*Mpr);
      nodes._meeusLonDeg = Lp / d2r + fullSl * 1e-6 + C.moonMeeusLpCorrection;
      nodes._meeusT = T;
      // Series distance (mirrors src/script.js obj._meeusDistKm — the
      // two-term ellipse the browser places the Moon at). Exposed on the
      // computePlanetPosition result so meters can pair override angles
      // with the OVERRIDE distance instead of the raw pivot distance.
      nodes._meeusDistKm = C.moonDistance * (1 - C.moonOrbitalEccentricity * Math.cos(Mpr));
    }
    if (nodes.isEllipse) {
      const x = Math.cos(θ) * nodes.a;
      const z = Math.sin(θ) * nodes.b;
      nodes.pivot.px = x;
      nodes.pivot.pz = z;
      nodes.rotAxis.px = x;
      nodes.rotAxis.pz = z;
      nodes.orbit.ry = 0;
    } else {
      nodes.orbit.ry = θ;
    }
  }

  // Earth
  animateObject(graph.earthNodes, graph.earthNodes.def);

  // Earth precession layers
  const precLayers = [
    [graph.earthInclPrec, graph.earthInclPrec.def],
    [graph.earthEclipPrec, graph.earthEclipPrec.def],
    [graph.earthObliqPrec, graph.earthObliqPrec.def],
    [graph.earthPeriPrec1, graph.earthPeriPrec1.def],
    [graph.earthPeriPrec2, graph.earthPeriPrec2.def],
    [graph.barycenter, graph.barycenter.def],
  ];
  for (const [nodes, def] of precLayers) animateObject(nodes, def);

  // Sun
  animateObject(graph.sunNodes, graph.sunNodes.def);

  // Moon chain
  const moonLayers = [
    graph.moonApsidalPrec, graph.moonApsNodalPrec1, graph.moonApsNodalPrec2,
    graph.moonLunarLevel, graph.moonNodalPrec,
  ];
  for (const nodes of moonLayers) animateObject(nodes, nodes.def);
  animateObject(graph.moonNodes, graph.moonNodes.def);

  // Dynamic Earth ecliptic perihelion longitude (for geocentric elipticOrbit)
  const earthPeriPrec1Angle = graph.earthPeriPrec1.orbit.ry;
  const earthPeriEcl = ((earthPeriPrec1Angle + C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 * d2r) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  // Compute yearsSinceBalanced for dynamic ecliptic inclination.
  // Uses _epochCache.mSY for pos→jd round-trip; yearsSinceBalanced then
  // uses the same mSY so the year count is epoch-consistent with the
  // caller's JD input.
  const currentJD = _jdFromPosTools(pos);
  const yearsSinceBalanced = (currentJD - C.balancedJD) / _epochCache.mSY;

  // Planets
  for (const key of Object.keys(graph.planetNodeMap)) {
    const pm = graph.planetNodeMap[key];
    animateObject(pm.eclip1, pm.eclip1.def);
    animateObject(pm.periFromE, pm.periFromE.def);
    animateObject(pm.eclip2, pm.eclip2.def);

    // Dynamic geocentric elipticOrbit for Type II + III planets
    if (pm.sceneData && (pm.sceneData.p.type === 'III' || pm.sceneData.p.type === 'II')) {
      const planetPrecAngle = pm.eclip1.orbit.ry;
      const planetPeriEcl = ((planetPrecAngle + pm.sceneData.p.longitudePerihelion * d2r) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const dw = earthPeriEcl - planetPeriEcl;
      let eo = 2 * dynEcc.earth * 100 * Math.sin(dw);
      if (pm.sceneData.p.antiPhase) eo = -eo;
      if (pm.sceneData.p.type === 'II') {
        // Type II: Mars orbit center offset + half Earth geocentric correction
        const eccDist = (dynEcc[key] || pm.sceneData.p.orbitalEccentricityJ2000) * pm.sceneData.d.orbitDistance * 100;
        eo = eccDist / 2 - eo / 2;
      }
      pm.realPeri.pivot.px = eo;
      pm.realPeri.rotAxis.px = eo;
    }

    // Dynamic orbital plane: update planet container tilt from dynamic ecliptic inclination
    // Uses dynamic ascending node (matching script.js updateOrbitalPlaneRotations)
    if (pm.sceneData && pm.sceneData.p.ascendingNodeInvPlane !== undefined) {
      const dynamicIncl = computeDynamicEclipticInclination(key, yearsSinceBalanced);
      const currentYear = C.startmodelYear + (currentJD - C.startmodelJD) / _epochCache.mSY;
      const dynamicAscNode = OE.calculateDynamicAscendingNodeFromTilts(
        pm.sceneData.p.orbitTilta, pm.sceneData.p.orbitTiltb, currentYear, key);
      const correctedAscNode = dynamicAscNode + (ascNodeToolCorrection[key] || 0);
      const angle = (-90 - correctedAscNode) * d2r;
      pm.planet.container.rx = Math.cos(angle) * -dynamicIncl * d2r;
      pm.planet.container.rz = Math.sin(angle) * -dynamicIncl * d2r;
    }

    animateObject(pm.realPeri, pm.realPeri.def);
    animateObject(pm.planet, pm.planet.def);
  }

  // Update all world matrices from root
  graph.root.updateWorldMatrix();
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE PLANET POSITION — Main entry point
// ═══════════════════════════════════════════════════════════════════════════

// Cache the scene graph (built once, reused)
let _graph = null;
function getGraph() {
  if (!_graph) _graph = buildSceneGraph();
  return _graph;
}

/** Invalidate cached scene graph (forces rebuild on next use). */
function _invalidateGraph() {
  _graph = null;
}

/**
 * Compute geocentric RA/Dec for a planet or the Moon at a given Julian Day.
 *
 * @param {string} target - 'mercury','venus','mars','jupiter','saturn','uranus','neptune','moon','sun'
 * @param {number} jd - Julian Day number
 * @returns {{ ra: number, dec: number, distAU: number, sunDistAU: number }}
 *   ra/dec in radians (Three.js spherical convention: theta/phi)
 */
// (Stage C ring lock REVERTED — mirrors src/script.js: the deep-time
// ring-vs-Moon misalignment was root-caused to the UT-vs-TT clock split
// between the Moon-chain layers and the override arguments; fixed at the
// source via the TT clock in the _dtMoonIntegrator branch and the series'
// UT→TT shift, after which the lock measured dA/dN ≈ 0 at every epoch and
// was removed.)

function computePlanetPosition(target, jd) {
  const graph = getGraph();

  // Sync epoch cache from this JD (no-op when DEEP_TIME_ENABLED=false).
  // Must precede pos computation so pos uses the epoch-appropriate mSY.
  _syncEpochForJD(jd);

  // Convert JD to pos via the integrated conversion (R4; script.js: posFromJD)
  const pos = _posFromJDTools(jd);

  // Animate all objects
  moveModel(graph, pos);

  // Get Earth reference frame (rotationAxis world matrix)
  const earthRotAxisWP = graph.earthNodes.rotAxis.getWorldPosition();

  // Get target world position
  let targetWP;
  if (target === 'moon') {
    targetWP = graph.moonNodes.pivot.getWorldPosition();
  } else if (target === 'sun') {
    targetWP = graph.sunNodes.pivot.getWorldPosition();
  } else {
    const pm = graph.planetNodeMap[target];
    if (!pm) throw new Error(`Unknown target: ${target}`);
    targetWP = pm.planet.pivot.getWorldPosition();
  }

  // Get Sun world position for sun distance
  const sunWP = graph.sunNodes.pivot.getWorldPosition();

  // Distance from Earth
  const dx = targetWP[0] - earthRotAxisWP[0];
  const dy = targetWP[1] - earthRotAxisWP[1];
  const dz = targetWP[2] - earthRotAxisWP[2];
  const distAU = Math.sqrt(dx*dx + dy*dy + dz*dz) / 100;

  // Distance from Sun
  const sdx = targetWP[0] - sunWP[0];
  const sdy = targetWP[1] - sunWP[1];
  const sdz = targetWP[2] - sunWP[2];
  const sunDistAU = Math.sqrt(sdx*sdx + sdy*sdy + sdz*sdz) / 100;

  // Transform planet world position into Earth's equatorial frame
  // (same as earth.rotationAxis.worldToLocal(PLANET_POS) in script.js)
  const local = graph.earthNodes.rotAxis.worldToLocal(targetWP[0], targetWP[1], targetWP[2]);

  // Convert to spherical (matches Three.js Spherical.setFromVector3)
  const sph = cartesianToSpherical(local[0], local[1], local[2]);

  // Post-hoc RA/Dec corrections for geocentric parallax + precession drift (15/18/24-param)
  // Model: dX = A + B/d + C*T + (D*sin(u) + E*cos(u) + F*sin(2u) + G*cos(2u)
  //              + H*sin(3u) + I*cos(3u))/d + T*(J*sin(u) + K*cos(u))/d
  //              + L/s + M*sin(u)/d² + N*sin(2u)/s + O*cos(u)/s
  //              + P*T*sin(2u)/d + Q*T*cos(2u)/d + R*T*sin(u)/s
  //              + S*T/d + U*cos(u)/d² + V/s² + W*sin(u)/s² + X*cos(3u)/s + Y*sin(3u)/s
  //   where u = RA - ascendingNode(t), d = geocentric dist, s = sunDist, T = centuries from J2000
  if (target !== 'moon' && target !== 'sun') {
    const _p = C.planets[target];
    const _currentYear = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    const ascNode = OE.calculateDynamicAscendingNodeFromTilts(_p.orbitTilta, _p.orbitTiltb, _currentYear, target);
    const u = (sph.theta / d2r - ascNode) * d2r;
    const invD = 1 / distAU;
    const invD2 = invD * invD;
    const invS = 1 / sunDistAU;
    const invS2 = invS * invS;
    const T = (jd - C.j2000JD) / C.julianCenturyDays;  // centuries from J2000
    const sinU = Math.sin(u), cosU = Math.cos(u);
    const sin2U = Math.sin(2*u), cos2U = Math.cos(2*u);
    const sin3U = Math.sin(3*u), cos3U = Math.cos(3*u);

    // Conjunction phase for Jupiter-Saturn interaction terms (AR-AW)
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    const conjPhase = 2 * Math.PI * (_yr - 2000) / C.tripleSynodicYears;
    const sinCP = Math.sin(conjPhase), cosCP = Math.cos(conjPhase);
    const sin2CP = Math.sin(2 * conjPhase), cos2CP = Math.cos(2 * conjPhase);

    // Sun mean longitude for eccentricity-offset terms (AX-BA)
    const _Lsun = (280.460 + 0.9856474 * (jd - C.j2000JD)) * d2r;
    const sinLsun = Math.sin(_Lsun), cosLsun = Math.cos(_Lsun);

    // Planet mean anomaly for heliocentric orbital phase terms (BR-CA)
    // Uses dynamic M from EoC computation in animateObject (stored on planet node)
    // Only for inner planets (Mercury, Venus, Mars) — outer planets have too few M cycles
    const _useM = (target === 'mercury' || target === 'venus' || target === 'mars');
    let sinMplanet = 0, cosMplanet = 0, sin2Mplanet = 0, cos2Mplanet = 0;
    if (_useM) {
      const _pm = graph.planetNodeMap[target];
      const _Mplanet = _pm && _pm.planet._meanAnomaly != null ? _pm.planet._meanAnomaly : 0;
      sinMplanet = Math.sin(_Mplanet); cosMplanet = Math.cos(_Mplanet);
      sin2Mplanet = Math.sin(2 * _Mplanet); cos2Mplanet = Math.cos(2 * _Mplanet);
    }

    const dc = C.ASTRO_REFERENCE.decCorrection[target];
    if (dc) {
      const invDS = invD * invS;
      const corrDec = dc.A + dc.B * invD + (dc.C || 0) * T
        + (dc.D * sinU + dc.E * cosU + dc.F * sin2U + dc.G * cos2U
         + (dc.H || 0) * sin3U + (dc.I || 0) * cos3U) * invD
        + T * ((dc.J || 0) * sinU + (dc.K || 0) * cosU) * invD
        + (dc.L || 0) * invS + (dc.M || 0) * sinU * invD2
        + (dc.N || 0) * sin2U * invS + (dc.O || 0) * cosU * invS
        + (dc.P || 0) * T * sin2U * invD + (dc.Q || 0) * T * cos2U * invD
        + (dc.R || 0) * T * sinU * invS
        + (dc.S || 0) * T * invD + (dc.U || 0) * cosU * invD2
        + (dc.V || 0) * invS2 + (dc.W || 0) * sinU * invS2
        + (dc.X || 0) * cos3U * invS + (dc.Y || 0) * sin3U * invS
        + (dc.Z || 0) * invDS + (dc.AA || 0) * sinU * invDS
        + (dc.AB || 0) * cos2U * invDS + (dc.AC || 0) * T * sin2U * invS
        + (dc.AD || 0) * cos3U * invD2 + (dc.AE || 0) * sin2U * invS2
        + (dc.AF || 0) * sin3U * invS2 + (dc.AG || 0) * cos3U * invS2
        + (dc.AH || 0) * cosU * invS2 + (dc.AI || 0) * sinU * invD2 * invS
        + (dc.AJ || 0) * Math.cos(4*u) * invS + (dc.AK || 0) * sin2U * invD2 * invS
        + (dc.AL || 0) * Math.sin(4*u) * invD + (dc.AM || 0) * Math.cos(4*u) * invD
        + (dc.AN || 0) * T * sinU * invD2 + (dc.AO || 0) * T * cosU * invD2
        + (dc.AP || 0) * sinU * invD2 * invD + (dc.AQ || 0) * cosU * invD2 * invD
        + (dc.AR || 0) * sinCP + (dc.AS || 0) * cosCP
        + (dc.AT || 0) * sin2CP + (dc.AU_ || 0) * cos2CP
        + (dc.AV || 0) * sinCP * invD + (dc.AW || 0) * cosCP * invD
        + (dc.AX || 0) * sinLsun * invD + (dc.AY || 0) * cosLsun * invD
        + (dc.AZ || 0) * sinLsun + (dc.BA || 0) * cosLsun
        + (dc.BB || 0) * T * sinLsun * invD + (dc.BC || 0) * T * cosLsun * invD
        + (dc.BD || 0) * T * sinLsun + (dc.BE || 0) * T * cosLsun
        + (dc.BF || 0) * cosU * sinLsun * invD2 + (dc.BG || 0) * cosU * cosLsun * invD2
        + (dc.BH || 0) * sinLsun * invD2 * invD + (dc.BI || 0) * cosLsun * invD2 * invD
        + (dc.BJ || 0) * Math.sin(u - _Lsun) * invD2 + (dc.BK || 0) * Math.cos(u - _Lsun) * invD2
        + (dc.BL || 0) * T * T * invD + (dc.BM || 0) * T * T * sinU * invD + (dc.BN || 0) * T * T * cosU * invD
        + (dc.BO || 0) * sin2U * invD2 * invD + (dc.BP || 0) * cos2U * invD2 * invD
        + (dc.BQ || 0) * sinU * invD2 * invD * invD
        + (dc.BR || 0) * sinMplanet * invD + (dc.BS || 0) * cosMplanet * invD
        + (dc.BT || 0) * sin2Mplanet * invD + (dc.BU || 0) * cos2Mplanet * invD
        + (dc.BV || 0) * sinMplanet + (dc.BW || 0) * cosMplanet
        + (dc.BX || 0) * sin2Mplanet + (dc.BY || 0) * cos2Mplanet
        + (dc.BZ || 0) * sinMplanet * invD2 + (dc.CA || 0) * cosMplanet * invD2;
      sph.phi += corrDec * d2r;
    }

    const rc = C.ASTRO_REFERENCE.raCorrection && C.ASTRO_REFERENCE.raCorrection[target];
    if (rc) {
      const invDS = invD * invS;
      const corrRA = rc.A + rc.B * invD + (rc.C || 0) * T
        + (rc.D * sinU + rc.E * cosU + rc.F * sin2U + rc.G * cos2U
         + (rc.H || 0) * sin3U + (rc.I || 0) * cos3U) * invD
        + T * ((rc.J || 0) * sinU + (rc.K || 0) * cosU) * invD
        + (rc.L || 0) * invS + (rc.M || 0) * sinU * invD2
        + (rc.N || 0) * sin2U * invS + (rc.O || 0) * cosU * invS
        + (rc.P || 0) * T * sin2U * invD + (rc.Q || 0) * T * cos2U * invD
        + (rc.R || 0) * T * sinU * invS
        + (rc.S || 0) * T * invD + (rc.U || 0) * cosU * invD2
        + (rc.V || 0) * invS2 + (rc.W || 0) * sinU * invS2
        + (rc.X || 0) * cos3U * invS + (rc.Y || 0) * sin3U * invS
        + (rc.Z || 0) * invDS + (rc.AA || 0) * sinU * invDS
        + (rc.AB || 0) * cos2U * invDS + (rc.AC || 0) * T * sin2U * invS
        + (rc.AD || 0) * cos3U * invD2 + (rc.AE || 0) * sin2U * invS2
        + (rc.AF || 0) * sin3U * invS2 + (rc.AG || 0) * cos3U * invS2
        + (rc.AH || 0) * cosU * invS2 + (rc.AI || 0) * sinU * invD2 * invS
        + (rc.AJ || 0) * Math.cos(4*u) * invS + (rc.AK || 0) * sin2U * invD2 * invS
        + (rc.AL || 0) * Math.sin(4*u) * invD + (rc.AM || 0) * Math.cos(4*u) * invD
        + (rc.AN || 0) * T * sinU * invD2 + (rc.AO || 0) * T * cosU * invD2
        + (rc.AP || 0) * sinU * invD2 * invD + (rc.AQ || 0) * cosU * invD2 * invD
        + (rc.AR || 0) * sinCP + (rc.AS || 0) * cosCP
        + (rc.AT || 0) * sin2CP + (rc.AU_ || 0) * cos2CP
        + (rc.AV || 0) * sinCP * invD + (rc.AW || 0) * cosCP * invD
        + (rc.AX || 0) * sinLsun * invD + (rc.AY || 0) * cosLsun * invD
        + (rc.AZ || 0) * sinLsun + (rc.BA || 0) * cosLsun
        + (rc.BB || 0) * T * sinLsun * invD + (rc.BC || 0) * T * cosLsun * invD
        + (rc.BD || 0) * T * sinLsun + (rc.BE || 0) * T * cosLsun
        + (rc.BF || 0) * cosU * sinLsun * invD2 + (rc.BG || 0) * cosU * cosLsun * invD2
        + (rc.BH || 0) * sinLsun * invD2 * invD + (rc.BI || 0) * cosLsun * invD2 * invD
        + (rc.BJ || 0) * Math.sin(u - _Lsun) * invD2 + (rc.BK || 0) * Math.cos(u - _Lsun) * invD2
        + (rc.BL || 0) * T * T * invD + (rc.BM || 0) * T * T * sinU * invD + (rc.BN || 0) * T * T * cosU * invD
        + (rc.BO || 0) * sin2U * invD2 * invD + (rc.BP || 0) * cos2U * invD2 * invD
        + (rc.BQ || 0) * sinU * invD2 * invD * invD
        + (rc.BR || 0) * sinMplanet * invD + (rc.BS || 0) * cosMplanet * invD
        + (rc.BT || 0) * sin2Mplanet * invD + (rc.BU || 0) * cos2Mplanet * invD
        + (rc.BV || 0) * sinMplanet + (rc.BW || 0) * cosMplanet
        + (rc.BX || 0) * sin2Mplanet + (rc.BY || 0) * cos2Mplanet
        + (rc.BZ || 0) * sinMplanet * invD2 + (rc.CA || 0) * cosMplanet * invD2;
      sph.theta -= corrRA * d2r;
    }
  }

  // Gravitation correction (per-planet synodic periods, planet-planet perturbations)
  const gravCorr = C.GRAVITATION_CORRECTION && C.GRAVITATION_CORRECTION[target];
  if (gravCorr) {
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    for (const term of gravCorr) {
      const phase = 2 * Math.PI * (_yr - 2000) / term.period;
      const sp = Math.sin(phase), cp = Math.cos(phase);
      sph.theta -= (term.raSin * sp + term.raCos * cp) * d2r;
      sph.phi += (term.decSin * sp + term.decCos * cp) * d2r;
    }
  }

  // Elongation offset correction (elongation × Earth perihelion geometry)
  // Applied to inner planets: Venus, Mars
  const _elCorr = C.ELONGATION_CORRECTION && C.ELONGATION_CORRECTION[target];
  if (_elCorr) {
    const vc = _elCorr;
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / _epochCache.mSY;
    // Compute Sun RA for elongation
    const _sunSph = computePlanetPosition('sun', jd, graph);
    const _sunRA = _sunSph.ra;  // radians
    const _venusRA = sph.theta; // radians (already corrected by parallax + conjunction)
    const _elong = _venusRA - _sunRA;
    // Earth perihelion angle
    const _wE = (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 + 360 / (C.H / 16) * (_yr - 2000)) * d2r;
    const _vFromWE = _venusRA - _wE;
    // Planet-Earth synodic phase (exact from integer orbit count)
    const _plCount = Math.round(C.totalDaysInH / C.planets[target].solarYearInput);
    const _synVE = 1 / Math.abs(1 - _plCount / C.H);
    const _synPhase = 2 * Math.PI * (_yr - 2000) / _synVE;
    // 15 basis functions (1st-4th harmonics of V-ωE × sin(elongation) + synodic + d²-weighted)
    const sinEl = Math.sin(_elong), cosEl = Math.cos(_elong);
    const cosVwE = Math.cos(_vFromWE), sinVwE = Math.sin(_vFromWE);
    const sin2VwE = Math.sin(2 * _vFromWE), cos2VwE = Math.cos(2 * _vFromWE);
    const sin3VwE = Math.sin(3 * _vFromWE), cos3VwE = Math.cos(3 * _vFromWE);
    const sin4VwE = Math.sin(4 * _vFromWE), cos4VwE = Math.cos(4 * _vFromWE);
    const invD = 1 / distAU;
    sph.theta -= ((vc.cosVwE_sinEl_ra || 0) * cosVwE * sinEl
                + (vc.sinEl_d_ra || 0) * sinEl * invD
                + (vc.sinVwE_sinEl_ra || 0) * sinVwE * sinEl
                + (vc.sin2VwE_sinEl_ra || 0) * sin2VwE * sinEl
                + (vc.cos2VwE_sinEl_ra || 0) * cos2VwE * sinEl
                + (vc.cos4VwE_sinEl_ra || 0) * cos4VwE * sinEl
                + (vc.sin4VwE_sinEl_ra || 0) * sin4VwE * sinEl
                + (vc.sinVwE_sinEl_d2_ra || 0) * sinVwE * sinEl * invD * invD
                + (vc.cos3VwE_sinEl_ra || 0) * cos3VwE * sinEl
                + (vc.sin3VwE_sinEl_ra || 0) * sin3VwE * sinEl
                + (vc.sin2syn_ra || 0) * Math.sin(2 * _synPhase)
                + (vc.cos1syn_ra || 0) * Math.cos(_synPhase)
                + (vc.sin3VwE_sinEl_d2_ra || 0) * sin3VwE * sinEl * invD * invD
                + (vc.sin2VwE_sinEl_d2_ra || 0) * sin2VwE * sinEl * invD * invD
                + (vc.cos2VwE_sinEl_d2_ra || 0) * cos2VwE * sinEl * invD * invD
                + (vc.cosEl_d_ra || 0) * cosEl * invD
                + (vc.cosVwE_cosEl_d_ra || 0) * cosVwE * cosEl * invD
                + (vc.sinVwE_cosEl_d_ra || 0) * sinVwE * cosEl * invD
                + (vc.cosEl_d2_ra || 0) * cosEl * invD * invD
                + (vc.cosVwE_cosEl_d2_ra || 0) * cosVwE * cosEl * invD * invD
                + (vc.sinVwE_cosEl_d2_ra || 0) * sinVwE * cosEl * invD * invD) * d2r;
    sph.phi += ((vc.cosVwE_sinEl_dec || 0) * cosVwE * sinEl
              + (vc.sinEl_d_dec || 0) * sinEl * invD
              + (vc.sinVwE_sinEl_dec || 0) * sinVwE * sinEl
              + (vc.sin2VwE_sinEl_dec || 0) * sin2VwE * sinEl
              + (vc.cos2VwE_sinEl_dec || 0) * cos2VwE * sinEl
              + (vc.cos4VwE_sinEl_dec || 0) * cos4VwE * sinEl
              + (vc.sin4VwE_sinEl_dec || 0) * sin4VwE * sinEl
              + (vc.sinVwE_sinEl_d2_dec || 0) * sinVwE * sinEl * invD * invD
              + (vc.cos3VwE_sinEl_dec || 0) * cos3VwE * sinEl
              + (vc.sin3VwE_sinEl_dec || 0) * sin3VwE * sinEl
              + (vc.sin2syn_dec || 0) * Math.sin(2 * _synPhase)
              + (vc.cos1syn_dec || 0) * Math.cos(_synPhase)
              + (vc.sin3VwE_sinEl_d2_dec || 0) * sin3VwE * sinEl * invD * invD
              + (vc.sin2VwE_sinEl_d2_dec || 0) * sin2VwE * sinEl * invD * invD
              + (vc.cos2VwE_sinEl_d2_dec || 0) * cos2VwE * sinEl * invD * invD
              + (vc.cosEl_d_dec || 0) * cosEl * invD
              + (vc.cosVwE_cosEl_d_dec || 0) * cosVwE * cosEl * invD
              + (vc.sinVwE_cosEl_d_dec || 0) * sinVwE * cosEl * invD
              + (vc.cosEl_d2_dec || 0) * cosEl * invD * invD
              + (vc.cosVwE_cosEl_d2_dec || 0) * cosVwE * cosEl * invD * invD
              + (vc.sinVwE_cosEl_d2_dec || 0) * sinVwE * cosEl * invD * invD) * d2r;
  }

  // Planet offset correction (time-dependent, fitted from Tier 1 observed data)
  // PLANET_OFFSET_CORRECTION removed — the inclination geometry residual for Mercury
  // is now handled by the 62p parallax BJ/BK terms (sin/cos(u-Lsun)/d²).
  // See docs/72-planet-offset-correction.md for the physics derivation.

  // Full Meeus Ch. 47 post-hoc correction: override both RA and Dec
  if (target === 'moon' && C.useVariableSpeed &&
      graph.moonNodes._meeusLonDeg !== undefined && graph.moonNodes._meeusLatDeg !== undefined) {
    // Use framework's authoritative obliquity (matches scene kinematic tilt).
    // Was: Meeus linear (obliquityJ2000_deg - 0.01300*T); framework harmonics
    // diverge by 11" at modern → sub-km Moon position effect at eclipse epochs.
    // Consistent with src/script.js Moon Meeus overlay fix (commit 5443a55).
    // NOTE (Stage C investigation): an empirical scene-basis conversion was
    // tested here (sun-plane and moon-base-plane variants) against the
    // moon-on-ring meter and FALSIFIED — the conversion frame is correct.
    // The ~9-10° plane divergence measured at the time was the then-missing
    // Phase 9.13 _dtMoonIntegrator mirror branch (added; planes now ≤1.0°),
    // and the residual phase misalignment was resolved by the TT clock
    // alignment (Moon-chain layers + args on one clock).
    const currentYear = C.balancedYear + (jd - C.balancedJD) / _epochCache.mSY;
    const eps = OE.computeObliquityEarth(currentYear) * d2r;
    const cosE = Math.cos(eps), sinE = Math.sin(eps);
    const lamR = graph.moonNodes._meeusLonDeg * d2r;
    const betR = graph.moonNodes._meeusLatDeg * d2r;
    const sinLam = Math.sin(lamR), cosLam = Math.cos(lamR);
    const sinBet = Math.sin(betR), cosBet = Math.cos(betR);

    let newRA = Math.atan2(sinLam * cosE - Math.tan(betR) * sinE, cosLam);
    if (newRA < 0) newRA += 2 * Math.PI;
    let newDec = Math.asin(sinBet * cosE + cosBet * sinE * sinLam);

    // Post-Meeus RA/Dec correction (fitted to JPL DE440 residuals)
    // D5 derived optics (mirrors src/script.js): framework-native subtracts
    // the ANALYTIC annual aberration + the small fitted residual; pure-Meeus
    // A/B mode keeps the legacy fitted MOON_CORRECTION.
    if (MOON_ARGS_FRAMEWORK_NATIVE) {
      // delta TO the aberration-removed direction (u − v/c) — apply directly
      const _ab = _moonAberrationRaDecTools(C.j2000JD + (graph.moonNodes._meeusT || 0) * 36525, newRA, newDec);
      newRA  += _ab.dRA;
      newDec += _ab.dDec;
    }
    const mc = MOON_ARGS_FRAMEWORK_NATIVE ? C.MOON_CORRECTION_RESIDUAL : C.MOON_CORRECTION;
    if (mc) {
      const dJD = (graph.moonNodes._meeusT || 0) * 36525;  // days from J2000
      const Dc  = (297.850 + 12.19074912 * dJD) * d2r;
      const Mpc = (134.963 + 13.06499295 * dJD) * d2r;
      const Msc = (357.529 + 0.98560028 * dJD) * d2r;
      newRA  -= (mc.raSinD  * Math.sin(Dc) + mc.raCosD  * Math.cos(Dc)
               + mc.raSinMp * Math.sin(Mpc) + mc.raCosMp * Math.cos(Mpc)
               + mc.raSinMs * Math.sin(Msc) + mc.raCosMs * Math.cos(Msc)) * d2r;
      newDec -= (mc.decSinD  * Math.sin(Dc) + mc.decCosD  * Math.cos(Dc)
               + mc.decSinMp * Math.sin(Mpc) + mc.decCosMp * Math.cos(Mpc)
               + mc.decSinMs * Math.sin(Msc) + mc.decCosMs * Math.cos(Msc)) * d2r;
    }

    // (Stage C note: a rigid ring-frame placement mirror was implemented and
    // measured to be an exact identity — frames are rigid; reverted.)
    sph.theta = newRA;
    sph.phi = Math.PI / 2 - newDec;
  }

  // Extract dynamic mean anomaly for inner planets (from EoC computation)
  let meanAnomaly = 0;
  if (target !== 'moon' && target !== 'sun') {
    const _pm = graph.planetNodeMap[target];
    if (_pm && _pm.planet._meanAnomaly != null) {
      meanAnomaly = _pm.planet._meanAnomaly;
    }
  }

  return {
    ra: sph.theta,   // radians
    dec: sph.phi,    // radians (Three.js phi convention)
    distAU,
    sunDistAU,
    meanAnomaly,     // radians (from EoC computation, heliocentric orbital phase)
    // Moon override only: the SERIES distance the browser places the Moon at
    // (km). distAU above stays the raw pivot distance — pair angles with
    // THIS for any override-vs-ring comparison (meter distance-pairing fix).
    meeusDistKm: (target === 'moon' && C.useVariableSpeed) ? graph.moonNodes._meeusDistKm : undefined,
  };
}

/**
 * Convert Three.js spherical dec (phi) to standard declination in degrees.
 * phi in [0, π] → dec in [-90°, +90°]
 */
function phiToDecDeg(phi) {
  const decRad = (phi <= 0) ? phi + Math.PI / 2 : Math.PI / 2 - phi;
  return decRad * (180 / Math.PI);
}

/**
 * Convert Three.js spherical RA (theta) to degrees [0, 360).
 */
function thetaToRaDeg(theta) {
  let deg = theta * (180 / Math.PI);
  return ((deg % 360) + 360) % 360;
}

/**
 * Convert Three.js spherical RA (theta) to hours [0, 24).
 */
function thetaToRaHours(theta) {
  if (theta < 0) theta += 2 * Math.PI;
  return theta * 12 / Math.PI;
}

/**
 * Get Sun's world-space angle (for sidereal year measurement).
 * Returns atan2(z, x) in degrees [0, 360).
 */
function getSunWorldAngle(jd) {
  const graph = getGraph();
  _syncEpochForJD(jd);
  const pos = _posFromJDTools(jd);
  moveModel(graph, pos);
  const sunWP = graph.sunNodes.pivot.getWorldPosition();
  let angle = Math.atan2(sunWP[2], sunWP[0]) * 180 / Math.PI;
  return ((angle % 360) + 360) % 360;
}

/**
 * Get WobbleCenter-Sun distance in AU (for perihelion/aphelion detection).
 * Uses the fixed wobble center (scene origin) → Sun, NOT Earth → Sun.
 * This measures the true anomalistic orbit without axial-precession noise.
 */
function getWobbleSunDistAU(jd) {
  const graph = getGraph();
  _syncEpochForJD(jd);
  const pos = _posFromJDTools(jd);
  moveModel(graph, pos);
  // WobbleCenter is at the scene origin (0,0,0)
  const sunWP = graph.sunNodes.pivot.getWorldPosition();
  return Math.sqrt(sunWP[0]*sunWP[0] + sunWP[1]*sunWP[1] + sunWP[2]*sunWP[2]) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// FAST SUN POSITION — Only animates Earth precession + Sun node.
// Skips all planets, Moon, and dynamic ascending node computations.
// ~5-10x faster than computePlanetPosition('sun', jd).
// Use for cardinal point / year-length exports that scan Sun RA at high frequency.
// ═══════════════════════════════════════════════════════════════════════════

function computeSunPositionFast(jd) {
  const graph = getGraph();
  _syncEpochForJD(jd);
  const pos = _posFromJDTools(jd);

  // Compute Earth eccentricity for EoC — epoch-consistent mSY for round-trip.
  // pos IS the tropical-year count from startmodelJD (see the block at
  // computePositions): startModelYearWithCorrection + pos, one convention.
  const currentYear = C.startModelYearWithCorrection + pos;
  const earthEcc = OE.computeEccentricity(currentYear, C.balancedYear, C.perihelionCycleLength, C.eccentricityBase, C.eccentricityAmplitude);

  // Animate a single node: orbit.ry = θ (with EoC if applicable)
  function animateFast(nodes, def) {
    let θ;
    // Phase 9.12 (B-full): tagged Earth H-cycle precession objects use
    // integrated phase ∫1/H(t')dt' under deep-time. See animateObject in
    // moveModel() for the identical branch.
    if (DEEP_TIME_ENABLED && Number.isFinite(def._dtCycleN)) {
      const cycles = DT.cyclesBetweenYears(C.balancedYear, currentYear, def._dtCycleN);
      θ = (cycles !== null ? cycles : 0) * 2 * Math.PI * def._dtCycleSign;
    } else {
      θ = def.speed * pos - def.startPos * d2r;
    }
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      const e = def._eocDerived
        ? earthEcc - C.eccentricityBase / 2
        : def.eccentricity;
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
    }
    // Phase Z-B (2026-06): Sun longitude harmonics applied to SUN NODE only.
    // Mirror of the moveModel() Sun-only block above. See there for full notes.
    const SUN_HARM_ENABLED = process.env.SUN_HARMONICS_DISABLED !== '1';
    if (SUN_HARM_ENABLED && nodes === graph.sunNodes && C.SUN_LONGITUDE_HARMONICS) {
      const year = 2000 + (jd - C.j2000JD) / 365.25;
      const t = year - C.balancedYear;
      let corr = C.SUN_LONGITUDE_MEAN || 0;
      const H_round = Math.round(C.H);
      for (const h of C.SUN_LONGITUDE_HARMONICS) {
        const divisor = h[0];
        const isYearMultiple      = divisor >= H_round && divisor % H_round === 0;
        const isPrecessionDivisor = divisor > 0 && divisor <= 20;
        const isLunarPrecession   = divisor === C.N_nodalI || divisor === C.N_apsidalI;
        // Clause (d) "sharesFactorWithH" removed 2026-07-15 — admitted
        // mid-range fit artifacts (divisors 84, 92, 115, 122) not physically
        // motivated. See tools/fit/sun-longitude-harmonics.js for rationale.
        if (!isYearMultiple && !isPrecessionDivisor && !isLunarPrecession) continue;
        const phase = 2 * Math.PI * t / (C.H / divisor);
        corr += h[1] * Math.sin(phase) + h[2] * Math.cos(phase);
      }
      θ -= corr * d2r;
    }
    nodes.orbit.ry = θ;
  }

  // Animate Earth + precession chain + Sun only
  animateFast(graph.earthNodes, graph.earthNodes.def);
  const precLayers = [
    [graph.earthInclPrec, graph.earthInclPrec.def],
    [graph.earthEclipPrec, graph.earthEclipPrec.def],
    [graph.earthObliqPrec, graph.earthObliqPrec.def],
    [graph.earthPeriPrec1, graph.earthPeriPrec1.def],
    [graph.earthPeriPrec2, graph.earthPeriPrec2.def],
    [graph.barycenter, graph.barycenter.def],
  ];
  for (const [nodes, def] of precLayers) animateFast(nodes, def);
  animateFast(graph.sunNodes, graph.sunNodes.def);

  // Update world matrices from root
  graph.root.updateWorldMatrix();

  // Extract Sun position in Earth's equatorial frame
  const earthRotAxisWP = graph.earthNodes.rotAxis.getWorldPosition();
  const sunWP = graph.sunNodes.pivot.getWorldPosition();

  const dx = sunWP[0] - earthRotAxisWP[0];
  const dy = sunWP[1] - earthRotAxisWP[1];
  const dz = sunWP[2] - earthRotAxisWP[2];
  const distAU = Math.sqrt(dx*dx + dy*dy + dz*dz) / 100;

  const local = graph.earthNodes.rotAxis.worldToLocal(sunWP[0], sunWP[1], sunWP[2]);
  const sph = cartesianToSpherical(local[0], local[1], local[2]);

  // World-angle (sidereal position) and wobble-center distance
  let worldAngle = Math.atan2(sunWP[2], sunWP[0]) * 180 / Math.PI;
  worldAngle = ((worldAngle % 360) + 360) % 360;
  const wobbleDistAU = Math.sqrt(sunWP[0]*sunWP[0] + sunWP[1]*sunWP[1] + sunWP[2]*sunWP[2]) / 100;

  return { ra: sph.theta, dec: sph.phi, distAU, sunDistAU: distAU, worldAngle, wobbleDistAU };
}

module.exports = {
  computePlanetPosition,
  computeSunPositionFast,
  getSunWorldAngle,
  getWobbleSunDistAU,
  phiToDecDeg,
  thetaToRaDeg,
  thetaToRaHours,
  buildSceneGraph,
  moveModel,
  _invalidateGraph,
  // Expose internals for testing
  Mat4,
  Node,
  cartesianToSpherical,
  _getGraphForProbe: () => getGraph(),   // research probes: the internal graph AFTER a computePlanetPosition call
};
