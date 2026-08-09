/**
 * Guard the JSON values that `src/script.js` duplicates as literals (§2g).
 *
 * WHY THIS EXISTS. Any value not yet migrated to the generated module agrees
 * with the JSON today only because nobody has edited it — there is no sync
 * mechanism holding it there. MASS_RATIO_EARTH_MOON, earthEccentricityJ2000 and
 * moonSiderealMonthInput are in that group.
 *
 * Rather than mirror values into script.js, this CHECKS without
 * patching. It shrinks to nothing as values migrate to the generated module: a
 * migrated value must be ABSENT as a literal, which is how the ledger proves
 * migration actually happened rather than merely adding an unused import.
 *
 * THREE THINGS LEARNED BUILDING IT, each now handled:
 *
 *  1. Compare NUMERICALLY, never as strings. `3.828e+26` from JSON.parse and
 *     `3.828e26` in source are the same number and different text; so are
 *     `1600000000` and `1.6e9`. String matching reported both as missing.
 *
 *  2. Resolve simple arithmetic. script.js writes `84381.406 / 3600`, not the
 *     quotient, so a literal scan cannot see the value at all.
 *
 *  3. Name-matching beats value-matching. It is what surfaced the obliquity
 *     divergence: script.js holds IAU 2006 (84381.406") while the JSON holds
 *     IAU 1976/1980 (84381.448") under the same key — 0.042" apart, which a
 *     presence check would never have found because both numbers exist.
 *
 *   node tools/constants/check-literals.mjs           check  (exit 1 on drift)
 *   node tools/constants/check-literals.mjs --list    show every classification
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPT = readFileSync(join(ROOT, 'src/script.js'), 'utf8');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'public/input', f), 'utf8'));

/**
 * Values migrated to the generated module (§5e). Each MUST have disappeared as
 * a literal from script.js. Grows one block at a time during Phase 5f; when it
 * covers everything, this file retires.
 * @type {string[]}
 */
