/**
 * Guard the JSON values that `src/script.js` duplicates as literals (§2g).
 *
 * WHY THIS EXISTS. `export-to-script.js` patches ~129 of the 164 duplicated
 * values. The other 35 have no sync mechanism at all — they agree today only
 * because nobody has edited them. MASS_RATIO_EARTH_MOON, earthEccentricityJ2000
 * and moonSiderealMonthInput are in that group.
 *
 * Rather than extend a mirroring mechanism Phase 5 deletes, this CHECKS without
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
 * covers everything, this file and export-to-script.js both retire.
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
];

/**
 * JSON values legitimately not present in script.js, each with the reason.
 * An entry here is a claim that needs to stay true, so it carries its evidence.
 * @type {Record<string, string>}
 */
const NOT_IN_SCRIPT = {
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
  'model.deepTime.alpha1PerMa': 'deep-time engine is Node-side (tools/lib/deep-time.js)',
  'astro.earthOrbital.earthEccentricityDotDotJ2000': 'second derivative used by tools/lib only',
  'astro.earthOrbital.earthPerihelionLongitudeJ2000': 'script.js derives perihelion longitude from the model',
  'astro.physicalConstants.earthJ2': 'used by tools/lib figure-of-Earth term',
  'astro.physicalConstants.earthEquatorialRadiusKm': 'used by tools/lib figure-of-Earth term',
};

/**
 * Divergences that are known, deliberate-or-undecided, and NOT to be silently
 * accepted. Printed on every run. Removing an entry is how a resolution gets
 * recorded — same discipline as verify-laws carrying its Saturn 44/45 failure.
 * @type {Record<string, string>}
 */
const KNOWN_DIVERGENCE = {
  'astro.earthOrbital.obliquityJ2000_deg':
    'DECIDED, NOT YET ADOPTED — blocked on a refit. src/script.js uses IAU 2006 '
    + '(84381.406", Capitaine 2003); the JSON, and so tools/lib/constants.js, still '
    + 'holds IAU 1976/1980 (84381.448"). 0.042" apart, ~6.5x the 0.00641" out-of-sample '
    + 'RMS the obliquity fit targets. IAU 2006 IS the intended value. It is not in yet '
    + 'because this constant is a FIT TARGET (tools/lib/optimizer.js:218, '
    + 'tools/fit/obliquity-harmonics.js), so adopting it requires regenerating Step 6a '
    + 'and then Step 6b — not a constant swap. Swapping it alone was measured: '
    + 'verify-pipeline went 0.0000" -> 0.0420" and failed, since the shipped harmonics '
    + 'stay anchored to the old value. Remove this entry when the refit lands.',
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
