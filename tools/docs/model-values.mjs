/**
 * MODEL VALUES REGISTRY — the shared definition of every number the prose
 * quotes, and how to render it.
 *
 * THIS IS THE PIECE BOTH REPOS SHARE. The renderers cannot be shared: the
 * website resolves keys through MDX + `<V k="…"/>` at build time, while
 * `3d/docs/*.md` is static markdown read on GitHub and must carry the digits
 * literally. What they must agree on is the VALUE — one definition, one
 * derivation, one rounding. That is this file.
 *
 * Trajectory (§2i, Phases 20/21): this registry moves into the published
 * `@essrt/physics` package, and the website's `src/data/model-values.compute.ts`
 * imports it instead of computing from synced copies of the constants. Until
 * then it lives here and reads the engine directly — which is already one copy
 * fewer than the alternative, because the engine IS the original.
 *
 * ADDING A KEY. Give it a `get()` that derives from the engine or a tracked
 * artifact — never a typed literal, or the registry becomes the thing that
 * goes stale. If a value cannot be derived outside the browser, do NOT add it:
 * leave the doc manual and say so, rather than bake a guess into automation.
 *
 * KEY NAMES AND RENDERING ARE THE WEBSITE'S CONTRACT. When the site imports
 * this registry it stops computing these numbers, so any name or precision we
 * choose differently silently changes what every page displays. Match
 * `model-values.generated.json` exactly — `tools/docs/parity-model-values.mjs`
 * measures it. Keys the site does not define are fine; keys it defines
 * DIFFERENTLY are a defect in this file until proven otherwise.
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
// |s₃|, ″/yr — the dominant nodal mode of Earth's orbit on the invariable plane (the engine's deep
// secular modes; the obliquity beat's partner). Lazy + memoized; ONE reader for every key that needs it.
const s3ArcsecPerYr = (() => {
  let v;
  return () => {
    if (v === undefined) {
      const z = rd('data/nbody-deep-secular-modes.json').modes.earth.zeta
        .filter((m) => Math.abs(m.omegaRadPerYr) > 1e-9)
        .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
      v = Math.abs(z.omegaRadPerYr * 180 / Math.PI) * 3600;
    }
    return v;
  };
})();

const C = require(join(ROOT, 'tools', 'lib', 'constants.js'));
/** Lazy deep-time engine (loads the ΔT/LOD chain on first key that needs it). */
const dtl = () => require(join(ROOT, 'tools', 'lib', 'deep-time.js'));
// THE published of-date year-length / precession family is the one-family
// route — the Node engine's instance of the package factory
// (deep-orbital-history.js createOneSourceMovement().yearLengths, the same
// construction as the package model and the browser).
let _oneMovementM = null;
const oneMovement = () => {
  if (!_oneMovementM) {
    _oneMovementM = require(join(ROOT, 'tools', 'lib', 'deep-orbital-history.js')).createOneSourceMovement();
    if (!_oneMovementM) throw new Error('model-values: the one-source movement needs data/nbody-secular-series.json');
  }
  return _oneMovementM;
};
const oneYL = () => oneMovement().yearLengths;
// THE published obliquity is the hybrid (the one-source movement's ε); the
// kinematic-day keys' mean-ε RA projection rides the IAU J2000 obliquity input
// (STELLAR_DAY_RA_PROJECTION).
const oneEps = (y) => oneMovement().epsDeg(y);
// The published e's range over the last Myr (the N-body series, 500-yr samples)
// — the insolation extremes ride it.
let _seriesERangeM = null;
const seriesERange = () => {
  if (!_seriesERangeM) {
    let lo = Infinity, hi = -Infinity;
    for (let y = -1000000; y <= 2000; y += 500) { const e = oneMovement().e(y); if (e < lo) lo = e; if (e > hi) hi = e; }
    _seriesERangeM = { lo, hi };
  }
  return _seriesERangeM;
};

/** The SHIPPED predictive-precession basis, browser-true: the shared
 *  @essrt/physics predict module (snapshot planet-side phases — the basis the
 *  physical coefficients were fitted against) wired with the browser's
 *  deep-time Earth scalars (integrated-phase perihelion/ERD/obliquity,
 *  epoch-H ERD ω). Lazy singleton shared by every key family that evaluates
 *  fluctuations. */
/** Law 2/5 weight machinery over the eight planets — √a/d² AMD shares and
 *  the √m·a^1.5/√d·e_base eccentricity weights (Earth from its own
 *  constants; anti-phase = Saturn). Shared by the balance/AMD key families. */
let _balanceHelpersM = null;
function balanceMachinery() {
  if (_balanceHelpersM) return _balanceHelpersM;
  let balM = null;
  const bal = () => { if (!balM) balM = rd('data/balance-presets.json'); return balM; };
  // What is left of the balance search is the recorded search artifact
  // (data/balance-presets.json).
  _balanceHelpersM = { bal };
  return _balanceHelpersM;
}

let _predictHelpersM = null;
function predictiveMachinery() {
  if (_predictHelpersM) return _predictHelpersM;
  // The PUBLISHED perihelion of date is the Sun channel's — the series' ϖ plus
  // the MEASURED osculating-mean offset EARTH_OSCULATING_MEAN_OFFSET.dPomArcsec
  // (createModel().sun.perihelionLongitudeDegAt, ecliptic of date): the
  // osculating-mean apsidal direction that Meeus's and Standish's mean
  // elements tabulate and that the eclipses and the cardinal points ride.
  // Measured: it matches Meeus at 1000/1246/2000/2500/3000 AD within 0.001°;
  // the bare series mean (createModel().earth.perihelionLongitudeDeg, the
  // N-body secular mean) sits a constant 0.0195° below it. The rate is the
  // ±50-yr central difference in ″/cy (a constant offset does not enter it).
  const earthPeriOfDateDeg = (year) => physModel().sun.perihelionLongitudeDegAt(year);
  const earthPeriOfDateRateArcsecCy = (year) => {
    const d = earthPeriOfDateDeg(year + 50) - earthPeriOfDateDeg(year - 50);
    return (((d + 540) % 360) - 180) * 3600;   // ° per century → ″/cy
  };
  // The Earth-frame RA rate of a planet's perihelion motion IS the equatorial
  // projection of the chain motion (doc 13 §1.8; twin: src/script.js
  // perihelionFrameBreakdown, identical ops):
  //   α̇ = rate_ecl · dα/dλ(λ, ε) + ∂α/∂ε(λ, ε) · ε̇
  // λ the chain's perihelion longitude of date, ε the published one-source ε
  // and ε̇ its ±50-yr central difference. The chain's DYNAMICAL rate of date is
  // a different quantity (a window rate; the outer planets' are
  // great-inequality-dominated, Neptune's ϖ swings ~16°/cy on its near-zero e).
  const D2R = Math.PI / 180;
  // The motion projected is THE CHAIN'S — the sidereal rate is the 1800–2100
  // window rate with 1PN OFF (the NEWTONIAN window), the perihelion longitude
  // of date is the chain's ϖ (J2000 ecliptic frame, the series handover beyond
  // each planet's boundary). The Newtonian window is ONE base across the whole
  // doc-13 projection family, so the paper's stated closure (projection excess
  // + obliquity-rate term = the Earth-frame rate) holds on a single rate, and
  // the relativistic supplement stays an explicit, stated addition rather than
  // something already folded into the projected number. The model's TOTAL rate
  // of date is <p>PeriRateNowArcsecCy. Browser twin: src/script.js
  // perihelionFrameBreakdown, identical ops.
  const chainBaseline = (planet) => chainWindowNewton(planet);
  // The projection terms of the chain motion at year y (doc 13 §1.8
  // "projection excess + obliquity-rate term"): the Earth-frame rate minus
  // the sidereal rate. Its extremes over one secular perihelion period (the
  // `<p>FluctuationMin/Max` keys) are a property of the projection — λ
  // against the equinox.
  const chainFluct = (y, p) => {
    const eps = oneEps(y) * D2R;
    const epsRate = (oneEps(y + 50) - oneEps(y - 50)) * 3600;
    const lam = physModel().planets.perihelionLongitudeDeg(p, y) * D2R;
    const den = Math.cos(lam) ** 2 + Math.sin(lam) ** 2 * Math.cos(eps) ** 2;
    const rate = chainBaseline(p);
    return rate * (Math.cos(eps) / den - 1) + (-Math.sin(lam) * Math.cos(lam) * Math.sin(eps) / den) * epsRate;
  };
  const fluct = chainFluct;
  const totalPrecession = (y, p) => chainBaseline(p) + chainFluct(y, p);   // the Earth-frame RA rate, frame (b)
  _predictHelpersM = { fluct, chainFluct, earthPeriOfDateDeg, earthPeriOfDateRateArcsecCy, totalPrecession, chainBaseline };
  return _predictHelpersM;
}
const astro = rd('public/input/astro-reference.json');   // the ONE input file (model-parameters.json is deleted, plan 11 step 6)
const versionInfo = rd('public/input/model-version.json');
const dtFit = rd('data/deltaT-4flag-fit.json');
// THE CHAIN ARTIFACT as the planets' one home: secular eigenfrequencies g/s
// (″/yr, the leading z/ζ modes of the 1-Myr WH+NAFF run), the 1800–2100 window
// rates (1PN and Newtonian), the J2000 anchor elements. Every planet key below
// reads it; the key NAMES stay so the markers re-render.
const chainArt = (() => { /** @type {any} */ let a; return () => a || (a = rd('data/nbody-secular-frequencies.json')); })();
/** Leading secular apsidal frequency, ″/yr, prograde positive. @param {string} p */
const chainG = (p) => chainArt().g[p].arcsecPerYr;
/** The era window rates (1800–2100), ″/cy: gr = 1PN on, newton = off. @param {string} p */
const chainWindowGr = (p) => chainArt().windowRatesArcsecCy.gr[p];
const chainWindowNewton = (p) => chainArt().windowRatesArcsecCy.newton[p];
/** The J2000 general precession rate, ″/yr (the one-family beat at 2000). */
const pAJ2000ArcsecPerYr = () => 1296000 / oneYL().axialPrecessionYearsAtYear(2000);
/** The chain's inclination to the invariable plane over the banked ±10-Myr
 *  series (the API's `invPlaneInclinationDeg`, sampled every 2 kyr): mean and
 *  half-range — the engine's replacement of the ψ law's mean/amplitude. A
 *  multi-mode quantity has no single amplitude; the half-range is stated as
 *  such in the notes. @param {string} p */
const chainInclStats = (() => {
  /** @type {Record<string, {mean:number, min:number, max:number}>} */ const memo = {};
  return (p) => {
    if (memo[p]) return memo[p];
    // Earth's inclination to the invariable plane is the engine's own normal
    // (model.earth.inclinationDeg); the planets' is the chain's.
    const f = p === 'earth'
      ? (/** @param {string} _ @param {number} y */ (_, y) => physModel().earth.inclinationDeg(y))
      : physModel().planets.invPlaneInclinationDeg;
    let s = 0, n = 0, mn = Infinity, mx = -Infinity;
    for (let y = -9996000; y <= 9996000; y += 2000) { const v = f(p, 2000 + y); s += v; n++; if (v < mn) mn = v; if (v > mx) mx = v; }
    // (model-values 23.0.0: the half-range (mx − mn)/2 left with the `<p>InclAmp`
    // keys — a multi-mode quantity is published as its mean and its range.)
    memo[p] = { mean: s / n, min: mn, max: mx };
    return memo[p];
  };
})();
// The package model on the SERIES tier (the API's construction), built lazily
// on the first key that reads it (the spin-channel keys).
const phys = await import('@essrt/physics');
const physModel = (() => {
  /** @type {any} */ let m;
  return () => {
    if (!m) m = phys.createModel(undefined, { secularSeriesArtifact: rd('data/nbody-secular-series.json') });
    return m;
  };
})();
// The published series against La2010a (Laskar et al. 2011, A&A 532, A89) over the solution's span
// (−500 kyr → 0 at 1 kyr, public/input/la2010-orbital-elements.json, invariable-plane frame): the
// ONE computation behind the deep-eccentricity figure (tools/explore/deep-ecc-history.mjs) and the
// browser's inv-tab note — theory against theory, published either way it falls. Memoised.
const seriesVsLa2010a = (() => {
  /** @type {{eccRms:number, eccMaxAbs:number, inclRmsDeg:number, n:number}|undefined} */ let memo;
  return () => {
    if (memo) return memo;
    const la = rd('public/input/la2010-orbital-elements.json');
    const m = physModel();
    let s2e = 0, s2i = 0, mx = 0, n = 0;
    for (const r of la.data) {
      const y = 2000 + r.year;   // the file's years count from J2000
      const de = m.earth.eccentricity(y) - r.eccentricity;
      const di = m.earth.inclinationDeg(y) - r.inclination;
      s2e += de * de; s2i += di * di; mx = Math.max(mx, Math.abs(de)); n++;
    }
    memo = { eccRms: Math.sqrt(s2e / n), eccMaxAbs: mx, inclRmsDeg: Math.sqrt(s2i / n), n };
    return memo;
  };
})();

/** `1234567.89` -> `1,234,567.89` (the form the prose uses for H). */
const thousands = (n, dp = 0) => {
  const [i, f] = Number(n).toFixed(dp).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
};

/** The website's scientific-notation convention: mantissa × 10 with unicode
 *  superscript exponent (e.g. -3.93 × 10⁻⁷). Replicates its fmtSci exactly. */
const fmtSci = (n, mantissaDecimals = 1) => {
  if (!Number.isFinite(n) || n === 0) return String(n);
  let exp = Math.floor(Math.log10(Math.abs(n)));
  let mantissa = n / Math.pow(10, exp);
  // Normalize the rounding boundary: 9.99999e-7 at 1 dp is '1.0 × 10⁻⁶',
  // not '10.0 × 10⁻⁷'. (The site's fmtSci shares this latent edge but only
  // ever receives pre-rounded literals, so it never fires there.)
  if (Math.abs(Number(mantissa.toFixed(mantissaDecimals))) >= 10) {
    mantissa /= 10;
    exp += 1;
  }
  const supMap = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const expStr = String(exp).split('').map((c) => supMap[c] ?? c).join('');
  return `${mantissa.toFixed(mantissaDecimals)} × 10${expStr}`;
};

/** The website's signed-percent convention: below the rendering threshold the
 *  string is "< 0.01"-style rather than a misleading "+0.00". */
const fmtSignedPct = (n, decimals = 2) => {
  const abs = Math.abs(n);
  if (abs < 10 ** -decimals) return `< 0.${'0'.repeat(decimals - 1)}1`;
  return `${n >= 0 ? '+' : '-'}${abs.toFixed(decimals)}`;
};

/**
 * key -> { get, render, unit, note }
 *   get()    derives the raw number
 *   render() the exact string the prose should contain
 * Both renderers (this repo's markdown baker, the website's V component)
 * must produce the same string for the same key.
 */