const MIGRATED = [
  // Phase 5f block 1 — model.foundational. `holisticyearLength` is SEEDED
  // (`let x = K.foundational...`) rather than imported, because
  // recomputeEpochAnchors reassigns it and an ESM binding is read-only (§5e);
  // the literal is gone either way, which is what this ledger asserts.
  'model.foundational.holisticyearLength',
  'model.foundational.inputmeanlengthsolaryearindays',
  'model.foundational.startmodelJD',
  'model.foundational.startmodelYear',
  'model.foundational.correctionDays',
  'model.foundational.correctionSun',
  'model.foundational.temperatureGraphMostLikely',
  'model.foundational.startAngleModel',
  'model.foundational.systemResetN',

  // Phase 5f block 2 — model.earth (eccentricityAmplitudeK is Node-side, see
  // NOT_IN_SCRIPT).
  'model.earth.earthtiltMean',
  'model.earth.earthInvPlaneInclinationAmplitude',
  'model.earth.eccentricityBase',
  'model.earth.eccentricityAmplitude',

  // Phase 5f block 3 — model.moon. This block also CORRECTED a drift:
  // script.js held moonMeeusLpCorrection = 0.010525 against the JSON's
  // 0.010524. The archive settles it — the optimizer produced 0.010524 and
  // re-running was a no-op ("0.010524 | 0.010524 | none"), and the bounded-moon
  // derivation records "bit-identical (0.8086/0.010524/0.0015), FULL GATES
  // PASSED". tools/lib always used 0.010524; only the browser copy had drifted.
  'model.moon.moonStartposApsidal',
  'model.moon.moonStartposNodal',
  'model.moon.moonStartposMoon',
  'model.moon.moonMeeusLpCorrection',

  // Phase 5f block 4 — astro.physicalConstants. Listed per-path rather than by
  // prefix: earthJ2 and earthEquatorialRadiusKm are Node-side (NOT_IN_SCRIPT)
  // and massRatioDE440 is not migrated, and MIGRATED is matched FIRST, so a
  // prefix here would falsely claim all three.
  //
  // Four of these carry short local names in script.js that differ from their
  // JSON keys — earthMoiFactorJ2000 -> EARTH_MOI_FACTOR, solarLuminosityW ->
  // L_SUN_W, solarWindMassLossKgPerS -> SOLAR_WIND_KG_PER_S. The mapping is
  // visible at the import site in script.js.
  'astro.physicalConstants.currentAUDistance',
  'astro.physicalConstants.speedOfLight',
  'astro.physicalConstants.G_CONSTANT',
  'astro.physicalConstants.MASS_RATIO_EARTH_MOON',
  'astro.physicalConstants.earthMoiFactorJ2000',
  'astro.physicalConstants.solarLuminosityW',
  'astro.physicalConstants.solarWindMassLossKgPerS',
  'astro.earthOrbital.perihelionalignmentYear',

  // Phase 5f block 5 — astro.earthOrbital, COMPLETE since the §12e refit:
  // the JSON adopted IAU 2006, so obliquityJ2000_deg finally migrated
  // (script.js reads K.earthOrbital.obliquityJ2000_deg; the arcsec form is
  // derived deg × 3600, no second literal).
  'astro.earthOrbital.obliquityJ2000_deg',
  'astro.earthOrbital.obliquityRate_arcsecPerCentury',
  'astro.earthOrbital.earthInclinationJ2000_deg',
  'astro.earthOrbital.sunMeanLongitudeJ2000_deg',
  'astro.earthOrbital.perihelionPassageJ2000_JD',
  'astro.earthOrbital.juneSolstice2000_JD',
  'astro.earthOrbital.earthInclinationCycleAnchor',
  'astro.earthOrbital.deltaTStart',
  'astro.earthOrbital.sunTilt',

  // The three ELP W1 T^2 terms script.js actually consumes. The other three in
  // that JSON block (tides* pair, IAU2006 variant) are analysis-only.
  'astro.moonMeeus.elpW1T2Decomposition_arcsecPerCy2.planetary',
  'astro.moonMeeus.elpW1T2Decomposition_arcsecPerCy2.earthFigureJ2',
  'astro.moonMeeus.elpW1T2Decomposition_arcsecPerCy2.generalPrecessionPA_T2_Lieske1976',

  // Phase 5f block 6 — astro.moonReference (moonInclinationConstantBrownELP is
  // the documented Brown/ELP partner constant and is not carried by script.js)
  // and the whole of astro.moonMeeus.
  'astro.moonReference.moonSiderealMonthInput',
  'astro.moonReference.moonApsidalPrecessionDaysInputICRF',
  'astro.moonReference.moonNodalPrecessionDaysInputICRF',
  'astro.moonReference.moonDistance',
  'astro.moonReference.moonEclipticInclinationJ2000',
  'astro.moonReference.moonOrbitalEccentricityBase',
  'astro.moonReference.moonObliquityEclipticJ2000',
  'astro.moonReference.moonTilt',
  'astro.moonMeeus.moonMeanAnomalyJ2000_deg',
  'astro.moonMeeus.moonMeanAnomalyRate_degPerDay',
  'astro.moonMeeus.moonMeanElongationJ2000_deg',
  'astro.moonMeeus.moonMeanElongationRate_degPerDay',
  'astro.moonMeeus.sunMeanAnomalyJ2000_deg',
  'astro.moonMeeus.sunMeanAnomalyRate_degPerDay',
  'astro.moonMeeus.moonArgLatJ2000_deg',
  'astro.moonMeeus.moonArgLatRate_degPerCentury',
  'astro.moonMeeus.moonMeanElongationJ2000Full_deg',
  'astro.moonMeeus.moonMeanElongationRate_degPerCentury',

  // Phase 5f block 7 — astro.yearLengthRef. Local names carry a `J2000` suffix
  // the JSON keys lack, marking them as the fixed anchors as opposed to the
  // epoch-dependent values recomputeEpochAnchors produces. iauPrecessionJ2000
  // stays out: script.js derives it (see NOT_IN_SCRIPT).
  'astro.yearLengthRef.tropicalYearVE',
  'astro.yearLengthRef.tropicalYearSS',
  'astro.yearLengthRef.tropicalYearAE',
  'astro.yearLengthRef.tropicalYearWS',
  'astro.yearLengthRef.tropicalYearMean',
  'astro.yearLengthRef.tropicalYearRateSecPerCentury',
  'astro.yearLengthRef.anomalisticYear',
  'astro.yearLengthRef.siderealYear',
  'astro.yearLengthRef.solarDay',
  'astro.yearLengthRef.siderealDay',
  'astro.yearLengthRef.stellarDay',

  // Phase 5f block 8 — all seven planets, both sources, plus the perihelion
  // passage reference JDs. Prefixes are safe here: every leaf under these three
  // roots is migrated.
  //
  // NOT migrated: perihelionEclipticYears / axialPrecessionYears /
  // obliquityCycle. Those encode the H-lattice fractions the JSON stores as
  // integer pairs ([8,11] written as H/(1+3/8)), so importing them would change
  // the expression's form rather than its source. Phase 6 owns that.
  'model.planets',
  'astro.planetOrbitalElements',
  'model.perihelionPassageRef',

  // Phase 5f block 9 — DE440 mass ratios, deep-time alphas and tapers, the two
  // Earth eccentricity anchors, and the four additional bodies.
  //
  // The Ceres migration FIXED A BUG: script.js had ascendingNodeInvPlane 10.36,
  // verbatim Eros's value from the block above. Ceres is 80.89 — a figure the
  // same file already carried as ceresAscendingNodeInvPlaneSouamiSouchay with a
  // Souami & Souchay (2012) citation. A value-presence check could never find
  // this: the key repeats across bodies so name-matching is off, and 80.89 does
  // appear in the file, just under the other name. Importing removes the class
  // of error entirely.
  'astro.physicalConstants.massRatioDE440',
  'model.deepTime.alpha3PerMa3',
  'model.deepTime.alpha4PerMa4',
  'model.deepTime.alphaClimateScalePerMille',
  'model.deepTime.dtStackTaperFullHalfwidthYr',
  'model.deepTime.dtStackTaperTotalHalfwidthYr',
  'astro.earthOrbital.earthEccentricityJ2000',
  'astro.earthOrbital.earthEccentricityDotJ2000',
  'model.additionalBodies',

  // Phase 5f block 10 — the H-lattice fraction pairs. script.js wrote these as
  // hand-rolled arithmetic (`-holisticyearLength*8/65`) while the integer pairs
  // sat in the JSON; latticeYears() now derives them. Verified bit-identical for
  // all 21 (7 planets x peri/axial/obliquity) before the change.
  'model.planets.mercury.perihelionEclipticFraction',
  'model.planets.venus.perihelionEclipticFraction',

  // Phase 5f block 11 — masses that had NO JSON source until now. The
  // planet-ALONE ratios, Pluto (system and alone, 10.85% apart because of
  // Charon), and the three small-body masses lived only as literals in
  // script.js. Mercury/Venus/Earth-alone stay derived: no moons, so ALONE
  // equals SYSTEM and a second stored copy would be a drift channel.
  'astro.physicalConstants.massRatioDE440Alone',
  'astro.physicalConstants.smallBodyMasses',

  // Phase 5f block 12 — REFERENCE_DATA. Validation targets and presentation
  // data now imported from the generator's second export rather than kept as
  // literals. Single-sourced but NOT injectable: createModel refuses these keys,
  // so a counterfactual still cannot move the goalposts it is judged by (§2d).
  'astro.jplEclipticInclinationTrends',
  'astro.laplaceLagrangeBounds',
  'astro.ascendingNodesSouamiSouchay',
  'astro.galaxyMotion',

  // Phase 5f block 13 — the constants a manual read found after the automated
  // sweep had reported clean. Body diameters (previously no JSON source at all,
  // and NOT presentation: they yield R_EARTH_M and the eclipse radii), the full
  // orbital-element set for the four additional bodies (only 2-3 of 8 fields
  // per body had a JSON home), and three that my own allowlist had wrongly
  // excluded — the last of which was diverging.
  'astro.bodyDiametersKm',
  'astro.additionalBodiesReference',
  'model.deepTime.alpha1PerMa',
  'astro.earthOrbital.earthEccentricityDotDotJ2000',
  'astro.earthOrbital.earthPerihelionLongitudeJ2000',

  // Phase 5f block 14 — the last three per additional body: angleCorrection,
  // startpos and the perihelionEclipticFraction [1,1]. All four bodies now go
  // through latticeYears() like the seven planets, so no hand-written lattice
  // arithmetic remains anywhere in script.js.
  'model.additionalBodies.pluto.angleCorrection',
  'model.additionalBodies.pluto.startpos',
  'model.additionalBodies.halleys.angleCorrection',
  'model.additionalBodies.halleys.startpos',
  'model.additionalBodies.eros.angleCorrection',
  'model.additionalBodies.eros.startpos',
  'model.additionalBodies.ceres.angleCorrection',
  'model.additionalBodies.ceres.startpos',

  // Phase 5f block 15 — earthAscendingNodeInvPlaneVerified. Same NUMBER as
  // ascendingNodesSouamiSouchay.earth (284.51), different ROLE: this is the node
  // the model ADOPTS, so it is an input and comes from the injectable anchor
  // block; the S&S entry is the catalog value for the parallel
  // EclipticInclinationSouamiSouchayDynamic comparison and stays in
  // REFERENCE_DATA. Classification turns on function, not on value.
  'astro.earthOrbital.earthAscendingNodeInvPlane',

  // Phase 8.1 — calendar/epoch references (j2000JD, julianCenturyDays,
  // Gregorian start, the JD_1800/1900/2100 display anchors) and the astropixels
  // June-solstice validation JDs. The solstice leaves are named `solsticeRefJD`
  // in the JSON precisely because this file matches by leaf NAME: `jd:` occurs
  // as a numeric property throughout the PLANET_TEST_DATES tables, and a first
  // attempt with `solsticeJD` was caught by this very check — a diagnostic at
  // ~L42939 declares `const solsticeJD = 2451716.5`.
  // rotationPeriodDays (9 bodies) and model.planets.*.fibonacciD are covered
  // by the block-8/13 prefixes above.
  'astro.timeReference',
  'astro.juneSolsticeReference',
];

