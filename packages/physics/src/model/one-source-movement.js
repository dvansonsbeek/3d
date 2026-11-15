/**
 * The one-source movement — the hybrid's ε(t), e(t), ϖ(t) on the per-tier sampler, the ONE year-length family, and the days of date on them.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { createDeepOrbitalHistory } from '../earth/deep-orbital-history.cjs';
import { ONE_FAMILY_WINDOW_YEARS, createYearLengths } from '../earth/year-lengths.cjs';
import { DEEP_MODES_ARTIFACT } from '../moon/deep-modes-artifact.cjs';
import { CHAIN_ARTIFACT } from '../planets/chain-artifact.js';
import { sceneObliquityHandoverWeight, createHybridBeatTable, composeSceneObliquityDeg, composeSceneObliquityBand } from '../earth/scene-obliquity.cjs';
import { NAVIGABLE_PAST_YEARS, NAVIGABLE_FUTURE_YEARS, DEEP_TIER_GRID_YEARS, deepTierWalkSpanYears } from '../time/navigable-domain.cjs';

/** @param {import('./year-day-lengths.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleOneSourceMovement(ctx) {
  const {
    C, options, secularSeriesArtifact, EPOCH_PARAMS, alphaGia, certifiedAxialPrecessionJ2000Years, dayLengthSeconds,
    deepLod, dtCycleLodCorrectionSum, meanSolarYearDays, yearToTMa, chain, s3ArcsecPerYr,
  } = ctx;
  // The cardinal INSTANTS are the crossings of the one Sun the scene renders
  // and the eclipse chain certifies (cardinal-instants.js); the cardinal
  // STRUCTURE here is the EoC layer (year lengths, crossing offsets, the
  // e(t)-proportional spread) on the one-source movement's own e(t)/ϖ(t) —
  // the MODE tier (the package's embedded deep-modes artifact; the series
  // tier when the governed artifact is injected). Absolute dates deliberately
  // absent — see cardinal/one-source-structure.cjs. The mean year is SI
  // SECONDS: the sidereal year of date reduced by the SECULAR equinox
  // precession on the composed T_p(t).
  // THE ONE of-date year-length family — createYearLengths owns tropical
  // (equinox-rate mean, wobble included), sidereal (the λ̇ channel),
  // anomalistic (the cardinal structure on the SAME mean), all λ̇-corrected
  // coherently, SI seconds, and the beats of that pair.
  // S3 tier unification: when the caller injects the governed secular-
  // series artifact (createModel opts.secularSeriesArtifact — the API/Node
  // path; the npm package alone has no 8 MB series), the movement runs the
  // SERIES tier exactly like the browser — killing the mode-vs-series
  // value split (measured: 6 s on the anomalistic year at J2000).
  // The ONE-SOURCE movement: the hybrid's ε(t) (THE published obliquity) and
  // the one-family year lengths, on the same
  // per-tier sampler.
  const oneSourceM = (() => {
    const AEarth = /** @type {any} */ (CHAIN_ARTIFACT).j2000AnchorElements.earth;
    // The ψ̇ anchor: the IAU 2006 general precession p_A (25,771.575 yr — the
    // ONE home certifiedAxialPrecessionJ2000Years, twins in tools-lib and the
    // browser).
    const axial0 = certifiedAxialPrecessionJ2000Years();   // the ONE home
    // The deep-time ψ̇(t) the hybrid precesses on is the COMPOSED lunisolar
    // rate — its period of date T_p(t) read directly; the composition carries
    // the lunar 1/a³ growth (104.5 ″/yr at 2.46 Ga against Lantink 2022's
    // 108.6 ± 8.5).
    const seriesArt = /** @type {any} */ (secularSeriesArtifact);
    const sb = seriesArt && seriesArt.bodies && seriesArt.bodies.earth;
    // The hybrid's own domain is the banked ζ series' span (years; null
    // without a series). Beyond it the ζ-mode tail carries the Quaternary mean with no tidal
    // evolution — the API refuses the obliquity there and serves the cited mean beside it.
    const obliquityHybridDomainYears = sb
      ? /** @type {[number, number]} */ ([2000 + seriesArt.t0Yr, 2000 + seriesArt.t0Yr + (sb.zetaQ.length - 1) * sb.stepYr])
      : null;
    const hist = createDeepOrbitalHistory({
      zModes: DEEP_MODES_ARTIFACT.earthZ,
      zetaModes: DEEP_MODES_ARTIFACT.earthZeta,
      ...(sb ? {
        zetaSeries: { t0Yr: seriesArt.t0Yr, stepYr: sb.stepYr, q: sb.zetaQ, p: sb.zetaP },
        zSeries: { t0Yr: seriesArt.t0Yr, stepYr: sb.stepYr, q: sb.zQ, p: sb.zP },
      } : {}),
      // Plan 21: the e/ϖ anchor is the series' OWN J2000 node (the mean element,
      // carried by the deep-modes embed); the inclination/node pair is the chain's.
      anchorE: DEEP_MODES_ARTIFACT.anchorE,
      anchorPeriEclipticDeg: DEEP_MODES_ARTIFACT.anchorPeriEclipticDeg,
      anchorInclEclipticDeg: AEarth.inclEclipticDeg,
      anchorAscNodeEclipticDeg: AEarth.ascNodeEclipticDeg,
      axialPrecessionYearsJ2000: axial0,
      // The hybrid's initial condition is the OBSERVED J2000 mean obliquity —
      // the IAU 2006 input constant (84381.406″), the same anchor the
      // browser's _deepHistSeries and the Node one-source movement use.
      obliquityJ2000Deg: C.earthOrbital.obliquityJ2000_deg,
      // The CONSTANT's scaling (the torque period), not the published rate of date: the
      // integration's own ŝ·n̂ carries the obliquity's cosine, so the cited mean obliquity's
      // factor must not enter twice.
      // The age is yearToTMa(yr) — the ONE mapping (J2000 = 2000.0 on the engine year axis,
      // as the factory's own t and the browser's and tools/lib's twins read it). Plan 24
      // measured the former (startmodelYear − yr)/1e6, a 0.5-yr offset, as a twin split of
      // 1e-6″ at −100 kyr / 7e-6″ at −1 Myr in ε — invisible to every gate until the bank,
      // walked by the tools/lib twin, had to be bit-identical to this walk.
      axialPrecessionYearsAtYearFn: (yr) => deepLod.lunisolarTorquePeriodYearsAtAge(yearToTMa(yr)) ?? axial0,
      // THE PRECESSION OF DATE: on top of the secular law above, the solar
      // torque at the eccentricity of date and the oblateness of date from
      // the GIA channel — both exactly 1 at J2000, so the J2000 anchor is
      // untouched. The channel is
      // read PURE (alphaGia, not the pinned earthMoiFactorAtAge):
      // the samplers are cached, their values must be pure in year.
      solarTorqueShareJ2000: EPOCH_PARAMS.precessionSolarShareJ2000,
      // options.giaEllipticityOfDate === false: the orbital forcing alone (the T1 line derivation).
      dynamicalEllipticityRatioAtYearFn: options.giaEllipticityOfDate === false ? undefined : alphaGia.j2RatioAt,
      // PLAN 24 — the spin-axis checkpoint bank (data/spin-axis-checkpoints.json, loaded by the
      // API and the Node scene beside the series; never part of the hash): a deep jump walks at
      // most one spacing from the nearest banked state, bit-identical to the continuous walk.
      spinCheckpoints: options.spinCheckpointsArtifact ?? undefined,
    });
    // PER-TIER ROUTING (the anomalistic-contamination fix): one sampler PER
    // grid tier, built on first entry and KEPT — a query always reads the
    // tier its own span selects. The former single grown sampler replaced
    // the 100-yr grid with the 1000/5000-yr one after any deep-time probe,
    // and the year-length rates (±0.5-yr central differences through the
    // grid) then returned grid-segment averages instead of local rates
    // (anomalistic of date +2.63 s / +19 s, visit-order dependent).
    const samplers = /** @type {Map<number, any>} */ (new Map());
    const gridStep = (/** @type {number} */ n) => (n <= 50000 ? 100 : n <= 2000000 ? 1000 : 5000);
    const tierSpan = (/** @type {number} */ n) => (n <= 50000 ? 50000 : 2000000);
    const sampleAt = (/** @type {number} */ yearIn) => {
      // PLAN 27 (doc 111 §1.36): a read is CLAMPED to the navigable domain — the spin bank's two
      // edges. Beyond the deepest checkpoint the walk continued unseated into physics the inputs
      // no longer define (the Moon history ends there): 3.4 s at −4,425.5 Myr, 15 s at −4,431 Myr,
      // ε reading 0.8°; a windowed display row sampling ±10 Myr around the edge held the browser's
      // main thread for 22 minutes after every landing there. The edge's own sample stands in.
      const year = Math.max(2000 - NAVIGABLE_PAST_YEARS, Math.min(2000 + NAVIGABLE_FUTURE_YEARS, yearIn));
      const t = year - 2000, need = Math.max(20000, Math.abs(t) * 1.25);
      if (need > 2000000) {
        // The deep tier (5000-yr grid): walked in the queried DIRECTION only,
        // to two nodes past the query — never past the domain's edge (ONE home,
        // time/navigable-domain) — and EXTENDED by the factory's shared
        // walk when a deeper epoch arrives. It was built to
        // ±1.25·|t| in both directions and rebuilt from J2000 on every deeper
        // probe — bit-identical values, 4× the RK4 steps of one walk.
        const span = deepTierWalkSpanYears(t);
        return hist.build(t < 0 ? -span : span, 0, DEEP_TIER_GRID_YEARS).at(t);
      }
      const span = tierSpan(need);
      if (!samplers.has(span)) samplers.set(span, hist.build(span, -span, gridStep(span)));
      return samplers.get(span).at(t);
    };
    // The anomalistic year rides THIS movement's own apsidal line (the
    // scene's perihelion) — the factory owns the construction; the planet
    // chain's secular tangent is no longer a member (year-lengths.cjs).
    // The hybrid's beat band on a lazy 1-Myr node table (ONE home earth/scene-obliquity: a deep read at a
    // new age seats on the nearest bank checkpoint and walks — 20–30 ms per region — so the 41-sample
    // instrument is read once per node, never per frame). The browser's frame keeps a bit-identical twin
    // on its own sampler (the epoch gate reads the two against each other).
    // With the GENERATED table (data/obliquity-beat-table.json, loaded beside the banks by the API, the
    // Node scene and the browser) every node inside the navigable domain is a record: the generator
    // refuses unless a fresh model reproduces its nodes bit-exactly, so table and instrument are one number.
    const beatTable = createHybridBeatTable({ epsDegAt: (y) => sampleAt(y).epsDeg, beatYearsAtYear: obliquityBeatYearsAtYear, nodesArtifact: options.obliquityBeatTableArtifact ?? null });
    const yearLengths = createYearLengths({
      sampleAt,
      massLossSiderealSecondsAtYearFn: (year) => deepLod.siderealYearSecondsAtAge(yearToTMa(year)),
    });
    return {
      yearLengths,
      /** The one-source sample at a decimal year (the engine year) — ε, e, ϖ of date, the Earth-orbit normal (the fields the frame of date and the invariable-plane elements read). @param {number} year */
      sampleAt,
      /** EXPERIMENT accessors: the series' e and equinox-referenced ϖ of date. @param {number} year @returns {number} */
      eAt: (year) => sampleAt(year).e,
      /** @param {number} year @returns {number} */
      periOfDateDegAt: (year) => sampleAt(year).periOfDateDeg,
      /** The hybrid's obliquity at a decimal year, degrees — the banked series inside its span, the α(t)-coupled ζ-tail integration beyond (the deep sampler grows ~0.1 s/Myr). @param {number} year @returns {number} */
      epsAt: (year) => sampleAt(year).epsDeg,
      /** The hybrid's own domain, [yearFrom, yearTo] — the banked ζ series' span; null without a series. */
      obliquityHybridDomainYears,
      /** The precession of date's two factors at a decimal year (the factory's own — ONE home). @param {number} year @returns {{solarTorque: number, ellipticity: number}} */
      precessionOfDateFactorsAt: (year) => hist.precessionOfDateFactorsAt(year - 2000),
      /** The spin axis's INERTIAL precession period at J2000, years — the self-anchored
       *  lunisolar rate the hybrid integrates ŝ on (deep-orbital-history D4e): the general
       *  precession anchor plus the planetary mean the ecliptic's own motion carries. */
      axialPrecessionYearsLunisolarJ2000: hist.axialPrecessionYearsLunisolarJ2000,
      obliquityBeatYearsAtYear,
      sceneEpsAt,
      sceneObliquityBandAt,
      /** The hybrid's raw beat band at a year from the node table — {meanDeg, minDeg, maxDeg}; the generator's instrument. @param {number} year */
      hybridBeatBandAt: (year) => beatTable.atYear(year),
      /** A node of the beat table by index k (the year 2000 + k × 1 Myr) — the generator writes these; with the artifact loaded a node inside its range is the record. @param {number} k */
      hybridBeatNodeAt: (k) => beatTable.nodeAt(k),
      /** [kMin, kMax] of the loaded table artifact, or null when every node is computed. */
      hybridBeatNodeRange: beatTable.nodeRange,
    };
    /** THE OBLIQUITY BEAT OF DATE, years — 2π/(ψ̇ᵢₙ(t) − |s₃|): the spin axis's INERTIAL rate of date (the
     *  self-anchored lunisolar rate the hybrid integrates ŝ on) against the ecliptic's nodal mode (falsification
     *  leg 1; 41,098 at J2000). ONE home — the published lunisolar surface, the band instrument and the scene
     *  rule below read it. @param {number} year @returns {number} */
    function obliquityBeatYearsAtYear(year) {
      const r = deepLod.lunisolarPrecessionRateArcsecPerYrAtAge(yearToTMa(year));
      const psiDot = r === null ? 1296000 / certifiedAxialPrecessionJ2000Years() : r;
      const psiDotInertial = psiDot * (certifiedAxialPrecessionJ2000Years() / hist.axialPrecessionYearsLunisolarJ2000);
      return 1296000 / (psiDotInertial - s3ArcsecPerYr);
    }
    /** THE OBLIQUITY A DRAWN SCENE SHOWS (plan 31 A2; doc 111 §1.44): the hybrid inside its banked domain; beyond
     *  it the CITED mean obliquity of date carrying the hybrid's own wobble about its beat mean (the band — the
     *  hybrid carries no tidal evolution of its mean, 23.2–23.4° at every age, where the cited column reads 11.9°
     *  at the history's end), handed over C¹ across the 10 Myr past the domain's edge (ONE home
     *  earth/scene-obliquity). The eclipse tier's ground mapping and every drawn axis read THIS; the hybrid's own
     *  epsAt stays the published obliquity inside the domain and the lunar arguments' carrier everywhere.
     *  @param {number} year @returns {number} */
    function sceneEpsAt(year) {
      const eps = sampleAt(year).epsDeg;
      const w = sceneObliquityHandoverWeight(year, obliquityHybridDomainYears);
      if (w === 0) return eps;
      return composeSceneObliquityDeg(eps, beatTable.atYear(year).meanDeg, citedMeanDegAt(year), w);
    }
    /** The cited mean obliquity of date at a year, degrees; NaN beyond the history (the composition then keeps the hybrid). @param {number} year */
    function citedMeanDegAt(year) { const c = chain.meanObliquityCitedDegAtAge(yearToTMa(year)); return c === null ? NaN : c; }
    /** THE DRAWN OBLIQUITY'S BAND at a year (the Genesis Analysis chart, plan 31 A2): the hybrid's beat band from the
     *  lazy node table, shifted onto the cited mean by the rule's weight — {centreDeg (the drawn tilt's centre), minDeg,
     *  maxDeg, hybridMeanDeg}. @param {number} year */
    function sceneObliquityBandAt(year) {
      return composeSceneObliquityBand(beatTable.atYear(year), citedMeanDegAt(year), sceneObliquityHandoverWeight(year, obliquityHybridDomainYears));
    }
  })();
  const yearLengthsM = oneSourceM.yearLengths;
  /** THE one-family tropical year of date in SI seconds: route B inside the
   *  one-family window, the tidal-chain year beyond (the Sun's
   *  mean longitude, the cardinal instants and the published year lengths
   *  all ride this one function). @param {number} year @returns {number} */
  const oneFamilyTropicalYearSeconds = (year) => (Math.abs(year - 2000) <= ONE_FAMILY_WINDOW_YEARS
    ? yearLengthsM.tropicalYearSecondsAtYear(year)
    : (deepLod.tropicalYearSecondsAtAge(yearToTMa(year)) ?? meanSolarYearDays * 86400));

  /** Tropical year of date in DAYS OF THE EPOCH (the kinematic day,
   *  year-day-lengths.js) — the one-family SI year over the epoch's day
   *  length, so solarYearSeconds ≡ the one-family year. @param {number} year @returns {number} */
  const tropicalYearDays = (year) => oneFamilyTropicalYearSeconds(year) / dayLengthSeconds(year);

  /** Layer-4 solar day of date in SI seconds — LOD_real, the shipped
   *  observable (the tweakpane Solar Day row, the registry's lodRealPhysical,
   *  the Framework Verification panel's day): the kinematic day of date + the
   *  ecliptic missing-motion term on the nodal period + the calibrated ΔT
   *  cycle stack incl. the core-mantle swing. Twin of tools/lib
   *  computeLodRealSecondsAtEpoch and the browser's _vfpSolarDaySecondsOfDate
   *  (86,400.001780 s at 2000). @param {number} year @returns {number} */
  const lodRealSeconds = (year) =>
    dayLengthSeconds(year)
    + (deepLod.eclipticLodCorrectionSecondsAtAge(yearToTMa(year)) ?? 0)
    + dtCycleLodCorrectionSum(year);
  /** Mean sidereal day of date in SI seconds — on LOD_real (plan 08 storyline
   *  sweep, 2026-10-09: the published day bases are the SI day of exactly
   *  86,400 s, the IAU constants, and LOD_real; this rode the KINEMATIC day
   *  before, 1.7 ms below the simulator's readout at J2000). One rotation
   *  more against the equinox than there are solar days in a year.
   *  @param {number} year @returns {number} */
  const siderealDaySeconds = (year) => {
    const Y = tropicalYearDays(year);
    return (lodRealSeconds(year) * Y) / (Y + 1);
  };
  /** Mean stellar day of date in SI seconds — the sidereal day plus the
   *  equinox's daily regression projected onto the equator (on LOD_real, like
   *  the sidereal day). @param {number} year @returns {number} */
  const stellarDaySeconds = (year) => {
    const tMa = yearToTMa(year);
    // One equinox turn per T_p(t) — the composed lunisolar period (its
    // certified J2000 anchor past the chain's domain).
    const TpRaw = deepLod.lunisolarPrecessionPeriodYearsAtAge(tMa);
    const Tp = TpRaw === null ? certifiedAxialPrecessionJ2000Years() : TpRaw;
    const syD = tropicalYearDays(year);
    const sidDay = siderealDaySeconds(year);
    // The RA projection reads the published ε (the one-source hybrid) — the
    // browser's _sceneEpsTargetDeg twin; 1e-8 s.
    const raProjection = Math.cos((oneSourceM.epsAt(year) * Math.PI) / 180);
    return (sidDay / Tp / (syD + 1)) * raProjection + sidDay;
  };

  return { lodRealSeconds, oneFamilyTropicalYearSeconds, oneSourceM, siderealDaySeconds, stellarDaySeconds, tropicalYearDays, yearLengthsM };
}
/** @typedef {import('./year-day-lengths.js').Ctx & ReturnType<typeof assembleOneSourceMovement>} Ctx */