export const VALUES = {
  deltaTStart: {
    get: () => dtFit.optimum.deltaTStart,
    render: (v) => Number(v).toFixed(2),
    unit: 's',
    note: 'ΔT trend anchor at J2000, joint-fit optimum',
  },
  usnoLodJ2000: {
    get: () => dtFit.optimum.usno_target_lod_s,
    render: (v) => thousands(v, 4),
    unit: 's',
    note: 'USNO Earth Orientation Center J2000 LOD anchor — the joint fit\'s hard-equality closure target',
  },
  deltaTEspenakRmsSeconds: {
    get: () => dtFit.optimum.espenak_rms_s,
    render: (v) => Number(v).toFixed(1),
    unit: 's',
    note: 'joint-fit RMS over the Espenak window. NOT the validate-resonator sweep figure (different window) — the two differ and have been confused before',
  },
  stephensonFullWindowRmsSeconds: {
    get: () => rd('data/core-mantle-resonator-stage3-validation.json').on.steph_rms_demeaned,
    render: (v) => Number(v).toFixed(2),
    unit: 's',
    note: 'joint-world ON Stephenson full-window RMS (stage-3 validation artifact) — the doc-105 shipped-configuration column',
  },
  // ── Layer-4 solar-day family (§12h) — engine twins of the tweakpane ─────
  // Website contract: lodRealPhysical / lodH5Only / stackNetLodJ2000Ms in
  // model-values.compute.ts (the dayLength.ts port). ONE J2000 day basis — the
  // kinematic day of date is the Layer-0 tidal mean, exactly ω₀ (the SI day)
  // at J2000, and the ΔT joint fit closes on that same day. The gate inside
  // lodRealPhysical holds the closure to 1e-8 s on every docs build.
  lodRealPhysical: {
    get: () => {
      const v = dtl().computeLodRealSecondsAtEpoch(2000);
      // §12h basis-consistency gate: display-basis composite + basis spread
      // must land exactly on the fit's closure target. Ties the engine, the
      // 6d anchor (the astro-reference year-length inputs) and the joint fit
      // (deltaT-4flag-fit.json) together — fires if any is reshipped without
      // the others. Tolerance covers the fitter's 86400-approx h5 and its
      // linear-algebra Σ vs the runtime Σ (measured ~8e-10 s). Assumes the
      // shipped flag set: running docs under DT_*_DISABLED= envs fails here
      // by design — the doc numbers assert the shipped world.
      const target = dtFit.optimum.usno_target_lod_s;
      if (Math.abs(v - target) > 1e-8) {
        throw new Error('model-values: lodRealPhysical basis-consistency gate FAILED: '
          + `composite ${v}, but the joint fit's USNO closure target is ${target}. `
          + 'The engine and the ΔT joint fit have desynced (run Step 7c, then constants:generate).');
      }
      return v;
    },
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'Layer-4 physical solar day at J2000 (tweakpane Solar Day) — closes on usnoLodJ2000, the one J2000 day basis',
  },
  measuredMeanSolarDayJ2000Seconds: {
    // ONE J2000 day basis — the SI day ω₀. The key stays for its readers.
    get: () => C.meanLengthOfDay,
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'the scene day basis at J2000 — the SI day ω₀',
  },
  lodH5Only: {
    get: () => dtl().computeLodKinematicSecondsAtEpoch(2000) + dtl().h5Correction(2000),
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'kinematic solar day + the ecliptic missing-motion term at J2000 (no ΔT cycles) — intermediate, not the physical readout (key name kept)',
  },
  stackNetLodJ2000Ms: {
    get: () => dtl().dtCycleLodCorrectionSum(2000) * 1000,
    render: (v) => fmtSignedPct(v, 2),
    unit: 'ms',
    note: '4-flag stack + Core-mantle swing δLOD sum at J2000 — basis-independent (= lodRealPhysical − lodH5Only)',
  },
  h5LodCorrectionMs: {
    get: () => dtl().h5Correction(2000) * 1000,
    render: (v) => Number(v).toFixed(3),
    unit: 'ms',
    note: 'the solar day’s ecliptic missing-motion LOD correction at J2000 — LOD_mean/(T_s₃·mSY) on the nodal period 1,296,000/|s₃| (orbital; key name kept)',
  },
  // Ours-only: doc 99 quotes the Layer-2-vs-Layer-4 display gap.
  layer2MinusLayer4GapMs: {
    get: () => {
      const tMa = (C.startmodelYear - 2000) / 1e6;
      const layer2 = dtl().meanLodSecondsAtAge(tMa) + dtl().h5Correction(2000);
      return (layer2 - dtl().computeLodRealSecondsAtEpoch(2000)) * 1000;
    },
    render: (v) => Number(v).toFixed(2),
    unit: 'ms',
    note: 'Layer 2 (tidal+GIA physics baseline + the ecliptic term) minus Layer 4 (shipped observable) at J2000',
  },
  // Ours-only: doc 99's solar-day layer table. Layer 1 (climate-MEAN α) stays
  // manual — its α-mean chain (meanLodSecondsAtAgeMeanAlpha) is browser-only.
  solarDayLayer2J2000: {
    get: () => {
      const tMa = (C.startmodelYear - 2000) / 1e6;
      return dtl().meanLodSecondsAtAge(tMa) + dtl().h5Correction(2000);
    },
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'Layer 2 solar day at J2000: tidal + GIA physics baseline + the ecliptic term (browser solarDayLayer2 at year 2000)',
  },
  solarDayLayer3J2000: {
    get: () => dtl().computeLodKinematicSecondsAtEpoch(2000) + dtl().h5Correction(2000)
             + (dtl().dtCycleLodCorrectionSum(2000) - dtl().resonatorSwingLodCorrection(2000)),
    render: (v) => thousands(v, 6),
    unit: 's',
    note: 'Layer 3 solar day at J2000: kinematic + the ecliptic term + 4-flag cycles WITHOUT the Core-mantle swing (browser solarDayLayer3 at year 2000)',
  },
  // ── Earth's precession periods ─────────────────────────────────────────
  // The website's convention, reproduced exactly: a `~` prefix on the rounded
  // ones, and axial precession alone carried to 2dp (it is the one compared
  // against the IAU figure). Earth's cycle periods are the model's OWN J2000
  // dynamical values. Key names kept (P4); the *Formula keys (consumed by the
  // website appendix) render the derivation.
  inclPrecYears: {
    get: () => oneYL().inclinationPrecessionYearsAtYear(2000),
    render: (v) => `~${thousands(Math.round(v))}`,
    unit: 'yr',
    note: 'apsidal precession period at J2000, Julian years — the perihelion against the stars, the ONE movement’s own apsidal rate of date (the scene’s perihelion; anom/(anom − sid) of the one family, the Prec. cell’s rate; the key keeps the historical inclPrec name)',
  },
  inclPrecFormula: { get: () => oneYL().inclinationPrecessionYearsAtYear(2000), render: () => 'the beat of the one-family anomalistic and sidereal years at J2000, T_anom·T_sid/(T_anom − T_sid) — the movement’s own apsidal rate of date' },
  eclPrecYears: {
    get: () => 1296000 / s3ArcsecPerYr(),
    render: (v) => `~${thousands(Math.round(v))}`,
    unit: 'yr',
    note: 'ecliptic (nodal) precession period — the dominant nodal mode s₃ of Earth’s orbit on the invariable plane, from the engine’s deep secular modes (the obliquity beat’s partner; the of-date tangent wanders far from it)',
  },
  eclPrecFormula: { get: () => 1296000 / s3ArcsecPerYr(), render: () => 'the N-body chain’s dominant nodal mode s₃, 1,296,000/|s₃|' },
  obliqCycleYears: {
    get: () => 1296000 / (physModel().lunisolar.spinAxisInertialRateArcsecPerYrJ2000 - s3ArcsecPerYr()),
    render: (v) => `~${thousands(Math.round(v))}`,
    unit: 'yr',
    note: 'obliquity cycle at J2000 — the beat 2π/(ψ̇ᵢₙ − |s₃|) of the spin axis\'s INERTIAL precession rate (the self-anchored rate the hybrid integrates on: the general precession plus the planetary mean, 50.385 ″/yr — IAU\'s ψ_A − p_A) against the nodal mode (≡ obliqBeatJ2000Kyr; falsification leg 1) — the INSTANTANEOUS limit: a dated record sees the beat of the pole rate\'s mean over its own window (obliqCycleRealized*Years; 40,927 over the LR04 record, the climate formula\'s p+s₀ line since v23.0; La2004\'s own series reads 40,900 on the same window — compare realized with realized, never this instant with Laskar\'s long-window precession frequency 50.476). On the general precession alone it read 41,224. S6: was H/8 = 41,915',
  },
  obliqCycleFormula: { get: () => 1296000 / (physModel().lunisolar.spinAxisInertialRateArcsecPerYrJ2000 - s3ArcsecPerYr()), render: () => 'the beat of the spin axis\'s inertial precession against the nodal mode s₃, 1,296,000/(ψ̇ᵢₙ − |s₃|)' },
  // The three RATES beside the three periods above — the same evaluators,
  // 1,296,000″ per period (model-values 23.1.0).
  inclPrecRateArcsecPerYr: { get: () => 1296000 / oneYL().inclinationPrecessionYearsAtYear(2000), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'apsidal precession rate at J2000 — 1,296,000″ / inclPrecYears, the one movement\'s own apsidal rate of date' },
  eclPrecRateArcsecPerYr: { get: () => Math.abs(s3ArcsecPerYr()), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'ecliptic (nodal) precession rate — |s₃|, the dominant nodal mode of Earth\'s orbit on the invariable plane (regression, quoted as a magnitude); 1,296,000″ / eclPrecYears' },
  obliqCycleRateArcsecPerYr: { get: () => physModel().lunisolar.spinAxisInertialRateArcsecPerYrJ2000 - s3ArcsecPerYr(), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the obliquity beat rate at J2000, ψ̇ᵢₙ − |s₃| — 1,296,000″ / obliqCycleYears (the instantaneous limit; a record sees the window mean)' },
  // v23.0 — THE REALIZED OBLIQUITY PERIOD: what a record spanning a window sees — the window mean of the
  // pole rate (the inertial rate of date × solar torque at e(t) × J₂(t)/J₂₀ × cos ε(t)/cos ε₀) minus |s₃|.
  // ONE home createModel().lunisolar.obliquityPeriodRealizedYears; the windows are the climate formula's
  // regimes (data/milankovitch-climate-formula.json regime_fits.*.window_kyr, kyr BP). The J2000 beat
  // (obliqCycleYears) is the instantaneous limit. Measured on the model's own ε(t) and on La2004
  // (obliquity-hybrid-verdict.json realized.*): 40,922 / 40,900 over 0–5.32 Ma, the prediction 40,930.
  ...Object.fromEntries(Object.entries({ Lr04: 'lr04-full', PostMpt: 'post-mpt', InhgMpt: 'inhg-mpt', PreInhg: 'pre-inhg' }).flatMap(([key, reg]) => {
    const win = () => { const w = rd('data/milankovitch-climate-formula.json').regime_fits[reg].window_kyr; return [2000 - w[1] * 1000, 2000 - w[0] * 1000]; };
    return [
      [`obliqCycleRealized${key}Years`, { get: () => physModel().lunisolar.obliquityPeriodRealizedYears(...win()), render: (v) => `~${thousands(Math.round(v))}`, unit: 'yr', note: `the realized obliquity period over the ${reg} window — the window mean of the pole rate minus |s₃| (what the record sees; the J2000 beat is the instantaneous limit)` }],
      [`spinAxisInertialRateMean${key}ArcsecPerYr`, { get: () => physModel().lunisolar.spinAxisInertialRateMeanArcsecPerYr(...win()), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: `the realized pole rate over the ${reg} window — the inertial rate of date with its three of-date factors, averaged (the rate the window's obliquity lines carry)` }],
    ];
  })),
  obliqCycleRealizedFitLr04Years: { get: () => rd('data/obliquity-hybrid-verdict.json').verdict.realized.modelFit.periodYr, render: (v) => `~${thousands(Math.round(v))}`, unit: 'yr', note: 'the dominant obliquity line of the model\'s OWN ε(t) over the LR04 window, fitted with the full line set and one free p (obliquity-hybrid-verdict.json) — gated to the window-mean prediction within 0.1 %' },
  obliqCycleLa2004FitLr04Years: { get: () => rd('data/obliquity-hybrid-verdict.json').verdict.realized.la2004Fit.periodYr, render: (v) => `~${thousands(Math.round(v))}`, unit: 'yr', note: 'La2004\'s own obliquity series on the same fit over the same window — a THEORY reference label, never an input' },
  obliqCycleRealizedVsLa2004Pct: { get: () => 100 * (rd('data/obliquity-hybrid-verdict.json').verdict.realized.modelFit.periodYr / rd('data/obliquity-hybrid-verdict.json').verdict.realized.la2004Fit.periodYr - 1), render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), unit: '%', note: 'the model\'s realized obliquity period against La2004\'s on the same window and fit — the convergence statement, like for like' },
  // The axial precession period is the model's ONE J2000 reading — the one-family route's beat at
  // 2000 (≈ 25,771.6 yr, the IAU p_A period). Key names kept (P4).
  axialPrecYears: {
    get: () => oneYL().axialPrecessionYearsAtYear(2000),
    render: (v) => thousands(v, 2),
    unit: 'yr',
    note: 'axial precession period at J2000, Julian years — the of-date year laws’ beat (one-family route), the model’s one J2000 precession reading; the same number as 360°/the frame’s precession rate per Julian year',
  },
  axialPrecFormula: { get: () => oneYL().axialPrecessionYearsAtYear(2000), render: () => 'the of-date year laws’ beat at J2000, T_sid·T_trop/((T_sid − T_trop)·365.25 d)', note: 'consumed by the website appendix' },
  periPrecYears: {
    get: () => oneYL().perihelionPrecessionYearsAtYear(2000),
    render: (v) => `~${thousands(Math.round(v))}`,
    unit: 'yr',
    note: 'perihelion-of-date period at J2000 — the axial and apsidal rates add (the one-family route’s beat)',
  },
  periPrecFormula: { get: () => oneYL().perihelionPrecessionYearsAtYear(2000), render: () => 'the perihelion-of-date beat of the one-family route at J2000: 1/T_peri = 1/T_p + 1/T_aps' },
  // Two cycles the website also surfaces at the other rounding.
  axialPrecRound: {
    get: () => oneYL().axialPrecessionYearsAtYear(2000),
    render: (v) => `~${thousands(Math.round(v))}`,
    unit: 'yr',
    note: 'axial precession at J2000, whole years (axialPrecYears carries 2dp) — the of-date reading',
  },
  obliquityRateJ2000: {
    get: () => ((oneEps(2001) - oneEps(1999)) / 2) * 3600,
    render: (v) => Number(v).toFixed(4),
    unit: '″/yr',
    note: 'central difference of the published obliquity (the hybrid) at J2000 — IAU 2006: −0.46840 ″/yr',
  },
  // J2000-instantaneous precession rates. UNITS LESSON (measured, 2026-08):
  // the engine's computeLengthOfSiderealYear counts the year in LOD-days
  // (deep-time base T_sid_s/LOD_s — correct for the tweakpane mirror), while
  // computeLengthOfSolarYear counts SI-JD days. Feeding that mix into
  // sid/(sid−sol) inflates the denominator by 1e-4 and gives 50.294 against
  // the IAU-confirmed 50.289 (period 25,771 yr). The ratio needs ONE day
  // unit, so the sidereal term is re-based onto the IAU SI-day mean here.
  // SI days ≠ LOD days — the first naming rule, as arithmetic.
  // Both J2000 rates are the one-family route's beats (one family, SI seconds
  // throughout).
  axialRateJ2000: {
    get: () => 1296000 / oneYL().axialPrecessionYearsAtYear(2000),
    render: (v) => Number(v).toFixed(3),
    unit: '″/yr',
    note: 'axial precession rate at J2000 — the one-family route (B): 1,296,000 / its sidereal–tropical beat',
  },
  periRateJ2000: {
    get: () => 1296000 / oneYL().perihelionPrecessionYearsAtYear(2000),
    render: (v) => Number(v).toFixed(3),
    unit: '″/yr',
    note: 'perihelion (climatic) precession rate at J2000 — the one-family route (B): 1,296,000 / its anomalistic–tropical beat',
  },
  // ── Earth figure (display) ──────────────────────────────────────────────
  // Derived from the PARALLAX radius, not the IAU nominal equatorial radius:
  // two distinct quantities, both shipped in astro-reference (see
  // _earthRadiiNote there). The parallax radius is the matched pair of
  // currentAUDistance via the appendix chain and is what the website's
  // EARTH_RADIUS_KM carries; the equatorial nominal (6378.1366) serves the
  // J2 figure-of-Earth term. Resolved with Dennis 2026-08 after the earlier
  // "one constant must win" framing turned out to be a unit conflation.
  earthRadius: {
    get: () => astro.physicalConstants.earthParallaxRadiusKm,
    render: (v) => thousands(v, 2),
    unit: 'km',
  },
  earthDiameter: {
    get: () => 2 * astro.physicalConstants.earthParallaxRadiusKm,
    render: (v) => thousands(v, 2),
    unit: 'km',
  },
  earthCircumference: {
    get: () => 2 * Math.PI * astro.physicalConstants.earthParallaxRadiusKm,
    render: (v) => thousands(v, 2),
    unit: 'km',
  },

  // ── Earth eccentricity family ───────────────────────────────────────────
  // base and amplitude are the fitted pair (model-parameters); the rest are
  // derived: mean = √(base² + amp²) — the RMS of the two-component cycle, the
  // same formula the website's EARTH_ECC_MEAN uses — and min/max = base ∓ amp,
  // which the website types as prose ('~0.0140'/'~0.0167') but we derive.
  j2000Eccentricity: {
    get: () => astro.earthOrbital.earthEccentricityJ2000,
    render: (v) => Number(v).toFixed(8),
    note: 'the IAU/Standish MEAN element (JPL Keplerian-elements table) — a calibration input, not a fit product; the series\' secular element is earthSeriesEccJ2000',
  },
  // ── The two J2000 conventions, labelled ────────────────────────────────
  // The published Earth surface reads the SECULAR element of the one-source
  // N-body series (≡ JPL's osculating J2000 seed state and La2004); the
  // Calibration Inputs carry the IAU/Standish MEAN element (the 1800–2050
  // fit, carrying the average of the short-period planetary terms). The gap
  // is a convention, never reconciled — every surface names which it shows.
  earthSeriesEccJ2000: {
    get: () => oneMovement().e(2000),
    render: (v) => Number(v).toFixed(8),
    note: 'the one-source series\' e at J2000 — the SECULAR element the Earth panel and scene read',
  },
  earthSeriesPeriLongJ2000: {
    get: () => oneMovement().periOfDateDeg(2000),
    render: (v) => Number(v).toFixed(3),
    unit: '°',
    note: 'the one-source series\' equinox-referenced ϖ of date at J2000 — the SECULAR element the Earth panel reads',
  },
  earthConventionGapEcc: {
    get: () => astro.earthOrbital.earthEccentricityJ2000 - oneMovement().e(2000),
    render: (v) => Number(v).toExponential(1),
    note: 'IAU mean element − series secular element at J2000 (a convention gap, labelled not reconciled)',
  },
  earthConventionGapPeriArcsec: {
    get: () => (astro.earthOrbital.earthPerihelionLongitudeJ2000 - oneMovement().periOfDateDeg(2000)) * 3600,
    render: (v) => Number(v).toFixed(0),
    unit: '″',
    note: 'IAU mean element − series secular element at J2000 (a convention gap, labelled not reconciled)',
  },
  earthEccSeriesVsLa2010aRms: {
    get: () => seriesVsLa2010a().eccRms,
    render: (v) => Number(v).toExponential(1),
    note: 'rms of the published series\' Earth eccentricity against La2010a over the solution\'s span (−500 kyr → 0, 501 rows at 1 kyr; theory against theory, the deep-eccentricity figure\'s measured difference)',
  },
  earthEccSeriesVsLa2010aMaxAbs: {
    get: () => seriesVsLa2010a().eccMaxAbs,
    render: (v) => Number(v).toExponential(1),
    note: 'largest |Δe| of the published series against La2010a over the same span',
  },
  earthInclSeriesVsLa2010aRmsDeg: {
    get: () => seriesVsLa2010a().inclRmsDeg,
    render: (v) => Number(v).toFixed(4),
    unit: '°',
    note: 'rms of the series\' Earth inclination to the invariable plane against La2010a over the same span (the browser\'s inv-tab overlay note)',
  },
  lodKinematicFourierJ2000Seconds: {
    get: () => dtl().computeLodKinematicSecondsAtEpoch(2000),
    render: (v) => thousands(v, 6), unit: 's',
    note: 'o.lodKinematic at J2000: the kinematic day of date (the Layer-0 tidal mean) at J2000 = ω₀, the SI day (the key name is historical)',
  },

  // ── Earth–Sun distances and insolation (from the AU chain + eccentricity) ─
  // AU = currentAUDistance — the parallax-chain value astro-reference ships
  // (matched pair of earthParallaxRadiusKm). Distances use the OBSERVED
  // e(J2000); the insolation extremes use the model's base ∓ amplitude, i.e.
  // 1/√(1−e²) − 1 at the eccentricity-cycle extremes.
  // ── Insolation extension test (doc 94): tracked results of the three
  //    instruments scripts/milankovitch_insolation_{extension,laskar_check,
  //    stability}.py — measured on the shipped model (the physical-line L1,
  //    the N-body eccentricity series as e(t)). ΔR² rendered signed.
  ...(() => {
    const sdr = (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(4);
    const ext = () => rd('data/insolation-extension-results.json');
    const las = () => rd('data/insolation-laskar-check-results.json');
    const stb = () => rd('data/insolation-stability-results.json');
    const out = {};
    for (const [key, reg] of [['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg'], ['Lr04Full', 'lr04-full'], ['EpicaCo2', 'epica-co2']]) {
      out[`insolExtDeltaR2${key}`] = { get: () => ext().regime_results[reg].delta_r2_linsol, render: sdr, note: `in-sample ΔR² of L_insol (model e, ϖ, ε) on L1+L2+L3, regime ${reg}` };
      out[`insolExtR2Canon${key}`] = { get: () => ext().regime_results[reg].r2_l1_l2_l3, render: (v) => Number(v).toFixed(4), note: `R² of the canonical L1+L2+L3 fit, regime ${reg}` };
      out[`insolExtR2Full${key}`] = { get: () => ext().regime_results[reg].r2_l1_l2_l3_linsol, render: (v) => Number(v).toFixed(4), note: `R² with L_insol added, regime ${reg}` };
    }
    out.insolExtMaxDeltaR2 = { get: () => ext().max_delta_r2, render: sdr, note: 'max in-sample ΔR² across the LR04 regimes + EPICA (the pre-registered decision statistic)' };
    for (const [key, field] of [['Eps', 'gamma_eps_anom'], ['Ecc', 'gamma_ecc'], ['ESin', 'gamma_e_sin_peri'], ['ECos', 'gamma_e_cos_peri']]) {
      out[`insolExtGamma${key}PostMpt`] = { get: () => ext().regime_results['post-mpt'].linsol_coefs[field], render: sdr, note: `standardized L_insol coefficient ${field}, post-MPT regime` };
    }
    out.insolExtVerdict = { get: () => ext().verdict, render: (v) => String(v), note: 'the extension script\'s own verdict string under its pre-registered bands' };
    out.insolLaskarV1DeltaR2Lr04 = { get: () => las().lr04_three_way.v1_delta_r2, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(5), note: '0–500 kyr LR04: ΔR² with MODEL insolation features' };
    out.insolLaskarV2DeltaR2Lr04 = { get: () => las().lr04_three_way.v2_delta_r2, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(5), note: '0–500 kyr LR04: ΔR² with La2010a insolation features' };
    out.insolLaskarV1DeltaR2Epica = { get: () => las().epica_three_way.v1_delta_r2, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(5), note: '0–500 kyr EPICA CO₂: ΔR² with MODEL insolation features' };
    out.insolLaskarV2DeltaR2Epica = { get: () => las().epica_three_way.v2_delta_r2, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(5), note: '0–500 kyr EPICA CO₂: ΔR² with La2010a insolation features' };
    out.insolLaskarVerdict = { get: () => las().verdict, render: (v) => String(v) };
    for (const [key, reg] of [['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg'], ['Lr04Full', 'lr04-full']]) {
      out[`insolStabModelCv${key}`] = { get: () => stb().regime_results[reg].model_cv_delta_r2, render: sdr, note: `split-half cross-validated ΔR² of L_insol with the MODEL features, regime ${reg}` };
      out[`insolStabLaskarDeltaR2${key}`] = { get: () => stb().regime_results[reg].laskar_delta_r2, render: sdr, note: `in-sample ΔR² with La2004 e, ϖ (model ε), regime ${reg}` };
      out[`insolStabLaskarCv${key}`] = { get: () => stb().regime_results[reg].laskar_cv_delta_r2, render: sdr, note: `split-half cross-validated ΔR² with La2004 features, regime ${reg}` };
    }
    out.insolStabMaxModelCv = { get: () => stb().max_model_cv_delta_r2, render: sdr, note: 'max cross-validated ΔR² (model features) across the LR04 regimes' };
    out.insolStabMaxLaskarCv = { get: () => stb().max_laskar_cv_delta_r2, render: sdr, note: 'max cross-validated ΔR² (La2004 features) across the LR04 regimes' };
    out.insolStabEccMinModel = { get: () => stb().ecc_range_model_0_5320kyr[0], render: (v) => Number(v).toFixed(4), note: 'the model e(t) (N-body series) minimum over the LR04 span (0–5320 kyr)' };
    out.insolStabEccMaxModel = { get: () => stb().ecc_range_model_0_5320kyr[1], render: (v) => Number(v).toFixed(4), note: 'the model e(t) (N-body series) maximum over the LR04 span (0–5320 kyr)' };
    out.insolStabEccMinLaskar = { get: () => stb().ecc_range_laskar_0_5320kyr[0], render: (v) => Number(v).toFixed(4), note: 'La2004 e(t) minimum over the LR04 span' };
    out.insolStabEccMaxLaskar = { get: () => stb().ecc_range_laskar_0_5320kyr[1], render: (v) => Number(v).toFixed(4), note: 'La2004 e(t) maximum over the LR04 span' };
    // L1 line audit (every shipped physical line on the doc-94 footing) and the ~100-kyr band period scan
    const aud = () => rd('data/l1-line-audit-results.json');
    const scn = () => rd('data/ecc-period-scan-results.json');
    const kyr1 = (v) => Number(v).toFixed(1);
    const signedPct1 = (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(1);
    out.l1LineCount = { get: () => aud().metadata.n_lines, render: (v) => String(v), note: 'number of shipped L1 lines (data/l1-physical-lines.json)' };
    for (const [key, reg] of [['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg'], ['Lr04Full', 'lr04-full']]) {
      out[`l1AuditR2${key}`] = { get: () => aud().regime_results[reg].r2_l1_l2_l3, render: (v) => Number(v).toFixed(4), note: `R² of the shipped L1+L2+L3 fit, regime ${reg}` };
      out[`l1AuditCvPositive${key}`] = { get: () => aud().regime_results[reg].n_cv_positive, render: (v) => String(v), note: `shipped lines with a positive cross-validated pair ΔR² (dropped, refitted, re-added as a free-phase pair, split-half CV), regime ${reg}` };
      out[`l1AuditBestCvLine${key}`] = { get: () => aud().regime_results[reg].best_cv_line.label, render: (v) => String(v), note: `the line with the largest cross-validated pair ΔR², regime ${reg}` };
      out[`l1AuditBestCvLineKyr${key}`] = { get: () => aud().regime_results[reg].best_cv_line.period_kyr, render: kyr1, unit: 'kyr', note: `that line's period, regime ${reg}` };
      out[`l1AuditBestCvDeltaR2${key}`] = { get: () => aud().regime_results[reg].best_cv_line.pair_cv, render: sdr, note: `that line's cross-validated pair ΔR², regime ${reg}` };
      out[`l1AuditLargestLooLine${key}`] = { get: () => aud().regime_results[reg].largest_loo_line.label, render: (v) => String(v), note: `the line whose removal costs the most in-sample R², regime ${reg}` };
      out[`l1AuditLargestLooDeltaR2${key}`] = { get: () => aud().regime_results[reg].largest_loo_line.loo_in, render: sdr, note: `that leave-one-out R² loss, regime ${reg}` };
    }
    const scnOpen = (reg) => scn().regime_results[reg].open;
    const cvAtNearest = (reg) => { const o = scnOpen(reg); return o.at_lines[Number(o.nearest_line_to_cv_peak.period_kyr).toFixed(4)].cv; };
    out.eccScanBandLines = { get: () => scn().metadata.band_lines_removed_for_open.length, render: (v) => String(v), note: 'shipped L1 lines inside the 75–130-kyr band, removed for the band-open baseline' };
    out.eccScanPreInhgCvBestKyr = { get: () => scn().summary.pre_inhg_cv_best_kyr_open, render: kyr1, unit: 'kyr', note: 'pre-iNHG cross-validated best free period in the ~100-kyr band (band-open baseline)' };
    out.eccScanPreInhgMaxCv = { get: () => scn().summary.pre_inhg_max_cv_open, render: sdr, note: 'its cross-validated ΔR²' };
    out.eccScanPreInhgCvHalfmaxLoKyr = { get: () => scn().summary.pre_inhg_cv_halfmax_kyr_open[0], render: kyr1, unit: 'kyr', note: 'lower edge of the CV half-max band' };
    out.eccScanPreInhgCvHalfmaxHiKyr = { get: () => scn().summary.pre_inhg_cv_halfmax_kyr_open[1], render: kyr1, unit: 'kyr', note: 'upper edge of the CV half-max band' };
    out.eccScanPreInhgNearestLineLabel = { get: () => scn().summary.pre_inhg_nearest_line_open.label, render: (v) => String(v), note: 'the shipped line nearest the pre-iNHG CV peak' };
    out.eccScanPreInhgNearestLineKyr = { get: () => scn().summary.pre_inhg_nearest_line_open.period_kyr, render: kyr1, unit: 'kyr', note: 'its period' };
    out.eccScanPreInhgOffsetFromNearestLinePct = { get: () => scn().summary.pre_inhg_nearest_line_open.offset_pct, render: signedPct1, unit: '%', note: 'the pre-iNHG CV peak relative to that line' };
    out.eccScanPreInhgCvAtNearestLine = { get: () => scn().summary.pre_inhg_cv_at_nearest_line_open, render: sdr, note: 'CV ΔR² of a free-phase pair at that line\'s own period, pre-iNHG, band-open baseline' };
    out.eccScanPreInhgInBestKyr = { get: () => scnOpen('pre-inhg').argmax_in_kyr, render: kyr1, unit: 'kyr', note: 'pre-iNHG IN-SAMPLE best free period (the non-stationary ~100-kyr power)' };
    out.eccScanPreInhgInBestCv = { get: () => scnOpen('pre-inhg').cv_at_in_peak, render: sdr, note: 'CV ΔR² at the in-sample power peak, pre-iNHG — negative: not phase-stable' };
    out.eccScanPreInhgBestCvShippedLineLabel = { get: () => scnOpen('pre-inhg').best_cv_shipped_line.label, render: (v) => String(v), note: 'the shipped band line with the largest CV ΔR² at its own period, pre-iNHG' };
    out.eccScanPreInhgBestCvShippedLineCv = { get: () => scnOpen('pre-inhg').best_cv_shipped_line.cv, render: sdr, note: 'that CV ΔR²' };
    out.eccScanPostMptCvBestKyr = { get: () => scnOpen('post-mpt').argmax_cv_kyr, render: kyr1, unit: 'kyr', note: 'post-MPT cross-validated best free period in the band (band-open baseline)' };
    out.eccScanPostMptNearestLineLabel = { get: () => scnOpen('post-mpt').nearest_line_to_cv_peak.label, render: (v) => String(v), note: 'the shipped line nearest the post-MPT CV peak' };
    out.eccScanPostMptNearestLineKyr = { get: () => scnOpen('post-mpt').nearest_line_to_cv_peak.period_kyr, render: kyr1, unit: 'kyr', note: 'its period' };
    out.eccScanPostMptOffsetFromNearestLinePct = { get: () => scnOpen('post-mpt').nearest_line_to_cv_peak.offset_pct, render: signedPct1, unit: '%', note: 'the post-MPT CV peak relative to that line' };
    out.eccScanPostMptCvAtNearestLine = { get: () => cvAtNearest('post-mpt'), render: sdr, note: 'CV ΔR² of a free-phase pair at that line\'s own period, post-MPT, band-open baseline' };
    // The clock-of-date test (scripts/test_evolving_clock_climate_formula.py): the p-carrying lines on the composed clock
    const clk = () => rd('data/evolving-clock-test.json');
    const signed5 = (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(5);
    out.evolvingClockTpJ2000Yr = { get: () => clk().clock_source.T_p_2000_yr, render: (v) => Number(v).toFixed(0), unit: 'yr', note: 'the composed precession period at J2000 the clock test is anchored on' };
    for (const [key, w] of [['PostMpt', 'post-mpt'], ['Pleistocene', 'pleistocene'], ['Lr04Full', 'lr04-full'], ['Epica', 'epica'], ['InhgMpt', 'inhg-mpt'], ['Cenogrid', 'cenogrid'], ['Mesozoic', 'mesozoic'], ['Phanerozoic', 'phanerozoic']]) {
      out[`evolvingClockMeanRatio${key}`] = { get: () => clk().clock_window_means[w].mean_period_ratio, render: (v) => Number(v).toFixed(5), note: `window mean of T_p(t)/T_p(2000) on the composed clock, ${w}` };
      out[`evolvingClockPeriodCorrectionPct${key}`] = { get: () => clk().clock_window_means[w].period_correction_pct, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), unit: '%', note: `the p-lines' mean period over the window relative to J2000, ${w}` };
      out[`evolvingClockExtraCycles${key}`] = { get: () => clk().clock_window_means[w].extra_cycles_over_window, render: (v) => Number(v).toFixed(2), note: `extra precession cycles accumulated over the window, ${w}` };
    }
    for (const [key, reg] of [['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg'], ['Lr04Full', 'lr04-full'], ['Cenogrid', 'cenogrid'], ['Cheng', 'cheng']]) {
      out[`evolvingClockDeltaR2L1${key}`] = { get: () => clk().results[reg].delta_r2_l1, render: signed5, note: `ΔR² (L1 only) of the clock-of-date fit against the J2000-period fit, ${reg}` };
      out[`evolvingClockDeltaR2Total${key}`] = { get: () => clk().results[reg].delta_r2_total, render: signed5, note: `ΔR² (L1+L2+L3) of the clock-of-date fit against the J2000-period fit, ${reg}` };
      out[`evolvingClockMaxShiftKyr${key}`] = { get: () => clk().results[reg].max_shift_kyr, render: kyr1, unit: 'kyr', note: `largest line-time shift at the window end (the longest p-line), ${reg}` };
      out[`evolvingClockBestScale${key}`] = { get: () => clk().results[reg].scale_scan.best_scale, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(1), note: `the warp scale k the record prefers (k = 1 the model's clock, 0 the shipped fit), ${reg}` };
      out[`evolvingClockDeltaR2AtScaleMinusOne${key}`] = { get: () => clk().results[reg].scale_scan.at_minus_one, render: signed5, note: `ΔR² total with the counter-rotating warp (k = −1) — the sign control, ${reg}` };
      out[`evolvingClockHalfADeltaR2${key}`] = { get: () => clk().results[reg].halves_delta_r2_total_at_one[0], render: signed5, note: `ΔR² total at k = 1 on the younger half of the window, fitted alone, ${reg}` };
      out[`evolvingClockHalfBDeltaR2${key}`] = { get: () => clk().results[reg].halves_delta_r2_total_at_one[1], render: signed5, note: `ΔR² total at k = 1 on the older half of the window, fitted alone, ${reg}` };
      out[`evolvingClockPreferredDeltaP${key}`] = { get: () => clk().results[reg].dp_scan.best_dp_arcsec_per_yr, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), unit: '″/yr', note: `the constant frequency offset on the p-lines the record prefers (k = 0), ${reg}` };
      out[`evolvingClockPreferredP${key}`] = { get: () => clk().results[reg].dp_scan.implied_p_arcsec_per_yr, render: (v) => Number(v).toFixed(2), unit: '″/yr', note: `the precession rate implied by that offset (artifact p + δp), ${reg}` };
      out[`evolvingClockDeltaR2AtPreferredP${key}`] = { get: () => clk().results[reg].dp_scan.best_delta_r2_total, render: signed5, note: `ΔR² total at the preferred δp, k = 0, ${reg}` };
      out[`evolvingClockGainAtPreferredP${key}`] = { get: () => clk().results[reg].dp_scan.clock_gain_at_best_dp, render: signed5, note: `the composed clock's own gain (k = 1) on top of the preferred δp, ${reg}` };
      out[`evolvingClockPreferredDeltaPObliquity${key}`] = { get: () => clk().results[reg].dp_scan_by_family['obliquity'].best_dp_arcsec_per_yr, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), unit: '″/yr', note: `the preferred constant offset on the OBLIQUITY lines alone (the climatic-precession lines at their shipped periods), ${reg}` };
      out[`evolvingClockDeltaR2AtPreferredPObliquity${key}`] = { get: () => clk().results[reg].dp_scan_by_family['obliquity'].best_delta_r2_total, render: signed5, note: `ΔR² total at that obliquity-only offset, ${reg}` };
      out[`evolvingClockPreferredDeltaPPrecession${key}`] = { get: () => clk().results[reg].dp_scan_by_family['climatic precession'].best_dp_arcsec_per_yr, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), unit: '″/yr', note: `the preferred constant offset on the CLIMATIC-PRECESSION lines alone (the obliquity lines at their shipped periods), ${reg}` };
      out[`evolvingClockDeltaR2AtPreferredPPrecession${key}`] = { get: () => clk().results[reg].dp_scan_by_family['climatic precession'].best_delta_r2_total, render: signed5, note: `ΔR² total at that precession-only offset, ${reg}` };
    }
    out.evolvingClockArtifactPArcsecPerYr = { get: () => clk().p_artifact_arcsec_per_yr, render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the general precession in longitude the climatic-precession lines were derived with (data/l1-physical-lines.json config.pArcsecPerYr)' };
    out.evolvingClockArtifactPInertialArcsecPerYr = { get: () => clk().p_inertial_artifact_arcsec_per_yr, render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the rate the obliquity lines were derived with (data/l1-physical-lines.json config.pObliquityArcsecPerYr): v23.0 the realized pole rate over the LR04 window — the spin axis\'s inertial rate of date with its of-date factors, averaged; v22.0 took the J2000 instant (50.385)' };
    // The two J2000 precession rates of the model surface — ONE home for the line derivation's inputs
    out.spinAxisInertialRateArcsecPerYrJ2000 = { get: () => physModel().lunisolar.spinAxisInertialRateArcsecPerYrJ2000, render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the spin axis\'s INERTIAL precession rate at J2000 — the self-anchored rate the hybrid obliquity integrates on (the general precession plus the planetary mean the N-body ecliptic\'s motion carries, +0.097 ≡ IAU\'s planetary precession ψ_A − p_A); the obliquity lines p + sᵢ carry it. La2004\'s precession frequency (50.476) sits 0.09 above it.' };
    out.spinAxisInertialPeriodYearsJ2000 = { get: () => physModel().lunisolar.spinAxisInertialPeriodYearsJ2000, render: (v) => thousands(v, 0), unit: 'yr', note: 'the same as a period' };
    out.spinAxisInertialMinusGeneralArcsecPerYr = { get: () => physModel().lunisolar.spinAxisInertialRateArcsecPerYrJ2000 - physModel().lunisolar.meanRateArcsecPerYrAtYear(2000), render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(3), unit: '″/yr', note: 'the planetary mean: the inertial spin-axis rate minus the general precession in longitude at J2000' };
    out.evolvingClockGainAfterPreferredPMax = { get: () => clk().verdict.max_clock_gain_after_preferred_dp, render: signed5, note: 'largest gain of the composed clock (k = 1) on top of the preferred δp over all windows' };
    out.evolvingClockPreferredDeltaPMinLr04 = { get: () => clk().verdict.preferred_dp_lr04_min, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), unit: '″/yr', note: 'smallest preferred δp over the four LR04 windows' };
    out.evolvingClockPreferredDeltaPMaxLr04 = { get: () => clk().verdict.preferred_dp_lr04_max, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), unit: '″/yr', note: 'largest preferred δp over the four LR04 windows' };
    // Fit-methodology diagnostics on the shipped lines (scripts/fit_methodology_diagnostics.py, doc 92 §9.5)
    const fdg = () => rd('data/fit-methodology-diagnostics.json');
    const g3 = (v) => Number(v).toPrecision(3);
    const f3s = (v) => Number(v).toFixed(3);
    out.fitDiagLineCount = { get: () => fdg().metadata.n_lines, render: (v) => String(v), note: 'shipped L1 lines in the design matrix' };
    for (const [key, reg] of [['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg'], ['Lr04Full', 'lr04-full']]) {
      out[`fitDiagCond${key}`] = { get: () => fdg().regimes[reg].conditioning.condition_number, render: g3, note: `condition number of the centred L1 design matrix, ${reg}` };
      out[`fitDiagMaxVif${key}`] = { get: () => fdg().regimes[reg].vif.max_vif, render: g3, note: `largest variance inflation factor among the L1 columns, ${reg}` };
      out[`fitDiagUnresolvedGroups${key}`] = { get: () => fdg().regimes[reg].rayleigh.n_unresolved_groups, render: (v) => String(v), note: `groups of lines closer than one Rayleigh element (1/T) of the window, ${reg}` };
      out[`fitDiagUnresolvedLines${key}`] = { get: () => fdg().regimes[reg].rayleigh.n_lines_in_unresolved_groups, render: (v) => String(v), note: `lines inside those groups, ${reg}` };
      out[`fitDiagOlsR2${key}`] = { get: () => fdg().regimes[reg].ols.r2_l1, render: (v) => Number(v).toFixed(4), note: `L1-layer R² of plain OLS on normalized data, ${reg}` };
      out[`fitDiagRidgeR2${key}`] = { get: () => fdg().regimes[reg].ridge_shipped.r2_l1, render: (v) => Number(v).toFixed(4), note: `L1-layer R² of the shipped ridge (λ = L1_RIDGE_LAMBDA), ${reg}` };
      out[`fitDiagOlsMaxAmp${key}`] = { get: () => fdg().regimes[reg].ols.max_amp, render: f3s, note: `largest L1 amplitude under OLS (normalized units), ${reg}` };
      out[`fitDiagRidgeMaxAmp${key}`] = { get: () => fdg().regimes[reg].ridge_shipped.max_amp, render: f3s, note: `largest L1 amplitude under the shipped ridge (normalized units), ${reg}` };
      out[`fitDiagForwardGrowth${key}`] = { get: () => fdg().regimes[reg].shipped_fit_forward_growth.growth_ratio_total_ptp, render: (v) => Number(v).toFixed(2), unit: '×', note: `shipped fit (L1 ridge + L3): forward-grid ptp over in-sample ptp, ${reg}` };
    }
    const lad = () => fdg().ladder_post_mpt;
    const ladRow = (lambda) => lad().rows.find((r) => r.lambda === lambda && !r.kept_lines);
    out.fitDiagLadderOlsForwardMin = { get: () => ladRow(0).forward_min, render: (v) => Number(v).toFixed(2), note: 'post-MPT OLS L1 layer, forward-grid minimum (normalized units)' };
    out.fitDiagLadderOlsForwardMax = { get: () => ladRow(0).forward_max, render: (v) => Number(v).toFixed(2), note: 'post-MPT OLS L1 layer, forward-grid maximum' };
    out.fitDiagLadderOlsForwardPtp = { get: () => ladRow(0).forward_ptp, render: (v) => Number(v).toFixed(2), note: 'post-MPT OLS L1 layer, forward-grid peak-to-peak' };
    out.fitDiagLadderOlsInSamplePtp = { get: () => ladRow(0).in_sample_ptp, render: (v) => Number(v).toFixed(2), note: 'post-MPT OLS L1 layer, in-sample peak-to-peak' };
    out.fitDiagLadderRidgeForwardMin = { get: () => ladRow(1).forward_min, render: (v) => Number(v).toFixed(2), note: 'post-MPT ridge λ = 1 L1 layer, forward-grid minimum' };
    out.fitDiagLadderRidgeForwardMax = { get: () => ladRow(1).forward_max, render: (v) => Number(v).toFixed(2), note: 'post-MPT ridge λ = 1 L1 layer, forward-grid maximum' };
    out.fitDiagLadderRidgeForwardPtp = { get: () => ladRow(1).forward_ptp, render: (v) => Number(v).toFixed(2), note: 'post-MPT ridge λ = 1 L1 layer, forward-grid peak-to-peak' };
    out.fitDiagLadderRidgeMinusOlsR2 = { get: () => lad().ridge_minus_ols_r2, render: sdr, note: 'post-MPT L1-layer R², ridge λ = 1 minus OLS' };
    out.fitDiagLadderOlsOverRidgeMaxAmp = { get: () => lad().ols_over_ridge_max_amp, render: (v) => Number(v).toFixed(1), unit: '×', note: 'post-MPT largest L1 amplitude, OLS over ridge λ = 1' };
    out.fitDiagLadderThinnedLines = { get: () => lad().rows.find((r) => r.kept_lines).n_lines, render: (v) => String(v), note: 'lines kept by the Rayleigh-spacing thin, post-MPT' };
    out.fitDiagLadderThinnedMinusRidgeR2 = { get: () => lad().thinned_minus_ridge_r2, render: sdr, note: 'post-MPT L1-layer R², Rayleigh-thinned OLS minus ridge λ = 1' };
    out.evolvingClockMaxDeltaR2Total = { get: () => clk().verdict.max_delta_r2_total, render: signed5, note: 'largest total ΔR² of the clock-of-date fit over all windows' };
    out.evolvingClockMaterialThreshold = { get: () => clk().verdict.material_threshold, render: (v) => String(v), note: 'the pre-stated ΔR² a clock-of-date gain must exceed to count as material' };
    for (const [key, reg] of [['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg'], ['Lr04Full', 'lr04-full']]) {
      out[`insolExtInsolOnlyR2${key}`] = { get: () => ext().regime_results._insol_only_r2[reg], render: (v) => Number(v).toFixed(4), note: `R² of the four classical insolation features ALONE (no L1/L2/L3), regime ${reg}` };
      out[`insolExtR2L1${key}`] = { get: () => ext().regime_results[reg].r2_l1, render: (v) => Number(v).toFixed(3), note: `R² of L1 alone, regime ${reg}` };
      out[`insolExtL1OverInsol${key}`] = { get: () => ext().regime_results[reg].r2_l1 / ext().regime_results._insol_only_r2[reg], render: (v) => `${Math.round(Number(v))}×`, note: `R²(L1) / R²(insolation alone), regime ${reg}` };
    }
    for (const [key, blk] of [['Lr04', 'lr04_insol_only'], ['Epica', 'epica_insol_only']]) {
      out[`insolLaskarModelOnlyR2${key}`] = { get: () => las()[blk].model_only_r2, render: (v) => Number(v).toFixed(3), note: `0–500 kyr ${key}: R² of the MODEL insolation features alone (no L1/L2/L3)` };
      out[`insolLaskarLaskarOnlyR2${key}`] = { get: () => las()[blk].laskar_only_r2, render: (v) => Number(v).toFixed(3), note: `0–500 kyr ${key}: R² of the La2010a insolation features alone` };
      out[`insolLaskarOnlyGainPct${key}`] = { get: () => (las()[blk].laskar_only_r2 / las()[blk].model_only_r2 - 1) * 100, render: (v) => `${Math.round(Number(v))}%`, note: `0–500 kyr ${key}: how much more variance La2010a's features alone explain than the model's` };
    }
    for (const [key, blk] of [['Lr04', 'lr04_three_way'], ['Epica', 'epica_three_way']]) {
      out[`insolLaskarV0R2${key}`] = { get: () => las()[blk].r2_l1_l2_l3, render: (v) => Number(v).toFixed(4), note: `0–500 kyr ${key}: R² of L1+L2+L3 only` };
      out[`insolLaskarV1R2${key}`] = { get: () => las()[blk].v1_model_r2, render: (v) => Number(v).toFixed(4), note: `0–500 kyr ${key}: R² with MODEL insolation features` };
      out[`insolLaskarV2R2${key}`] = { get: () => las()[blk].v2_laskar_r2, render: (v) => Number(v).toFixed(4), note: `0–500 kyr ${key}: R² with La2010a insolation features` };
    }
    return out;
  })(),

  earthSunOffsetKm: {
    get: () => Math.round(astro.earthOrbital.earthEccentricityJ2000 * astro.physicalConstants.currentAUDistance),
    render: (v) => thousands(v),
    unit: 'km',
    note: 'a × e — the wobble-center offset',
  },
  earthPerihelionDistanceKm: {
    get: () => Math.round(astro.physicalConstants.currentAUDistance * (1 - astro.earthOrbital.earthEccentricityJ2000)),
    render: (v) => thousands(v),
    unit: 'km',
  },
  earthAphelionDistanceKm: {
    get: () => Math.round(astro.physicalConstants.currentAUDistance * (1 + astro.earthOrbital.earthEccentricityJ2000)),
    render: (v) => thousands(v),
    unit: 'km',
  },
  earthApsidalDifferenceKm: {
    get: () => Math.round(2 * astro.earthOrbital.earthEccentricityJ2000 * astro.physicalConstants.currentAUDistance),
    render: (v) => thousands(v),
    unit: 'km',
  },
  earthPeriApoFluxRatioPct: {
    get: () => {
      const e = astro.earthOrbital.earthEccentricityJ2000;
      return ((1 + e) / (1 - e)) ** 2 * 100 - 100;
    },
    render: (v) => Number(v).toFixed(1),
    unit: '%',
  },
  // The insolation extremes ride the published e's range over the last Myr —
  // the N-body series.
  earthInsolationIncreaseMaxPct: {
    get: () => {
      const e = seriesERange().hi;
      return (1 / Math.sqrt(1 - e * e) - 1) * 100;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '%',
    note: 'orbit-averaged flux excess over circular at the series’ maximum e over the last Myr',
  },
  earthInsolationIncreaseMinPct: {
    get: () => {
      const e = seriesERange().lo;
      return (1 / Math.sqrt(1 - e * e) - 1) * 100;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '%',
    note: 'orbit-averaged flux excess over circular at the series’ minimum e over the last Myr',
  },
  earthInsolationDifferencePct: {
    get: () => {
      const hi = seriesERange().hi;
      const lo = seriesERange().lo;
      return ((1 / Math.sqrt(1 - hi * hi)) - (1 / Math.sqrt(1 - lo * lo))) * 100;
    },
    render: (v) => Number(v).toFixed(3),
    unit: '%',
  },

  // ── Per-planet eccentricities ───────────────────────────────────────────
  // What is published here is the OBSERVATION: orbitalEccentricityJ2000, the
  // JPL value each planet's chain is anchored on.
  ...Object.fromEntries(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
    .map((p) => [`${p}EccJ2000`, {
      get: () => C.planets[p].orbitalEccentricityJ2000,
      render: (v) => Number(v).toFixed(5),
      note: 'JPL observed',
    }])),

  // ── Per-planet inclinations and ascending nodes ─────────────────────────
  // InclEcl: the J2000 ecliptic inclination (composed constants).
  // OmegaSS: Souami & Souchay (2012) Table 2 invariable-plane nodes — the
  //   website TYPES these as literals; we derive them from astro-reference's
  //   ascendingNodesSouamiSouchay block (same digits, one source).
  // OmegaDelta: the CHAIN's invariable-plane node of date at J2000, expressed
  //   in the S&S longitude origin via the DERIVED conversion (the K5c
  //   node-origin derivation; inv-plane-frame.cjs), minus the S&S reference —
  //   the honest delta from the path that ships. Residual is element class
  //   (chain elements-of-date vs S&S mean elements), scaling as 1/sin(i_inv).
  ...(() => {
    let chainCache = null;
    const chainNodeSS = (p) => {
      if (!chainCache) {
        const KC = require(join(ROOT, 'packages', 'physics', 'src', 'planets', 'keplerian-chain.cjs'));
        const IPF = require(join(ROOT, 'packages', 'physics', 'src', 'planets', 'inv-plane-frame.cjs'));
        const ART = require(join(ROOT, 'packages', 'physics', 'src', 'planets', 'chain-artifact.js')).CHAIN_ARTIFACT;
        const chains = KC.buildPlanetChainsFromArtifactData(ART);
        const origin = IPF.computeEquatorNodeOriginSFrameDeg(ART.invariablePlane, astro.earthOrbital.obliquityJ2000_deg);
        chainCache = { KC, chains, origin };
      }
      const s = chainCache.KC.computePlanetElementsAtYear(2000, chainCache.chains[p], chainCache.chains).ascNodeInvPlaneDeg;
      return (((s - chainCache.origin) % 360) + 360) % 360;
    };
    // The spherical-triangle identity cos i_ecl = cos i_P cos i_E + sin i_P sin i_E cos(Ω_P − Ω_E)
    // — the closed-form node calibration (tools/explore/analytical-ascending-nodes.js) run
    // forward. Three node sets are closed against JPL's J2000 ecliptic inclination: S&S 2012
    // as published, the closed-form VERIFIED node (astro-reference planetOrbitalElements
    // .ascendingNodeInvPlaneClosedForm, solved to close this identity — a reference
    // derivation), and the chain's own
    // J2000 (i, Ω) pairs on the banked plane, Earth's included (the origin cancels in ΔΩ).
    const D = Math.PI / 180;
    const iEclDeg = (ip, Wp, ie, We) => Math.acos(Math.cos(ip * D) * Math.cos(ie * D) + Math.sin(ip * D) * Math.sin(ie * D) * Math.cos((Wp - We) * D)) / D;
    const closureArcsec = (p, omegaDeg) => (iEclDeg(astro.planetOrbitalElements[p].invPlaneInclinationJ2000, omegaDeg,
      astro.earthOrbital.earthInclinationJ2000_deg, astro.earthOrbital.earthAscendingNodeInvPlane)
      - astro.planetOrbitalElements[p].eclipticInclinationJ2000) * 3600;
    const chainEl = (p) => { chainNodeSS(p === 'earth' ? 'mercury' : p); return chainCache.KC.computePlanetElementsAtYear(2000, chainCache.chains[p], chainCache.chains); };
    return Object.fromEntries(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
      .flatMap((p) => [
        [`${p}InclEcl`, {
          get: () => C.planets[p].eclipticInclinationJ2000,
          render: (v) => Number(v).toFixed(3),
          unit: '°',
        }],
        [`${p}OmegaSS`, {
          get: () => astro.ascendingNodesSouamiSouchay[p],
          render: (v) => Number(v).toFixed(2),
          unit: '°',
          note: 'Souami & Souchay 2012, external reference',
        }],
        [`${p}OmegaDelta`, {
          get: () => {
            const d = chainNodeSS(p) - astro.ascendingNodesSouamiSouchay[p];
            return ((d + 540) % 360) - 180;
          },
          render: (v) => fmtSignedPct(v, 2),
          unit: '°',
          note: 'chain node (S&S convention, derived conversion) minus S&S 2012 — element class (of-date vs mean elements)',
        }],
        [`${p}OmegaVerified`, {
          get: () => astro.planetOrbitalElements[p].ascendingNodeInvPlaneClosedForm,
          render: (v) => Number(v).toFixed(2),
          unit: '°',
          note: 'closed-form J2000 node: Ω solved from the spherical triangle (JPL J2000 ecliptic inclination, S&S invariable-plane inclination, Earth’s S&S inclination and node) — astro-reference ascendingNodeInvPlaneClosedForm; S&S origin',
        }],
        [`${p}EclInclSSClosureArcsec`, {
          get: () => closureArcsec(p, astro.ascendingNodesSouamiSouchay[p]),
          render: (v) => fmtSignedPct(v, 1),
          unit: '″',
          note: 'ecliptic inclination from the spherical triangle on the S&S 2012 node, minus JPL J2000 (arcsec)',
        }],
        [`${p}EclInclVerifiedClosureArcsec`, {
          get: () => closureArcsec(p, astro.planetOrbitalElements[p].ascendingNodeInvPlaneClosedForm),
          render: (v) => fmtSignedPct(v, 1),
          unit: '″',
          note: 'ecliptic inclination from the spherical triangle on the closed-form verified node, minus JPL J2000 (arcsec; zero by construction up to the stored node’s 2-dp rounding)',
        }],
        [`${p}EclInclChainClosureArcsec`, {
          get: () => {
            const e = chainEl(p), E = chainEl('earth');
            return (iEclDeg(e.inclInvPlaneDeg, e.ascNodeInvPlaneDeg, E.inclInvPlaneDeg, E.ascNodeInvPlaneDeg) - astro.planetOrbitalElements[p].eclipticInclinationJ2000) * 3600;
          },
          render: (v) => fmtSignedPct(v, 1),
          unit: '″',
          note: 'the same identity on the chain’s own J2000 (i, Ω) pairs — planet and Earth on the banked invariable plane — minus JPL J2000 (arcsec): the chain’s J2000 ecliptic inclination against the catalog',
        }],
      ]));
  })(),

  // ── Obliquity family ────────────────────────────────────────────────────
  // Min/max are the envelope of the PUBLISHED obliquity — the hybrid — over
  // the last million years (100-yr samples; the La2004 comparison window,
  // doc 109 §18).
  ...(() => {
    const envelope = () => {
      let min = Infinity, max = -Infinity;
      for (let y = -1_000_000; y <= 2000; y += 100) {
        const obliq = oneEps(y);
        if (obliq < min) min = obliq;
        if (obliq > max) max = obliq;
      }
      return { min, max };
    };
    let cached;
    const env = () => (cached ??= envelope());
    return {
      obliquityMin: { get: () => env().min, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityMax: { get: () => env().max, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityMinRound: { get: () => env().min, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityMaxRound: { get: () => env().max, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityRangeInline: {
        // get() must return a number for resolveAll's sanity guard; render
        // reads both extrema from the cached envelope directly.
        get: () => env().min,
        render: () => `~${env().min.toFixed(2)}° – ~${env().max.toFixed(2)}°`,
      },
    };
  })(),

  // ── Cycle timing (phase-dependent scans) ────────────────────────────────
  // These ask WHEN, not how much — extremum searches over the runtime
  // evaluators: the hybrid obliquity and the one-source inclination — the two
  // published quantities (the one-source route puts the last inclination
  // maximum where the engine's Earth-orbit normal does).
  ...(() => {
    let obliqScan;
    const nextObliqMin = () => {
      if (!obliqScan) {
        const f = oneEps;   // the published obliquity (the hybrid), plan 06 Phase 3 S3b
        let mn = Infinity, mnYr = 0;
        for (let y = 2000; y <= 35000; y++) {
          const o = f(y);
          if (o < mn) { mn = o; mnYr = y; }
        }
        obliqScan = { mn, mnYr };
      }
      return obliqScan;
    };
    return {
      obliquityNextMin: { get: () => nextObliqMin().mn, render: (v) => Number(v).toFixed(2), unit: '°' },
      obliquityNextMinYear: { get: () => nextObliqMin().mnYr, render: (v) => thousands(v) },
    };
  })(),
  // ── Precession family (11-2m) — the scan keys ───────────────────────────
  // The scans ride the ONE published family (the one-family route — the beats
  // of its own years, SI seconds). Porting these surfaced the fourth WEBSITE
  // defect: its forecast scan used the cardinal-mean solar year +
  // snapshot-phase sidereal Fourier and read 25,314 @ 12,411 where the
  // simulator computes 25,312 @ 12,440 (site routes corrected in
  // dayYear.ts/precession.ts, snapshot regenerated). The full-cycle envelope
  // and J2000 rates were robust to the route difference; only the ±35 kyr
  // forecast extrema moved.
  ...(() => {
    // The published family is the one-family route — the beats of ITS years
    // (the scans stay inside ±2 Myr, the published window).
    const precAt = (y) => {
      const Y = oneYL();
      return { a: Y.axialPrecessionYearsAtYear(y), p: Y.perihelionPrecessionYearsAtYear(y), i: Y.inclinationPrecessionYearsAtYear(y) };
    };
    let forecast = null, cycle = null;
    const axialForecast = () => {
      if (!forecast) {
        let mn = Infinity, mnYr = 0, mx = -Infinity, mxYr = 0;
        for (let y = 2000; y <= 35000; y++) {
          const a = precAt(y).a;
          if (a < mn) { mn = a; mnYr = y; }
          if (a > mx) { mx = a; mxYr = y; }
        }
        forecast = { mn, mnYr, mx, mxYr };
      }
      return forecast;
    };
    const cycleScan = () => {
      if (!cycle) {
        let aMn = Infinity, aMx = -Infinity, pMn = Infinity, pMx = -Infinity, iMn = Infinity, iMx = -Infinity;
        // one apsidal circulation of Earth's orbit from J2000 — the span of the
        // of-date factors' dominant modulation
        const span = Math.round(oneYL().inclinationPrecessionYearsAtYear(2000));
        for (let y = 2000; y <= 2000 + span; y++) {
          const r = precAt(y);
          if (r.a < aMn) aMn = r.a;
          if (r.a > aMx) aMx = r.a;
          if (r.p < pMn) pMn = r.p;
          if (r.p > pMx) pMx = r.p;
          if (r.i < iMn) iMn = r.i;
          if (r.i > iMx) iMx = r.i;
        }
        cycle = { aMn, aMx, pMn, pMx, iMn, iMx };
      }
      return cycle;
    };
    const wholeYears = (v) => thousands(Math.round(v));
    return {
      axialPrecMinPeriod: { get: () => axialForecast().mn, render: wholeYears, unit: 'yr', note: 'next forecast minimum of the axial precession period (scan 2000..+35000)' },
      axialPrecMinYear:   { get: () => axialForecast().mnYr, render: (v) => thousands(v) },
      axialPrecMaxPeriod: { get: () => axialForecast().mx, render: wholeYears, unit: 'yr' },
      axialPrecMaxYear:   { get: () => axialForecast().mxYr, render: (v) => thousands(v) },
      axialPrecCycleMin:  { get: () => cycleScan().aMn, render: wholeYears, unit: 'yr', note: 'axial precession period extrema over one apsidal circulation from J2000' },
      axialPrecCycleMax:  { get: () => cycleScan().aMx, render: wholeYears, unit: 'yr' },
      periPrecCycleMin:   { get: () => cycleScan().pMn, render: wholeYears, unit: 'yr' },
      periPrecCycleMax:   { get: () => cycleScan().pMx, render: wholeYears, unit: 'yr' },
      axialPrecJ2000:     { get: () => precAt(2000).a, render: wholeYears, unit: 'yr', note: 'instantaneous J2000 axial precession period — the one-family route, the published family' },
      periPrecJ2000:      { get: () => precAt(2000).p, render: wholeYears, unit: 'yr' },
    };
  })(),

  // ── Obliquity reference tables (11-2n) — Model vs La2004 vs Chapront ────
  // Model values from the engine's computeObliquityEarth; La2004 values
  // DERIVED from the tracked artifact public/input/la2004-orbital-solution
  // .json (1-kyr grid, years-from-J2000 axis, linear interpolation at the
  // three off-grid epochs) — the website typed all twelve as literals citing
  // exactly that file; Chapront (2002) citation values from astro-reference's
  // obliquityChapront2002 block (the 11-2i Souami pattern: citations live in
  // the tracked reference JSON, one source).
  ...(() => {
    const laskarObliquityDeg = (calYear) => {
      const rows = new Map(rd('public/input/la2004-orbital-solution.json').data
        .map((r) => [r.year, r.obliquity]));
      const t = calYear - 2000;
      if (rows.has(t)) return rows.get(t);
      const lo = Math.floor(t / 1000) * 1000;
      const hi = lo + 1000;
      if (!rows.has(lo) || !rows.has(hi)) {
        throw new Error(`model-values: La2004 grid has no bracket for calendar year ${calYear}`);
      }
      return rows.get(lo) + ((t - lo) / 1000) * (rows.get(hi) - rows.get(lo));
    };
    const oeOb = (y) => oneEps(y);   // the published obliquity (the hybrid), plan 06 Phase 3 S3b
    const refs = [
      { year: -10000, key: '10000BC', chapront: 'deg10000BC' },
      { year: -9233,  key: '9233BC' },
      { year: -1000,  key: '1000BC' },
      { year: 2000,   key: '2000AD' },
      { year: 2050,   key: '2050AD' },
      { year: 3000,   key: '3000AD' },
      { year: 5000,   key: '5000AD' },
      { year: 7000,   key: '7000AD' },
      { year: 10000,  key: '10000AD', chapront: 'deg10000AD' },
      { year: 11725,  key: '11725AD' },
      { year: 12000,  key: '12000AD' },
      { year: 20000,  key: '20000AD' },
    ];
    const out = {};
    for (const r of refs) {
      out[`obliqModel${r.key}`] = {
        get: () => oeOb(r.year),
        render: (v) => Number(v).toFixed(4),
        unit: '°',
      };
      out[`obliqLaskar${r.key}`] = {
        get: () => laskarObliquityDeg(r.year),
        render: (v) => Number(v).toFixed(4),
        unit: '°',
        note: 'La2004 obliquity from the tracked artifact (interpolated where off-grid)',
      };
      if (r.chapront) {
        out[`obliqChapront${r.key}`] = {
          get: () => astro.obliquityChapront2002[r.chapront],
          render: (v) => Number(v).toFixed(4),
          unit: '°',
          note: 'Chapront, Chapront-Touze & Francou (2002) citation value',
        };
      }
    }
    out.obliquityCurrent = {
      get: () => oeOb(2000),
      render: (v) => Number(v).toFixed(4),
      unit: '°',
    };
    return out;
  })(),

  // Next turning points of the millennial LOD cycle — sign-change scan of the
  // 4-flag + swing δLOD sum, mirroring the website's forward scan (descending
  // phase at J2000, so trough first, then peak).
  ...(() => {
    let turns = null;
    const stackTurns = () => {
      if (!turns) {
        let prev = dtl().dtCycleLodCorrectionSum(2000);
        let prevSign = 0, trough = 0, peak = 0;
        for (let y = 2001; y <= 6000 && (trough === 0 || peak === 0); y++) {
          const v = dtl().dtCycleLodCorrectionSum(y);
          const s = Math.sign(v - prev);
          if (prevSign !== 0 && s !== 0 && s !== prevSign) {
            if (prevSign < 0 && trough === 0) trough = y - 1;
            else if (prevSign > 0 && trough !== 0 && peak === 0) peak = y - 1;
          }
          if (s !== 0) prevSign = s;
          prev = v;
        }
        turns = { trough, peak };
      }
      return turns;
    };
    return {
      stackNextTroughYear: { get: () => stackTurns().trough, render: (v) => thousands(v) },
      stackNextPeakYear:   { get: () => stackTurns().peak, render: (v) => thousands(v) },
    };
  })(),

  // ── Earth invariable-plane inclination family (11-2o) ───────────────────
  // The mean, minimum and maximum of Earth's inclination to the invariable
  // plane over the banked ±10-Myr series — the engine's own normal (the API's
  // earth.inclinationDeg); J2000 / node / anchor from astro-reference
  // earthOrbital (the node is the Souami & Souchay value).
  earthInclMean: {
    get: () => chainInclStats('earth').mean,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
    note: 'the mean of Earth\'s inclination to the invariable plane over the banked ±10-Myr series — the engine\'s one-source normal ',
  },
  earthInclMin: {
    get: () => chainInclStats('earth').min,
    render: (v) => Number(v).toFixed(3),
    unit: '°',
    note: 'the minimum of Earth\'s inclination to the invariable plane over the banked ±10-Myr series',
  },
  earthInclMax: {
    get: () => chainInclStats('earth').max,
    render: (v) => Number(v).toFixed(3),
    unit: '°',
    note: 'the maximum of Earth\'s inclination to the invariable plane over the banked ±10-Myr series',
  },
  earthInclJ2000: {
    get: () => astro.earthOrbital.earthInclinationJ2000_deg,
    render: (v) => Number(v).toFixed(5),
    unit: '°',
  },
  earthAscNodeJ2000: {
    get: () => astro.earthOrbital.earthAscendingNodeInvPlane,
    render: (v) => Number(v).toFixed(2),
    unit: '°',
    note: 'Souami & Souchay invariable-plane ascending node',
  },

  // ── Year/day-length family (11-2p) — the unit-trap tier ─────────────────
  // Every quantity pinned to its exact browser twin. MEAN family: the
  // kinematic day basis — meanLengthOfDay, NOT Layer-4 LOD_real. J2000 family:
  // SI seconds, SI days (the one-family route at 2000).
  // stellarDayJ2000 uses OF-DATE obliquity at 2000 — porting it surfaced the
  // fifth website defect: its J2000 constant used the MEAN-ε RA projection,
  // one final digit below the simulator's readout (86,164.098895 vs .098896;
  // fixed website-side, snapshot regenerated).
  ...(() => {
    // the mean sidereal and stellar day — tools/lib/constants.js's exports, the ONE home
    const meanSiderealDaySeconds = () => C.meanSiderealDay;
    const meanStellarDaySeconds = () => C.meanStellarDay;
    return {
      meanSolarYearDays:     { get: () => C.meanSolarYearDays, render: (v) => thousands(v, 7), unit: 'd' },
      meanSolarYearDaysFull: { get: () => C.meanSolarYearDays, render: (v) => thousands(v, 12), unit: 'd', note: 'full-precision form for derivation contexts' },
      // The J2000 year lengths of date are the one-family route — SI seconds, SI days.
      solarYearJ2000Days:    { get: () => oneYL().tropicalYearSecondsAtYear(2000) / 86400, render: (v) => thousands(v, 7), unit: 'd', note: 'the one-family tropical year of date at J2000, SI days (tweakpane predictions.solarYearDays)' },
      solarYearJ2000Seconds: { get: () => oneYL().tropicalYearSecondsAtYear(2000), render: (v) => thousands(v, 2), unit: 's', note: 'tweakpane predictions.solarYearSeconds — the one-family tropical year of date at J2000' },
      meanSiderealYearDays:  { get: () => C.meanSiderealYearDays, render: (v) => thousands(v, 7), unit: 'd', note: 'the IAU sidereal year in days' },
      meanSiderealYearDaysFull: { get: () => C.meanSiderealYearDays, render: (v) => v.toFixed(9), unit: 'd', note: '9-dp render of meanSiderealYearDays' },
      siderealYearSeconds:   { get: () => C.meanSiderealYearSeconds, render: (v) => thousands(v, 2), unit: 's', note: 'IAU sidereal year in SI seconds (31,558,149.7635)' },
      siderealYearJ2000Days: { get: () => oneYL().siderealYearSecondsAtYear(2000) / 86400, render: (v) => thousands(v, 8), unit: 'd', note: 'the one-family sidereal year of date at J2000 (the λ̇ channel), SI days' },
      anomalisticYearDays:   { get: () => oneYL().anomalisticYearSecondsAtYear(2000) / 86400, render: (v) => thousands(v, 7), unit: 'd' },
      anomalisticYearDaysFull: { get: () => oneYL().anomalisticYearSecondsAtYear(2000) / 86400, render: (v) => v.toFixed(9), unit: 'd', note: '9-dp render of the J2000 anomalistic year — the one-family law of date at 2000' },
      anomalisticYearSeconds: { get: () => oneYL().anomalisticYearSecondsAtYear(2000), render: (v) => thousands(v, 2), unit: 's', note: 'the J2000 anomalistic year, SI seconds — the law of date at 2000' },
      anomalisticYearSimon1994Days: { get: () => astro.knownValues.simon1994AnomalisticYearDays, render: (v) => String(v), unit: 'days', note: 'Simon et al. 1994 MEAN element — a citation (apsidal rate 11.6124 ″/yr); the model derives its own' },
      anomalisticYearSimon1994DeltaSeconds: { get: () => oneYL().anomalisticYearSecondsAtYear(2000) - astro.knownValues.simon1994AnomalisticYearDays * 86400, render: (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(3), unit: 's', note: 'model (the series\' secular apsidal tangent) − Simon (mean element): the secular-vs-mean-element convention, 0.0031 ″/yr of apsidal rate' },
      anomalisticYearJ2000Days: { get: () => oneYL().anomalisticYearSecondsAtYear(2000) / 86400, render: (v) => thousands(v, 7), unit: 'd', note: 'the one-family anomalistic year of date at J2000 (the movement’s own apsidal line — the scene’s perihelion), SI days' },
      anomalisticYearJ2000Seconds: { get: () => oneYL().anomalisticYearSecondsAtYear(2000), render: (v) => thousands(v, 2), unit: 's' },
      siderealSolarDiffSeconds: {
        get: () => oneYL().siderealYearSecondsAtYear(2000) - oneYL().tropicalYearSecondsAtYear(2000),
        render: (v) => thousands(v, 1),
        unit: 's',
        note: 'sidereal − tropical year at J2000, the one-family route, SI seconds',
      },
      siderealSolarMeanDiffSeconds: {
        get: () => (C.meanSiderealYearDays - C.meanSolarYearDays) * C.meanLengthOfDay,
        render: (v) => thousands(v, 2),
        unit: 's',
      },
      meanSolarDaySeconds:    { get: () => C.meanLengthOfDay, render: (v) => thousands(v, 6), unit: 's', note: 'LOD_mean, the kinematic day' },
      meanSiderealDaySeconds: { get: meanSiderealDaySeconds, render: (v) => thousands(v, 7), unit: 's' },
      meanStellarDaySeconds:  { get: meanStellarDaySeconds, render: (v) => thousands(v, 7), unit: 's' },
      stellarSiderealDayDiffMs: {
        get: () => (meanStellarDaySeconds() - meanSiderealDaySeconds()) * 1000,
        render: (v) => thousands(v, 2),
        unit: 'ms',
        note: 'the RA-projected (m = p·cos ε) offset — compare IAU 8.373 ms',
      },
      axialCoinRotationMs: {
        get: () => (meanSiderealDaySeconds() / dtl().certifiedAxialPrecessionJ2000Years()) / (C.meanSolarYearDays + 1) * 1000,
        render: (v) => thousands(v, 2),
        unit: 'ms',
        note: 'UNPROJECTED ecliptic-frame count — one extra sidereal day per precession period T_p (the certified J2000 reading) — deliberately not the 8.37 ms projected offset',
      },
      // The two days on the model's PHYSICAL day of J2000 — LOD_real, the
      // tweakpane Solar Day row's day — which the simulator's Days & Years rows
      // and its Framework Verification panel read since 2026-10-03. The
      // published bases are two (owner, 2026-10-09): the SI day of exactly
      // 86,400 s (the IAU inputs siderealDayInputSeconds / stellarDayInputSeconds)
      // and LOD_real (these); the stellar day's RA projection reads the
      // published hybrid ε of date.
      siderealDayJ2000Physical: {
        get: () => {
          const sol = dtl().tropicalYearDaysOfDate(2000);   // plan 09: the one-family tropical year over the kinematic day of date
          return (sol * dtl().computeLodRealSecondsAtEpoch(2000)) / (sol + 1);
        },
        render: (v) => thousands(v, 6),
        unit: 's',
        note: 'sidereal day on LOD_real of J2000 — the simulator readout basis (solar day of date × Y/(Y + 1))',
      },
      stellarDayJ2000Physical: {
        get: () => {
          const sol = dtl().tropicalYearDaysOfDate(2000);
          const d = (sol * dtl().computeLodRealSecondsAtEpoch(2000)) / (sol + 1);
          const raProj = Math.cos((oneEps(2000) * Math.PI) / 180);
          return (d / dtl().certifiedAxialPrecessionJ2000Years()) / (sol + 1) * raProj + d;
        },
        render: (v) => thousands(v, 6),
        unit: 's',
        note: 'stellar day on LOD_real of J2000 — the simulator readout basis (sidereal × (1 + cos ε/(T_p·(Y + 1))), of-date ε)',
      },
      lodRealJ2000ExcessMs: {
        get: () => (dtl().computeLodRealSecondsAtEpoch(2000) - 86400) * 1000,
        render: (v) => Number(v).toFixed(2),
        unit: 'ms',
        note: 'LOD_real of J2000 minus the SI day of 86,400 s — the split between the IAU day constants and the simulator\'s sidereal/stellar day readouts',
      },
    };
  })(),

  // ── dLOD/dt decomposition + J2000 day identities (11-2q) ────────────────
  // The channels come LIVE from the engine's dLodDtDecompositionAtAge at
  // t_Ma = −5e-7 (model epoch 2000.5 — the convention the website's DLOD_*
  // keys are defined on), so the registry carries the derivation itself
  // rather than synced literals. Nets are the engine's own net_L2/L3/L4, not sums of
  // rounded channels — verified to render identically. solarDayJ2000 is the
  // SI day definition (86400 exactly), NOT lodRealPhysical.
  ...(() => {
    let dlod = null;
    const dl = () => { if (!dlod) dlod = dtl().dLodDtDecompositionAtAge(-5e-7); return dlod; };
    const signed2 = (v) => fmtSignedPct(v, 2);
    return {
      dLodDtTidalJ2000:      { get: () => dl().tidal, render: signed2, unit: 'ms/cy', note: 'Moon-recession tidal baseline (Farhat 2022 / LLR α₁)' },
      dLodDtGiaJ2000:        { get: () => dl().gia, render: signed2, unit: 'ms/cy', note: 'GIA channel (L1-orbital α(t))' },
      dLodDtAllCyclesJ2000:  { get: () => dl().stack, render: signed2, unit: 'ms/cy', note: 'Σ d/dt of the 4-flag stack' },
      dLodDtResonatorJ2000:  { get: () => dl().resonator, render: signed2, unit: 'ms/cy', note: 'Core-mantle swing (analytic rate)' },
      dLodDtNetSecularJ2000: { get: () => dl().net_L2, render: signed2, unit: 'ms/cy', note: 'tidal + GIA ≈ IERS +1.75' },
      dLodDtNetL3J2000:      { get: () => dl().net_L3, render: signed2, unit: 'ms/cy' },
      dLodDtNetFullJ2000:    { get: () => dl().net_L4, render: signed2, unit: 'ms/cy', note: 'the shipped Layer-4 observable rate' },
      iersObservedDLodDt: {
        get: () => astro.knownValues.iersObservedDLodDtMsPerCy,
        render: signed2,
        unit: 'ms/cy',
        note: 'IERS observed secular LOD rate — citation, the model comparator',
      },
      solarDayJ2000: {
        get: () => 86400,
        render: (v) => thousands(v, 6),
        unit: 's',
        note: 'the SI day definition — NOT lodRealPhysical (Layer-4 actual LOD)',
      },
      eclipticSiderealDayJ2000: {
        get: () => {
          const sol = dtl().tropicalYearDaysOfDate(2000);
          const sidDay = (sol * dtl().computeLodKinematicSecondsAtEpoch(2000)) / (sol + 1);
          const meanSidDay = (C.meanSolarYearDays / (C.meanSolarYearDays + 1)) * C.meanLengthOfDay;
          const axialCoinMs = (meanSidDay / dtl().certifiedAxialPrecessionJ2000Years()) / (C.meanSolarYearDays + 1) * 1000;
          return sidDay + axialCoinMs / 1000;
        },
        render: (v) => thousands(v, 6),
        unit: 's',
        note: 'sidereal day + the UNPROJECTED per-day precession (ecliptic-longitude counterpart of the stellar day)',
      },
      stackOvershootMs: {
        get: () => ((dtl().computeLodKinematicSecondsAtEpoch(2000) + dtl().h5Correction(2000))
                    - dtl().computeLodRealSecondsAtEpoch(2000)) * 1000,
        render: (v) => thousands(v, 2),
        unit: 'ms',
        note: 'the kinematic day + the ecliptic term minus Layer 4 — |stackNetLodJ2000Ms|, kept in lockstep by derivation',
      },
    };
  })(),

  // ── Eclipse audit + LOD-climate (11-2r) ─────────────────────────────────
  // The eclipse and correlation numbers are MEASURED CAMPAIGN RESULTS with
  // no engine derivation; their tracked homes are the two data/ summary
  // JSONs (provenance in each _description — the website typed all of them
  // as literals). The model-vs-NASA gap keys and percentages are DERIVED
  // from the artifact so a re-run flows through.
  ...(() => {
    const ecl = rd('data/eclipse-audit-summary.json');
    const clim = rd('data/lod-climate-correlation-summary.json');
    const L = ecl.lunar, S = ecl.solar;
    // The eclipse Sun's mean-element offset: the window mean of (osculating −
    // secular) EMB ϖ and e from the Horizons J2000 seed integrated as a
    // nine-body system — the generator is tools/verify/earth-osculating-offset.js
    // (derived; no JPL fit).
    const osc = rd('data/earth-osculating-mean-offset.json');
    return {
      // The model's apparent Sun and its cardinal instants against JPL Horizons
      // over ±3000 yr (TT cache; tools/verify/sun-vs-horizons.js).
      ...(() => {
        const svh = rd('data/sun-vs-horizons-summary.json');
        const mil = (from) => svh.sun.perMillennium.find((m) => m.from === from);
        const cmil = (from) => svh.cardinal.perMillennium.find((m) => m.from === from);
        const f1 = (v) => Number(v).toFixed(1).replace('-', '−'), f2 = (v) => Number(v).toFixed(2).replace('-', '−');
        const out = {
          sunVsHorizonsSdArcsec:        { get: () => svh.sun.all.sd, render: f2, unit: '″', note: 'model apparent Sun − Horizons, sd over −3000..+3000 (TT, 219k instants)' },
          sunVsHorizonsMeanArcsec:      { get: () => svh.sun.all.mean, render: f2, unit: '″', note: 'model apparent Sun − Horizons, mean over −3000..+3000' },
          sunVsHorizonsModernSdArcsec:  { get: () => svh.sun.window1970to2049.sd, render: f2, unit: '″', note: '1970–2049 sd on the TT-cache definition (the registry instrument\'s UT-cache figure is frameworkSunVsJplRms)' },
          sunVsHorizonsModernMeanArcsec:{ get: () => svh.sun.window1970to2049.mean, render: f2, unit: '″', note: '1970–2049 mean offset (the L0 anchor + aberration conventions)' },
          cardinalVsHorizonsMeanMin:    { get: () => svh.cardinal.all.mean, render: f2, unit: 'min', note: 'model cardinal instants − Horizons\' own crossings, mean over −3000..+3000 (24k events)' },
          cardinalVsHorizonsSdMin:      { get: () => svh.cardinal.all.sd, render: f2, unit: 'min', note: 'model cardinal instants − Horizons, sd over −3000..+3000' },
          sunVsHorizonsN:               { get: () => svh.sun.all.n, render: (v) => thousands(v), note: 'Horizons TT instants compared (10-day grid, ±3000 yr)' },
          sunVsHorizonsWorstMillenniumMeanArcsec: { get: () => Math.max(...svh.sun.perMillennium.map((m) => Math.abs(m.mean))), render: f1, unit: '″', note: 'the largest per-millennium |mean| of model apparent Sun − Horizons over −3000..+3000 — whichever millennium it is (the difference between two equinoxes of date: the model\'s and Horizons\' IAU76/80 frame)' },
          cardinalVsHorizonsWorstMillenniumMeanMin: { get: () => Math.max(...svh.cardinal.perMillennium.map((m) => Math.abs(m.mean))), render: f1, unit: 'min', note: 'the largest per-millennium |mean| of model cardinal instants − Horizons over −3000..+3000' },
        };
        for (const from of [-3000, -2000, -1000, 0, 1000, 2000]) {
          const tag = from < 0 ? `M${-from}` : `P${from}`;
          out[`sunVsHorizonsMean${tag}Arcsec`] = { get: () => mil(from).mean, render: f1, unit: '″', note: `model apparent Sun − Horizons, mean over the millennium ${from}..${from + 1000}` };
          out[`sunVsHorizonsSd${tag}Arcsec`] = { get: () => mil(from).sd, render: f1, unit: '″', note: `sd over the millennium ${from}..${from + 1000}` };
          out[`cardinalVsHorizonsMean${tag}Min`] = { get: () => cmil(from).mean, render: f2, unit: 'min', note: `model cardinal instants − Horizons, mean over ${from}..${from + 1000}` };
        }
        return out;
      })(),
      // THE PRECESSION OF DATE against its two theory referees
      // (tools/verify/equinox-vs-vondrak.js): the equinox vs Vondrák et al. 2011
      // over ±3000 yr, the obliquity vs La2004 over the last Myr, each beside
      // the secular law alone; and the two factors themselves.
      ...(() => {
        const evv = rd('data/equinox-vs-vondrak.json');
        const row = (y) => evv.equinox.rows.find((r) => r.year === y);
        const win = (a, b) => evv.obliquity.windows.find((w) => w.fromKyr === a && w.toKyr === b);
        const s1 = (v) => (v > 0 ? '+' : '') + Number(v).toFixed(1).replace('-', '−'), f1 = (v) => Number(v).toFixed(1), f2 = (v) => Number(v).toFixed(2);
        const out = {
          equinoxVsVondrakMaxAbsArcsec:        { get: () => evv.equinox.maxAbsArcsec, render: f1, unit: '″', note: 'max |model − Vondrák 2011| of the equinox of date over ±3000 yr (theory vs theory; the Sun\'s of-date longitude moves by the negative)' },
          equinoxVsVondrakMaxAbsInnerArcsec:   { get: () => evv.equinox.maxAbsInnerArcsec, render: f1, unit: '″', note: 'the same inside −500…+2500' },
          equinoxSecularOnlyMaxAbsArcsec:      { get: () => evv.equinox.secularOnlyMaxAbsArcsec, render: f1, unit: '″', note: 'max |Δequinox| over ±3000 yr on the secular precession law ALONE (without the two factors of date) — what the factors close' },
          obliqVsVondrakMaxAbsArcsec:          { get: () => evv.equinox.obliquityMaxAbsArcsec, render: f1, unit: '″', note: 'max |model − Vondrák 2011| of the mean obliquity over ±3000 yr' },
          obliqVsLa2004RmsLastMyrArcsec:       { get: () => win(-1000, 0).modelRmsArcsec, render: f1, unit: '″', note: 'obliquity, model − La2004, rms over the last million years (theory vs theory)' },
          obliqSecularOnlyVsLa2004RmsLastMyrArcsec: { get: () => win(-1000, 0).secularOnlyRmsArcsec, render: f1, unit: '″', note: 'the same on the secular precession law alone — the J2000-frozen solar torque drifts out of phase with La2004' },
          obliqVsLa2004RmsLast100KyrArcsec:    { get: () => win(-100, 0).modelRmsArcsec, render: f1, unit: '″', note: 'obliquity, model − La2004, rms over the last 100 kyr' },
          precOfDateSolarTorqueMeanLastMyrPct: { get: () => evv.factors.lastMyr.solarTorque.meanMinusOne * 100, render: (v) => Number(v).toFixed(3), unit: '%', note: 'mean over the last Myr of the solar-torque factor of date minus 1 — the mean e² sits above today\'s, so the precession runs this much faster than the J2000-frozen torque' },
          precOfDateSolarTorqueMaxLastMyrPct:  { get: () => evv.factors.lastMyr.solarTorque.maxMinusOne * 100, render: f2, unit: '%', note: 'largest solar-torque factor of date minus 1 over the last Myr (at the eccentricity maxima)' },
          precOfDateEllipticityAmpLastMyrPct:  { get: () => Math.max(Math.abs(evv.factors.lastMyr.ellipticity.minMinusOne), Math.abs(evv.factors.lastMyr.ellipticity.maxMinusOne)) * 100, render: f2, unit: '%', note: 'largest excursion of J₂(t)/J₂₀ from 1 over the last Myr (the ice-age oblateness; bounded, no secular part)' },
          precOfDateEquinoxShiftAtM1MyrDeg:    { get: () => evv.obliquity.equinoxShiftAtM1MyrDeg, render: f1, unit: '°', note: 'accumulated equinox at −1 Myr, the movement minus the secular law alone' },
          j2RateJ2000Per1e11Yr:                { get: () => evv.factors.j2RateJ2000PerYr * 1e11, render: (v) => Number(v).toFixed(1).replace('-', '−'), unit: '×10⁻¹¹ /yr', note: 'the GIA channel\'s realized dJ₂/dt at J2000 — the observed satellite rate (Cox & Chao 2002) by construction; the model-parameters input j2RateJ2000PerYr' },
        };
        for (const y of [-3000, -2500, -2000, -1500, -1000, -500, 0, 1000, 3000]) {
          const tag = y < 0 ? `M${-y}` : `P${y}`;
          out[`equinoxVsVondrak${tag}Arcsec`] = { get: () => row(y).equinoxArcsec, render: s1, unit: '″', note: `equinox of date, model − Vondrák 2011 at ${y} (+ = east)` };
          out[`equinoxSecularOnly${tag}Arcsec`] = { get: () => row(y).secularOnlyArcsec, render: s1, unit: '″', note: `the same on the secular precession law alone at ${y}` };
        }
        return out;
      })(),
      sunMeanOffsetPomArcsec:    { get: () => osc.dPomArcsec, render: (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(2), unit: '″', note: 'mean-element ϖ offset of the eclipse Sun over the derivation window (osculating − secular)' },
      sunMeanOffsetE:            { get: () => osc.dE, render: (v) => (v >= 0 ? '+' : '') + Number(v).toExponential(2), note: 'mean-element e offset of the eclipse Sun over the derivation window (osculating − secular)' },
      // Mean |residual|, never an RMS — the former key name (lunarResidualRmsSeconds)
      // described the wrong statistic for a value that has always been the mean
      // absolute residual, and the website published it in a table column headed
      // "Mean |residual|" beside NASA's mean-abs figure. Same value as
      // lunarDtBandsFrameworkMeanAbsSeconds below.
      lunarResidualMeanAbsSeconds: { get: () => L.frameworkMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's', note: 'mean |residual| of the framework against the primary-source lunar timings' },
      lunarResidualMinutes:      { get: () => L.frameworkMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      solarResidualSecondsModel: { get: () => S.frameworkMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      solarResidualMinutes:      { get: () => S.frameworkMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      nasaLunarResidualSeconds:  { get: () => L.nasaMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      nasaLunarResidualMinutes:  { get: () => L.nasaMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      solarResidualSecondsNasa:  { get: () => S.nasaMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      nasaSolarResidualMinutes:  { get: () => S.nasaMeanAbsResidualSeconds / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      lunarEventsBeatingNasa:    { get: () => L.eventsBeatingNasa, render: (v) => thousands(v) },
      lunarEventsTotal:          { get: () => L.eventsTotal, render: (v) => thousands(v) },
      lunarEventsRawTotal:       { get: () => L.eventsRawTotal, render: (v) => thousands(v), note: 'raw count before the NASA-polynomial validity filter' },
      lunarBeatingNasaPct:       { get: () => 100 * L.eventsBeatingNasa / L.eventsTotal, render: (v) => Number(v).toFixed(1), unit: '%' },
      solarEventsBeatingNasa:    { get: () => S.eventsBeatingNasa, render: (v) => thousands(v) },
      solarEventsTotal:          { get: () => S.eventsTotal, render: (v) => thousands(v) },
      solarBeatingNasaPct:       { get: () => 100 * S.eventsBeatingNasa / S.eventsTotal, render: (v) => Number(v).toFixed(1), unit: '%' },
      lunarResidualGapAboveNasaSeconds: { get: () => L.frameworkMeanAbsResidualSeconds - L.nasaMeanAbsResidualSeconds, render: (v) => thousands(v), unit: 's' },
      lunarResidualGapAboveNasaMinutes: { get: () => (L.frameworkMeanAbsResidualSeconds - L.nasaMeanAbsResidualSeconds) / 60, render: (v) => Number(v).toFixed(1), unit: 'min' },
      solarResidualGapAboveNasaSeconds: { get: () => S.frameworkMeanAbsResidualSeconds - S.nasaMeanAbsResidualSeconds, render: (v) => fmtSignedPct(v, 0), unit: 's' },
      bondIrdCorrelation:            { get: () => clim.bondIrdPearsonR, render: (v) => fmtSignedPct(v, 2), note: 'out-of-sample Pearson r vs Bond 2001 IRD — shipped as open correspondence, NOT validation (fails the docs/103 null tests)' },
      gisp2CorrelationForComparison: { get: () => clim.gisp2PearsonR, render: (v) => fmtSignedPct(v, 2) },
      signConventionHitsWindow:      { get: () => clim.signConventionHits, render: (v) => String(v) },
      signConventionTotalWindow:     { get: () => clim.signConventionTotal, render: (v) => String(v) },
      validatedWindowStartBC:        { get: () => -clim.validatedWindowStartYear, render: (v) => thousands(v), note: 'rendered as the BC year number' },
      validatedWindowEndAD:          { get: () => clim.validatedWindowEndYear, render: (v) => thousands(v) },
      // The ΔT stack's fitted periods, STATED IN YEARS from the fit file.
      bondYr:      { get: () => Math.round(dtFit.shipped_coefficients.bond.period_yr), render: (v) => thousands(v), unit: 'yr', note: 'the fitted Bond period — Bond 2001 ~1470 yr N-Atlantic IRD' },
      hallstattYr: { get: () => Math.round(dtFit.shipped_coefficients.hallstatt.period_yr), render: (v) => thousands(v), unit: 'yr', note: 'the fitted Hallstatt period — the solar-activity Hallstatt cycle' },
      joseFiveYr:  { get: () => Math.round(dtFit.shipped_coefficients.jose5.period_yr), render: (v) => thousands(v), unit: 'yr', note: 'the fitted period — 5 × Charvátová Jose 179' },
      joseFourYr:  { get: () => Math.round(dtFit.shipped_coefficients.jose4.period_yr), render: (v) => thousands(v), unit: 'yr', note: 'the fitted period — 4 × Charvátová Jose 179' },
    };
  })(),

  // ── GIA α(t) constants + audit-26 + Babylon −135 (11-2s) ────────────────
  // alphaJ2000 from astro physicalConstants; the calibrated scale LIVE from
  // the engine (deep-time.js ALPHA_CLIMATE_SCALE — reaching the website
  // through @essrt/model-values); Cox & Chao dJ2/dt and the
  // Peltier factor from the new giaCoxChaoPeltier citation block, with
  // dAlphaDtJ2000 DERIVED (= dJ2Dt / factor) so the calibration identity
  // auto-holds. The audit-26 verdict counts and the Babylon −135 case study
  // are campaign measurements — recorded in eclipse-audit-summary.json's
  // audit26/babylon135 sections (same maintenance note + planned generator),
  // with the alignment/scan-reach/total rollups derived.
  ...(() => {
    const ecl = rd('data/eclipse-audit-summary.json');
    const a26 = ecl.audit26, b135 = ecl.babylon135;
    const alignment = () => a26.confirmed + a26.offPeak;
    const scanReach = () => alignment() + a26.regional + a26.dtRegional;
    return {
      alphaJ2000:         { get: () => astro.physicalConstants.earthMoiFactorJ2000, render: (v) => String(v), note: 'IERS Conventions 2010 Earth moment-of-inertia factor' },
      alphaClimateScale:  { get: () => dtl().ALPHA_CLIMATE_SCALE, render: (v) => fmtSci(v, 2), unit: 'per ‰', note: 'the GIA channel coupling k — DERIVED at runtime so dα/dt(J2000) matches Cox & Chao on the lagged L1; live from the engine' },
      alphaGiaRelaxationKyr: { get: () => phys.DEFAULT_CONSTANTS.deepTime.alphaGiaRelaxationKyr, render: (v) => String(v), unit: 'kyr', note: 'the mantle relaxation time τ of the GIA channel — MEASURED against the historical ΔT record through the joint fitter (optimum 5–6 kyr; the degree-2 Maxwell estimate 4–6 kyr)' },
      alphaGiaRateJ2000:  { get: () => phys.DEFAULT_CONSTANTS.deepTime.alphaGiaRateJ2000PerYr, render: (v) => fmtSci(v, 2), unit: '/yr', note: 'the dα/dt(J2000) the channel is anchored on — Cox & Chao dJ₂/dt ÷ the Peltier factor, DERIVED into the assembled deepTime block (plan 11 step 1)' },
      dAlphaDtJ2000:      { get: () => astro.giaCoxChaoPeltier.dJ2DtPerYr / astro.giaCoxChaoPeltier.j2ToAlphaFactor, render: (v) => fmtSci(v, 2), unit: '/yr', note: 'DERIVED: dJ₂/dt ÷ Peltier factor, so the identity auto-holds' },
      coxChaoDJ2Dt:       { get: () => astro.giaCoxChaoPeltier.dJ2DtPerYr, render: (v) => fmtSci(v, 1), unit: '/yr', note: 'Cox & Chao 2002 satellite gravimetry — citation' },
      giaJ2ToAlphaFactor: { get: () => astro.giaCoxChaoPeltier.j2ToAlphaFactor, render: (v) => Number(v).toFixed(1), note: 'Peltier ICE-6G LOD-coupling axisymmetric-GIA factor — citation' },
      solarAudit26Confirmed:  { get: () => a26.confirmed, render: (v) => thousands(v) },
      solarAudit26OffPeak:    { get: () => a26.offPeak, render: (v) => thousands(v) },
      solarAudit26Regional:   { get: () => a26.regional, render: (v) => thousands(v) },
      solarAudit26DTRegional: { get: () => a26.dtRegional, render: (v) => thousands(v) },
      solarAudit26Geographic: { get: () => a26.geographic, render: (v) => thousands(v) },
      solarAudit26Alignment:  { get: alignment, render: (v) => thousands(v), note: 'derived: confirmed + off-peak' },
      solarAudit26ScanReach:  { get: scanReach, render: (v) => thousands(v), note: 'derived: alignment + regional + ΔT-regional' },
      solarAudit26Total:      { get: () => scanReach() + a26.geographic, render: (v) => thousands(v), note: 'derived rollup of the five verdict categories' },
      babylon135BestGapKm:   { get: () => b135.bestGapKm, render: (v) => String(v), unit: 'km' },
      babylon135BestDeltaUT: { get: () => b135.bestDeltaUT, render: (v) => String(v) },
      babylon135FrameworkUT: { get: () => b135.frameworkUT, render: (v) => String(v) },
      babylon135DocumentedUT: { get: () => b135.documentedUT, render: (v) => String(v) },
      // NASA centerline instrument — DERIVED live from the generated
      // eclipse-audit artifact's per-point shadow-plane residuals, so a
      // regenerated audit run moves these automatically (no hand-typed copy).
      centerlinesEvents: { get: () => ecl.centerlines.events.length, render: (v) => thousands(v), note: 'derived: NASA eclipse-path reference events tracked' },
      centerlinesPoints: { get: () => ecl.centerlines.events.reduce((n, e) => n + e.points.length, 0), render: (v) => thousands(v), note: 'derived: fixed-UT reference points across the tracked events' },
      centerlinesMeanArcsec: { get: () => {
        const pts = ecl.centerlines.events.flatMap((e) => e.points.map((p) => p.shadowPlaneArcsec));
        return pts.reduce((a, b) => a + b, 0) / pts.length;
      }, render: (v) => Number(v).toFixed(1), unit: '″', note: 'derived: mean shadow-plane centerline residual over all tracked points' },
      centerlinesMaxArcsec: { get: () => Math.max(...ecl.centerlines.events.flatMap((e) => e.points.map((p) => p.shadowPlaneArcsec))), render: (v) => Number(v).toFixed(1), unit: '″', note: 'derived: worst shadow-plane centerline residual' },
    };
  })(),

  // ── Lunar-alignment gate artifact (Phase A) ──────────────────────────────
  // Keys read data/lunar-alignment-summary.json — the recorded baseline of
  // tools/verify/lunar-alignment.js (same reproduction convention as
  // eclipse-audit). Docs 102/103/106 consume the per-century Babylonian
  // convergence and the −135 untimed-bounds headline.
  ...(() => {
    const la = rd('data/lunar-alignment-summary.json');
    const b = la.dtBounds.babylon135;
    const centuries = Object.entries(la.dtBandsByCentury);
    const absResMin = centuries.map(([, r]) => Math.abs(r.residualHours) * 60);
    /** @type {Record<string, any>} */
    const keys = {
      lunarDtBoundsBabylon135LowSeconds:  { get: () => b.boundsLowSeconds, render: (v) => thousands(v), unit: 's' },
      lunarDtBoundsBabylon135HighSeconds: { get: () => b.boundsHighSeconds, render: (v) => thousands(v), unit: 's' },
      lunarDtBoundsBabylon135FrameworkSeconds: { get: () => b.frameworkSeconds, render: (v) => thousands(v), unit: 's' },
      lunarCenturyResidualMinMinutes: { get: () => Math.round(Math.min(...absResMin)), render: (v) => String(v), unit: 'min', note: 'derived: smallest per-century |residual| across the Babylonian bins' },
      lunarCenturyResidualMaxMinutes: { get: () => Math.round(Math.max(...absResMin)), render: (v) => String(v), unit: 'min', note: 'derived: largest per-century |residual| across the Babylonian bins' },
    };
    for (const [cent, row] of centuries) {
      const tag = String(Math.abs(Number(cent)));
      keys[`lunarCentury${tag}N`] = { get: () => row.n, render: (v) => String(v) };
      keys[`lunarCentury${tag}ObsHours`] = { get: () => row.meanObservedHours, render: (v) => Number(v).toFixed(2), unit: 'hr' };
      keys[`lunarCentury${tag}FrameworkHours`] = { get: () => row.meanFrameworkHours, render: (v) => Number(v).toFixed(2), unit: 'hr' };
      keys[`lunarCentury${tag}ResidualHours`] = { get: () => row.residualHours, render: (v) => (v < 0 ? '−' : v > 0 ? '+' : '') + Math.abs(v).toFixed(2), unit: 'hr' };
    }
    // Headline rollups for the doc-106 dossier entry.
    keys.lunarCanonEvents = { get: () => la.canonGeometry.canonEvents, render: (v) => thousands(v) };
    keys.lunarCanonMatched = { get: () => la.canonGeometry.matched, render: (v) => thousands(v) };
    keys.lunarCanonTypeAgree = { get: () => la.canonGeometry.typeAgree, render: (v) => thousands(v) };
    keys.lunarVisibilityInsideAgree = { get: () => la.visibility.insideAgree, render: (v) => String(v) };
    keys.lunarVisibilityChecked = { get: () => la.visibility.entriesChecked, render: (v) => String(v) };
    keys.lunarBabylon746MagnitudeUmbral = { get: () => la.babylon746.magnitudeUmbral, render: (v) => Number(v).toFixed(3) };
    keys.lunarBabylon746CanonMagnitudeUmbral = { get: () => la.babylon746.canonMagnitudeUmbral, render: (v) => Number(v).toFixed(3) };
    keys.lunarBabylon746AltitudeDeg = { get: () => la.babylon746.babylonMoonAltitudeDeg, render: (v) => Number(v).toFixed(1), unit: '°' };
    keys.lunarDtBandsFrameworkMeanAbsSeconds = { get: () => la.dtBands.overall.frameworkMeanAbsSeconds, render: (v) => thousands(v), unit: 's' };
    keys.lunarDtBandsSplineMeanAbsSeconds = { get: () => la.dtBands.overall.stephensonSplineMeanAbsSeconds, render: (v) => thousands(v), unit: 's' };
    keys.lunarDtBandsN = { get: () => la.dtBands.overall.n, render: (v) => String(v) };
    keys.lunarS13FrameworkInside = { get: () => la.dtBounds.S13.frameworkInside, render: (v) => String(v) };
    keys.lunarS13N = { get: () => la.dtBounds.S13.n, render: (v) => String(v) };
    // theoryDrift: the framework-vs-ELP-class secular drift and the
    // pre-registered re-reduction prediction (doc 102 §lunar-theory drift).
    const signedMin = (/** @type {number} */ v) => (v < 0 ? '−' : v > 0 ? '+' : '') + Math.abs(v).toFixed(1);
    keys.lunarTheoryDriftDeltaNdot = { get: () => la.theoryDrift.effectiveDeltaNdotArcsecPerCy2, render: (v) => Number(v).toFixed(2), unit: '″/cy²' };
    for (const [cent, bin] of [['-800', '-750'], ['-700', '-650'], ['-600', '-550'], ['-500', '-450'], ['-400', '-350']]) {
      const tag = String(Math.abs(Number(cent)));
      keys[`lunarDrift${tag}Minutes`] = { get: () => la.theoryDrift.driftVsModernMinutes[bin], render: (v) => signedMin(v), unit: 'min' };
      keys[`lunarPredictedReduced${tag}Minutes`] = { get: () => la.theoryDrift.predictedReducedResidualMinutes[cent], render: (v) => signedMin(v), unit: 'min' };
    }
    return keys;
  })(),

  // ── Scene anchors + Moon months (11-2t) ─────────────────────────────────
  // Anchor years/JDs and offsets from the engine constants (porting these
  // surfaced the SIXTH website defect: its hardcoded PERI_ALIGN_JD 2,176,152
  // sat one day below the simulator's constant 2,176,153 — the raw value
  // lands on a 0.5 rounding boundary and the sim's FP evaluation is the
  // shipped convention; fixed website-side, both dependent keys moved). The
  // Moon months from the engine's month chain on the IAU inputs.
  ...(() => {
    return {
      meanSolarDay: { get: () => C.meanLengthOfDay, render: (v) => '~' + thousands(v, 0), unit: 's', note: 'prose approximation' },
      siderealDay:  { get: () => (C.meanSolarYearDays / (C.meanSolarYearDays + 1)) * C.meanLengthOfDay, render: (v) => '~' + thousands(v, 2), unit: 's' },
      stellarDay: {
        get: () => {
          const d = (C.meanSolarYearDays / (C.meanSolarYearDays + 1)) * C.meanLengthOfDay;
          return (d / dtl().certifiedAxialPrecessionJ2000Years()) / (C.meanSolarYearDays + 1) * C.STELLAR_DAY_RA_PROJECTION + d;
        },
        render: (v) => '~' + thousands(v, 2),
        unit: 's',
      },
      oneAU: { get: () => C.currentAUDistance, render: (v) => thousands(v, 6), unit: 'km', note: 'the model-derived AU' },
      periAlignYear:    { get: () => C.perihelionalignmentYear, render: (v) => String(v), note: 'the perihelion-alignment epoch — Meeus\'s mean-element root of ϖ_of-date = 90° (1246.1); the model\'s own series crosses later: periAlignYearSeries' },
      // the model's OWN perihelion–solstice alignment: the year the published
      // (series) longitude of perihelion of date crosses 90° — 2.3 yr after the
      // mean-element anchor (the series' secular element sits 70″ below the IAU
      // mean element at J2000, plus its own rate). Two conventions, labelled.
      periAlignYearSeries: { get: () => { const pom = (y) => ((physModel().earth.perihelionLongitudeDeg(y) % 360) + 360) % 360; let lo = 1100, hi = 1400; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (pom(mid) > 90) hi = mid; else lo = mid; } return (lo + hi) / 2; }, render: (v) => Number(v).toFixed(1), unit: 'AD', note: 'the year the model\'s own (series) longitude of perihelion of date = 90° — the perihelion at the December solstice by the model\'s dynamics; the device anchors at periAlignYear (Meeus)' },
      periAlignYearRound: { get: () => C.perihelionalignmentYear, render: (v) => Number(v).toFixed(2) },
      periAlignJD:      { get: () => C.perihelionalignmentJD, render: (v) => thousands(v), unit: 'JD' },
      preprintDoi: { get: () => versionInfo.preprintDoi, render: (v) => String(v), note: 'canonical preprint DOI — single source: model-version.json' },
      moonDiameter:       { get: () => astro.bodyDiametersKm.moon, render: (v) => thousands(v, 1), unit: 'km' },
      moonOrbitalRadius:  { get: () => C.moonDistance, render: (v) => thousands(v, 2), unit: 'km' },
      moonOrbitalCircumference: { get: () => 2 * Math.PI * C.moonDistance, render: (v) => thousands(v, 2), unit: 'km' },
      siderealMonth:    { get: () => C.moonSiderealMonth, render: (v) => thousands(v, 10), unit: 'd' },
      synodicMonth:     { get: () => C.moonSynodicMonth, render: (v) => thousands(v, 10), unit: 'd' },
      anomalisticMonth: { get: () => C.moonAnomalisticMonth, render: (v) => thousands(v, 10), unit: 'd' },
      draconicMonth:    { get: () => C.moonNodalMonth, render: (v) => thousands(v, 10), unit: 'd' },
      tropicalMonth:    { get: () => C.moonTropicalMonth, render: (v) => thousands(v, 10), unit: 'd' },
      fullMoonCycleICRF: { get: () => C.moonFullMoonCycleICRF, render: (v) => thousands(v, 10), unit: 'd' },
    };
  })(),

  // ── The Moon's precession periods (11-2u) ───────────────────────────────
  // The of-date periods are the inputs (apsidalPrecICRF / nodalPrecICRF); the
  // ICRF/Earth day-values are the engine's month-chain outputs.
  ...(() => {
    return {
      fullMoonCycleEarth:      { get: () => C.moonFullMoonCycleEarth, render: (v) => thousands(v, 2), unit: 'd', note: 'observed supermoon cycle' },
      fullMoonCycleEarthExact: { get: () => C.moonFullMoonCycleEarth, render: (v) => thousands(v, 10), unit: 'd' },
      draconicYearICRF:  { get: () => C.moonDraconicYearICRF, render: (v) => thousands(v, 10), unit: 'd', note: 'the lunar chain\'s fixed-frame (inertial) draconic year' },
      draconicYearEarth: { get: () => C.moonDraconicYearEarth, render: (v) => thousands(v, 10), unit: 'd', note: 'observed eclipse year' },
      apsidalPrecICRF:      { get: () => C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => '~' + thousands(v, 2), unit: 'yr' },
      apsidalPrecICRFexact: { get: () => C.moonApsidalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      apsidalPrecEarth:     { get: () => C.moonApsidalPrecessionDaysEarth / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      nodalPrecICRF:        { get: () => C.moonNodalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => '~' + thousands(v, 1), unit: 'yr' },
      nodalPrecICRFexact:   { get: () => C.moonNodalPrecessionDaysICRF / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      nodalPrecEarth:       { get: () => C.moonNodalPrecessionDaysEarth / C.meanSolarYearDays, render: (v) => thousands(v, 5), unit: 'yr' },
      moonLevelingCycle: { get: () => C.moonLunarLevelingCycleDays / C.meanSolarYearDays, render: (v) => '~' + thousands(v, 2), unit: 'yr' },
    };
  })(),

  // ── Moon inclination + Cassini obliquity labs (11-2v) ───────────────────
  // The dynamical inclination and Brown/ELP constant from astro moonReference
  // (the DYNAMICAL 5.1573 vs the theory constant 5.1454 — documented
  // partners, not interchangeable); GRAIL/LLR gravity from the new
  // moonGrailWilliams2014 citation block; the Cassini lab results from
  // data/cassini-moontilt-results.json (both generator scripts exist and
  // reproduce the ε values — only --write is missing, see the plan's
  // follow-up list; pct ratios as published).
  ...(() => {
    const cas = rd('data/cassini-moontilt-results.json');
    return {
      moonEclipticInclination: { get: () => astro.moonReference.moonEclipticInclinationJ2000, render: (v) => String(v), unit: '°', note: 'dynamical mean osculating inclination (v4 E3c)' },
      moonInclinationConstantBrownELP: { get: () => astro.moonReference.moonInclinationConstantBrownELP, render: (v) => String(v), unit: '°', note: 'Brown/ELP latitude sinF normalization constant' },
      moonObliquityEcliptic: { get: () => astro.moonReference.moonObliquityEclipticJ2000, render: (v) => String(v), unit: '°', note: 'measured lunar spin-to-ecliptic obliquity' },
      moonJ2Grail:  { get: () => astro.moonGrailWilliams2014.j2E6, render: (v) => String(v), note: 'lunar J₂ ×10⁻⁶ (GRAIL; Williams 2014)' },
      moonC22Grail: { get: () => astro.moonGrailWilliams2014.c22E6, render: (v) => String(v), note: 'lunar C₂₂ ×10⁻⁶ (GRAIL; Williams 2014)' },
      moonCMR2:     { get: () => astro.moonGrailWilliams2014.cMR2, render: (v) => String(v), note: 'lunar polar moment C/MR² (GRAIL+LLR)' },
      cassiniObliquityDerived:    { get: () => cas.rigidEllipse.epsilonDeg, render: (v) => Number(v).toFixed(4), unit: '°', note: 'rigid-figure torque-averaged Cassini equilibrium' },
      cassiniObliquityPct:        { get: () => cas.rigidEllipse.pctOfMeasured, render: (v) => Number(v).toFixed(1), unit: '%' },
      cassiniObliquityCoupled:    { get: () => cas.coupledAverage.epsilonDeg, render: (v) => Number(v).toFixed(4), unit: '°', note: 'coupled average over the real ELP orbit' },
      cassiniObliquityCoupledPct: { get: () => cas.coupledAverage.pctOfMeasured, render: (v) => Number(v).toFixed(2), unit: '%' },
      cassiniObliquityEuler:      { get: () => cas.eulerIntegration.epsilonDeg, render: (v) => Number(v).toFixed(4), unit: '°', note: 'full Euler integration — no averaging assumption' },
      cassiniObliquityEulerPct:   { get: () => cas.eulerIntegration.pctOfMeasured, render: (v) => Number(v).toFixed(2), unit: '%' },
    };
  })(),

  // ── Input constants + Meeus/Sun validation stats (11-2w) ────────────────
  // Inputs from the engine constants and astro-reference; the eccDot pair
  // renders in exponent form with the site's unicode leading minus; the
  // validation statistics live in knownValues (recorded campaign snapshots,
  // per its _description). meeusLongitude/LatitudeTerms are the Meeus 47.A/B
  // CANONICAL counts (structural, like earthInclD): the tracked longitude
  // table carries 59 rows because the canonical 60th is the
  // zero-longitude-coefficient distance-only term.
  ...(() => {
    const uMinus = (s) => s.replace(/^-/, '−');
    return {
      moonOrbitalEccentricity:     { get: () => C.moonOrbitalEccentricity, render: (v) => Number(v).toFixed(4) },
      moonOrbitalEccentricityFull: { get: () => C.moonOrbitalEccentricity, render: (v) => String(v) },
      siderealYearInputDays: { get: () => C.meanSiderealYearSeconds / 86400, render: (v) => Number(v).toFixed(9), unit: 'd', note: 'IAU J2000 sidereal year input' },
      massRatioEarthMoon:    { get: () => C.MASS_RATIO_EARTH_MOON, render: (v) => String(v), note: 'DE440 SPICE kernel' },
      llrTidalGamma:         { get: () => astro.knownValues.llrTidalGammaArcsecPerCy2, render: (v) => uMinus(Number(v).toFixed(2)), unit: '″/cy²', note: 'LLR tidal acceleration (α₁ chain anchor)' },
      earthEccDotJ2000:      { get: () => astro.earthOrbital.earthEccentricityDotJ2000, render: (v) => uMinus(Number(v).toExponential()), unit: '/cy' },
      earthEccDotDotJ2000:   { get: () => astro.earthOrbital.earthEccentricityDotDotJ2000, render: (v) => uMinus(Number(v).toExponential()), unit: '/cy²' },
      earthPerihelionLongitudeJ2000: { get: () => astro.earthOrbital.earthPerihelionLongitudeJ2000, render: (v) => Number(v).toFixed(3), unit: '°' },
      sunMeanLongitudeJ2000: { get: () => astro.earthOrbital.sunMeanLongitudeJ2000_deg, render: (v) => String(v), unit: '°', note: 'D5 aberration anchor' },
      moonSiderealMonthInput: { get: () => C.moonSiderealMonthInput, render: (v) => Number(v).toFixed(8), unit: 'd', note: 'the one dynamical lunar input' },
      moonAxialTilt: { get: () => C.moonTilt, render: (v) => String(v), unit: '°', note: 'to orbit plane' },
      moonApsidalPrecessionDaysInput: { get: () => C.moonApsidalPrecessionDaysInputICRF, render: (v) => thousands(v, 3), unit: 'd' },
      moonNodalPrecessionDaysInput:   { get: () => C.moonNodalPrecessionDaysInputICRF, render: (v) => thousands(v, 2), unit: 'd' },
      moonKeplerEffectiveDistance: { get: () => astro.knownValues.moonKeplerEffectiveDistanceKm, render: (v) => thousands(v), unit: 'km', note: 'DLT-1 §3 three-body a (vs two-body 384,748)' },
      // The Moon-Kepler mass chain (docs 24; the website's "mass from the Moon"
      // page) — read from the ONE place that computes it, createModel().massChain
      // (physics 22.1.0; the pages carried these as hand-typed literals,
      // recomputed by hand at the v24.0 update). References: JPL DE440
      // (Park et al. 2021), astro-reference knownValues.
      moonKeplerLunarSmallParameter: { get: () => physModel().massChain.lunarSmallParameter, render: (v) => Number(v).toFixed(8), note: 'm = T_M / T_sidereal-year (Hill 1878), the lunar small parameter on the IAU inputs' },
      moonKeplerMassFraction: { get: () => physModel().massChain.moonMassFraction, render: (v) => Number(v).toFixed(8), note: 'μ = M_Moon / (M_Earth + M_Moon) = 1 / (ratio + 1) on the DE440 mass ratio' },
      moonKeplerSolarTidalShiftKm: { get: () => physModel().massChain.solarTidalShiftKm, render: (v) => Number(v).toFixed(2), unit: 'km', note: 'Δa = a_M · μ · m — the solar-tidal shift that makes Kepler III return the DE440 GM (a re-parameterisation of Hill-Brown\'s ½·m² correction, doc 24 §3)' },
      moonKeplerCorrectedDistanceKm: { get: () => physModel().massChain.moonDistanceCorrectedKm, render: (v) => thousands(v, 2), unit: 'km', note: 'a_M + Δa, the Kepler-effective Earth–Moon distance on the IAU mean distance' },
      moonKeplerMonthSeconds: { get: () => physModel().massChain.moonSiderealMonthDays * physModel().massChain.dayLengthSeconds, render: (v) => thousands(v, 2), unit: 's', note: 'the IAU sidereal month in SI seconds (T_M × the SI day)' },
      // the chain's three inputs as keys, so the derivation tables on docs/24 and the website's mass-from-moon
      // page carry no typed number (TODO 2026-10-15: both pages had the chain hand-recomputed at v24.0)
      moonKeplerSiderealMonthDays: { get: () => physModel().massChain.moonSiderealMonthDays, render: (v) => Number(v).toFixed(6), unit: 'd', note: 'T_M, the IAU sidereal month the GM chain runs on (the model’s J2000 input)' },
      moonKeplerDayLengthSeconds: { get: () => physModel().massChain.dayLengthSeconds, render: (v) => thousands(v, 0), unit: 's', note: 'the day the month is converted to seconds with — the SI day the IAU inputs are stated in' },
      moonKeplerEarthMassFraction: { get: () => 1 - physModel().massChain.moonMassFraction, render: (v) => Number(v).toFixed(6), note: 'ratio/(ratio + 1) = M_Earth/(M_Earth + M_Moon), the factor GM_Earth takes of the system GM' },
      gmEarthMoonSystemModelKm3S2: { get: () => physModel().massChain.gmEarthMoonSystemKm3S2, render: (v) => thousands(v, 2), unit: 'km³/s²', note: 'G(M_Earth + M_Moon) = 4π²·a_corrected³/T²' },
      gmEarthModelKm3S2: { get: () => physModel().massChain.gmEarthKm3S2, render: (v) => thousands(v, 2), unit: 'km³/s²', note: 'GM_Earth = G(M_E + M_M) · ratio/(ratio + 1)' },
      gmMoonModelKm3S2: { get: () => physModel().massChain.gmMoonKm3S2, render: (v) => thousands(v, 2), unit: 'km³/s²', note: 'GM_Moon = G(M_E + M_M) / (ratio + 1)' },
      gmSunModelKm3S2: { get: () => physModel().massChain.gmSunKm3S2, render: (v) => thousands(v, 0), unit: 'km³/s²', note: 'GM_Sun = 4π²·AU³/T_sid² − GM_Earth (the downstream chain)' },
      earthMassModelKg: { get: () => physModel().massChain.earthMassKg, render: (v) => (v / 1e24).toFixed(6) + ' × 10²⁴', unit: 'kg', note: 'GM_Earth / G with CODATA G = 6.6743×10⁻²⁰ km³/(kg·s²); G\'s ~22 ppm sets the floor' },
      gmEarthDE440Km3S2: { get: () => astro.knownValues.de440GmEarthKm3S2, render: (v) => thousands(v, 2), unit: 'km³/s²', note: 'JPL DE440 (Park et al. 2021) — the reference the model chain is compared against' },
      gmMoonDE440Km3S2: { get: () => astro.knownValues.de440GmMoonKm3S2, render: (v) => thousands(v, 2), unit: 'km³/s²', note: 'JPL DE440 (Park et al. 2021)' },
      gmSunDE440Km3S2: { get: () => astro.knownValues.de440GmSunKm3S2, render: (v) => thousands(v, 0), unit: 'km³/s²', note: 'JPL DE440 (Park et al. 2021)' },
      gmEarthResidualPpm: { get: () => (physModel().massChain.gmEarthKm3S2 / astro.knownValues.de440GmEarthKm3S2 - 1) * 1e6, render: (v) => Number(v).toFixed(1), unit: 'ppm', note: 'the model GM_Earth against DE440 — the Δa chain\'s residual (doc 24 §8)' },
      gmMoonResidualPpm: { get: () => (physModel().massChain.gmMoonKm3S2 / astro.knownValues.de440GmMoonKm3S2 - 1) * 1e6, render: (v) => Number(v).toFixed(1), unit: 'ppm', note: 'the model GM_Moon against DE440 (the same ratio as GM_Earth: the split is DE440\'s mass ratio)' },
      gmSunResidualPpm: { get: () => (physModel().massChain.gmSunKm3S2 / astro.knownValues.de440GmSunKm3S2 - 1) * 1e6, render: (v) => Number(v).toFixed(2), unit: 'ppm', note: 'the model GM_Sun against DE440' },
      a1RateDegPerCy: { get: () => astro.knownValues.meeusA1RateDegPerCy, render: (v) => String(v), unit: '°/cy', note: 'Meeus A1 rate (18V−16E−M′ resonance) — duplicated from script.js:26562' },
      meeusLongitudeTerms: { get: () => 60, render: (v) => String(v), note: 'Meeus 47.A canonical count — tracked table carries 59 (60th is the distance-only term)' },
      meeusLatitudeTerms:  { get: () => 60, render: (v) => String(v), note: 'Meeus 47.B canonical count' },
      meeusEclipsesTestCount: { get: () => astro.knownValues.meeusEclipsesTestCount, render: (v) => String(v) },
      meeusEclipseRMS:        { get: () => astro.knownValues.meeusEclipseRmsMinutes, render: (v) => Number(v).toFixed(2), unit: 'min' },
      meeusParallaxResidual:  { get: () => astro.knownValues.meeusParallaxResidualArcsec, render: (v) => Number(v).toFixed(2), unit: '″' },
      meeusPearsonR:          { get: () => astro.knownValues.meeusPearsonR, render: (v) => String(v) },
      meeusJPLDecRMS:         { get: () => astro.knownValues.meeusJplDecRmsDeg, render: (v) => Number(v).toFixed(2), unit: '°' },
      sunModelDecRMS:    { get: () => astro.knownValues.sunModelDecRmsDeg, render: (v) => String(v), unit: '°' },
      sunModelTrueError: { get: () => astro.knownValues.sunModelTrueErrorDeg, render: (v) => String(v), unit: '°' },
      frameworkSunVsJplRms:  { get: () => astro.knownValues.frameworkSunVsJplRmsArcsec, render: (v) => Number(v).toFixed(2), unit: '″', note: 'E4/E5 certified apparent solar longitude vs JPL, modern window (doc 99)' },
      meeusCh25SunVsJplRms:  { get: () => astro.knownValues.meeusCh25SunVsJplRmsArcsec, render: (v) => Number(v).toFixed(2), unit: '″', note: 'Meeus Ch. 25 reference on the same window/instrument' },
      moonSeriesLonVsJplRms: { get: () => astro.knownValues.moonSeriesLonVsJplRmsArcsec, render: (v) => Number(v).toFixed(2), unit: '″', note: 'shipped derived lunar series, all-phase λ vs JPL after the 20.3h round-2 Delaunay tail (doc 66)' },
      moonSeriesLatVsJplRms: { get: () => astro.knownValues.moonSeriesLatVsJplRmsArcsec, render: (v) => Number(v).toFixed(2), unit: '″', note: 'shipped derived lunar series, all-phase β vs JPL (doc 66)' },
      sunTropicalYearDiff: { get: () => astro.knownValues.sunTropicalYearDiffSeconds, render: (v) => fmtSignedPct(v, 2), unit: 's' },
      sunSiderealYearDiff: { get: () => astro.knownValues.sunSiderealYearDiffSeconds, render: (v) => fmtSignedPct(v, 2), unit: 's' },
      sunDiameter: { get: () => astro.bodyDiametersKm.sun, render: (v) => thousands(v), unit: 'km' },
      sunOrbitalCircumference: { get: () => 2 * Math.PI * C.currentAUDistance, render: (v) => thousands(v, 2), unit: 'km', note: '2π × model AU' },
      arcsecInCircle: { get: () => 360 * 3600, render: (v) => thousands(v), note: 'structural: 360 × 3600' },
    };
  })(),

  // ── Parallax chain (11-2x) ──────────────────────────────────────────────
  // The parallax-chain members from astro physicalConstants (solarParallax is
  // the IAU 1976 defining constant; arcsecDisplacement is the historical
  // primitive the website builds its AU from — displacement × 648000/π =
  // currentAUDistance to 0.2 mm, see the chain note).
  ...(() => {
    const APR = () => (180 * 3600) / Math.PI;
    return {
      arcsecPerRadian:    { get: APR, render: (v) => thousands(v, 9), note: 'structural: 180·3600/π' },
      arcsecDisplacement: { get: () => astro.physicalConstants.arcsecDisplacementKm, render: (v) => thousands(v, 12), unit: 'km', note: '1-arcsec displacement at 1 AU — the historical parallax-chain primitive' },
      oneParsec:          { get: () => C.currentAUDistance * APR(), render: (v) => thousands(v, 1), unit: 'km' },
      solarParallax:      { get: () => astro.physicalConstants.solarParallaxArcsec, render: (v) => String(v), unit: '″', note: 'IAU 1976 defining constant' },
    };
  })(),

  // ── The invariable plane's node + mainstream comparisons (11-2y) ────────
  // The mainstream* family is conventional-theory literature for the
  // comparison tables, tracked in knownValues; the invariable plane's own
  // ecliptic node joins the Souami block.
  ...(() => {
    // (The registry publishes live quantities only; the recorded constants of the
    // retired integer laws, ψ and K, are doc 109's record.)
    return {
      invPlaneAscNode: { get: () => astro.ascendingNodesSouamiSouchay.invariablePlaneOnEclipticDeg, render: (v) => String(v), unit: '°', note: 'the invariable plane\'s node on the ecliptic (Souami & Souchay 2012)' },
      mainstreamAxialPrec:  { get: () => astro.knownValues.mainstreamAxialPrecKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamPeriPrec:   { get: () => astro.knownValues.mainstreamPeriPrecKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamObliqCycle: { get: () => astro.knownValues.mainstreamObliqCycleKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamInclCycle:  { get: () => astro.knownValues.mainstreamInclCycleKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamApsidalPrec: { get: () => astro.knownValues.mainstreamApsidalPrecKyr, render: (v) => `~${v}k`, unit: 'yr' },
      mainstreamObliqRange: {
        get: () => astro.knownValues.mainstreamObliqRangeMinDeg,
        render: (v) => `~${v}° to ~${astro.knownValues.mainstreamObliqRangeMaxDeg}°`,
      },
      mainstreamAxialPrecExact:  { get: () => dtl().certifiedAxialPrecessionJ2000Years(), render: (v) => `~${thousands(v)}`, unit: 'yr', note: 'the mainstream axial-precession period — 1,296,000″ / the IAU 2006 general precession p_A (the model’s own J2000 input since plan 09), DERIVED here, not typed beside it (was knownValues.mainstreamAxialPrecExactYr 25771)' },
      mainstreamPeriPrecExact:   { get: () => astro.knownValues.mainstreamPeriPrecExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
      mainstreamObliqCycleExact: { get: () => astro.knownValues.mainstreamObliqCycleExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
      mainstreamInclCycleExact:  { get: () => astro.knownValues.mainstreamInclCycleExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
      mainstreamApsidalPrecExact: { get: () => astro.knownValues.mainstreamApsidalPrecExactYr, render: (v) => `~${thousands(v)}`, unit: 'yr' },
    };
  })(),

  // ── Planet perihelion periods + J2000 eccentricities (11-2z) ────────────
  // Periods and rates from the chain (below); eccentricities from the
  // per-planet JPL DE440 J2000 elements (Earth from astro earthOrbital).
  ...(() => {
    const out = {};
    // The perihelion period and rate of each planet are THE CHAIN'S —
    // `<p>PeriPeriod` the perihelion period AGAINST THE EQUINOX OF DATE,
    // 1,296,000/(g + p_A) yr (the same quantity Earth's row has always
    // published — the of-date beat), `<p>PeriPeriodICRF` / `<p>IcrfPeriod` the
    // inertial period 1,296,000/|g| yr, `<p>PeriRate` the of-date rate in °/yr;
    // g the leading secular apsidal eigenfrequency (type A — bounded for every
    // planet, the quantity the deep-time chain and the climate lines ride),
    // p_A the J2000 general precession. The era window rate (1800–2100, 1PN)
    // is <p>PeriRateNowArcsecCy, Newtonian in <p>ModelBaseline. The notes below
    // say which of the two a page should quote; Neptune's window rate is
    // ill-conditioned (e = 0.011) and its secular mode is the only bounded
    // statement.
    const PERI_NOTE = (p) => `of-date perihelion period/rate: the chain's secular g (${chainArt().g[p].nearestLaskar.mode}, ${chainG(p).toFixed(4)} ″/yr) + the J2000 general precession; inertial twin <${p}PeriPeriodICRF>, era window <${p}PeriRateNowArcsecCy>`;
    for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      const ofDateArcsecPerYr = () => chainG(planet) + pAJ2000ArcsecPerYr();
      out[`${planet}PeriPeriod`] = {
        get: () => 1296000 / ofDateArcsecPerYr(),
        render: (v) => thousands(Math.round(v)),
        unit: 'yr',
        note: PERI_NOTE(planet),
      };
      out[`${planet}PeriFormula`] = { get: () => `${chainArt().g[planet].nearestLaskar.mode} + p_A`, render: (v) => String(v), note: `the leading secular apsidal mode of the chain plus the J2000 general precession` };
      out[`${planet}PeriRate`] = {
        get: () => ofDateArcsecPerYr() / 3600,
        render: (v) => thousands(v, 6),
        unit: '°/yr',
        note: PERI_NOTE(planet),
      };
    }
    // Earth's perihelion-of-date period is the one-family route's beat.
    out.earthPeriRate = { get: () => 360 / oneYL().perihelionPrecessionYearsAtYear(2000), render: (v) => thousands(v, 6), unit: '°/yr', note: 'perihelion-of-date rate at J2000 — the of-date year laws’ beat' };
    out.earthPeriPeriod = { get: () => oneYL().perihelionPrecessionYearsAtYear(2000), render: (v) => thousands(Math.round(v)), unit: 'yr', note: 'perihelion-of-date period at J2000 — the one-family route’s beat' };
    const eccSources = {
      mercury: () => C.planets.mercury.orbitalEccentricityJ2000,
      venus:   () => C.planets.venus.orbitalEccentricityJ2000,
      earth:   () => astro.earthOrbital.earthEccentricityJ2000,
      mars:    () => C.planets.mars.orbitalEccentricityJ2000,
      jupiter: () => C.planets.jupiter.orbitalEccentricityJ2000,
      saturn:  () => C.planets.saturn.orbitalEccentricityJ2000,
      uranus:  () => C.planets.uranus.orbitalEccentricityJ2000,
      neptune: () => C.planets.neptune.orbitalEccentricityJ2000,
    };
    for (const [planet, get] of Object.entries(eccSources)) {
      out[`${planet}EccJ2000`] = { get, render: (v) => Number(v).toFixed(5), note: 'JPL DE440 J2000 element' };
    }
    return out;
  })(),

  // ── The two-engine composed precession (doc 99 "one solar system") ──────
  // The W3 forward model as derived keys: Earth's PHYSICAL axial-precession
  // rate at age t is the two engines composed — engine K's spin ω(t) and
  // recession history a_m(t) carrying the lunar torque, engine D's side the
  // solar torque: ψ̇(t) = [ω(t)/ω₀]·(p_S + p_L·(a_m0/a_m(t))³) at μ = 1.
  // The composed rate IS the model's ψ̇(t) — ONE home
  // @essrt/physics/earth/precession-composed inside the deep-time factory,
  // read here through the Node engine (tools/lib/deep-time.js), the same
  // evaluator the hybrid precesses on and the paleo-anchors gate's
  // precArcsecPerYr rows check. Instrument twin:
  // tools/explore/w3-precession-crosscoupling.mjs.
  ...(() => {
    const composedAt = (ageMa) => dtl().meanLunisolarPrecessionRateArcsecPerYrAtAge(ageMa);
    const out = {
      earthPrecSolarShareJ2000Pct: { get: () => 100 * dtl().PRECESSION_SOLAR_SHARE_J2000, render: (v) => Number(v).toFixed(1), unit: '%', note: 'solar fraction of Earth’s J2000 precession torque, derived from the shared constants (the W3 split; the lunar part is the rest)' },
      // Four decimals, not one: the published comparison against IAU 2006's
      // 50.2880 ″/yr (5,028.796195″/cy, P03) turns on a 0.0007 % difference, which 50.3 cannot carry —
      // the website had to hard-code the rate to state it at all.
      // The IAU 2006 (P03, Hilton et al. 2006) general precession p_A as published: per Julian century and
      // per year — the model's J2000 input (astro-reference earthOrbital.generalPrecessionJ2000_arcsecPerYr),
      // so a page quoting the standard beside the model quotes ONE number twice; the website's hand-typed
      // 50.2875 / 50.2879 were a transcription slip and a truncation (TODO 2026-10-09).
      generalPrecessionIau2006ArcsecPerCy: { get: () => 100 * astro.earthOrbital.generalPrecessionJ2000_arcsecPerYr, render: (v) => thousands(v, 6), unit: '″/cy', note: 'IAU 2006 general precession in longitude p_A at J2000, 5,028.796195″ per Julian century (P03; Hilton et al. 2006) — the model’s input' },
      generalPrecessionIau2006ArcsecPerYr: { get: () => astro.earthOrbital.generalPrecessionJ2000_arcsecPerYr, render: (v) => Number(v).toFixed(4), unit: '″/yr', note: 'IAU 2006 general precession p_A per year, 50.2880 — the model’s J2000 precession rate IS this input (plan 09), so earthPrecRateJ2000ArcsecPerYr equals it exactly' },
      earthPrecRateJ2000ArcsecPerYr: { get: () => dtl().precessionRateJ2000ArcsecPerYr(), render: (v) => Number(v).toFixed(4), unit: '″/yr', note: 'the model’s J2000 axial-precession rate — 1,296,000/T_p(J2000), the certified year laws’ beat at 2000 (IAU 2006 50.2880)' },
      earthPrecSolarJ2000ArcsecPerYr: { get: () => dtl().precessionRateJ2000ArcsecPerYr() * dtl().PRECESSION_SOLAR_SHARE_J2000, render: (v) => Number(v).toFixed(4), unit: '″/yr',note: 'the solar torque’s share of the J2000 rate, f_S · ψ̇₀' },
      earthPrecLunarJ2000ArcsecPerYr: { get: () => dtl().precessionRateJ2000ArcsecPerYr() * (1 - dtl().PRECESSION_SOLAR_SHARE_J2000), render: (v) => Number(v).toFixed(4), unit: '″/yr',note: 'the lunar torque’s share of the J2000 rate, (1 − f_S) · ψ̇₀' },
    };
    for (const age of [650, 1400, 2460]) {
      out[`earthPrecComposed${age}MaArcsecPerYr`] = { get: () => composedAt(age), render: (v) => Number(v).toFixed(1), unit: '″/yr', note: `the precession RATE of date at ${age} Ma: ω(t) × (solar torque + lunar torque on the cited recession history) × cos ε̄(t)/cos ε̄(0) on the cited mean obliquity (plan 12 §8 option (a); the chain held cos ε̄ at J2000 before), μ = 1 — the model’s ψ̇(t) (plan 06 D6/Phase 3)` };
      out[`earthPrecTorque${age}MaArcsecPerYr`] = { get: () => dtl().meanLunisolarTorqueRateArcsecPerYrAtAge(age), render: (v) => Number(v).toFixed(1), unit: '″/yr', note: `the precession CONSTANT of date at ${age} Ma as a rate on the J2000 obliquity — the spin and torque scaling alone (what the hybrid obliquity integration takes; the pre-§8 published rate)` };
      out[`earthMeanObliquityCited${age}MaDeg`] = { get: () => dtl().meanObliquityCitedDegAtAge(age), render: (v) => Number(v).toFixed(2), unit: '°', note: `the cited mean obliquity of date at ${age} Ma — Farhat et al. 2022’s own column of the Earth–Moon history (a Myr-scale mean; 23.25° at age 0), read as cos ε̄(t)/cos ε̄(0) on the precession rate (plan 12 §8 option (a))` };
      out[`earthPrecObliquityFactor${age}MaPct`] = { get: () => 100 * (dtl().precessionObliquityFactorAtAge(age) - 1), render: (v) => Number(v).toFixed(2), unit: '%', note: `cos ε̄(t)/cos ε̄(0) − 1 at ${age} Ma — what the cited mean obliquity adds to the precession rate of date over the constant’s scaling` };
    }
    out.earthMeanObliquityCitedJ2000Deg = { get: () => dtl().meanObliquityCitedDegAtAge(0), render: (v) => Number(v).toFixed(2), unit: '°', note: 'the cited mean obliquity at age 0 (Farhat et al. 2022) — a Myr-scale MEAN of a secular solution, against the J2000 instant 23.44° the hybrid starts from; the rate’s factor is the RATIO cos ε̄(t)/cos ε̄(0), so the model keeps its own J2000 obliquity' };
    out.earthMeanObliquityCitedDevonianDeg = { get: () => dtl().meanObliquityCitedDegAtAge(380), render: (v) => Number(v).toFixed(2), unit: '°', note: 'the cited mean obliquity at the Devonian (380 Ma) — Farhat et al. 2022’s column' };
    out.earthPrecObliquityFactorDevonianPct = { get: () => 100 * (dtl().precessionObliquityFactorAtAge(380) - 1), render: (v) => Number(v).toFixed(2), unit: '%', note: 'cos ε̄(t)/cos ε̄(0) − 1 at the Devonian — what the cited mean obliquity adds to the precession rate of date' };
    return out;
  })(),

  // ── The lunisolar clock's ratios ────────────────────────────────────────
  // Spoken in periods and ratios — no unit, no integer. T_p is the PUBLISHED
  // of-date precession period (the one-family route, ≈ 25,771.6 at J2000 —
  // the model's one J2000 reading). T_aps/T_p (the apsidal period — the ONE
  // movement's own apsidal rate of date, the SAME helper the Prec. cell and
  // the one-family anomalistic use) and T_peri/T_p with
  // T_peri = 1/(1/T_p + 1/T_aps) the perihelion-of-date period (frame
  // arithmetic at every epoch). The wander keys are the owner's by-hand
  // finding, measured: over ±26 kyr the ratio is nowhere pinned.
  ...(() => {
    // T_aps: the ONE movement's own apsidal period of date (anom/(anom − sid)
    // of the one family — the scene's perihelion; year-lengths.cjs), Julian years.
    const tApsYr = (y) => oneYL().inclinationPrecessionYearsAtYear(y);
    const tPYr = (y) => oneYL().axialPrecessionYearsAtYear(y);   // the published of-date T_p (S5), Julian years
    const apsPerPrec = (y) => tApsYr(y) / tPYr(y);
    const periPerPrec = (y) => { const tp = tPYr(y), ta = tApsYr(y); return (1 / (1 / tp + 1 / ta)) / tp; };
    let wander = null;
    const wanderScan = () => {
      if (!wander) {
        let mn = Infinity, mx = -Infinity, mnYr = 0, mxYr = 0;
        for (let y = -26000; y <= 26000; y += 500) { const r = apsPerPrec(y); if (r < mn) { mn = r; mnYr = y; } if (r > mx) { mx = r; mxYr = y; } }
        wander = { mn, mx, mnYr, mxYr };
      }
      return wander;
    };
    return {
      lunisolarPeriodJ2000Yr: { get: () => tPYr(2000), render: (v) => thousands(v, 1), unit: 'yr', note: 'the lunisolar precession period T_p at J2000, JULIAN years — the model’s ONE J2000 precession reading (the of-date year laws’ beat ≡ 360°/the frame’s rate per Julian year ≡ the composed clock’s anchor; IAU 25,771.6)' },
      lunisolarApsidalPerPrecessionJ2000: { get: () => apsPerPrec(2000), render: (v) => Number(v).toFixed(3), note: 'T_aps/T_p at J2000 — the perihelion’s period against the stars (the ONE movement’s own apsidal rate of date, the scene’s perihelion) in of-date precession periods; a J2000 reading, not a law' },
      lunisolarPeriOfDatePerPrecessionJ2000: { get: () => periPerPrec(2000), render: (v) => Number(v).toFixed(4), note: 'T_peri/T_p at J2000, T_peri = 1/(1/T_p + 1/T_aps) the perihelion-of-date period (equinox precession + inertial perihelion motion — frame arithmetic at every epoch)' },
      lunisolarApsidalPerPrecessionWanderMin: { get: () => wanderScan().mn, render: (v) => Number(v).toFixed(2), note: 'minimum of T_aps/T_p over ±26 kyr (500-yr scan) — the ratio is not pinned' },
      lunisolarApsidalPerPrecessionWanderMax: { get: () => wanderScan().mx, render: (v) => Number(v).toFixed(2), note: 'maximum of T_aps/T_p over ±26 kyr (500-yr scan)' },
      lunisolarTorqueConstantJ2000ArcsecPerYr: { get: () => (1296000 / tPYr(2000)) / Math.cos((astro.earthOrbital.obliquityJ2000_deg * Math.PI) / 180), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the hybrid’s precession constant α = p₀ / cos ε₀ (p₀ = 1,296,000/T_p(J2000), the derived rate); literature ≈ 54.9' },
    };
  })(),

  // ── Engine-D secular frequencies (Batch D: P1b of the restatement) ──────
  // The A/B-typed keys read data/nbody-secular-frequencies.json — the
  // governed artifact written by tools/verify/nbody-secular.js (--write)
  // from the model's own WH+NAFF pipeline (1PN on; g = leading ecliptic
  // z-mode, s = leading INVARIABLE ζ mode; Laskar 2004 labels are reference
  // only). The derived relativistic supplement's ONE home is
  // <p>PeriAnomalyGrArcsecCy (the P1 projection group below); the generator
  // re-derives the same formula only as the P8b closure assertion.
  ...(() => {
    const nsf = () => rd('data/nbody-secular-frequencies.json');
    const planets8 = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const out = {};
    for (const p of planets8) {
      out[`${p}PeriFreqArcsecPerYr`] = {
        get: () => nsf().g[p].arcsecPerYr,
        render: (v) => Number(v).toFixed(3),
        unit: '″/yr',
        note: 'type A — engine-D long-term apsidal frequency (leading z-mode, 1-Myr WH+NAFF, 1PN on); the artifact records the nearest Laskar 2004 g-mode (Earth and Uranus lead with g5, not their own mode)',
      };
      out[`${p}NodeFreqArcsecPerYr`] = {
        get: () => nsf().s[p].arcsecPerYr,
        render: (v) => Number(v).toFixed(3),
        unit: '″/yr',
        note: 'type A — engine-D long-term nodal frequency (leading ζ-mode, invariable plane, 1-Myr WH+NAFF); nearest Laskar 2004 s-mode in the artifact (Jupiter’s own s5 ≡ 0 by definition of the plane)',
      };
      out[`${p}PeriRateNowArcsecCy`] = {
        get: () => nsf().windowRatesArcsecCy.gr[p],
        render: (v) => (v >= 0 ? '' : '−') + thousands(Math.abs(v), 1),
        unit: '″/cy',
        note: 'type B — engine-D mean ecliptic dϖ/dt over 1800–2100 (1PN on), the present-epoch window rate',
      };
    }
    return out;
  })(),

  // ── Engine-D chain elements of date at J2000 (K7: the element-set keys) ─
  // Evaluated by the SHIPPED evaluator over the embedded governed artifact
  // (@essrt/physics/planets/keplerian-chain + chain-artifact) — the same
  // numbers the simulator panels and the website calculator display at
  // year 2000. Of-date values AT J2000, not catalog inputs (compare the
  // …J2000Full catalog family below). Inv-plane pair = the ENGINE'S OWN
  // banked invariable plane (K5c s-frame).
  ...(() => {
    let cache = null;
    const el = (p) => {
      if (!cache) {
        const KC = require(join(ROOT, 'packages', 'physics', 'src', 'planets', 'keplerian-chain.cjs'));
        const ART = require(join(ROOT, 'packages', 'physics', 'src', 'planets', 'chain-artifact.js')).CHAIN_ARTIFACT;
        const chains = KC.buildPlanetChainsFromArtifactData(ART);
        cache = { KC, chains, ART };
      }
      return cache.KC.computePlanetElementsAtYear(2000, cache.chains[p], cache.chains);
    };
    const planets8 = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const out = {};
    for (const p of planets8) {
      out[`${p}ChainEccJ2000`] = { get: () => el(p).e, render: (v) => Number(v).toFixed(6), note: 'engine-D chain eccentricity of date at J2000 (dimensionless)' };
      out[`${p}ChainPeriLongJ2000Deg`] = { get: () => el(p).lonPeriEclipticDeg, render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'engine-D chain ecliptic longitude of perihelion of date at J2000' };
      out[`${p}ChainInclEclJ2000Deg`] = { get: () => el(p).inclEclipticDeg, render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'engine-D chain inclination to the ecliptic, of date at J2000' };
      out[`${p}ChainAscNodeEclJ2000Deg`] = { get: () => el(p).ascNodeEclipticDeg, render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'engine-D chain ascending node on the ecliptic, of date at J2000' };
      out[`${p}ChainInclInvJ2000Deg`] = { get: () => el(p).inclInvPlaneDeg, render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'engine-D chain inclination to the engine’s own invariable plane (K5c), of date at J2000' };
      out[`${p}ChainAscNodeInvJ2000Deg`] = { get: () => el(p).ascNodeInvPlaneDeg, render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'engine-D chain node on the engine’s own invariable plane (K5c s-frame; node origin = ecliptic-X projected into the plane), of date at J2000' };
      out[`${p}ChainAscNodeInvSSJ2000Deg`] = { get: () => convertToSS(el(p).ascNodeInvPlaneDeg), render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'engine-D chain node on the engine’s own invariable plane, of date at J2000, expressed in the Souami & Souchay (2012) longitude origin (the inv plane’s ascending node on the ICRF equator) via the DERIVED conversion — zero fitted constants (inv-plane-frame.cjs)' };
    }
    const art = () => {
      el('earth');   // ensure cache
      return cache.ART.invariablePlane;
    };
    const originSS = () => {
      const IPF = require(join(ROOT, 'packages', 'physics', 'src', 'planets', 'inv-plane-frame.cjs'));
      return IPF.computeEquatorNodeOriginSFrameDeg(art(), astro.earthOrbital.obliquityJ2000_deg);
    };
    const convertToSS = (sFrameDeg) => (((sFrameDeg - originSS()) % 360) + 360) % 360;
    out.invPlaneNodeOriginSFrameDeg = { get: () => originSS(), render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'the S&S (2012) longitude origin — the invariable plane’s ascending node on the ICRF equator — expressed as an engine s-frame longitude; DERIVED from the banked plane + the J2000 mean obliquity (reproduces S&S’s published node RA 3°51′9.4″ to 0.4 mdeg)' };
    out.invPlaneInclEngineDeg = { get: () => art().inclEclipticDeg, render: (v) => Number(v).toFixed(5), unit: 'deg', note: 'the ENGINE’S OWN invariable plane: inclination to ecliptic J2000 (banked from the J2000-seed total angular momentum; S&S 2012 give 1.5787 as the external reference)' };
    out.invPlaneNodeEngineDeg = { get: () => art().ascNodeEclipticDeg, render: (v) => Number(v).toFixed(4), unit: 'deg', note: 'the ENGINE’S OWN invariable plane: node on the ecliptic (banked, K5c; S&S 2012 give 107.58 as the external reference)' };
    return out;
  })(),

  // ── Scene-vs-JPL published comparison (K6/K7 verdict keys) ──────────────
  // Reads data/chain-vs-jpl-rms.json — the governed artifact banked by
  // tools/verify/measure-rms-by-epoch.js --write (joint RA+Dec RMS,
  // of-date frame, verify-pipeline Step-10 metric). PUBLISHED model
  // content: agreement and divergence are both reported, never tuned.
  ...(() => {
    const cj = () => rd('data/chain-vs-jpl-rms.json');
    const out = {};
    for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${p}ChainVsJplRms2000sArcsec`] = {
        get: () => cj().perTarget[p].refRmsArcsec,
        render: (v) => Number(v).toFixed(1), unit: '″',
        note: 'the rendered chain planet vs the JPL Horizons cache, joint RA+Dec RMS over 2000–2099 (published comparison, never tuned)',
      };
      const earliest = () => {
        const b = cj().perTarget[p].buckets;
        const label = Object.keys(b).find((k) => k !== '<1600') || Object.keys(b)[0];
        return { label, rms: b[label].rmsArcsec };
      };
      out[`${p}ChainVsJplRmsEarliestArcsec`] = {
        get: () => earliest().rms,
        render: (v) => Number(v).toFixed(1), unit: '″',
        note: 'the rendered chain planet vs the JPL Horizons cache over its earliest full cache century — the extrapolation end (published comparison, never tuned)',
      };
      out[`${p}ChainVsJplRmsEarliestWindow`] = {
        get: () => earliest().label,
        render: (v) => String(v),
        note: 'the century window the …EarliestArcsec key measures (cache coverage varies per planet)',
      };
    }
    out.moonVsJplRms2000sArcsec = {
      get: () => cj().perTarget.moon.refRmsArcsec,
      render: (v) => Number(v).toFixed(1), unit: '″',
      note: 'the rendered Moon (engine-K lunar series) vs the JPL Horizons cache, joint RA+Dec RMS over 2000–2099',
    };
    return out;
  })(),

  // ── The deep-time metronome verdict (engine-switch Stage B, T5c) ────────
  // Reads data/nbody-deep-secular-modes.json — the governed ±10-Myr deep
  // mode table banked by tools/verify/deep-secular-modes.js --write. The
  // engine's OWN dynamics (JPL seed, zero fitted constants) must carry the
  // 405-kyr long-eccentricity metronome; La2004 values are theory reference
  // labels, and the falsification criterion keeps the ROCK 405.6 kyr.
  ...(() => {
    const dm = () => rd('data/nbody-deep-secular-modes.json');
    return {
      earthDeepBeatPeriodKyr: {
        get: () => dm().verdict.strongestBeatPeriodKyr,
        render: (v) => Number(v).toFixed(1), unit: 'kyr',
        note: 'the STRONGEST eccentricity beat of the engine’s own ±10-Myr Earth z (g2−g5 class) — the deep-time metronome, from gravity alone (T5c PASS window 395–415)',
      },
      earthDeepBeatLa2004PeriodKyr: {
        get: () => dm().verdict.la2004BeatPeriodKyr,
        render: (v) => Number(v).toFixed(1), unit: 'kyr',
        note: 'the same beat from La2004 Table-3 g2−g5 (THEORY reference label, never an input)',
      },
      earthDeepBeatRockKyr: {
        get: () => dm().verdict.rockMetronomeKyr,
        render: (v) => Number(v).toFixed(1), unit: 'kyr',
        note: 'the rock-record long-eccentricity metronome — the OBSERVED reference the falsification criterion keeps (plan-04 leg; the engine value reproduces it, never replaces it)',
      },
      earthDeepBeatCompanion124Kyr: {
        get: () => dm().verdict.companion124Kyr,
        render: (v) => Number(v).toFixed(1), unit: 'kyr',
        note: 'the ~124-kyr companion line of the deep e-spectrum (g4−g2 class), present and correctly ranked',
      },
      earthDeepBeatCompanion95Kyr: {
        get: () => dm().verdict.companion95Kyr,
        render: (v) => Number(v).toFixed(1), unit: 'kyr',
        note: 'the ~95-kyr companion line of the deep e-spectrum (g4−g5 class), present and correctly ranked',
      },
      earthDeepG5ArcsecPerYr: {
        get: () => dm().verdict.earthLeadingModesArcsecPerYr[0],
        render: (v) => Number(v).toFixed(4), unit: '″/yr',
        note: 'Earth deep z leading mode (g5, Jupiter’s term) from the ±10-Myr NAFF — La2004 gives 4.2575 (theory label)',
      },
      earthDeepG2ArcsecPerYr: {
        get: () => dm().verdict.earthLeadingModesArcsecPerYr[1],
        render: (v) => Number(v).toFixed(4), unit: '″/yr',
        note: 'Earth deep z second mode (g2, Venus’s term) — La2004 gives 7.452, La2010a 7.453 (theory labels); the point-mass run read 7.4230, and the shipped run’s lunar quadrupole + asteroids close that 0.029 ″/yr gap (doc 109 §17)',
      },
      deepRunSpanYears: {
        get: () => dm().meta.spanYears,
        render: (v) => String(v), unit: 'yr',
        note: 'total span of the deep N-body run behind the metronome verdict (±10 Myr, WH order-2, dt 2 d, 1PN)',
      },
      deepRunConservationMaxDE: {
        get: () => dm().meta.conservationMaxDE,
        render: (v) => Number(v).toExponential(1),
        note: 'max |ΔE/E| of the deep run — the symplectic-bound diagnostic',
      },
    };
  })(),

  // ── The Stage-C obliquity hybrid (engine-switch record, K8b-3 opener) ───
  // Reads data/obliquity-hybrid-verdict.json — banked by
  // tools/verify/obliquity-hybrid.js --write from the one-home lab: ε(t)
  // from the averaged precession equation, orbit plane from engine D's deep
  // ζ-modes, ONE anchor α = p₀/cos ε₀, zero fitted constants. La2004 is a
  // THEORY reference label.
  ...(() => {
    const oh = () => rd('data/obliquity-hybrid-verdict.json');
    return {
      epsHybridRateJ2000ArcsecCy: {
        get: () => oh().verdict.rateEraArcsecPerCy,
        render: (v) => Number(v).toFixed(2), unit: '″/cy',
        note: 'dε/dt at J2000 DERIVED by the hybrid (engine-D ζ-modes + the p₀ anchor, zero fitted constants; the era ζ-tier, where J2000-local quantities live) — the quantity the shipped scene A-solve TARGETS',
      },
      epsHybridIauRateArcsecCy: {
        get: () => oh().verdict.iauRateArcsecPerCy,
        render: (v) => Number(v).toFixed(2), unit: '″/cy',
        note: 'the IAU obliquity-rate reference beside the derived value (astro-reference home)',
      },
      epsHybridAlphaArcsecPerYr: {
        get: () => oh().verdict.alphaArcsecPerYr,
        render: (v) => Number(v).toFixed(3), unit: '″/yr',
        note: 'the precession constant α = p₀/cos ε₀ — the hybrid’s single anchor (literature ~54.9)',
      },
      epsHybridBeatKyr: {
        get: () => oh().verdict.beatKyr,
        render: (v) => Number(v).toFixed(1), unit: 'kyr',
        note: 'the dominant obliquity beat |ψ̇| − |s₃| derived by the hybrid, produced natively',
      },
      epsHybridEraRms13KyrArcsec: {
        get: () => oh().verdict.windowsEra['13'].hybridRmsArcsec,
        render: (v) => Number(v).toFixed(0), unit: '″',
        note: 'hybrid ε vs La2004 over 0–13 kyr (the era ζ-slice of the two-tier verdict)',
      },
      epsModeTableRms13KyrArcsec: {
        get: () => oh().verdict.windowsEra['13'].modeTableRmsArcsec,
        render: (v) => Number(v).toFixed(0), unit: '″',
        note: 'the same hybrid ε integration on the bare model\'s 18-mode ζ table (no series artifact — the series-less configuration) vs La2004 over the same 0–13 kyr window — the budget the series-driven ε beats (the verdict REFUSES otherwise)',
      },
      epsHybridDeepRms1MyrArcsec: {
        get: () => oh().verdict.windowsFull['1000'].hybridRmsArcsec,
        render: (v) => Number(v).toFixed(0), unit: '″',
        note: 'hybrid ε vs La2004 over the full megayear (the deep ζ-table tier) — a flat error profile where the fitted law decorrelates',
      },
      epsHybridDeepCorr1Myr: {
        get: () => oh().verdict.windowsFull['1000'].hybridCorr,
        render: (v) => Number(v).toFixed(3),
        note: 'hybrid-vs-La2004 correlation over the full megayear (the same hybrid on the 18-mode table reads lower there)',
      },
    };
  })(),

  // ── The deep-source insolation features (Stage C-2) ─────────────────────
  // Reads data/insolation-stability-deep-results.json — the stability/null
  // instrument run on data/insolation-features-deep.csv (hybrid ε + deep
  // z/ζ + the physical of-date climatic precession). Published BESIDE the
  // earlier model-e(t) record (insolStab*Model keys), never over it.
  ...(() => {
    const sd = () => rd('data/insolation-stability-deep-results.json');
    return {
      insolStabEccMinDeep: {
        get: () => sd().ecc_range_model_0_5320kyr[0],
        render: (v) => Number(v).toFixed(5),
        note: 'the DEEP-source e(t) minimum over the LR04 span (0–5320 kyr) — beside insolStabEccMinLaskar; the law’s envelope gap closes',
      },
      insolStabEccMaxDeep: {
        get: () => sd().ecc_range_model_0_5320kyr[1],
        render: (v) => Number(v).toFixed(5),
        note: 'the DEEP-source e(t) maximum over the LR04 span — matches the La2004 envelope',
      },
      insolDeepMaxCvDeltaR2: {
        get: () => sd().max_model_cv_delta_r2,
        render: (v) => Number(v).toExponential(2),
        note: 'the deep-source features’ best cross-validated ΔR² on LR04 across regimes — the NULL verdict (no stable positive regime): the climate signal is not a direct e/ε feature, matching the L1 attribution doctrine',
      },
    };
  })(),

  // ── The C-4 spin/Cassini landscape (doc 109 §19) ────────────────────────
  // OUR deep node lines (data/nbody-deep-secular-modes.json — the leading
  // proper ζ mode per planet) beside the OBSERVED spin-precession constants
  // (astro-reference planetSpinObserved — a TARGET block: citations, never
  // inputs). The landscape verdicts live in the two Stage-C-4 labs.
  ...(() => {
    const dm = () => rd('data/nbody-deep-secular-modes.json');
    const lead = (p) => {
      const m = dm().modes[p].zeta.filter((x) => Math.abs(x.omegaRadPerYr) > 1e-9)
        .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
      return (m.omegaRadPerYr * 180 / Math.PI) * 3600;
    };
    const sp = astro.planetSpinObserved;
    return {
      deepNodeS8ArcsecPerYr: { get: () => lead('neptune'), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the engine’s OWN s8 (Neptune’s proper nodal mode, deep ζ table) — the line Saturn’s spin is captured at (Ward & Hamilton 2004); Laskar gives −0.692' },
      deepNodeS7ArcsecPerYr: { get: () => lead('uranus'), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the engine’s OWN s7 (Uranus’s proper nodal mode) — the line Jupiter’s spin is entering (Saillenfest 2020); Laskar gives −2.993' },
      deepNodeS1ArcsecPerYr: { get: () => lead('mercury'), render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'the engine’s OWN s1 (Mercury’s proper nodal mode) — the node Mercury’s Cassini-locked spin follows (Margot 2007)' },
      marsSpinPrecObsArcsecPerYr: { get: () => sp.marsSpinPrecessionArcsecPerYr, render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'OBSERVED Mars spin precession (Konopliv 2016 / InSight) — sits INSIDE the engine’s inner s-band: the chaotic-obliquity regime (citation target, never an input)' },
      jupiterSpinPrecObsArcsecPerYr: { get: () => sp.jupiterSpinPrecessionApproxArcsecPerYr, render: (v) => Number(v).toFixed(1), unit: '″/yr', note: 'Jupiter spin precession ≈ (Saillenfest 2020, MoI-dependent −2.7…−2.9) — adjacent to the engine’s s7 (citation target)' },
      saturnSpinPrecLongTermArcsecPerYr: { get: () => sp.saturnSpinPrecessionPresentArcsecPerYr / sp.saturnPresentToLongTermFraction, render: (v) => Number(v).toFixed(3), unit: '″/yr', note: 'Saturn’s long-term pole rate (present −0.45 ÷ 0.68, the Titan-cycle fraction; Ward & Hamilton 2004) — sits on the engine’s s8 to ~4% (citation-derived target)' },
    };
  })(),

  // ── The planets' spin channel — DERIVED ─────────────────────────────────
  // The precession constant from each planet's OWN torques (astro-reference
  // planetSpinPhysical: J₂, C/MR², the IAU pole and spin, the regular
  // satellites; Ward & Hamilton 2004 form) on the model's OWN orbit (chain
  // a/e/n, the deep ζ plane history), the spin integrated from the IAU J2000
  // pole — ONE home packages/physics/src/planets/spin-channel.cjs, read here
  // through the package model. The observed rows above are the closures /
  // targets these are checked against (test:spin-channel).
  ...(() => {
    const spin = (p) => physModel().planets.spin(p);
    const band = (p) => spin(p).obliquityEnvelopeDeg(2000, 1_000_000);
    // the engine's own leading nodal line per planet (the deep ζ table), as the C-4 block reads it
    const leadZeta = (p) => {
      const z = rd('data/nbody-deep-secular-modes.json').modes[p].zeta.filter((x) => Math.abs(x.omegaRadPerYr) > 1e-9)
        .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
      return (z.omegaRadPerYr * 180 / Math.PI) * 3600;
    };
    const s8 = () => leadZeta('neptune');
    const s1 = () => leadZeta('mercury');
    /** @type {Record<string, any>} */
    const keys = {};
    const NAMES = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune' };
    for (const [p, N] of Object.entries(NAMES)) {
      keys[`${p}SpinAlphaDerivedArcsecPerYr`] = { get: () => spin(p).alphaArcsecPerYr, render: (v) => Number(v).toFixed(p === 'uranus' || p === 'neptune' ? 4 : 3), unit: '″/yr', note: `${N}'s precession constant α DERIVED from its own J₂, C/MR², spin and satellites on the model's orbit (Ward & Hamilton 2004 form; the ${p === 'mercury' ? 'free constant — Mercury is Cassini-locked, α_free/|s1| = the lock statement' : 'torque side of the spin channel'})` };
      keys[`${p}SpinMomentOfInertiaFactor`] = { get: () => astro.planetSpinPhysical[p].momentOfInertiaFactor, render: (v) => String(v), unit: '', note: `${N}'s normalized polar moment of inertia C/MR² as INPUT to the spin channel (${astro.planetSpinPhysical[p].momentOfInertiaFactorClass}; source in the astro-reference planetSpinPhysical _description)` };
      keys[`${p}ObliquityJ2000DerivedDeg`] = { get: () => spin(p).obliquityJ2000Deg, render: (v) => Number(v).toFixed(3), unit: '°', note: `${N}'s J2000 obliquity to its own orbit, DERIVED as the angle between the IAU J2000 pole (angular-momentum sense: Venus ≈ 177°, Uranus ≈ 98°) and the chain's J2000 orbit plane — not an input` };
      if (p === 'mercury') continue;
      keys[`${p}SpinPrecDerivedArcsecPerYr`] = { get: () => spin(p).spinPrecessionRateArcsecPerYrJ2000, render: (v) => Number(v).toFixed(p === 'uranus' || p === 'neptune' ? 4 : 3), unit: '″/yr', note: `${N}'s J2000 pole precession rate about its orbit normal, ψ̇ = −α cos ε, DERIVED (negative = retrograde precession of a prograde spinner; Venus's retrograde spin precesses prograde)` };
      keys[`${p}AxialPrecessionPeriodDerivedYr`] = { get: () => spin(p).axialPrecessionPeriodYearsJ2000, render: (v) => thousands(Math.round(v)), unit: 'yr', note: `${N}'s axial precession period at J2000 on the derived channel (2π/|ψ̇|)` };
      keys[`${p}ObliquityBandMinDeg`] = { get: () => band(p).minDeg, render: (v) => Number(v).toFixed(2), unit: '°', note: `${N}'s obliquity minimum over ±1 Myr around J2000, the spin integrated on the planet's own ζ plane history (quasi-periodic tables: the envelope, never chaotic diffusion)` };
      keys[`${p}ObliquityBandMaxDeg`] = { get: () => band(p).maxDeg, render: (v) => Number(v).toFixed(2), unit: '°', note: `${N}'s obliquity maximum over ±1 Myr around J2000 (same integration)` };
    }
    keys.mercurySpinFreeToNodeRatio = { get: () => spin('mercury').alphaArcsecPerYr / Math.abs(s1()), render: (v) => Number(v).toFixed(1), unit: '×', note: 'Mercury: the free precession constant over its own node rate (s1) — ≫ 1 is the Cassini lock (Margot 2007) stated from the model\'s own numbers; the shipped axial row is the node rate' };
    keys.marsSpinPrecClosurePct = { get: () => (spin('mars').spinPrecessionRateArcsecPerYrJ2000 / astro.planetSpinObserved.marsSpinPrecessionArcsecPerYr - 1) * 100, render: (v) => Number(v).toFixed(2), unit: '%', note: 'Mars: the derived pole rate against the measured −7.606 ″/yr (Konopliv 2016) — a CLOSURE (the source inferred C/MR² from this rate), through the model\'s own a, e, n' };
    keys.venusSpinPrecClosurePct = { get: () => (Math.abs(spin('venus').spinPrecessionRateArcsecPerYrJ2000) / 44.58 - 1) * 100, render: (v) => Number(v).toFixed(2), unit: '%', note: 'Venus: the derived pole rate against the measured 44.58 ± 3.3 ″/yr (Margot et al. 2021) — a closure of their C/MR² inference' };
    keys.saturnSpinPrecVsS8Pct = { get: () => (spin('saturn').spinPrecessionRateArcsecPerYrJ2000 / s8() - 1) * 100, render: (v) => Number(v).toFixed(1), unit: '%', note: 'Saturn: the derived pole rate against the engine\'s OWN s8 (the Ward–Hamilton capture line) at the gravity-constrained C/MR² 0.2181 — the WH04 libration band 0.2257–0.2438 lands within +7…−1 % (measured in the Phase 7 lab)' };
    keys.jupiterSpinAlphaVsSaillenfestLowPct = { get: () => (spin('jupiter').alphaArcsecPerYr / 2.64 - 1) * 100, render: (v) => Number(v).toFixed(1), unit: '%', note: 'Jupiter: the derived α relative to the low end of Saillenfest et al. 2020\'s 2.64–3.17 ″/yr range (positive = inside the range; their range spans the older moment-of-inertia band, the gravity-constrained 0.2639 sits at its low end)' };
    return keys;
  })(),

  // ── The sharpened leg-1 obliquity statement (owner-adopted) ─────────────
  // The obliquity band follows the BEAT 2π/(ψ̇(t) − |s₃|): the spin
  // precession ψ̇(t) the COMPOSED lunisolar rate (on the derived J2000 anchor
  // — the SAME scaling the shipped hybrid precesses on), s₃ at its dynamical
  // value under the measured μ ≈ 1 (engine D). The pre-registered alternative
  // "obliquity period ∝ T_p" (the `obliqPrecScaled*Kyr` keys, D8 (iii)) holds
  // the J2000 beat proportional to T_p(t) — identical to the beat at J2000
  // by construction, the two split at Precambrian ages (plan 02 §8; doc 109
  // §18).
  ...(() => {
    const DT = () => require(join(ROOT, 'tools', 'lib', 'deep-time.js'));
    const s3 = () => {
      const z = rd('data/nbody-deep-secular-modes.json').modes.earth.zeta
        .filter((m) => Math.abs(m.omegaRadPerYr) > 1e-9)
        .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
      return Math.abs(z.omegaRadPerYr * 180 / Math.PI) * 3600;   // ″/yr
    };
    // T_p(t) = the composed lunisolar period on the derived J2000 anchor — ONE home; the RATE of
    // date (the cited mean obliquity's cosine on the constant's scaling)
    const axialYr = (tMa) => DT().meanLunisolarPrecessionPeriodYearsAtAge(tMa);
    // The beat rides the spin axis's INERTIAL rate: the composed rate × the hybrid's self-anchor
    // factor (inertial/general at J2000, the multiplicative form the obliquity integration applies).
    const kInertial = () => physModel().epoch.axialPrecessionYearsAtYear(2000) / physModel().lunisolar.spinAxisInertialPeriodYearsJ2000;
    const beatKyr = (tMa) => 1296000 / ((1296000 / axialYr(tMa)) * kInertial() - s3()) / 1000;
    // "obliquity period ∝ T_p": the J2000 beat held proportional to T_p(t) (≡ the beat at J2000)
    const h8Kyr = (tMa) => beatKyr(0.000001) * axialYr(tMa) / axialYr(0.000001);
    const mk = (name, tMa, label) => ({
      [`obliqBeat${name}Kyr`]: { get: () => beatKyr(tMa), render: (v) => Number(v).toFixed(1), unit: 'kyr', note: `the obliquity band as the BEAT 2π/(ψ̇ᵢₙ − |s₃|) at ${label} — ψ̇ᵢₙ the spin axis's inertial rate of date (the composed lunisolar RATE — the constant's scaling × the cited mean obliquity's cos ε̄(t)/cos ε̄(0), plan 06 D6/Phase 3/S5 + plan 12 §8 — times the hybrid's self-anchor factor), s₃ dynamical under measured μ (the adopted leg-1 form)` },
      [`obliqPrecScaled${name}Kyr`]: { get: () => h8Kyr(tMa), render: (v) => Number(v).toFixed(1), unit: 'kyr', note: `the pure precession-scaling reading "obliquity period ∝ T_p" (the J2000 beat × T_p(t)/T_p(J2000)) at ${label} — identical to the beat at J2000, the discriminated alternative at depth` },
      // Deprecated alias (plan 16: no unit label in a published key name) — one version, for the website's pin; then it goes.
      [`obliqH8Scaled${name}Kyr`]: { get: () => h8Kyr(tMa), render: (v) => Number(v).toFixed(1), unit: 'kyr', note: `deprecated alias of obliqPrecScaled${name}Kyr` },
    });
    return {
      ...mk('J2000', 0.000001, 'J2000'),
      ...mk('Devonian', 380, '380 Ma'),
      ...mk('200MyrFuture', -200, '+200 Myr'),
      ...mk('1400Ma', 1400, '1.4 Ga'),
      ...mk('2460Ma', 2460, '2.46 Ga'),
    };
  })(),

  // ── Full-precision J2000 catalog elements (doc-20 reference tables) ─────
  // Straight reads of astro-reference planetOrbitalElements — the JPL/SPICE
  // catalog inputs, rendered at stored precision (String of the raw value).
  ...(() => {
    const out = {};
    for (const [planet, el] of Object.entries(astro.planetOrbitalElements)) {
      if (planet.startsWith('_') || typeof el !== 'object') continue;
      out[`${planet}EccJ2000Full`] = { get: () => el.orbitalEccentricityJ2000, render: (v) => String(v), note: 'JPL J2000 catalog input' };
      out[`${planet}PeriLongJ2000Full`] = { get: () => el.longitudePerihelion, render: (v) => String(v), unit: 'deg', note: 'JPL J2000 catalog input' };
      out[`${planet}EclInclJ2000Full`] = { get: () => el.eclipticInclinationJ2000, render: (v) => String(v), unit: 'deg', note: 'JPL/SPICE catalog input' };
      out[`${planet}AscNodeEclJ2000`] = { get: () => el.ascendingNode, render: (v) => String(v), unit: 'deg', note: 'JPL/SPICE catalog input' };
      out[`${planet}MeanAnomalyJ2000`] = { get: () => el.meanAnomaly, render: (v) => String(v), unit: 'deg', note: 'JPL J2000 catalog input' };
      out[`${planet}TrueAnomalyJ2000`] = { get: () => el.trueAnomaly, render: (v) => String(v), unit: 'deg', note: 'JPL J2000 catalog input' };
    }
    return out;
  })(),

  // ── External year/day-length inputs (astro-reference yearLengthRef) ─────
  ...(() => {
    const y = astro.yearLengthRef;
    return {
      tropicalYearMeanJ2000Days: { get: () => C.meanSolarYearDays, render: (v) => Number(v).toFixed(9), unit: 'days', note: 'derived: the beat of the IAU sidereal year and the IAU 2006 p_A per Julian year, 1/T = 1/T_sid + p_A/(1,296,000″·365.25 d) — ONE home, @essrt/physics computeMeanTropicalYearJ2000Days (plan 09; was the Meeus & Savoie 1992 input 365.2421897, 66 ms shorter)' },
      tropicalYearVEJ2000Days: { get: () => y.tropicalYearVE, render: (v) => String(v), unit: 'days', note: 'Meeus & Savoie 1992' },
      tropicalYearSSJ2000Days: { get: () => y.tropicalYearSS, render: (v) => String(v), unit: 'days', note: 'Meeus & Savoie 1992' },
      tropicalYearAEJ2000Days: { get: () => y.tropicalYearAE, render: (v) => String(v), unit: 'days', note: 'Meeus & Savoie 1992' },
      tropicalYearWSJ2000Days: { get: () => y.tropicalYearWS, render: (v) => String(v), unit: 'days', note: 'Meeus & Savoie 1992' },
      siderealDayInputSeconds: { get: () => y.siderealDay, render: (v) => thousands(v, 6), unit: 's', note: 'IERS input' },
      stellarDayInputSeconds: { get: () => y.stellarDay, render: (v) => thousands(v, 6), unit: 's', note: 'IERS input' },
      obliquityJ2000Arcsec: { get: () => astro.earthOrbital.obliquityJ2000_deg * 3600, render: (v) => v.toFixed(3), unit: 'arcsec', note: 'IAU 2006' },
      obliquityRateArcsecPerCy: { get: () => astro.earthOrbital.obliquityRate_arcsecPerCentury, render: (v) => String(v), unit: 'arcsec/cy', note: 'IAU 2006' },
    };
  })(),

  // ── Reference + tuned-parameter keys (doc-20 remainder) ─────────────────
  // Mass ratios, Meeus lunar/solar mean elements, JPL inclination trends,
  // minor-body catalog elements, per-planet tuned parameters — all straight
  // reads of astro-reference / model-parameters / the engine.
  ...(() => {
    const group = (v) => { const [i, f] = String(v).split('.'); return i.replace(/(\d)(?=(\d{3})+$)/g, '$1,') + (f ? '.' + f : ''); };
    const out = {};
    for (const [p, v] of Object.entries(astro.physicalConstants.massRatioDE440)) {
      out[`${p}MassRatioDE440`] = { get: () => v, render: group, note: 'DE440 M_Sun / M_body' };
    }
    for (const p of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${p}MassFraction`] = { get: () => C.massFraction[p], render: (v) => fmtSci(v, 3), note: 'M_planet / M_Sun' };
    }
    for (const [k, v] of Object.entries(astro.moonMeeus)) {
      if (k.startsWith('_') || typeof v !== 'number') continue;
      const key = k.replace(/_deg$/, 'Deg').replace(/_degPerDay$/, 'DegPerDay').replace(/_degPerCentury$/, 'DegPerCentury');
      out[key] = { get: () => v, render: (v2) => String(v2), note: 'Meeus Ch. 47 mean element' };
    }
    for (const [p, v] of Object.entries(astro.jplEclipticInclinationTrends)) {
      if (p.startsWith('_') || typeof v !== 'number') continue;
      out[`${p}EclInclTrendDegPerCy`] = { get: () => v, render: (v2) => String(v2), unit: 'deg/cy', note: 'JPL approx_pos catalog trend' };
    }
    for (const b of ['pluto', 'ceres']) {
      out[`${b}OmegaSS`] = { get: () => astro.ascendingNodesSouamiSouchay[b], render: (v) => String(v), unit: 'deg', note: 'Souami & Souchay 2012' };
    }
    for (const [p, el] of Object.entries(astro.planetOrbitalElements)) {
      if (p.startsWith('_') || typeof el !== 'object') continue;
      out[`${p}OrbitalPeriodInputDays`] = { get: () => el.solarYearInput, render: (v) => String(v), unit: 'days', note: 'JPL orbital period input' };
      out[`${p}AxialTiltJ2000`] = { get: () => el.axialTiltJ2000, render: (v) => String(v), unit: 'deg', note: 'IAU' };
    }
    for (const [b, el] of Object.entries(astro.additionalBodiesReference)) {
      if (b.startsWith('_') || typeof el !== 'object') continue;
      out[`${b}OrbitalPeriodInputDays`] = { get: () => el.solarYearInput, render: group, unit: 'days', note: 'JPL orbital period input' };
      out[`${b}EccJ2000Full`] = { get: () => el.orbitalEccentricityJ2000, render: (v) => String(v), note: 'JPL J2000 catalog input' };
      out[`${b}EclInclJ2000Full`] = { get: () => el.eclipticInclinationJ2000, render: (v) => String(v), unit: 'deg', note: 'JPL catalog input' };
      out[`${b}PeriLongJ2000Full`] = { get: () => el.longitudePerihelion, render: (v) => String(v), unit: 'deg', note: 'JPL catalog input' };
      out[`${b}AscNodeEclJ2000`] = { get: () => el.ascendingNode, render: (v) => String(v), unit: 'deg', note: 'JPL catalog input' };
      out[`${b}InvPlaneInclJ2000`] = { get: () => el.invPlaneInclinationJ2000, render: (v) => String(v), unit: 'deg', note: 'S&S 2012' };
    }
    out.eocEccentricityValue = { get: () => C.eocEccentricity, render: (v) => v.toFixed(5), note: 'derived: e(J2000)/2 — the Sun node\'s EoC half under the one eccentricity law' };
    out.perihelionPassageJD = { get: () => astro.earthOrbital.perihelionPassageJ2000_JD, render: (v) => String(v), unit: 'JD', note: 'USNO (2000 Jan 3)' };
    out.juneSolstice2000JD = { get: () => astro.earthOrbital.juneSolstice2000_JD, render: (v) => String(v), unit: 'JD', note: 'USNO (June 21, 2000)' };
    // R4d: the four observed 2000 cardinal instants (USNO "Earth's Seasons",
    // UTC, minute precision) — reference data, one home (astro-reference
    // cardinalPointAnchors); no runtime reads them.
    for (const [cp, label] of [['VE', 'March equinox'], ['SS', 'June solstice'], ['AE', 'September equinox'], ['WS', 'December solstice']]) {
      out[`cardinalAnchor${cp}2000JD`] = { get: () => astro.cardinalPointAnchors[cp], render: (v) => String(v), unit: 'JD', note: `USNO 2000 ${label} (UTC, minute precision)` };
    }
    // The node cycle SURVIVES as a quantity — it is the chain's leading nodal
    // eigenmode — so the key keeps its name: 1,296,000/|s| yr, the twin of
    // <p>PeriPeriodICRF on the g side.
    for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${p}AscNodeCycleYears`] = {
        get: () => 1296000 / Math.abs(chainArt().s[p].arcsecPerYr),
        render: (v) => thousands(Math.round(v)),
        unit: 'yr',
        note: `nodal cycle on the invariable plane — the chain's leading secular nodal mode (${chainArt().s[p].nearestLaskar.mode}, ${chainArt().s[p].arcsecPerYr.toFixed(3)} ″/yr; regression, so the period is quoted as a magnitude)`,
      };
    }
    return out;
  })(),

  // ── Inertial (ICRF) perihelion periods ──────────────────────────────────
  // The planets' inertial perihelion period is the chain's secular apsidal
  // mode, 1,296,000/|g| yr, read from the governed artifact — the same number
  // every runtime's `perihelionEclipticYears` carries.
  ...(() => {
    // The planets' inertial (vs the stars) perihelion period is the chain's
    // secular mode, 1,296,000/|g| yr.
    const out = {};
    for (const planet of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}PeriPeriodICRF`] = {
        // S6: Earth's apsidal period against the stars is the one-family route's value.
        get: () => (planet === 'earth' ? oneYL().inclinationPrecessionYearsAtYear(2000) : 1296000 / Math.abs(chainG(planet))),
        render: (v) => thousands(Math.round(v)),
        unit: 'yr',
        note: planet === 'earth' ? 'Earth’s apsidal period vs the stars — the one-family route' : `inertial perihelion period, 1,296,000/|g| — the chain’s leading secular apsidal mode (${chainArt().g[planet].nearestLaskar.mode}); prograde`,
      };
    }
    // Pluto, Halley and Eros are not in the model; Ceres remains only as a
    // force-only perturber in the N-body run and as reference data, neither of
    // which needs a perihelion period. The bodies' OBSERVED values (DE440 mass
    // ratio, J2000 node and inclination) stay — they are external measurements
    // used in the mass-from-moon and ascending-node calibrations, independent
    // of whether anything is drawn.
    return out;
  })(),

  // ── Semi-major axes (11-2aa) — Kepler over the quantized year inputs ────
  // a = (T_planet / mSY)^(2/3), T from the tracked per-planet solarYearInput
  // (the model's quantized orbital period in days); Earth 1.0 by definition.
  ...(() => {
    const out = {};   // (plan 07 sweep: `earthSemiMajor` = 1 by definition is gone; nothing quoted it)
    for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}SemiMajor`] = {
        get: () => Math.pow(C.planets[planet].solarYearInput / C.meanSolarYearDays, 2 / 3),
        render: (v) => Number(v).toFixed(4),
        unit: 'AU',
        note: 'Kepler: (solarYearInput / mSY)^(2/3)',
      };
    }
    return out;
  })(),

  // ── Planet invariable-plane inclination family (11-2ab) ─────────────────
  // Mean and range of the CHAIN's inclination to the model's invariable plane
  // over the banked ±10-Myr series (the API's invPlaneInclinationDeg, sampled
  // every 2 kyr). A multi-mode quantity has no single amplitude: the range is
  // published as `<p>InclMin`/`<p>InclMax` (below), never as a symmetric swing
  // about the mean (Mercury's is 0.14°–10.97° about 6.69°). `<p>OmegaJ2000` is
  // the chain's J2000 node from the Souami & Souchay origin (the API's value);
  // `<p>InclJ2000` stays the S&S 2012 reference. (The earlier port surfaced
  // website defect #7, precision loss from 5-dp constants — both site tables
  // carry the registry's full precision.)
  ...(() => {
    const out = {};
    for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}InclMean`] = { get: () => chainInclStats(planet).mean, render: (v) => Number(v).toFixed(6), unit: '°', note: 'mean inclination to the invariable plane over the banked ±10-Myr series ' };
      out[`${planet}OmegaJ2000`] = { get: () => physModel().planets.ascendingNodeInvPlaneDeg(planet, 2000), render: (v) => Number(v).toFixed(2), unit: '°', note: 'the chain’s J2000 ascending node on the invariable plane, S&S origin' };
      out[`${planet}InclJ2000`] = { get: () => astro.planetOrbitalElements[planet].invPlaneInclinationJ2000, render: (v) => String(v), unit: '°', note: 'Souami & Souchay 2012 — the reference beside the chain anchor' };
    }
    return out;
  })(),

  // ── Pluto node + the planets' inclination envelopes (11-2ac) ───────────
  // Pluto's Ω is the model's VERIFIED closed-form node (101.06 — deliberately
  // ≠ the raw S&S 107.06; docs/32 table), astro-reference
  // additionalBodiesReference. Min/max are the series' own minimum and maximum
  // at 2 dp (model-values 23.0.0; a symmetric mean ∓ half-range had published
  // Venus's minimum as −0.19° for a range that is 0.00°–3.46° about a mean of
  // 1.54°); the *Round keys are the 3-dp J2000 table forms.
  ...(() => {
    const j2000Of = (planet) => {
      if (planet === 'earth') return astro.earthOrbital.earthInclinationJ2000_deg;
      return astro.planetOrbitalElements[planet].invPlaneInclinationJ2000;
    };
    const out = {
      // What is published for Pluto is observed: the node the ascending-node
      // calibration compares, and the J2000 inclination it is measured against.
      plutoOmegaJ2000: { get: () => astro.additionalBodiesReference.pluto.ascendingNodeInvPlaneClosedForm, render: (v) => Number(v).toFixed(2), unit: '°', note: 'the model\'s VERIFIED closed-form node — deliberately ≠ raw S&S 107.06 (docs/32); astro-reference additionalBodiesReference' },
      plutoInclJ2000: { get: () => astro.additionalBodiesReference.pluto.invPlaneInclinationJ2000, render: (v) => String(v), unit: '°' },
    };
    for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}InclMin`] = { get: () => chainInclStats(planet).min, render: (v) => Number(v).toFixed(2), unit: '°', note: 'the minimum of the chain\'s inclination to the invariable plane over the banked ±10-Myr series (model-values 23.0.0; was mean − half-range)' };
      out[`${planet}InclMax`] = { get: () => chainInclStats(planet).max, render: (v) => Number(v).toFixed(2), unit: '°', note: 'the maximum of the chain\'s inclination to the invariable plane over the banked ±10-Myr series (model-values 23.0.0; was mean + half-range)' };
    }
    for (const planet of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}InclJ2000Round`] = { get: () => j2000Of(planet), render: (v) => Number(v).toFixed(3), unit: '°' };
    }
    return out;
  })(),

  // ── Axial-precession identities + perihelion baselines (11-2ad) ─────────
  // `<p>ModelBaseline` is the chain's NEWTONIAN era window rate (1800–2100,
  // 1PN off) in ″/cy — the baseline Mercury's relativistic supplement sits on
  // (gr − newton = 43.0 ″/cy, the engine's own 1PN advance); Earth's row is
  // the one-family apsidal rate vs the stars.
  ...(() => {
    const baselineArcsecCy = (planet) => (planet === 'earth'
      ? 1296000 * 100 / oneYL().inclinationPrecessionYearsAtYear(2000)
      : chainWindowNewton(planet));
    const out = {
      axialPrecExact: { get: () => oneYL().axialPrecessionYearsAtYear(2000), render: (v) => thousands(v, 2), unit: 'yr', note: 'the J2000 of-date axial precession period' },
      siderealYearsPerAxialPrec: { get: () => Math.round(oneYL().axialPrecessionYearsAtYear(2000)) - 1, render: (v) => thousands(v), note: 'one fewer sidereal year than tropical years per axial precession period (coin rotation) — on the J2000 of-date period (S5; was round(H/13) − 1)' },
    };
    for (const planet of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${planet}ModelBaseline`] = {
        get: () => baselineArcsecCy(planet),
        render: (v) => thousands(v, 1),
        unit: '″/cy',
        note: planet === 'earth' ? 'apsidal rate vs the stars — the one-family route' : 'the chain’s Newtonian era window rate (1800–2100, 1PN off); with 1PN see <p>PeriRateNowArcsecCy',
      };
    }
    return out;
  })(),

  // ── Mercury anomaly + observed-rate citations (11-2ae) ──────────────────
  // The Mercury J2000 "anomaly" keys are the Earth-frame RA rate minus the
  // chain's Newtonian baseline — the projection terms (predictiveMachinery);
  // baseline diff = |textbook Newtonian − the chain's baseline|. The
  // observed-rate family are WebGeocalc/literature citations in knownValues
  // (see its _perihelionRatesNote).
  ...(() => {
    const kv = () => astro.knownValues;
    return {
      mercuryNewtonian:    { get: () => kv().mercuryNewtonianArcsecCy, render: (v) => thousands(v), unit: '″/cy', note: 'textbook Newtonian rate — citation' },
      mercuryObservedICRF: { get: () => kv().mercuryObservedICRFArcsecCy, render: (v) => thousands(v), unit: '″/cy', note: 'textbook 532 + 43 chain' },
      mercuryPark2017Rate: { get: () => kv().mercuryPark2017RateArcsecCy, render: (v) => String(v), unit: '″/cy', note: 'Park 2017 MESSENGER-era determination' },
      mercuryAnomalyClassic: { get: () => kv().mercuryAnomalyClassicArcsecCy, render: (v) => String(v), unit: '″/cy', note: 'the classic GR anomaly — citation' },
      mercuryBaselineDiff: {
        get: () => Math.abs(kv().mercuryNewtonianArcsecCy - chainWindowNewton('mercury')),
        render: (v) => thousands(v, 1),
        unit: '″/cy',
        note: 'textbook Newtonian vs the chain’s Newtonian era window rate',
      },
      mercuryObservedRate: { get: () => kv().mercuryObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy', note: 'WebGeocalc 1900–2000 heliocentric trend' },
      venusObservedRate:   { get: () => kv().venusObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy', note: '~0 — flips sign across sub-windows' },
      earthObservedRate:   { get: () => kv().earthObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy', note: 'geocentric, wrt moving equinox' },
      earthObservedRateHelio: { get: () => kv().earthObservedRateHelioArcsecCy, render: (v) => thousands(v), unit: '″/cy' },
      marsObservedRate:    { get: () => kv().marsObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy' },
      jupiterObservedRate: { get: () => kv().jupiterObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy' },
      saturnObservedRate:  { get: () => kv().saturnObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy', note: 'ecliptic-retrograde' },
      saturnMissingAdvanceArcsec: { get: () => kv().saturnMissingAdvanceArcsec, render: (v) => thousands(v), unit: '″', note: 'bridges heliocentric baseline to geocentric rate' },
      uranusObservedRate:  { get: () => kv().uranusObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy' },
      neptuneObservedRate: { get: () => kv().neptuneObservedRateArcsecCy, render: (v) => thousands(v), unit: '″/cy' },
    };
  })(),

  // ── Fluctuation ranges + geocentric chain (11-2af) ──────────────────────
  // The per-planet "fluctuation" range is the range of the PROJECTION TERMS of
  // the chain motion (predictiveMachinery.chainFluct: projection excess +
  // obliquity-rate term, doc 13 §1.8) over one perihelion cycle centred on
  // J2000 — a property of the perihelion's longitude against the equinox, ε
  // from the published one-source movement. Mercury's extremes are refined to
  // the year. Earth's row stays the ERD form (×360,000, browser form).
  // Geocentric chain = ICRF citations + the general-precession equinox drift
  // (knownValues).
  ...(() => {
    const { chainFluct, earthPeriOfDateRateArcsecCy } = predictiveMachinery();
    let scans = null;
    const scan = () => {
      if (!scans) {
        scans = {};
        // one secular perihelion period, 1,296,000/|g| (the chain's leading mode)
        const cycleOf = (p) => 1296000 / Math.abs(chainG(p));
        {
          const T = cycleOf('mercury');
          let mn = Infinity, mx = -Infinity, mnY = 0, mxY = 0;
          for (let y = Math.round(2000 - T / 2); y <= 2000 + T / 2; y += 100) {
            const f = chainFluct(y, 'mercury');
            if (f < mn) { mn = f; mnY = y; }
            if (f > mx) { mx = f; mxY = y; }
          }
          for (let y = mnY - 100; y <= mnY + 100; y++) { const f = chainFluct(y, 'mercury'); if (f < mn) { mn = f; mnY = y; } }
          for (let y = mxY - 100; y <= mxY + 100; y++) { const f = chainFluct(y, 'mercury'); if (f > mx) { mx = f; mxY = y; } }
          scans.mercury = { mn, mx, mnY, mxY };
        }
        for (const p of ['venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
          const T = cycleOf(p);
          let mn = Infinity, mx = -Infinity;
          for (let y = Math.round(2000 - T / 2); y <= 2000 + T / 2; y += Math.max(100, Math.round(T / 4000))) {
            const f = chainFluct(y, p);
            if (f < mn) mn = f;
            if (f > mx) mx = f;
          }
          scans[p] = { mn, mx };
        }
        {
          // Earth: the series' perihelion-of-date rate minus its mean over one
          // perihelion-of-date period T_peri centred on J2000 — inside the
          // one-family window — the analogue of the planets' scan over one
          // secular period.
          const T = physModel().lunisolar.periOfDatePeriodYearsAtYear(2000);
          const rates = [];
          for (let y = Math.round(2000 - T / 2); y <= 2000 + T / 2; y += 10) rates.push(earthPeriOfDateRateArcsecCy(y));
          const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
          let mn = Infinity, mx = -Infinity;
          for (const r of rates) { const f = r - mean; if (f < mn) mn = f; if (f > mx) mx = f; }
          scans.earth = { mn, mx };
        }
      }
      return scans;
    };
    const fmtSignedInt = (v) => `${v >= 0 ? '+' : '-'}${thousands(Math.abs(Math.round(v)))}`;
    const out = {
      equinoxDriftRate: { get: () => 100 * astro.earthOrbital.generalPrecessionJ2000_arcsecPerYr, render: (v) => thousands(v, 1), unit: '″/cy', note: 'IAU 2006 general precession p_A per Julian century — the model’s J2000 input ×100 (was the rounded knownValues.generalPrecessionArcsecCy 5028.8)' },
      mercuryFluctuationMin: { get: () => scan().mercury.mn, render: fmtSignedInt, unit: '″/cy' },
      mercuryFluctuationMax: { get: () => scan().mercury.mx, render: fmtSignedInt, unit: '″/cy' },
      earthFluctuationMin: { get: () => scan().earth.mn, render: fmtSignedInt, unit: '″/cy', note: 'the series\' perihelion-of-date rate minus its mean over one T_peri centred on J2000' },
      earthFluctuationMax: { get: () => scan().earth.mx, render: fmtSignedInt, unit: '″/cy', note: 'as earthFluctuationMin' },
    };
    for (const p of ['venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${p}FluctuationMin`] = { get: () => scan()[p].mn, render: fmtSignedInt, unit: '″/cy' };
      out[`${p}FluctuationMax`] = { get: () => scan()[p].mx, render: fmtSignedInt, unit: '″/cy' };
    }
    return out;
  })(),

  // ── J2000 rates + BepiColombo projection (11-2ag) ───────────────────────
  // All through the shared predictive machinery: J2000 rate = the chain's
  // Newtonian baseline + fluctuation(2000); the Bepi chain projects MESSENGER's Park
  // 2017 measurement forward 14 yr (2013→2027) with the model's own
  // per-century rate decrease, so all three values stay self-consistent by
  // derivation. Earth's row is the observed heliocentric citation (its own
  // apsidal derivation, not the 7-planet formula).
  ...(() => {
    const pm = predictiveMachinery;
    const rateDecreasePerCy = () => (pm().totalPrecession(1800, 'mercury') - pm().totalPrecession(2100, 'mercury')) / 3;
    const bepiPredictedDiff = () => rateDecreasePerCy() * 14 / 100;   // MESSENGER ~2013 → BepiColombo ~2027
    const fmtSignedInt = (v) => `${v >= 0 ? '+' : '-'}${thousands(Math.abs(Math.round(v)))}`;
    const out = {
      mercuryRateDecreasePerCy: { get: rateDecreasePerCy, render: (v) => thousands(v, 1), unit: '″/cy per cy', note: '1800→2100 delta ÷ 3' },
      mercuryBepiPredictedDiff: { get: bepiPredictedDiff, render: (v) => thousands(v, 2), unit: '″' },
      mercuryBepiPrecisionRatio: {
        get: () => Math.round(bepiPredictedDiff() / astro.knownValues.bepiColomboPrecisionArcsec / 100) * 100,
        render: (v) => thousands(v),
        note: 'predicted gap over BepiColombo\'s 0.0015″ precision, to the nearest hundred',
      },
      mercuryBepicolomboPredict: {
        get: () => astro.knownValues.mercuryPark2017RateArcsecCy - bepiPredictedDiff(),
        render: (v) => thousands(v, 2),
        unit: '″/cy',
      },
    };
    // FRAME NOTE (doc 13 §1.8). Two coordinates carry a perihelion rate:
    //   (a) ecliptic longitude — what observers publish (sidereal: the chain's
    //       Newtonian baseline `<p>ModelBaseline`; of date: + p_A);
    //   (b) right ascension in the scene's equator, which co-moves with its
    //       stars — what the export and the predict basis produce
    //       (= (a) sidereal × dα/dλ + ∂α/∂ε·ε̇, gate-pinned). Nobody observes (b).
    // `<p>J2000Rate`, `<p>J2000Fluct`, `<p>Fluctuation*`, `mercuryHelio*`,
    // `mercuryAnomaly*` are (b); `mercuryGeo*` is (b) + p_A (a coordinate mix,
    // legacy). The *EarthFrameRa* names below are the same getters, correctly
    // named; the legacy names stay for the Dutch pages.
    for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${p}EarthFrameRaJ2000`] = { get: () => pm().totalPrecession(2000, p), render: (v) => thousands(Math.round(v)), unit: '″/cy', note: 'Earth-frame RA rate at J2000 (the chain’s Newtonian baseline + the projection terms) — the scene equator co-moves with its stars; not an observable' };
      out[`${p}J2000Fluct`] = { get: () => pm().fluct(2000, p), render: fmtSignedInt, unit: '″/cy', note: 'Earth-frame RA fluctuation at J2000 = projection excess + obliquity-rate term (+κ); not a longitude anomaly' };
    }
    return out;
  })(),

  // ── Mercury epoch tables + prose approximations (11-2ah) ────────────────
  // The 1800/1900/2000/2100 helio/geo/anomaly tables run through the shared
  // predictive machinery (+ the general-precession drift for geocentric);
  // the prose approximations derive from their tracked exact counterparts
  // (orbital path = 2π·AU to the nearest 10M km; period = the IAU mean
  // tropical year; mass ratio and synodic month rounded). The Chandler /
  // Milky Way / Jupiter-barycenter values are literature citations in
  // knownValues.
  ...(() => {
    const pm = predictiveMachinery;
    const out = {};
    // ── Perihelion-advance projection (plan IP-mercury-anomaly-projection, P1) ──
    // The equatorial projection of each planet's ecliptic perihelion advance:
    //   rate_RA = rate_ecl × dα/dλ,   dα/dλ = cos ε / (cos²λ + sin²λ cos²ε)   (β = 0)
    // at the IAU J2000 longitude of perihelion (reading A, the physical
    // perihelion). The obliquity-rate term ∂α/∂ε · ε̇ is what
    // separates the projection from the Earth-frame rate the export measures
    // (Mercury: 574.1 + 4.3 + ~1 = 579.9). The GR perihelion advance is
    // derived from the same constants (6π GM/(c² a (1−e²)) per orbit) so the
    // comparison carries no cited number. Closure gate:
    // tools/verify/perihelion-projection-closure.js.
    const D2R = Math.PI / 180;
    const epsJ2000 = () => astro.earthOrbital.obliquityJ2000_deg;
    const raSlope = (lamDeg, epsDeg) => { const l = lamDeg * D2R, e = epsDeg * D2R; return Math.cos(e) / (Math.cos(l) ** 2 + Math.sin(l) ** 2 * Math.cos(e) ** 2); };
    const dAlphaDeps = (lamDeg, epsDeg) => { const l = lamDeg * D2R, e = epsDeg * D2R; return -Math.sin(l) * Math.cos(l) * Math.sin(e) / (Math.cos(l) ** 2 + Math.sin(l) ** 2 * Math.cos(e) ** 2); };
    const epsRateArcsecCy = () => (oneEps(2050) - oneEps(1950)) * 3600;   // the published obliquity (the hybrid)
    // The ecliptic rate this family publishes is the chain's NEWTONIAN era
    // window (1800–2100, 1PN off). The paper names this key "the chain's
    // Newtonian rate" and builds the published identity on it — newton + the
    // 1PN supplement = the total era window, all three read from the SAME
    // window, so the sum is exact by construction (gr − newton). Projecting the
    // 1PN-inclusive rate would count the 43″ twice (doc 13 §1.8). The model's
    // TOTAL rate of date is <p>PeriRateNowArcsecCy.
    const eclRate = (p) => chainWindowNewton(p);
    const grAdvance = (p) => {   // ″/cy, 6π GM_sun / (c² a (1 − e²)) per orbit × orbits per century
      const P = C.planets[p];
      const aAU = Math.pow(P.solarYearInput / C.meanSiderealYearDays, 2 / 3);
      const aKm = aAU * C.currentAUDistance;
      const perOrbit = 6 * Math.PI * C.GM_SUN / (C.speedOfLight ** 2 * aKm * (1 - P.orbitalEccentricityJ2000 ** 2));
      return perOrbit * (36525 / P.solarYearInput) * 206264.806;
    };
    for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      const lamA = () => chainArt().j2000AnchorElements[p].lonPeriEclipticDeg;   // the chain's J2000 ϖ (plan 07; was the IAU input)
      out[`${p}PeriRateEclipticArcsecCy`] = { get: () => eclRate(p), render: (v) => thousands(v, 2), unit: '″/cy', note: 'the chain’s sidereal era window rate (1800–2100, 1PN on) — the projection’s input' };
      out[`${p}PeriRaSlopeJ2000`] = { get: () => raSlope(lamA(), epsJ2000()), render: (v) => Number(v).toFixed(5), note: 'dα/dλ at the chain’s J2000 perihelion longitude, IAU 2006 obliquity' };
      out[`${p}PeriRateRaProjectedJ2000`] = { get: () => eclRate(p) * raSlope(lamA(), epsJ2000()), render: (v) => thousands(v, 2), unit: '″/cy' };
      out[`${p}PeriProjectionExcessJ2000`] = { get: () => eclRate(p) * (raSlope(lamA(), epsJ2000()) - 1), render: (v) => thousands(v, 2), unit: '″/cy', note: 'reading A: the projected rate minus the ecliptic rate' };
      out[`${p}PeriObliquityRateTermJ2000`] = { get: () => eclRate(p) === 0 ? 0 : dAlphaDeps(lamA(), epsJ2000()) * epsRateArcsecCy(), render: (v) => thousands(v, 2), unit: '″/cy', note: '∂α/∂ε · ε̇ at J2000 at the chain’s J2000 perihelion longitude (plan 11 step 2: was at the scene marker’s λ + angleCorrection, the fitted RA→λ conversion — the chain places the marker now; shipped obliquity law, ±50 yr)' };
      out[`${p}PeriRateEarthFrameMeasuredJ2000`] = { get: () => pm().totalPrecession(2000, p), render: (v) => thousands(v, 2), unit: '″/cy', note: 'the export/predict Earth-frame rate (RA) at J2000' };
      out[`${p}PeriAnomalyGrArcsecCy`] = { get: () => grAdvance(p), render: (v) => Number(v).toFixed(2), unit: '″/cy', note: 'general-relativistic advance from the model constants (GM_SUN, c, a from the period, e)' };
    }
    // P8a (Batch D): Earth's supplement (C.planets has no earth entry) and
    // Mercury's split statement. Same one-home formula as grAdvance above.
    out.earthPeriAnomalyGrArcsecCy = {
      get: () => {
        const aKm = C.currentAUDistance;
        const e = astro.earthOrbital.earthEccentricityJ2000;
        const perOrbit = 6 * Math.PI * C.GM_SUN / (C.speedOfLight ** 2 * aKm * (1 - e ** 2));
        return perOrbit * (36525 / C.meanSolarYearDays) * 206264.806;
      },
      render: (v) => Number(v).toFixed(2),
      unit: '″/cy',
      note: 'general-relativistic advance from the model constants (a = 1 AU, e J2000) — documentation-grade beside Earth’s perihelion-of-date chain',
    };
    out.mercuryPeriRateWithRelativisticArcsecCy = {
      get: () => chainWindowGr('mercury'),   // plan 07: the chain's 1PN era window — the Newtonian window PLUS the engine's own relativistic advance
      render: (v) => thousands(v, 1),
      unit: '″/cy',
      note: 'Mercury’s stated total (P8a, design choice A): the chain’s NEWTONIAN era window (529.0 ″/cy, <mercuryModelBaseline> / <mercuryPeriRateEclipticArcsecCy>) + the 1PN supplement (43.0) = the chain’s 1PN era window (572.0) — the engine computes BOTH window rates, so the sum is exact by construction (gr − newton); the analytic 6πGM/(c²a(1−e²)) from the model constants (<mercuryPeriAnomalyGrArcsecCy>) is the INDEPENDENT check of the same 43.0. Additive and stated, never folded into a divisor; lands on the observed 572-window family',
    };
    // The residual of the CLOSED "anomaly = RA projection" reading (doc 13
    // §1.8): the equatorial projection of the Newtonian ecliptic rate against
    // the relativistic advance. Both legs are model quantities, so the gap and
    // its percentage are registry-derived rather than written into the doc —
    // they move with the chain instead of going stale in prose.
    const mercuryProjExcessJ2000 = () => {
      const lam = chainArt().j2000AnchorElements.mercury.lonPeriEclipticDeg;
      return eclRate('mercury') * (raSlope(lam, epsJ2000()) - 1);
    };
    out.mercuryProjectionVsGrGapArcsecCy = {
      get: () => grAdvance('mercury') - mercuryProjExcessJ2000(),
      render: (v) => Number(v).toFixed(2),
      unit: '″/cy',
      note: 'how far the equatorial projection of the Newtonian ecliptic rate falls SHORT of the relativistic advance — the residual that closed the projection reading (doc 13 §1.8); positive = the projection is too small',
    };
    out.mercuryProjectionVsGrDeltaPct = {
      get: () => (grAdvance('mercury') - mercuryProjExcessJ2000()) / grAdvance('mercury') * 100,
      render: (v) => Number(v).toFixed(1),
      unit: '%',
      note: 'the same residual as a fraction of the relativistic advance — the agreement level of the closed projection reading, not an exact identity (doc 13 §1.8)',
    };
    // The model's Newtonian rate against Park 2017's Newtonian subtotal
    // (575.31 ICRF − the GR advance): doc 13 §1.7's agreement figure, derived
    // so it tracks the chain (~0.6 % on the chain's Newtonian era window).
    out.mercuryModelVsParkNewtonianDeltaPct = {
      get: () => {
        const parkNewtonian = astro.knownValues.mercuryPark2017RateArcsecCy - grAdvance('mercury');
        return Math.abs(parkNewtonian - chainWindowNewton('mercury')) / parkNewtonian * 100;
      },
      render: (v) => Number(v).toFixed(1),
      unit: '%',
      note: 'the chain’s Newtonian era window vs Park 2017 minus the derived GR advance (<mercuryNewtonianModern>) — doc 13 §1.7',
    };
    // Earth's perihelion-of-date rate is the one-family beat.
    const earthOfDateArcsecCy = () => 1296000 * 100 / oneYL().perihelionPrecessionYearsAtYear(2000);
    out.earthPeriRateEclipticOfDateArcsecCy = { get: earthOfDateArcsecCy, render: (v) => thousands(v, 2), unit: '″/cy', note: 'the perihelion OF DATE (not the inertial advance) — the one-family beat at J2000' };
    out.earthPeriProjectionExcessJ2000 = { get: () => earthOfDateArcsecCy() * (raSlope(astro.earthOrbital.earthPerihelionLongitudeJ2000, epsJ2000()) - 1), render: (v) => thousands(v, 2), unit: '″/cy' };
    out.obliquityRateJ2000ArcsecCy = { get: epsRateArcsecCy, render: (v) => thousands(v, 1), unit: '″/cy', note: 'shipped obliquity law, central difference 1950–2050' };
    for (const y of [1800, 1900, 2000, 2100]) {
      out[`mercuryEarthFrameRa${y}`] = { get: () => pm().totalPrecession(y, 'mercury'), render: (v) => thousands(v, 2), unit: '″/cy', note: 'Earth-frame RA rate (scene equator co-moving with its stars); not an observable' };
      out[`mercuryEarthFrameExcess${y}`] = { get: () => pm().fluct(y, 'mercury'), render: (v) => thousands(v, 2), unit: '″/cy', note: 'Earth-frame RA rate minus the chain’s Newtonian baseline' };
    }
    // Ecliptic longitude OF DATE (frame a), both reduction systems — doc 13 §1.8 / tools/explore/mercury-perihelion-frames.mjs
    out.generalPrecessionNewcombArcsecCy = { get: () => astro.knownValues.generalPrecessionNewcombArcsecCy, render: (v) => thousands(v, 3), unit: '″/cy', note: 'Newcomb general precession used in the Le Verrier→Clemence reductions — citation' };
    out.mercuryLonOfDateModel = { get: () => chainWindowGr('mercury') + 100 * astro.earthOrbital.generalPrecessionJ2000_arcsecPerYr, render: (v) => thousands(v, 2), unit: '″/cy', note: 'the chain’s 1800–2100 window rate (1PN) + IAU 2006 p_A — the model in frame (a), modern system (plan 07; was the lattice rate)' };
    out.mercuryLonOfDateModelClassical = { get: () => chainWindowGr('mercury') + astro.knownValues.generalPrecessionNewcombArcsecCy, render: (v) => thousands(v, 2), unit: '″/cy', note: 'the chain’s window rate + Newcomb p_A — the model in frame (a), classical system (plan 07; was the lattice rate)' };
    out.mercuryObservedLonOfDateClemence = { get: () => astro.knownValues.mercuryObservedLonOfDateClemenceArcsecCy, render: (v) => thousands(v, 2), unit: '″/cy', note: 'Clemence 1947: 1765–1937 longitudes vs the equinox of date (± 0.41) — the only equinox-referred OBSERVATION; a modern-system equinox total does NOT exist and must not be manufactured by adding p_A to an ICRF rate' };
    out.mercuryNewtonianClassical = { get: () => astro.knownValues.mercuryNewtonianClassicalArcsecCy, render: (v) => thousands(v, 2), unit: '″/cy', note: 'Clemence 1947 Newtonian subtotal 5,557.18 − Newcomb p_A — citation' };
    out.mercuryNewtonianModern = { get: () => astro.knownValues.mercuryPark2017RateArcsecCy - grAdvance('mercury'), render: (v) => thousands(v, 2), unit: '″/cy', note: 'Park 2017 ICRF total minus the GR advance derived from the model constants' };
    Object.assign(out, {
      earthOrbitalPath: { get: () => Math.round(2 * Math.PI * C.currentAUDistance / 1e7) * 1e7, render: (v) => `~${thousands(v)}`, unit: 'km' },
      earthOrbitalPeriod: { get: () => C.meanSolarYearDays, render: (v) => `~${Number(v).toFixed(5)}`, unit: 'd', note: 'the derived J2000 mean tropical year (tropicalYearMeanJ2000Days), prose approximation' },
      earthMoonMassRatio: { get: () => C.MASS_RATIO_EARTH_MOON, render: (v) => `~${thousands(v, 1)}` },
      lunarMonthApprox: { get: () => C.moonSynodicMonth, render: (v) => `~${thousands(v, 2)}`, unit: 'd' },
      chandlerWobbleCycle: { get: () => astro.knownValues.chandlerWobbleCycleMonths, render: (v) => `~${v}`, unit: 'months', note: 'citation' },
      chandlerWobbleAmplitude: { get: () => astro.knownValues.chandlerWobbleAmplitudeRange, render: (v) => String(v), unit: 'm', note: 'citation' },
      jupiterBarycenterPeriod: { get: () => astro.knownValues.jupiterBarycenterPeriodYears, render: (v) => `~${v}`, unit: 'yr', note: 'citation' },
      milkyWayDistance: { get: () => astro.knownValues.milkyWayDistanceRangeLy, render: (v) => `~${v}`, unit: 'ly', note: 'citation' },
      milkyWaySpeed: { get: () => astro.knownValues.milkyWaySpeedKmS, render: (v) => `~${v}`, unit: 'km/s', note: 'citation' },
      milkyWayPeriod: { get: () => astro.knownValues.milkyWayPeriodMyr, render: (v) => `~${v}`, unit: 'Myr', note: 'citation' },
    });
    return out;
  })(),

  // The significance statistics and the balance rows left the registry (38
  // keys read by no surface); data/significance-results.json and
  // data/balance-presets.json stay tracked as the archive of a closed campaign
  // — balance-presets.json keeps live readers in packages/fitting and
  // tools/verify.

  // ── Saturn prediction + Sci weights + Config #N + start inputs (11-2ak) ─
  // Saturn's predicted eccentricity = in-phase total / Saturn's coefficient
  // (the Law 5 identity — derived, so it moves with the weights); the Sci
  // variants render the same derived weights; Config #N and the
  // deep-analysis funnel from the falsification-criterion artifact; the
  // start-model inputs from the engine constants (startSolstice = 1 is the
  // June-solstice start convention, the structural companion of JD
  // 2,451,716.5).
  ...(() => {
    const { bal } = balanceMachinery();
    // The `bal()` rows that remain are the recorded configuration search, not a
    // live derivation.
    const out = {
      configNumber: { get: () => bal().currentConfig.rank, render: (v) => String(v) },
      configSearchSpace: { get: () => bal().searchSpace, render: (v) => thousands(v) },
      configSearchPct: { get: () => 100 / bal().searchSpace, render: (v) => `${Number(v).toFixed(7)}%`, note: 'one configuration out of the exhaustive space' },
      deepEccThreshold: { get: () => bal().deepAnalysis.eccThreshold, render: (v) => String(v), unit: '%' },
      deepCandidateCount: { get: () => bal().deepAnalysis.candidateCount, render: (v) => String(v) },
      deepLLValidCount: { get: () => bal().deepAnalysis.llValidCount, render: (v) => String(v) },
      deepSurvivorCount: { get: () => bal().deepAnalysis.survivorCount, render: (v) => String(v) },
      deepMaxRateError: { get: () => bal().deepAnalysis.maxRateError, render: (v) => String(v), unit: '″' },
      startModelJD: { get: () => C.startmodelJD, render: (v) => thousands(v, 1), unit: 'JD' },
      startModelYear: { get: () => C.startmodelYear, render: (v) => String(v) },
      startSolstice: { get: () => 1, render: (v) => String(v), note: 'June-solstice start convention (structural, pairs with startModelJD)' },
    };
    return out;
  })(),

  // ── Calibration scalars + periLong/ecc comparison tables (11-2al) ───────
  // Model perihelion longitudes through the shared browser-form evaluator;
  // Meeus (1998) citations in knownValues; Laskar eccentricities DERIVED
  // from the tracked la2004 artifact (the site types them while citing that
  // from the tracked la2004 artifact (the site types them while citing that
  // file — same pattern as the obliquity tables); calibration scalars from
  // astro-reference.
  ...(() => {
    const laskarEcc = (calYear) => {
      const rows = new Map(rd('public/input/la2004-orbital-solution.json').data.map((r) => [r.year, r.eccentricity]));
      const t = calYear - 2000;
      if (rows.has(t)) return rows.get(t);
      const lo = Math.floor(t / 1000) * 1000;
      const hi = lo + 1000;
      if (!rows.has(lo) || !rows.has(hi)) throw new Error(`model-values: La2004 grid has no bracket for ${calYear}`);
      return rows.get(lo) + ((t - lo) / 1000) * (rows.get(hi) - rows.get(lo));
    };
    // the PUBLISHED eccentricity — the one-source N-body series (the value the
    // Earth panel, the Sun's equation of centre and the cardinal chain read)
    const oeEcc = (y) => oneMovement().e(y);
    const out = {
      speedOfLight: { get: () => astro.physicalConstants.speedOfLight, render: (v) => thousands(v, 3), unit: 'km/s' },
      periLongJ2000: { get: () => astro.earthOrbital.earthPerihelionLongitudeJ2000, render: (v) => Number(v).toFixed(3), unit: '°', note: 'the IAU/Standish MEAN element (JPL Keplerian-elements table, 1800–2050 fit); the series\' secular element is earthSeriesPeriLongJ2000' },
      periLongShift1246to2000: { get: () => astro.earthOrbital.earthPerihelionLongitudeJ2000 - 90, render: (v) => Number(v).toFixed(3), unit: '°', note: 'derived: J2000 longitude − the 90° alignment value' },
    };
    for (const [year, key] of [[1000, '1000AD'], [1246, '1246AD'], [2000, '2000AD'], [2500, '2500AD'], [3000, '3000AD']]) {
      out[`periLongModel${key}`] = { get: () => predictiveMachinery().earthPeriOfDateDeg(year), render: (v) => Number(v).toFixed(3), unit: '°', note: 'the model\'s perihelion longitude of date, ecliptic of date — the series\' ϖ plus the measured osculating-mean offset, the Sun channel\'s value (plan 09 step 4; was the 25-term comb)' };
      out[`periLongMeeus${key}`] = { get: () => astro.knownValues[`meeusPeriLong${key}`], render: (v) => Number(v).toFixed(3), unit: '°', note: 'Meeus (1998) citation' };
      // The signed difference model − Meeus, so no surface carries the delta as
      // a literal (model-values 16.0.0 shipped the model 167° off while every
      // page's hand-typed "+0.010°" column still read agreement).
      out[`periLongDelta${key}`] = { get: () => { const d = predictiveMachinery().earthPeriOfDateDeg(year) - astro.knownValues[`meeusPeriLong${key}`]; return ((d + 540) % 360) - 180; }, render: (v) => (Number(v) >= 0 ? '+' : '') + Number(v).toFixed(3), unit: '°', note: 'model − Meeus (1998), wrapped to ±180°' };
    }
    for (const [year, key] of [[2000, '2000AD'], [3000, '3000AD'], [5000, '5000AD'], [10000, '10000AD'], [11725, '11725AD'], [12000, '12000AD'], [15000, '15000AD'], [27000, '27000AD']]) {
      out[`eccModel${key}`] = { get: () => oeEcc(year), render: (v) => Number(v).toFixed(5) };
      out[`eccLaskar${key}`] = { get: () => laskarEcc(year), render: (v) => Number(v).toFixed(5), note: 'La2004 from the tracked artifact (interpolated where off-grid)' };
    }
    return out;
  })(),

  // ── Planet orientation (11-2am) ─────────────────────────────────────────
  // Perihelion longitudes from the tracked elements; the AXIAL periods from
  // the spin channel — each planet's precession constant DERIVED from its own
  // torques on the model's own orbit (Mercury: Cassini-locked, the row is the
  // chain's node period, as the panel shows); the inertial perihelion periods
  // are the chain's (below); the "mean obliquity" is the derived J2000
  // obliquity (acute). No obliquity CYCLE is claimed for any planet (the bands
  // are the `<planet>ObliquityBand*` keys above).
  ...(() => {
    // The "ICRF" periods are the inertial perihelion periods, 1,296,000/|g| from the
    // chain's leading secular mode (Earth: the one-family route); all prograde.
    const planets7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const out = {
      earthAxialPeriod: { get: () => oneYL().axialPrecessionYearsAtYear(2000), render: (v) => thousands(Math.round(v)), unit: 'yr', note: 'the J2000 of-date axial precession period' },
      earthIcrfPeriod: { get: () => oneYL().inclinationPrecessionYearsAtYear(2000), render: (v) => thousands(Math.round(v)), unit: 'yr', note: 'Earth’s apsidal period vs the stars — the one-family route' },
    };
    for (const p of planets7) {
      out[`${p}PeriLongJ2000`] = { get: () => chainArt().j2000AnchorElements[p].lonPeriEclipticDeg, render: (v) => Number(v).toFixed(3), unit: '°', note: 'the chain’s J2000 ecliptic longitude of perihelion (the API’s value)' };
      out[`${p}AxialPeriod`] = {
        get: () => (p === 'mercury'
          ? Math.abs(1296000 * 100 / rd('data/nbody-secular-frequencies.json').windowElementRates.mercury.nodeRateArcsecCy)
          : physModel().planets.spin(p).axialPrecessionPeriodYearsJ2000),
        render: (v) => thousands(Math.round(v)),
        unit: 'yr',
        note: p === 'mercury'
          ? 'Cassini-locked: the spin follows the orbit node — the chain\'s measured window node period (1800–2100)'
          : 'the spin channel\'s J2000 axial precession period, 2π/|ψ̇₀| with ψ̇₀ = −α cos ε₀ DERIVED from the planet\'s own torques (same value as the <planet>AxialPrecessionPeriodDerivedYr key; this name kept for the site)',
      };
      out[`${p}IcrfPeriod`] = {
        get: () => 1296000 / Math.abs(chainG(p)),
        render: (v) => thousands(Math.round(v)),
        unit: 'yr',
        note: `inertial perihelion period — the chain’s leading secular mode (${chainArt().g[p].nearestLaskar.mode}); ≡ <${p}PeriPeriodICRF>`,
      };
      out[`${p}MeanObliq`] = { get: () => C.planets[p].obliquityMean, render: (v) => Number(v).toFixed(2), unit: '°', note: 'the K eccentricity law\'s obliquity input since Phase 7 commit 2: the derived J2000 obliquity (IAU pole vs the chain\'s plane), acute' };
    }
    return out;
  })(),

  // ── Eccentricity cycles (11-2an) ────────────────────────────────────────
  // Cycle periods LIVE from the engine — the chain's OWN g-mode beat
  // (keplerian-chain computeSecularShape).
  ...(() => {
    const planets7 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const out = {};
    for (const p of planets7) {
      out[`${p}EccCycle`] = { get: () => C.planets[p].wobblePeriod, render: (v) => thousands(Math.round(v)), unit: 'yr', note: 'the chain\'s OWN g-mode beat (dominant mode × largest companion of the eccentricity vector — the panel\'s "Eccentricity Cycle (g-mode beat)" row)' };
    }
    return out;
  })(),

  // ── Deep-time epoch tables + tidal-lock + Driver-2 scalars (11-2ao) ─────
  // Everything runs LIVE through the deep-time engine at the named epochs:
  // Devonian t = 380 Ma, Hadean t = the moon-genesis age (the END of the cited
  // distance history, 4429 Ma — the epochs derive from the recorded age), future
  // t = −200 Ma. Moon distances use the cited history's mean distance
  // (the site convention — the solar-Δa corrected engine value differs by
  // ~300 km). Lock-state values derive from the angular-momentum asymptote
  // (Kepler at a_lock gives the 47-day mutual day; days/year uses the
  // rounded 47 by the site's convention). Shrink ppm = mass-loss fraction ×
  // elapsed years (the site's Hadean 423 was a hand-rounding of the derived
  // 422 — fixed site-side).
  ...(() => {
    const P = () => dtl().EPOCH_PARAMS;
    // the raw distance is the engine's cited history (the AstroGeo22 shape on
    // the J2000 anchor).
    const rawMoonKm = (tMa) => dtl().meanMoonDistanceAtAge(tMa);
    const genesisMa = () => astro.knownValues.moonGenesisAgeGa * 1000;
    const lockLodSeconds = () => {
      const p = P();
      return 2 * Math.PI * Math.sqrt(p.moonLockDistanceM ** 3 / p.gmEarthMoonM3S2);
    };
    const epochs = { Devonian: () => 380, Hadean: genesisMa, '200MyrFuture': () => -200 };
    const out = {
      daysPerYearAtDevonian: { get: () => dtl().meanYearInDaysAtAge(380), render: (v) => Number(v).toFixed(2), unit: 'd/yr', note: 'matches Wells 1963 ~400 to 0.01%' },
      moonDistanceAtHadeanRE: { get: () => rawMoonKm(genesisMa()) / astro.physicalConstants.earthParallaxRadiusKm, render: (v) => Number(v).toFixed(2), unit: 'R_E' },
      tidalLockDaysPerYear: { get: () => C.meanSolarYearDays / Math.round(lockLodSeconds() / 86400), render: (v) => Number(v).toFixed(1), unit: 'd/yr', note: 'over the rounded 47-day lock LOD (site convention)' },
      tidalLockLodDays: { get: () => lockLodSeconds() / 86400, render: (v) => Number(v).toFixed(0), unit: 'd' },
      tidalLockApproachGyr: { get: () => astro.knownValues.tidalLockApproachGyr, render: (v) => String(v), unit: 'Gyr', note: 'prose estimate — beyond the red-giant phase' },
      wellsTidalRate: { get: () => astro.knownValues.wellsTidalRateHrPerMa, render: (v) => String(v), unit: 'hr/Ma', note: 'Wells 1963 citation' },
      wellsRecessionCmYr: { get: () => astro.knownValues.wellsRecessionCmYr, render: (v) => String(v), unit: 'cm/yr' },
      modernLLRRecessionCmYr: { get: () => astro.knownValues.modernLLRRecessionCmYr, render: (v) => String(v), unit: 'cm/yr', note: 'the framework α₁ anchor' },
      ageFromLinearRate: { get: () => 24 / astro.knownValues.wellsTidalRateHrPerMa / 1000, render: (v) => Number(v).toFixed(2), unit: 'Gyr', note: 'derived: 24 hr ÷ the Wells rate' },
      patternEarthAgeGyr: { get: () => astro.knownValues.patternEarthAgeGyr, render: (v) => String(v), unit: 'Gyr', note: 'Patterson 1956 citation' },
      moonGenesisAgeGa: { get: () => astro.knownValues.moonGenesisAgeGa, render: (v) => String(v), unit: 'Ga', note: 'the end of the cited Earth–Moon distance history (Farhat et al. 2022, AstroGeo22; lunar age 4.425 Ga)' },
      solarMassLossFracPerYr: { get: () => P().solarMassLossFracPerYear, render: (v) => fmtSci(v, 1), unit: '/yr' },
      solarSystemShrinkDevonianPpm: { get: () => P().solarMassLossFracPerYear * 380e6 * 1e6, render: (v) => String(Math.round(v)), unit: 'ppm' },
      solarSystemShrinkHadeanPpm: { get: () => P().solarMassLossFracPerYear * astro.knownValues.patternEarthAgeGyr * 1e9 * 1e6, render: (v) => String(Math.round(v)), unit: 'ppm' },
      // The formula horizon — DERIVED: on the LLR rate held constant forward (the
      // cited history's forward branch) the Moon reaches the tidal-lock distance
      // at (a_lock/a_now − 1)/|α₁|; the chain's own LOD reads null beyond it.
      // The domain runs from the cited history's END (the genesis age).
      essrtFormulaHorizonGyr: { get: () => (P().moonLockDistanceM / P().moonDistanceNowM - 1) / -P().alpha1PerMa / 1000, render: (v) => Number(v).toFixed(2), unit: 'Gyr', note: 'the LLR rate held constant forward reaches a_lock — a labelled extrapolation' },
      essrtEffectiveDomainGyr: { get: () => astro.knownValues.moonGenesisAgeGa + (P().moonLockDistanceM / P().moonDistanceNowM - 1) / -P().alpha1PerMa / 1000, render: (v) => Number(v).toFixed(1), unit: 'Gyr', note: 'genesis (the cited history\'s end) → the formula horizon' },
      essrtCurrentEpochPct: {
        get: () => {
          const horizon = (P().moonLockDistanceM / P().moonDistanceNowM - 1) / -P().alpha1PerMa / 1000;
          return 100 * astro.knownValues.moonGenesisAgeGa / (astro.knownValues.moonGenesisAgeGa + horizon);
        },
        render: (v) => String(Math.round(v)),
        unit: '%',
      },
      tidalLockKm: { get: () => P().moonLockDistanceM / 1000, render: (v) => thousands(Math.round(v)), unit: 'km' },
      tidalLockRE: { get: () => P().moonLockDistanceM / 1000 / astro.physicalConstants.earthParallaxRadiusKm, render: (v) => Number(v).toFixed(1), unit: 'R_E' },
    };
    for (const [key, tOf] of Object.entries(epochs)) {
      out[`lodAt${key}Hr`] = { get: () => dtl().meanLodSecondsAtAge(tOf()) / 3600, render: (v) => Number(v).toFixed(2), unit: 'hr' };
      out[`moonDistanceAt${key}`] = { get: () => rawMoonKm(tOf()), render: (v) => thousands(Math.round(v)), unit: 'km' };
      out[`axialPrecAt${key}`] = { get: () => dtl().meanLunisolarPrecessionPeriodYearsAtAge(tOf()), render: (v) => thousands(Math.round(v)), unit: 'yr', note: 'the composed lunisolar precession period at this epoch — 1,296,000/the precession RATE of date, with the cited mean obliquity’s cosine' };
    }
    // The clock at ±1 Gyr (the website's deep-time phase table; the composed period).
    // Forward: the cited history's extrapolation region.
    out.axialPrecAt1GyrAgo = { get: () => dtl().meanLunisolarPrecessionPeriodYearsAtAge(1000), render: (v) => thousands(Math.round(v)), unit: 'yr', note: 'the composed lunisolar precession period at −1 Gyr' };
    out.axialPrecAt1GyrFuture = { get: () => dtl().meanLunisolarPrecessionPeriodYearsAtAge(-1000), render: (v) => thousands(Math.round(v)), unit: 'yr', note: 'the composed lunisolar precession period at +1 Gyr (forward-extrapolation region; upper-bound reading)' };
    out.axialPrecOneGyrAgoPct = { get: () => 100 * dtl().meanLunisolarPrecessionPeriodYearsAtAge(1000) / dtl().meanLunisolarPrecessionPeriodYearsAtAge(0.000001), render: (v) => `~${Math.round(v)}`, unit: '%', note: 'the clock one billion years ago as a share of today’s (replaces hOneGyrAgoPct on the website)' };
    return out;
  })(),

  // ── Phase 19: paleo-validation anchors (the dossier's live numbers) ──────
  // Predictions recomputed from the engine with the SAME recipes as the
  // paleo-anchors gate (tools/verify/paleo-anchors.js); observed values and
  // the anchor list come from data/paleo-validation-anchors.json — ONE
  // source for the gate, the doc tables and the summary statistics. Porting
  // these caught the doc-99 statistical summary carrying a pre-proper-physics
  // vintage (claimed max 1.35% Cambrian / 4.16% Williams where the shipped
  // formula gives −0.15% / +5.70%).
  ...(() => {
    const anchors = rd('data/paleo-validation-anchors.json').anchors;
    const RE = () => astro.physicalConstants.earthParallaxRadiusKm;
    /** @type {Record<string, (t: number) => number>} */
    const predictOf = {
      daysPerYear: (t) => dtl().meanYearInDaysAtAge(t),
      lodHr: (t) => dtl().meanLodSecondsAtAge(t) / 3600,
      moonDistanceRE: (t) => dtl().meanMoonDistanceCorrectedAtAge(t) / RE(),
      moonDistanceRawRE: (t) => dtl().meanMoonDistanceAtAge(t) / RE(),
      precArcsecPerYr: (t) => dtl().meanLunisolarPrecessionRateArcsecPerYrAtAge(t),
    };
    const unitOf = { daysPerYear: 'd/yr', lodHr: 'hr', moonDistanceRE: 'R_E', moonDistanceRawRE: 'R_E', precArcsecPerYr: '″/yr' };
    const camel = (id) => id.split('-').map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))).join('').replace(/[^A-Za-z0-9]/g, '');
    /** @type {Record<string, any>} */
    const out = {};
    for (const a of anchors) {
      const cid = camel(a.id);
      out[`anchor${cid.charAt(0).toUpperCase() + cid.slice(1)}Pred`] = {
        get: () => predictOf[a.quantity](a.ageMa),
        render: (v) => Number(v).toFixed(2),
        unit: unitOf[a.quantity],
        note: `paleo anchor ${a.id} (${a.source})`,
      };
      if (a.observed !== undefined) {
        out[`anchor${cid.charAt(0).toUpperCase() + cid.slice(1)}DeltaPct`] = {
          get: () => (predictOf[a.quantity](a.ageMa) / a.observed - 1) * 100,
          render: (v) => `${v >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(2)}`,
          unit: '%',
        };
      }
    }
    // Summary statistics over the scalar days/yr set (the doc-99 "independent
    // paleontological datapoints" — Wells ×9 + Winter + Pannella + Triassic +
    // the flagship 380 + Williams).
    const daysSet = anchors.filter((a) => a.quantity === 'daysPerYear' && a.observed !== undefined);
    const deltas = (list) => list.map((a) => (predictOf[a.quantity](a.ageMa) / a.observed - 1) * 100);
    const phan = () => daysSet.filter((a) => a.ageMa <= 500);
    const mad = (ds) => ds.reduce((s, d) => s + Math.abs(d), 0) / ds.length;
    const rms = (ds) => Math.sqrt(ds.reduce((s, d) => s + d * d, 0) / ds.length);
    const maxAbs = (ds) => Math.max(...ds.map(Math.abs));
    out.paleoAnchorCountAll = { get: () => daysSet.length, render: (v) => String(v), note: 'scalar days/yr anchors in the dossier set' };
    out.paleoAnchorCountPhan = { get: () => phan().length, render: (v) => String(v) };
    out.paleoMadPhanPct = { get: () => mad(deltas(phan())), render: (v) => Number(v).toFixed(2), unit: '%' };
    out.paleoMadAllPct = { get: () => mad(deltas(daysSet)), render: (v) => Number(v).toFixed(2), unit: '%' };
    out.paleoRmsPhanPct = { get: () => rms(deltas(phan())), render: (v) => Number(v).toFixed(2), unit: '%' };
    out.paleoRmsAllPct = { get: () => rms(deltas(daysSet)), render: (v) => Number(v).toFixed(2), unit: '%' };
    out.paleoMaxPhanPct = { get: () => maxAbs(deltas(phan())), render: (v) => Number(v).toFixed(2), unit: '%' };
    out.paleoMaxAllPct = { get: () => maxAbs(deltas(daysSet)), render: (v) => Number(v).toFixed(2), unit: '%' };
    out.paleoWithin1All = { get: () => `${deltas(daysSet).filter((d) => Math.abs(d) < 1).length}/${daysSet.length}`, render: (v) => String(v) };
    out.paleoWithin2All = { get: () => `${deltas(daysSet).filter((d) => Math.abs(d) < 2).length}/${daysSet.length}`, render: (v) => String(v) };
    out.paleoWithin1Phan = { get: () => `${deltas(phan()).filter((d) => Math.abs(d) < 1).length}/${phan().length}`, render: (v) => String(v) };
    out.paleoWithin2Phan = { get: () => `${deltas(phan()).filter((d) => Math.abs(d) < 2).length}/${phan().length}`, render: (v) => String(v) };
    // Generic days/yr-at-age keys for the website's Wu et al. 2024 rows
    // (its table converts Wu's inversion to days/yr at round ages).
    for (const t of [100, 200, 300, 400, 500, 620, 650]) {
      out[`daysPerYearAt${t}Ma`] = { get: () => dtl().meanYearInDaysAtAge(t), render: (v) => Number(v).toFixed(2), unit: 'd/yr' };
    }
    return out;
  })(),

  // ── Asc-node residuals + climate/ECS + null tests (11-2ap — the last
  // actionable batch). Residuals LIVE from the falsification artifact's
  // deep-analysis best anchor (porting caught five of seven site snapshots
  // stale vs the current artifact — defect #11); Charney ECS trio from the
  // seeded Monte-Carlo artifact; ice-albedo shares and the MPT pair from
  // the per-regime artifact (the +31 pp shift DERIVED from its own pre/post
  // values); the doc 97/98/103 campaign scalars from knownValues.
  ...(() => {
    const { bal } = balanceMachinery();
    let ecsM = null, regM = null;
    const ecs = () => { if (!ecsM) ecsM = rd('data/climate-ecs-monte-carlo.json'); return ecsM; };
    const reg = () => { if (!regM) regM = rd('data/climate-ecs-per-regime.json'); return regM; };
    const share = (regime, band) => 100 * reg()[regime].by_band[band].ice_share_weighted;
    const residual = (p) => bal().deepAnalysis.configs[11].bestAnchor.perPlanet[p].errArcsec;
    const kv = () => astro.knownValues;
    const out = {
      charneyECS:     { get: () => ecs().overall.median, render: (v) => Number(v).toFixed(2), unit: 'K' },
      charneyECSLow:  { get: () => ecs().overall.p5, render: (v) => Number(v).toFixed(2), unit: 'K' },
      charneyECSHigh: { get: () => ecs().overall.p95, render: (v) => Number(v).toFixed(2), unit: 'K' },
      iceAlbedoShare100k:       { get: () => share('post_mpt', '100-kyr band (75-130)'), render: (v) => String(Math.round(v)), unit: '%' },
      iceAlbedoShareObliquity:  { get: () => share('post_mpt', 'obliquity (35-50)'), render: (v) => String(Math.round(v)), unit: '%' },
      iceAlbedoSharePrecession: { get: () => share('post_mpt', 'precession (18-26)'), render: (v) => String(Math.round(v)), unit: '%' },
      iceAlbedoShareLong: { get: () => kv().iceAlbedoShareLongPct, render: (v) => String(v), unit: '%', note: 'doc 97 table — the per-regime artifact carries only the sub-130-kyr bands' },
      // No iNHG-MPT obliquity-band share: on the shipped lines that band has no
      // phase-concordant line in the 1–2 Myr window (four obliquity lines within
      // 2 kyr of each other, below the window's resolution) — the per-line
      // instrument cannot read it. The two bands it does resolve there:
      mptObliquityIceSharePost: { get: () => share('post_mpt', 'obliquity (35-50)'), render: (v) => String(Math.round(v)), unit: '%' },
      mptHundredIceSharePre:    { get: () => share('inhg_mpt', '100-kyr band (75-130)'), render: (v) => String(Math.round(v)), unit: '%', note: 'iNHG-MPT 100-kyr-band ice-albedo share of total forcing (climate-ecs-per-regime)' },
      mptPrecessionIceSharePre: { get: () => share('inhg_mpt', 'precession (18-26)'), render: (v) => String(Math.round(v)), unit: '%', note: 'iNHG-MPT precession-band ice-albedo share of total forcing (climate-ecs-per-regime)' },
      // doc 92 Tier A/B prose values (tables generated by scripts/generate_doc97_tables.py)
      ...(() => {
        const cf = () => rd('data/milankovitch-climate-formula.json');
        const f4 = (v) => Number(v).toFixed(4), f3 = (v) => Number(v).toFixed(3), f2 = (v) => Number(v).toFixed(2);
        const o = {};
        for (const [key, reg] of [['Full', 'lr04-full'], ['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg']]) {
          o[`canonR2${key}`] = { get: () => cf().regime_fits[reg].r2_l1_l2_l3, render: f4, note: `canonical L1+L2+L3 R² (sequential ridge), ${reg}` };
        }
        o.canonR2Epica = { get: () => cf().epica_evaluation.r2_l1_l2_l3, render: f4, note: 'canonical formula on EPICA CO₂ (0–800 kyr)' };
        o.canonR2L1PostMpt = { get: () => cf().regime_fits['post-mpt'].r2_l1_only, render: f4, note: 'canonical fit, L1 layer only, post-MPT' };
        // the eight-regime R² breakdown the browser explorer and the paper table use (climate-formula-coefficients.json)
        const cc = () => rd('public/input/climate-formula-coefficients.json');
        const f3s = (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(3);
        for (const [key, reg] of [['PostMpt', 'lr04-post-mpt'], ['InhgMpt', 'lr04-inhg-mpt'], ['PreInhg', 'lr04-pre-inhg'], ['Lr04Full', 'lr04-full'],
                                  ['EpicaCo2', 'epica-co2'], ['Cenco2pip', 'cenco2pip'], ['CenogridD18o', 'cenogrid-d18o'], ['CenogridD13c', 'cenogrid-d13c']]) {
          o[`canon${key}L1Only`] = { get: () => cc().regimes[reg].r2.l1_only, render: f3, note: `canonical formula, L1 layer alone, ${reg}` };
          o[`canon${key}DeltaL2`] = { get: () => cc().regimes[reg].r2.delta_l2, render: f3s, note: `canonical formula, ΔR² from L2, ${reg}` };
          o[`canon${key}DeltaL3`] = { get: () => cc().regimes[reg].r2.delta_l3, render: f3s, note: `canonical formula, ΔR² from L3, ${reg}` };
          o[`canon${key}Total`] = { get: () => cc().regimes[reg].r2.l1_l2_l3, render: f3, note: `canonical formula, total R², ${reg}` };
        }
        o.canonR2Stitched = { get: () => cc().meta.stitched_lr04_r2, render: f2, note: 'three-regime stitched canonical fit evaluated over the full LR04 record (export_climate_formula_browser.py)' };
        o.canonR2CenCo2pip = { get: () => cf().cenco2pip_evaluation.r2_l1_l2_l3, render: f4, note: 'canonical formula on CenCO2PIP CO₂ (0–66 Ma)' };
        o.canonL5FloorPostMpt = { get: () => 100 * (1 - cf().regime_fits['post-mpt'].r2_l1_l2_l3), render: (v) => String(Math.round(v)), unit: '%', note: 'post-MPT L5 stochastic floor, 1 − R²' };
        // T7 — the fixed-phase L1 test (data/t7-fixed-phase-l1.json): the model's own e, ε, e·sin ϖ with one
        // coefficient each + one climate lag, against the shipped free-phase L1 — the description-vs-prediction split doc 92 quotes.
        const t7 = () => rd('data/t7-fixed-phase-l1.json');
        for (const [key, reg] of [['PostMpt', 'post-mpt'], ['InhgMpt', 'inhg-mpt'], ['PreInhg', 'pre-inhg']]) {
          o[`t7FixedR2${key}`] = { get: () => t7().results[reg].fixed_a_e_eps_esinw.in_window.r2, render: f3, note: `T7: fixed-phase (e, ε, e·sin ϖ + lag) in-window R², ${reg}` };
          o[`t7FixedHoldout${key}`] = { get: () => t7().results[reg].fixed_a_e_eps_esinw.holdout.r2_holdout_mean, render: f3, note: `T7: fixed-phase hold-out R² (half split, both orders, mean), ${reg}` };
          o[`t7FixedBlockCv${key}`] = { get: () => t7().results[reg].robustness.block_cv.fixed_a.mean, render: f3s, note: `T7: fixed-phase 4-block leave-one-out R² (mean), ${reg}` };
          o[`t7FreeR2${key}`] = { get: () => t7().results[reg].free_28_lines.r2, render: f3, note: `T7: shipped free-phase L1 in-window R² (L1 only, ridge λ = 1), ${reg}` };
          o[`t7FreeHoldout${key}`] = { get: () => t7().results[reg].free_28_lines.holdout.r2_holdout_mean, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), note: `T7: shipped free-phase L1 hold-out R² (half split, mean), ${reg}` };
          o[`t7FreeBestHoldout${key}`] = { get: () => t7().results[reg].free_28_lines.best_holdout_any_lambda, render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(2), note: `T7: free-phase L1 hold-out R² at the best ridge λ of 1/10/100/1000, ${reg}` };
          o[`t7NullP95${key}`] = { get: () => t7().results[reg].null_phase_randomised_a.in_window.p95, render: f3, note: `T7: phase-randomised null, 95th percentile of in-window R² (same regressors, random Fourier phases), ${reg}` };
          o[`t7LagKyr${key}`] = { get: () => t7().results[reg].fixed_a_e_eps_esinw.in_window.lag_kyr, render: (v) => Number(v).toFixed(1), unit: 'kyr', note: `T7: fitted climate lag of the fixed-phase model, ${reg}` };
          o[`t7La2004R2${key}`] = { get: () => t7().results[reg].fixed_a_e_eps_esinw_la2004.in_window.r2, render: f3, note: `T7: the same fixed-phase model on La2004's e, ε, ϖ̄ — the confirmation column, in-window R², ${reg}` };
        }
        o.t7Record100kSharePostMpt = { get: () => t7().results['post-mpt'].robustness.band_variance_fraction_of_record.hundred_kyr_85_135.record, render: f2, note: 'T7: fraction of post-MPT LR04 variance in the 85–135-kyr band' };
        o.t7Fixed100kLeftPostMpt = { get: () => t7().results['post-mpt'].robustness.band_variance_fraction_of_record.hundred_kyr_85_135.left_by_fixed_a, render: f2, note: 'T7: fraction of post-MPT LR04 variance in the 85–135-kyr band left unexplained by the fixed-phase model' };
        o.t7LagHalfHeightLoPostMpt = { get: () => t7().results['post-mpt'].robustness.lag_profile_a.half_height_range_kyr[0], render: (v) => Number(v).toFixed(0), unit: 'kyr', note: 'T7: lower end of the lag profile\'s half-height range, post-MPT' };
        o.t7LagHalfHeightHiPostMpt = { get: () => t7().results['post-mpt'].robustness.lag_profile_a.half_height_range_kyr[1], render: (v) => Number(v).toFixed(0), unit: 'kyr', note: 'T7: upper end of the lag profile\'s half-height range, post-MPT' };
        o.t7Local30kR2Free = { get: () => t7().results['post-mpt'].robustness.local_fidelity_normalised['0_30'].r2_free, render: f2, note: 'T7: free-phase fit\'s local R² over 0–30 kyr (inside its window) — the hindcast α(t) feels' };
        o.t7Local30kR2Fixed = { get: () => t7().results['post-mpt'].robustness.local_fidelity_normalised['0_30'].r2_fixed_a, render: f2, note: 'T7: fixed-phase model\'s local R² over 0–30 kyr' };
        o.t7DeltaTShift2700 = { get: () => t7().alpha_consequence.delta_t_shift_seconds_fixed_minus_shipped['2700'], render: (v) => (v >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(0), unit: 's', note: 'T7: historical ΔT shift at 2700 BP if α(t) rode the fixed-phase forcing instead of the shipped L1 (before any stack refit)' };
        o.t7AlphaPeakKyrShipped = { get: () => t7().alpha_consequence.alpha_peak_kyr_bp.shipped, render: (v) => Number(v).toFixed(1), unit: 'kyr BP', note: 'T7: α(t) peak on the shipped lagged L1' };
        o.t7AlphaPeakKyrFixed = { get: () => t7().alpha_consequence.alpha_peak_kyr_bp.fixed, render: (v) => Number(v).toFixed(1), unit: 'kyr BP', note: 'T7: α(t) peak on the fixed-phase forcing' };
        // T7 / WP2 — the ΔT joint fitter (report mode) with α(t) on three ice-history proxies (data/t7-alpha-proxy-dt-fit.json)
        const t7p = () => rd('data/t7-alpha-proxy-dt-fit.json');
        for (const [key, p] of [['Shipped', 'shipped'], ['Fixed', 'fixed'], ['Lr04', 'lr04']]) {
          o[`t7AlphaProxy${key}EspenakRms`] = { get: () => t7p().results[p].espenakRmsS, render: f2, unit: 's', note: `T7/WP2: ΔT stack refit with α(t) on the ${p} ice proxy — Espenak RMS (1650–2010 canon)` };
          o[`t7AlphaProxy${key}FullRms`] = { get: () => t7p().results[p].fullRmsS, render: f2, unit: 's', note: `T7/WP2: ΔT stack refit with α(t) on the ${p} ice proxy — full-window RMS (Stephenson −720..2017)` };
        }
        o.t7AlphaProxyHookParityFull = { get: () => t7p().verdict.hook_parity_shipped_minus_baseline_s.full, render: f2, unit: 's', note: 'T7/WP2: the table hook\'s parity — shipped proxy through the hook minus the unpatched fitter, full-window RMS' };
        return o;
      })(),
      // The ECS family (scripts/climate_ecs_*.py on the shipped physical lines; doc 97 is archived).
      // No iNHG-MPT obliquity-band key: on the shipped set that band has no
      // phase-concordant line in a 1-Myr window (its four obliquity lines sit
      // within 2 kyr of each other, below the window's resolution).
      ecsInhgHundredK: { get: () => reg().inhg_mpt.by_band['100-kyr band (75-130)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'iNHG-MPT 100-kyr-band ECS, CenCO2PIP CO₂' },
      ecsFullForcingHundredK: { get: () => rd('data/climate-ecs-full-forcing.json').by_band['100-kyr band (75-130)'].full.weighted_mean_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'post-MPT 100-kyr-band full-forcing ECS with constant f_ice' },
      ecsTightPostHundredK: { get: () => rd('data/climate-ecs-tight.json').regimes.post_mpt.by_band['100-kyr band (75-130)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'post-MPT 100-kyr-band ECS with frequency-dependent f_ice' },
      ecsBoronInhgObliquityK: { get: () => rd('data/climate-ecs-boron.json').regimes.inhg_mpt_dyez.by_band['obliquity (35-50)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'iNHG-MPT obliquity-band ECS with boron-isotope CO₂ (Dyez 2018)' },
      ecsBoronPreObliquityDyezK: { get: () => rd('data/climate-ecs-boron.json').regimes.pre_inhg_dyez.by_band['obliquity (35-50)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'pre-iNHG obliquity-band ECS, Dyez 2018 boron CO₂' },
      ecsBoronMbObliquityK: { get: () => rd('data/climate-ecs-boron.json').regimes.inhg_boundary_mb.by_band['obliquity (35-50)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'iNHG-boundary obliquity-band ECS, Martinez-Boti 2015 boron CO₂' },
      ecsBoronPreObliquityDelavegaK: { get: () => rd('data/climate-ecs-boron.json').regimes.pre_inhg_delavega.by_band['obliquity (35-50)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'pre-iNHG obliquity-band ECS, de la Vega 2020 boron CO₂' },
      // The boron-vs-ice-core cross-check, band by band (tightened analysis vs climate_ecs_boron.py)
      ecsTightPostObliquityK: { get: () => rd('data/climate-ecs-tight.json').regimes.post_mpt.by_band['obliquity (35-50)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'post-MPT obliquity-band ECS, tightened analysis (EPICA CO₂)' },
      ecsTightPostPrecessionK: { get: () => rd('data/climate-ecs-tight.json').regimes.post_mpt.by_band['precession (18-26)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'post-MPT precession-band ECS, tightened analysis (EPICA CO₂)' },
      ecsTightInhgHundredK: { get: () => rd('data/climate-ecs-tight.json').regimes.inhg_mpt.by_band['100-kyr band (75-130)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'iNHG-MPT 100-kyr-band ECS, tightened analysis (CenCO2PIP, 100-kyr-smoothed)' },
      ecsBoronPostObliquityK: { get: () => rd('data/climate-ecs-boron.json').regimes.post_mpt_chalk.by_band['obliquity (35-50)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'post-MPT obliquity-band ECS with boron-isotope CO₂ (Chalk 2017)' },
      ecsBoronPostHundredK: { get: () => rd('data/climate-ecs-boron.json').regimes.post_mpt_chalk.by_band['100-kyr band (75-130)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'post-MPT 100-kyr-band ECS with boron-isotope CO₂ (Chalk 2017)' },
      ecsBoronPostPrecessionK: { get: () => rd('data/climate-ecs-boron.json').regimes.post_mpt_chalk.by_band['precession (18-26)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'post-MPT precession-band ECS with boron-isotope CO₂ (Chalk 2017)' },
      ecsBoronInhgHundredK: { get: () => rd('data/climate-ecs-boron.json').regimes.inhg_mpt_dyez.by_band['100-kyr band (75-130)'].ecs_weighted_K, render: (v) => Number(v).toFixed(2), unit: 'K', note: 'iNHG-MPT 100-kyr-band ECS with boron-isotope CO₂ (Dyez 2018)' },
      tightFiceObliquity: { get: () => rd('data/climate-ecs-tight.json').band_f_ice['obliquity (35-50)'].f_ice, render: (v) => Number(v).toFixed(2), note: 'frequency-dependent ice fraction, obliquity band' },
      tightFiceHundred: { get: () => rd('data/climate-ecs-tight.json').band_f_ice['100-kyr band (75-130)'].f_ice, render: (v) => Number(v).toFixed(2), note: 'frequency-dependent ice fraction, 100-kyr band' },
      tightFicePrecession: { get: () => rd('data/climate-ecs-tight.json').band_f_ice['precession (18-26)'].f_ice, render: (v) => Number(v).toFixed(2), note: 'frequency-dependent ice fraction, precession band' },
      // Re-run campaign artifacts (the shipped physical lines) — bound to their generators, not snapshots.
      chengR2: { get: () => rd('data/climate-ecs-cross-proxy.json').cheng_R2_L1, render: (v) => Number(v).toFixed(2), note: 'the full L1 line set fitted to Cheng 2016 Asian-monsoon δ¹⁸O, R² L1-only over 0–640 kyr (climate_ecs_cross_proxy.py)' },
      testAObliquityLagPercentile: { get: () => kv().testAObliquityLagPercentile, render: (v) => String(v), unit: '%' },
      testAObliquityPeakMatch: { get: () => kv().testAObliquityPeakMatch, render: (v) => String(v) },
      testAEccentricityNull: { get: () => kv().testAEccentricityNullPct, render: (v) => String(v), unit: '%' },
      eightHDerivabilityTopPct: { get: () => kv().eightHDerivabilityTopPct, render: (v) => String(v), unit: '%' },
      testCBalanceSaturnMult: { get: () => kv().testCBalanceSaturnMult, render: (v) => String(v) },
      testCBalancePValue: { get: () => kv().testCBalancePValue, render: (v) => fmtSci(v, 0) },
      testC50Window: { get: () => kv().testC50WindowMyr, render: (v) => `−${Math.abs(v)}`, unit: 'Myr' },
    };
    for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      out[`${p}AscNodeResidual`] = { get: () => residual(p), render: (v) => Number(v).toFixed(2), unit: '″/cy', note: 'live from the deep-analysis best anchor' };
    }
    return out;
  })(),

  // ── solarOrbitalSpeed (11-2aq) ──────────────────────────────────────────
  // DERIVED as 2π·AU/T_sid in km/h (follow-up item 5 decided — the site's
  // former 9-dp hardcode sat 0.59 m/h below its own derivation; both trees
  // now derive from one source).
  ...(() => ({
    solarOrbitalSpeed: {
      get: () => 2 * Math.PI * C.currentAUDistance / C.meanSiderealYearSeconds * 3600,
      render: (v) => thousands(v, 9),
      unit: 'km/h',
      note: 'derived: 2π·AU / sidereal year — one source (item 5 decision)',
    },
  }))(),

  // Ours-only: the docs need a comma-free H for code contexts, and the IAU
  // 2006 obliquity anchor which the website does not surface as a key.
  obliquityJ2000Deg: {
    get: () => astro.earthOrbital.obliquityJ2000_deg,
    render: (v) => Number(v).toFixed(6),
    unit: '°',
    note: 'IAU 2006 obliquity at J2000 (84381.406″)',
  },
};

/**
 * DELIBERATELY ABSENT — values the prose quotes that cannot yet be derived
 * outside the browser. Listed so their absence is a recorded decision rather
 * than an oversight, and so nobody "helpfully" adds them as literals.
 *
 * Currently EMPTY. The founding entries (lodReal / rawH5Kinematic /
 * layer2MinusLayer4Gap) lifted into VALUES as lodRealPhysical / lodH5Only /
 * stackNetLodJ2000Ms / layer2MinusLayer4GapMs after the §12h strangler
 * extraction (tools/lib/deep-time.js `computeLodRealSecondsAtEpoch`,
 * bit-identical to the tweakpane) resolved the 0.32 ms fit-vs-display gap as
 * a day-basis spread — measured-anchor vs Fourier-direct sidereal days at
 * 2000. The basis identity is now enforced on every docs build by the gate
 * inside lodRealPhysical's get().
 */
export const NOT_DERIVABLE = [];

/** key -> rendered string, for the renderers to substitute. */
// §12g-3: the predict-form pinning gate (tools/verify/predict-form-pinning.js)
// compares the TRAINED Node scalar form against this module's browser-form
// mirror (the §12h parity-proven wiring above). Exported for that gate only.
export const _predictiveMachineryForGate = () => predictiveMachinery();

export function resolveAll() {
  const out = new Map();
  for (const [key, spec] of Object.entries(VALUES)) {
    const raw = spec.get();
    const okString = typeof raw === 'string' && raw.length > 0;   // e.g. the Babylon UT strings
    if (!okString && (raw === undefined || raw === null || Number.isNaN(Number(raw)))) {
      throw new Error(`model-values: key "${key}" resolved to ${raw} — the engine or artifact it reads has moved`);
    }
    out.set(key, spec.render(raw));
  }
  return out;
}