/**
 * JSON values legitimately not present in script.js, each with the reason.
 * An entry here is a claim that needs to stay true, so it carries its evidence.
 * @type {Record<string, string>}
 */
const NOT_IN_SCRIPT = {
  'astro.ascendingNodesSouamiSouchay.invariablePlaneOnEclipticDeg':
    'the invariable PLANE\'s own node on the ecliptic (docs/05) — registry key; '
    + 'script.js consumes only the per-planet nodes.',
  'astro.physicalConstants.solarParallaxArcsec':
    'IAU 1976 parallax-chain member — registry key + the appendix chain note; '
    + 'script.js consumes only the chain products (currentAUDistance, parallax radius).',
  'astro.physicalConstants.arcsecDisplacementKm':
    'historical parallax-chain primitive (the website builds ONE_AU_KM from it) — '
    + 'registry key; script.js consumes only currentAUDistance.',
  'astro.moonGrailWilliams2014':
    'GRAIL/LLR lunar gravity citations (Williams 2014) — consumed by the Cassini '
    + 'moontilt labs (tools/explore, which carry local copies) and the model-values '
    + 'registry; the browser never quotes them.',
  'astro.giaCoxChaoPeltier':
    'GIA calibration citation anchors (Cox & Chao dJ2/dt, Peltier factor) — the shipped '
    + 'product is the calibrated alphaClimateScalePerMille; script.js cites these in '
    + 'comments only (~:2375). Consumed by the model-values registry.',
  'astro.obliquityChapront2002':
    'Chapront (2002) obliquity citation values — consumed only by the model-values '
    + 'registry (obliqChapront* keys) for the Model-vs-literature tables; the browser '
    + 'never quotes them',
  'astro.knownValues': 'validation targets, consumed by tools/explore/moon-cycles.js only',
  'astro.moonMeeus.elpW1T2Decomposition_arcsecPerCy2': 'ELP W1 T^2 budget — analysis only, tools/explore/v4-kpl-budget.js',
  'astro.cardinalPointAnchors': 'Node-side anchors; script.js derives cardinal points from the scene',
  'astro.yearLengthRef.iauPrecessionJ2000':
    'script.js DERIVES this at :3457 from the ratio identity '
    + 'siderealYear / (siderealYear - tropicalYear) instead of carrying the IAU catalog '
    + 'value, and says so in a comment: the difference is higher-order terms in the IAU '
    + 'model, and the identity is used for internal consistency. Derived, so not a '
    + 'duplicated literal.',
  'model.earth.eccentricityAmplitudeK': 'consumed by tools/lib; script.js derives it',
  // Three entries were REMOVED from here after review — all three were wrong,
  // and all three hid a real copy in script.js:
  //   alpha1PerMa                   -> script.js ALPHA_1, identical
  //   earthEccentricityDotDotJ2000  -> ASTRO_REFERENCE.eccentricityDotDotJ2000, identical
  //   earthPerihelionLongitudeJ2000 -> perihelionLongitudeJ2000_deg, DIVERGED by 0.684"
  // See the LIMITATION note on the anti-masking guard below: it compares by key
  // NAME, so a renamed copy slips past it. All three were renamed.
  'astro.physicalConstants.earthJ2': 'used by tools/lib figure-of-Earth term',
  'astro.physicalConstants.earthEquatorialRadiusKm': 'used by tools/lib figure-of-Earth term',
  'astro.physicalConstants.earthParallaxRadiusKm': 'AU matched pair (appendix chain); consumed by the model-values registry, not script.js',

  // The four additional bodies carry their eccentricity TWICE in the JSON —
  // astro.additionalBodiesReference.<b>.orbitalEccentricityJ2000 and
  // model.additionalBodies.<b>.orbitalEccentricityBase — with identical values
  // (verified for all four). script.js holds one literal, now imported from the
  // model side, so the astro-side key has no separate copy to check. The two
  // JSON entries are themselves a duplication worth collapsing one day.
  'astro.additionalBodiesReference.pluto.orbitalEccentricityJ2000':
    'duplicate of model.additionalBodies.pluto.orbitalEccentricityBase (identical); script.js imports the model side',
  'astro.additionalBodiesReference.halleys.orbitalEccentricityJ2000':
    'duplicate of model.additionalBodies.halleys.orbitalEccentricityBase (identical); script.js imports the model side',
  'astro.additionalBodiesReference.eros.orbitalEccentricityJ2000':
    'duplicate of model.additionalBodies.eros.orbitalEccentricityBase (identical); script.js imports the model side',
  'astro.additionalBodiesReference.ceres.orbitalEccentricityJ2000':
    'duplicate of model.additionalBodies.ceres.orbitalEccentricityBase (identical); script.js imports the model side',
};

/**
 * Divergences that are known, deliberate-or-undecided, and NOT to be silently
 * accepted. Printed on every run. Removing an entry is how a resolution gets
 * recorded — same discipline as verify-laws carrying its Saturn 44/45 failure.
 * @type {Record<string, string>}
 */
const KNOWN_DIVERGENCE = {
  // (empty since the §12e IAU 2006 adoption landed — the obliquityJ2000_deg
  // entry resolved with the full Step 0 + 6a–6e + corrections refit. The
  // checker flags stale entries by design, which is why the resolution is
  // recorded by REMOVAL.)
};

// ── collect distinctive JSON leaves ──────────────────────────────────────────
/** @type {{path: string, key: string, value: number}[]} */
const leaves = [];
const walk = (o, p) => {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, q);
    else if (typeof v === 'number') leaves.push({ path: q, key: k, value: v });
  }
};
walk(read('model-parameters.json'), 'model');
walk(read('astro-reference.json'), 'astro');

// Short numbers (23, 0.5, 7) collide with unrelated code constantly.
const sig = (n) => String(n).replace(/[-.]/g, '').replace(/e[+-]?\d+$/, '').length;
const distinctive = leaves.filter((l) => sig(l.value) >= 6);

// ── resolve a script.js right-hand side to a number ──────────────────────────
// Handles `N`, `N / N`, `N * N` — enough for `84381.406 / 3600` and `-46.836769 / 3600`.
const NUM = String.raw`[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?`;
const evalRhs = (rhs) => {
  const t = rhs.trim();
  let m = t.match(new RegExp(`^(${NUM})$`));
  if (m) return Number(m[1]);
  m = t.match(new RegExp(`^(${NUM})\\s*/\\s*(${NUM})$`));
  if (m) return Number(m[1]) / Number(m[2]);
  m = t.match(new RegExp(`^(${NUM})\\s*\\*\\s*(${NUM})$`));
  if (m) return Number(m[1]) * Number(m[2]);
  return null;
};

/**
 * Keys that occur on more than one JSON object — `startpos`, `angleCorrection`
 * and `eocFraction` exist on all seven planets. Matching such a key by name in
 * script.js finds whichever declaration comes first (Mercury's) and compares it
 * against every planet, reporting six false divergences. Name-matching is only
 * sound for keys that are unique across the whole leaf set; the rest fall back
 * to value-presence.
 */
const keyCount = new Map();
for (const l of leaves) keyCount.set(l.key, (keyCount.get(l.key) ?? 0) + 1);

/**
 * Sound to match by name only when the key is unique AND long enough to be
 * unambiguous. The cardinal-point keys are `SS`, `WS`, `VE`, `AE`; searching
 * script.js for `AE` matched an unrelated `-0.0564`. Four characters is the
 * shortest that behaved.
 */
const isUniqueKey = (k) => keyCount.get(k) === 1 && k.length >= 4;

/** Find `key: <rhs>` or `const|let key = <rhs>` in script.js and resolve it. */
const findByName = (key) => {
  for (const re of [
    new RegExp(`(?:const|let|var)\\s+${key}\\s*=\\s*([^;,\\n]+)[;,\\n]`),
    new RegExp(`\\b${key}\\s*:\\s*([^,\\n}]+)[,\\n}]`),
  ]) {
    const m = SCRIPT.match(re);
    if (m) {
      const n = evalRhs(m[1]);
      if (n !== null) return n;
    }
  }
  return null;
};

/** Is this exact number present anywhere in script.js as a numeric literal? */
const allNumbers = new Set(
  (SCRIPT.match(new RegExp(NUM, 'g')) ?? []).map(Number).filter((n) => Number.isFinite(n)),
);
const presentByValue = (v) => allNumbers.has(v);

const covered = (path, map) =>
  Object.keys(map).some((p) => path === p || path.startsWith(`${p}.`));

// ── classify ─────────────────────────────────────────────────────────────────
const rows = [];
for (const { path, key, value } of distinctive) {
  if (MIGRATED.some((p) => path === p || path.startsWith(`${p}.`))) {
    // "Migrated" means the DECLARATION no longer holds a numeric literal — NOT
    // that the number is absent from the file. The same number legitimately
    // appears elsewhere: 365.2422 in comments, 335317 in a harmonic table,
    // 2451716.5 in a test fixture. Checking by value flagged three correctly
    // migrated constants. Once migrated, `const x = K.block.x` has no numeric
    // right-hand side, so findByName can no longer resolve one.
    const stillLiteral = findByName(key) !== null;
    rows.push({ path, key, value, kind: stillLiteral ? 'MIGRATED-BUT-STILL-LITERAL' : 'migrated' });
    continue;
  }
  if (covered(path, NOT_IN_SCRIPT)) {
    // An allowlist entry must mean "script.js does not carry this value", not
    // "I could not find the value" — those differ exactly when script.js holds a
    // DIFFERENT value under the same name, which is the case worth catching.
    // moonMeeusLpCorrection was masked this way: JSON 0.010524, script.js
    // 0.010525, both fed to the same lunar-longitude expression. The allowlist
    // was written from a failed value lookup and hid a real divergence.
    //
    // LIMITATION — this guard matches by key NAME, so it is blind to a RENAMED
    // copy. Three allowlist entries hid one that way and had to be found by
    // reading: alpha1PerMa lived as ALPHA_1, earthEccentricityDotDotJ2000 as
    // eccentricityDotDotJ2000, and earthPerihelionLongitudeJ2000 as
    // perihelionLongitudeJ2000_deg — the last DIVERGED by 0.684". Adding an
    // entry here on the strength of "the value isn't in script.js" is therefore
    // not enough; confirm the quantity is genuinely absent under ANY name.
    const shadow = isUniqueKey(key) ? findByName(key) : null;
    rows.push(shadow !== null && !Object.is(shadow, value)
      ? { path, key, value, kind: 'MASKED-BY-ALLOWLIST', found: shadow }
      : { path, key, value, kind: 'not-in-script' });
    continue;
  }

  const named = isUniqueKey(key) ? findByName(key) : null;
  if (named !== null) {
    const kind = Object.is(named, value)
      ? 'name-match'
      : (KNOWN_DIVERGENCE[path] ? 'known-divergence' : 'DIVERGENT');
    rows.push({ path, key, value, kind, found: named });
    continue;
  }
  rows.push({ path, key, value, kind: presentByValue(value) ? 'value-present' : 'MISSING' });
}

const by = (k) => rows.filter((r) => r.kind === k);
const divergent = by('DIVERGENT');
const missing = by('MISSING');
const stillLiteral = by('MIGRATED-BUT-STILL-LITERAL');

console.log('SCRIPT.JS LITERALS vs JSON SOURCE OF TRUTH');
console.log('='.repeat(78));
console.log(`  ${distinctive.length} distinctive JSON values checked`);
console.log(`    name-matched (strong) : ${by('name-match').length}`);
console.log(`    value-present (weak)  : ${by('value-present').length}`);
console.log(`    migrated to import    : ${by('migrated').length}`);
console.log(`    not in script.js      : ${by('not-in-script').length}`);

if (process.argv.includes('--list')) {
  for (const r of rows) {
    console.log(`  ${r.kind.padEnd(28)} ${r.path.padEnd(52)} ${r.value}${r.found !== undefined ? ` (script.js: ${r.found})` : ''}`);
  }
}

for (const r of by('known-divergence')) {
  console.log(`\n  KNOWN DIVERGENCE (not failing, not resolved)  ${r.path}`);
  console.log(`    JSON      ${r.value}`);
  console.log(`    script.js ${r.found}`);
  console.log(`    delta     ${r.found - r.value}`);
  for (const line of (KNOWN_DIVERGENCE[r.path].match(/.{1,72}(\s|$)/g) ?? [])) {
    console.log(`    ${line.trim()}`);
  }
}
// A resolved entry must be removed, or the map rots into a list of lies.
for (const p of Object.keys(KNOWN_DIVERGENCE)) {
  if (!by('known-divergence').some((r) => r.path === p)) {
    console.log(`\n  STALE KNOWN_DIVERGENCE  ${p} no longer diverges — remove the entry.`);
  }
}

for (const r of divergent) {
  console.log(`\n  DIVERGENT  ${r.path}`);
  console.log(`    JSON      ${r.value}`);
  console.log(`    script.js ${r.found}`);
  console.log(`    delta     ${r.found - r.value}`);
}
for (const r of missing) {
  console.log(`\n  MISSING  ${r.path} = ${r.value}`);
  console.log('    not found in script.js. Either it moved, or add it to NOT_IN_SCRIPT with a reason.');
}
for (const r of stillLiteral) {
  console.log(`\n  NOT ACTUALLY MIGRATED  ${r.path} = ${r.value}`);
  console.log('    listed in MIGRATED but still a literal in script.js — the import was added without removing the literal.');
}

const masked = by('MASKED-BY-ALLOWLIST');
for (const r of masked) {
  console.log(`\n  MASKED BY ALLOWLIST  ${r.path}`);
  console.log(`    JSON      ${r.value}`);
  console.log(`    script.js ${r.found}`);
  console.log('    NOT_IN_SCRIPT claims script.js does not carry this, but it holds a');
  console.log('    different value under the same name. Remove the allowlist entry.');
}

const bad = divergent.length + missing.length + stillLiteral.length + masked.length;
console.log(`\n${'='.repeat(78)}`);
if (bad) {
  console.log(`FAIL — ${divergent.length} divergent, ${missing.length} missing, ${stillLiteral.length} falsely migrated.`);
  process.exit(1);
}
console.log('PASS — every duplicated JSON value agrees with script.js.');
