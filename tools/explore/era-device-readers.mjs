#!/usr/bin/env node
/**
 * Plan 09 step 1 — THE FROZEN ERA DEVICE'S READERS, written by a script.
 *
 *   node tools/explore/era-device-readers.mjs           print the audit
 *   node tools/explore/era-device-readers.mjs --write   write data/era-device-readers.json (inputs-stamped)
 *
 * Every reader of the five device constants (`holisticyearLength` H,
 * `earthtiltMean`, `earthInvPlaneInclinationAmplitude`,
 * `earthInclinationCycleAnchor`, `kDeviceWheelPhaseAtJ2000Cycles`), of the
 * frozen era clock (`eraClockHAtAge` and its year/day twins, `holisticHAtAgeMa`)
 * and of the cycle counters (`cyclesBetweenYears`, `cyclesBetween`,
 * `_phaseCycles`), across the runtimes — browser, Node engine, fitting,
 * package, API, Python — classified per hit:
 *
 *   comb        a fitted correction family evaluated on H/N (harmonic bases, the
 *               cycle counters, the ∫1/H phase table)
 *   counter     the frozen era clock and the H/13 counting (lunar arguments, ΔT flags)
 *   calendar    the deep JD↔year calendar
 *   scene       the scene scaffolding's J2000 pose (wheels, tilt, RA angle)
 *   plumbing    constants loading / bridging, no physics
 *   source      the JSON that defines the constant
 *   comment     a comment or docstring line (no code)
 *   diagnostic  docs renderers, registry notes, literal gates, verifiers
 *   test        gates and fixtures
 *   explore     frozen research one-offs
 *   unclassified  a code line the heuristics could not place — read it
 *
 * The literal-grep rule (plan 07 R10): the conventions are ALSO searched as
 * literals — `H / N`, `N * H`, `8H`, `EIGHT_H`, `/ 13`, `270.0 +` — because
 * four private copies of one convention survived R10 by riding names. The
 * per-runtime divisor sets (the N in `H / N`, `cyclesBetweenYears(…, N)`,
 * `_phaseCycles(…, N)`) are printed side by side: a divisor present in one
 * runtime and absent in another is a private copy.
 *
 * THE TWINS (owner 2026-10-11, "the anchoring is already there"): every live
 * reader is paired with the one-source quantity that superseded the device
 * at the D4 flip — the one-family year laws, the hybrid obliquity, the
 * series' perihelion of date, the certified Sun's crossings, the composed
 * clock, the composed calendar, the lunar chain — and each pair is MEASURED
 * at a fixed epoch set (the device against the physics it approximated).
 * The retired-fitter record (tools/fit/README "The frozen era clock"): a
 * harmonic re-fit against the one-source movement was measured 30–60×
 * worse — the engine's spectrum is off-lattice; there is no unit to refit
 * the combs on, the twins replace them.
 *
 * Read-only against the model (tools/explore rule). Numbers for docs come
 * from the artifact, never from this header.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(join(ROOT, 'package.json'));
const { buildInputsBlock } = require(join(ROOT, 'tools/lib/artifact-inputs.js'));
const SELF_REL = 'tools/explore/era-device-readers.mjs';
const OUT_REL = 'data/era-device-readers.json';

const CONSTANTS = ['holisticyearLength', 'earthtiltMean', 'earthInvPlaneInclinationAmplitude', 'earthInclinationCycleAnchor', 'kDeviceWheelPhaseAtJ2000Cycles'];
const COUNTERS = ['eraClockHAtAge', 'eraClockTropicalYearSecondsAtAge', 'eraClockYearInDaysAtAge', 'eraClockH', 'holisticHAtAgeMa', 'cyclesBetweenYears', 'cyclesBetween', '_phaseCycles'];
const LITERALS = [
  ['H / N', /\bH\s*\/\s*(\d+(?:\.\d+)?)\b/g],
  ['N * H', /\b(\d+)\s*\*\s*H\b/g],
  ['8H', /\b8H\b/g],
  ['EIGHT_H', /\bEIGHT_H\b/g],
  ['/ 13', /\/\s*13(?:\.0)?\b/g],
  ['270.0 +', /270\.0\s*\+/g],
];

/** runtime label per path (first match wins) */
const RUNTIMES = [
  ['browser', (p) => p === 'src/script.js'],
  ['source', (p) => p.startsWith('public/input/')],
  ['tests', (p) => /^(test\/|packages\/[^/]+\/test\/|tools\/fixtures\/|scripts\/test_[^/]+\.js$)/.test(p)],
  ['explore', (p) => p.startsWith('tools/explore/')],
  ['docs-tools', (p) => /^tools\/(docs|constants|types)\//.test(p) || /^tools\/check-[^/]+\.mjs$/.test(p)],
  ['verify', (p) => p.startsWith('tools/verify/')],
  ['python', (p) => p.endsWith('.py')],
  ['fitting', (p) => /^(tools\/fit\/|packages\/fitting\/src\/|tools\/optimize\.js|tools\/lib\/optimizer\.js)/.test(p)],
  ['node-lib', (p) => p.startsWith('tools/lib/')],
  ['package', (p) => p.startsWith('packages/physics/src/')],
  ['api', (p) => p.startsWith('packages/api/src/')],
];
const SCAN_ROOTS = ['src', 'tools', 'packages', 'scripts', 'test', 'public/input'];
const SKIP = (p) => /node_modules|\/types\/|\.map$|\/archive\/|packages\/physics\/src\/constants\/(generated|coefficients)\.|packages\/fixtures\/|packages\/model-values\/src\/model-values\.generated|\.local\./.test(p) || p === SELF_REL;
const EXT = new Set(['.js', '.mjs', '.cjs', '.py', '.json']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { if (!/node_modules|\.git$/.test(name)) yield* walk(full); }
    else if (EXT.has(extname(name))) yield full;
  }
}
const runtimeOf = (rel) => (RUNTIMES.find(([, f]) => f(rel)) ?? ['other'])[0];
const PLUMBING = /^(tools\/lib\/constants\.js|tools\/lib\/constants\/utils\.js|tools\/fit\/python\/(load_constants|_dump_constants)\.(py|js)|tools\/lib\/python\/constants_scripts\.py|packages\/physics\/src\/index\.js)$/;

function classify(rel, runtime, line, token) {
  const t = line.trim();
  const isPy = rel.endsWith('.py');
  if ((isPy && /^#/.test(t)) || (!isPy && /^(\/\/|\/?\*|<!--)/.test(t))) return 'comment';
  // a token that appears only after the comment marker on a code line
  const codePart = isPy ? t.split('#')[0] : t.split('//')[0];
  const lit = LITERALS.find(([name]) => name === token);
  // a NON-global copy: the caller is iterating the global regex with exec(), its cursor must not move
  if (lit) { if (!new RegExp(lit[1].source).test(codePart)) return 'comment'; }
  else if (!codePart.includes(token)) return 'comment';
  if (runtime === 'source') return 'source';
  if (runtime === 'tests') return 'test';
  if (runtime === 'explore') return 'explore';
  if (runtime === 'docs-tools' || runtime === 'verify') return 'diagnostic';
  if (PLUMBING.test(rel)) return 'plumbing';
  if (runtime === 'python') return 'analysis';   // the Python tree is analysis, not a runtime of the model (the bridge is plumbing above)
  // presentation surfaces: hover text, labels, console reports, template strings
  if (/fmtNum\(|hover|label\s*:|toLocaleString|console\.(log|error)|subtitle|title\s*:|formula\s*:|description\s*:|note\s*:|`[^`]*\$\{[^`]*$|^\s*['"`]|small\s*:\s*'orbits'/.test(codePart)) return 'display';
  // the Step-3 workbook export's chunking over one H (a tool, not physics)
  if (/_hJd|_hSteps|_hFact|numSteps|workbook|exportSheet|SheetJS|holisticyearLength % d|d <= holisticyearLength/i.test(codePart)) return 'export';
  if (/orbitRadius|RotationPeriod|SolarYearCount/i.test(codePart)) return 'scene';
  if (/\b(H_YR|EIGHT_H(_YR)?|H)\s*\/\s*[\d.]+|\bH_YR\b.*\/\s*\d/.test(codePart) && !/eraClock/.test(codePart)) return 'comb';
  if (/^(let|const|var)\s+\w+\s*=\s*[\w.]+\s*;?\s*$|^[\w.]+(\s*,\s*[\w.]+)*\s*,?\s*$/.test(codePart)) return 'plumbing';
  if (/eraClock|holisticHAtAgeMa|\/\s*13\b|N_apsidal|N_nodal|N_sid|counter|lunarCounter|H13|h13|moon\w*Month|moonFullMoon|Draconic|_kcNOfDate|holisticYears\s*:/i.test(codePart)) return 'counter';
  if (/calendar|yearInDays|jdToYear|yearToJd|balancedYearAtCycle|deepCalendar|createDeepCalendar|H_t\b|recomputeEpochAnchors|HOLISTIC_YEAR_J2000|TOTAL_DAYS_IN_H|hAtAge/i.test(codePart)) return 'calendar';
  if (/_kcFrame|wheel|scaffold|RAAngle|earthtilt|tiltMean|pose|\.rotation|mesh|geometry|ring|quaternion|Euler|inclinationAmplitude|speed\s*:|Math\.PI\s*\*\s*2\s*\//i.test(codePart)) return 'scene';
  if (/cyclesBetween|phaseCycles|harmonic|comb|divisor|sideband|Math\.(sin|cos)|2 \* Math\.PI|TWO_PI|phaseAdvance|∫|trapezoid|PHASE|holisticyearLength\s*\/\s*\d+|CycleLength|CycleYears|ICRFYears|\bH\s*\/\s*\d+/i.test(codePart)) return 'comb';
  // plain plumbing lines: aliases, exports, object spreads of the constant
  if (/^(let|const|var)\s+\w+\s*=\s*(K|C|MP|CONST)\b|^\w+\s*,?\s*$|:\s*\w+\s*,?\s*$|^\s*\w+\s*=\s*\w+\s*;?\s*$/.test(codePart)) return 'plumbing';
  return 'unclassified';
}

const hits = [];
const divisorSets = {};
const addDiv = (runtime, kind, n) => { ((divisorSets[runtime] ??= {})[kind] ??= new Set()).add(Number(n)); };
for (const root of SCAN_ROOTS) {
  for (const full of walk(join(ROOT, root))) {
    const rel = relative(ROOT, full).split('\\').join('/');
    if (SKIP(rel)) continue;
    const runtime = runtimeOf(rel);
    const text = readFileSync(full, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      for (const tok of [...CONSTANTS, ...COUNTERS]) {
        if (!line.includes(tok)) continue;
        // whole-identifier match
        if (!new RegExp(`(^|[^A-Za-z0-9_])${tok.replace(/[$]/g, '\\$')}([^A-Za-z0-9_]|$)`).test(line)) continue;
        hits.push({ file: rel, line: i + 1, runtime, token: tok, class: classify(rel, runtime, line, tok), text: line.trim().slice(0, 160) });
      }
      for (const [name, re] of LITERALS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          hits.push({ file: rel, line: i + 1, runtime, token: name, class: classify(rel, runtime, line, name), text: line.trim().slice(0, 160) });
          if (name === 'H / N' && !/^(\/\/|\*|#)/.test(line.trim())) addDiv(runtime, 'H / N', m[1]);
        }
      }
      for (const m of line.matchAll(/cyclesBetweenYears\([^()]*,\s*(\d+(?:\.\d+)?)\s*\)/g)) addDiv(runtime, 'cyclesBetweenYears(…, N)', m[1]);
      for (const m of line.matchAll(/_phaseCycles\([^()]*,\s*(\d+(?:\.\d+)?)\s*\)/g)) addDiv(runtime, '_phaseCycles(…, N)', m[1]);
    });
  }
}

const EXCLUDED = ['comment', 'source', 'test', 'explore', 'diagnostic', 'display', 'analysis', 'export'];
// ── THE PHYSICAL TWINS (plan 09, owner 2026-10-11: "the anchoring is already there") ─────────
// Every live reader is paired with the one-source quantity that superseded it at the D4 flip,
// and the pair is MEASURED at a fixed epoch set — the device against the physics it approximated.
const TWINS = [
  ['kinematic-year-family', /computeYearDaysDirectAll|compute(Solar|Sidereal|Anomalistic)YearDaysDirect|_evalSiderealYearFourierIAU|siderealYearDaysFourierAt|computeLengthOfSimplified|computeLengthOfSiderealYear|evalYearFourier|(TROPICAL|SIDEREAL|ANOMALISTIC)_YEAR_HARMONICS|mean(Solar|Sidereal|Anomalistic)YearDays|meansolaryearlengthinDays|meansiderealyearlengthinDays|1 - 13 \/|13\s*\/\s*H|H_t - 13|H \/ 16\) - 1|YEAR_LENGTH_J2000_ANCHOR|holisticyearLength - 13|holisticyearLength \/ 8\)/,
    'the one-family year laws of date (earth/year-lengths.cjs: the composed precession, the λ̇ channel, the movement\'s own apsidal line) — gated by scene-year-lengths within 30 ms'],
  ['perihelion-comb', /PERI_HARMONICS|calcEarthPerihelionPredictive|calcERD|perihelionCycleLength|perihelionCoinRotation|earthPerihelionICRFYears|PERI_OFFSET|perihelionPhaseOffset|perihelionCycle\b|perihelionPrecessionYears|periPhase|isPerihelionCycle|PERI_PERIOD|EARTH_PERI_ICRF/,
    'the series\' perihelion longitude of date (the one-source movement periOfDateDeg; the scene\'s perihelion follows the series since v16.0)'],
  ['obliquity-comb', /SOLSTICE_OBLIQUITY|computeObliquityEarth|computeObliquityIntegrals|tiltMean|earthtiltMean|phase3\b|phase8\b/,
    'the hybrid obliquity ε(t) (the published ε, plan 06 S3b: ds/dt = α(ŝ·n̂)(ŝ×n̂) on the engine\'s own orbit-plane history) — ROUTED, plan 09 step 2: the comb (SOLSTICE_OBLIQUITY_*) and its readers are deleted; the remaining hits are the scene pose\'s earthtiltMean and retired-name comments'],
  ['cardinal-comb', /CARDINAL_POINT|cardinalHarmonics|tropicalHarmonics/,
    'the apparent crossings of the one certified Sun (model.cardinal, plan 06 R1 — the comb left the runtime; the record stays in the coefficients file)'],
  ['era-counter', /eraClock|holisticHAtAgeMa|cyclesBetween|_phaseCycles|phaseAdvance|balancedYear|H_era|\/\s*13\b|hAtAge|H_t\b|divisor_N|periAlign|phaseOrigin|_EPOCH_SEEDS/,
    'the composed clock T_p(t) (the unit H(t) = 13·T_p,composed, deltat/deep-time.cjs hAtAge; the counters agree within every fit window and part beyond ±1 Myr)'],
  ['device-periods', /holisticyearLength\s*\/\s*(3|5|8)\b|\bH\s*\/\s*(3|5|8)\b|cycle3|cycle8|inclCycle3|obliquityPrecession\s*=|eclipticPrecession\s*=|inclinationPrecessionPeriodYears|perihelionPrecessionPeriodYears|earthInvPlanePrecessionYears|OBLIQUITY_CYCLE|INCL_PERIOD|ascendingNodeCyclesIn8H|ascendingNodePeriod/,
    'the derived periods of the lunisolar surface — T_aps (the J2000 apsidal tangent, 111,634), |s₃| (68,751), the obliquity beat (41,098), T_peri (20,938): H/3, H/5, H/8, H/16 approximate them by 0.12, −2.45, +1.99 and 0.09 %'],
  ['lod-ecliptic-term', /\(holisticyearLength \/ 5\) \* means|derivedDayLength \/ \(\(holisticyearLength|predictedEcliptic|eclipticLodCorrection|ecliptic term/i,
    'the day\'s ecliptic term on the nodal mode s₃ (deep-time.cjs eclipticLodCorrectionSecondsAtAge; doc 11 LOD_real = lod + lod/(T_s₃·mSY) + …) — the device reads H/5 here, 2.45 % off s₃'],
  ['deep-calendar', /createDeepCalendar|yearInDays|jdToYear|yearToJd|deepCalendar|calendar|TOTAL_DAYS_IN_H|HOLISTIC_YEAR_J2000/,
    'the composed days-per-year of date (meanYearInDaysAtAge) and Julian years from J2000'],
  ['lunar-counter', /moon\w*Month|N_sid|N_apsidal|N_nodal|moonFullMoon|Draconic|MOON_SIDEREAL_MONTH|_kcNOfDate|holisticYears\s*:/,
    'the IAU month inputs and the lunar chain\'s own rates (moon/month-chain.cjs, moon/arguments.cjs)'],
  ['scene-pose', /_kcFrame|wheel|scaffold|RAAngle|inclinationAmplitude|earthInvPlaneInclinationAmplitude|kDeviceWheelPhase|speed\s*[:=]|Precession\d?\.speed|PrecessionRate|orbitRadius|RotationPeriod|SolarYearCount|\.rotation|mesh|geometry|ring/i,
    'none — the scene\'s J2000 pose; the R4 placement overrides every observable (plan 07 R10: dropping the pose tilted the scaffold 1.25° and moved no observable)'],
  ['ecc-law-anchor', /earthInclinationCycleAnchor|inclinationCycleAnchorDeg|zodiacOffset|ZodiacOffset/,
    'a recorded J2000 phase of the one eccentricity law, θ(J2000) = ϖ_J2000 − anchor (bit-exact re-expression, plan 09 step 4)'],
  ['sun-longitude-legacy', /SUN_LONGITUDE_(MEAN|HARMONICS)/, 'the certified Sun completion chain (D2; the legacy harmonics are the record, doc 20)'],
  ['ra-day-offset', /RA_DAY_OFFSET|computeRADayOffset|coinRotation|CoinRotation/i, 'none — a fitted display line (the coin-rotation RA offset); record'],
  ['dt-flags', /DT_RESONATOR|EIGHT_H|RES_T0|Bond|LONG_N|H\/253|gcd\(|structural\s*:|bondCycle|hallstattCycle/, 'the ΔT stack\'s flags stated in years (T5: the divisor is a fitter detail, the periods are fitted periods)'],
  ['plumbing', /./, 'none — a constants alias, an export list or a bridge line; goes with the constant it carries'],
];
const twinOf = (h) => { if (EXCLUDED.includes(h.class)) return null; if (h.class === 'plumbing') return 'plumbing'; for (const [id, re] of TWINS) if (id !== 'plumbing' && (re.test(h.text) || re.test(h.token))) return id; return 'unmapped'; };
for (const h of hits) { const t = twinOf(h); if (t) h.twin = t; }
const twinReaders = {};
for (const h of hits) if (h.twin) { ((twinReaders[h.twin] ??= {})[h.runtime] ??= 0); twinReaders[h.twin][h.runtime]++; }

// measurements — the device against its twin, at the fixed epoch set
// 2000, −4000, 10000, −26000, −270000, −1000000 (every row a FROZEN record since
// plan 09 step 7a deleted the last live device; the package model, the
// constants module and the Node orbital engine were read only by those twins)
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));
const DOH = require(join(ROOT, 'tools/lib/deep-orbital-history.js'));
const M = DOH.createOneSourceMovement();
const measured = {};
if (M) {
  const YL = M.yearLengths;
  const lodS = (y) => DT.meanLodSecondsAtAge((2000 - y) / 1e6);
  // plan 09 step 3: the year combs are deleted — FROZEN record of the last measurement before deletion
  // (device − law, s of year), kept so the artifact still states what the routing moved.
  void lodS; void YL;
  measured['kinematic-year-family'] = { unit: 's of year (device − law: tropical / sidereal / anomalistic) — recorded before the combs\' deletion at plan 09 step 3; the combs no longer evaluate', rows: [
    { year: 2000, tropical: -0.18364283442497253, sidereal: -0.15741310641169548, anomalistic: -0.31728624179959297 },
    { year: -4000, tropical: -9.711671400815248, sidereal: 0.4510342739522457, anomalistic: 17.732564590871334 },
    { year: 10000, tropical: 10.76361058279872, sidereal: -0.7273695729672909, anomalistic: -28.574370343238115 },
    { year: -26000, tropical: 45.73209993541241, sidereal: 1.0313979387283325, anomalistic: 153.2601317949593 },
    { year: -270000, tropical: 44.74587011709809, sidereal: 0.6040267795324326, anomalistic: 314.1274871490896 },
    { year: -1000000, tropical: -8.379667393863201, sidereal: 4.573813807219267, anomalistic: 129.21708285063505 },
  ] };
  // plan 09 step 2: the comb is deleted, so this row is the FROZEN record of the
  // last measurement before deletion (the comb against the hybrid, ″), kept so
  // the artifact still states what the routing moved.
  measured['obliquity-comb'] = { unit: '″ (fitted comb − hybrid ε) — recorded before the comb\'s deletion at plan 09 step 2; the comb no longer evaluates', rows: [
    { year: 2000, arcsec: 0.23314361143746964 }, { year: -4000, arcsec: 225.34364759740555 }, { year: 10000, arcsec: -126.97930614437638 },
    { year: -26000, arcsec: 4938.090393386764 }, { year: -270000, arcsec: 4592.334305779067 }, { year: -1000000, arcsec: -1776.8762516478005 },
  ] };
  // plan 09 step 4: the perihelion comb is deleted — FROZEN record of the last measurement (the comb no longer evaluates)
  measured['perihelion-comb'] = { unit: '° (predictive comb − the series\' ϖ of date; frames differ by the equinox convention — read the DRIFT across epochs, not the offset) — recorded before the comb\'s deletion at plan 09 step 4', rows: [
    { year: 2000, deg: 0.0290786002965433 }, { year: -4000, deg: -1.585318413795676 }, { year: 10000, deg: -2.938993674087442 },
    { year: -26000, deg: -19.99716160398134 }, { year: -270000, deg: -86.88308327267453 }, { year: -1000000, deg: -87.79076041849305 },
  ] };
  // plan 09 step 7a: the frozen era clock's counter (eraClockHAtAge and its year twins) is deleted — FROZEN
  // records of the last measurement before deletion (the counter no longer evaluates)
  measured['era-counter'] = { unit: 'H/16 comb phase, ° (frozen counter − composed clock, integrated from J2000) — recorded before the counter\'s deletion at plan 09 step 7a', rows: [
    { year: -4000, deg: -0.00006300986318708013, ratioMinus1: 0.0000012227007812892765 }, { year: 10000, deg: 0.00011201710319319602, ratioMinus1: -0.0000016302631730136241 },
    { year: -26000, deg: -0.0013722240174551814, ratioMinus1: 0.000005705961931168346 }, { year: -270000, deg: -0.12950250287623533, ratioMinus1: 0.000055432032930013975 },
    { year: -1000000, deg: -1.757801139671642, ratioMinus1: 0.0002042314715116067 },
  ] };
  measured['deep-calendar'] = { unit: 'days per year (era clock − composed) — recorded before the counter\'s deletion at plan 09 step 7a', rows: [
    { year: 2000, days: 0.000011807327439328219 }, { year: -4000, days: 0.000011824668206372735 }, { year: 10000, days: 0.000011784202513354103 },
    { year: -26000, days: 0.000011888280823768582 }, { year: -270000, days: 0.000012593842711794423 }, { year: -1000000, days: 0.000014706149158882909 },
  ] };
  // plan 09 step 3: the 8H counts are deleted (the months are the IAU inputs) — FROZEN record of the last measurement
  measured['lunar-counter'] = { unit: 's of month (device-quantized − IAU input) — recorded before the counts\' deletion at plan 09 step 3', rows: [{ year: 2000, sidereal: 0.007823650412319694 }] };
}

// the comb families that rode H as their unit: NONE remain — plan 09 deleted
// them family by family and plan 11 step 1 deleted their emptied home,
// public/input/fitted-coefficients.json
const families = [];

// summaries
const tally = (keyFn) => { const m = {}; for (const h of hits) { const k = keyFn(h); m[k] = (m[k] ?? 0) + 1; } return m; };
const byTokenRuntime = {};
for (const h of hits) { ((byTokenRuntime[h.token] ??= {})[h.runtime] ??= {}); byTokenRuntime[h.token][h.runtime][h.class] = (byTokenRuntime[h.token][h.runtime][h.class] ?? 0) + 1; }
const codeHits = hits.filter((h) => !EXCLUDED.includes(h.class));
const byFileCode = tally.call(null, (h) => h.file);
const filesWithHits = [...new Set(hits.map((h) => h.file))].sort();

const pad = (s, n) => String(s).padEnd(n);
console.log('ERA-DEVICE READERS — plan 09 step 1 (code hits exclude comments, sources, tests, explore, diagnostics, display strings, Python analysis)');
console.log(`  ${hits.length} hits in ${filesWithHits.length} files · ${codeHits.length} code hits`);
console.log('\n  token                              runtime     comb  counter calendar scene plumb uncls | disp  anal  comment diag test expl src');
const RT = ['browser', 'node-lib', 'fitting', 'package', 'api', 'python', 'verify', 'docs-tools', 'tests', 'explore', 'source', 'other'];
for (const tok of [...CONSTANTS, ...COUNTERS, ...LITERALS.map((l) => l[0])]) {
  const r = byTokenRuntime[tok]; if (!r) continue;
  for (const rt of RT) {
    const c = r[rt]; if (!c) continue;
    const g = (k) => pad(c[k] ?? '', 5);
    console.log(`  ${pad(tok, 34)} ${pad(rt, 11)} ${g('comb')} ${g('counter')} ${g('calendar')} ${g('scene')} ${g('plumbing')} ${g('unclassified')}| ${g('display')} ${g('analysis')} ${g('comment')} ${g('diagnostic')} ${g('test')} ${g('explore')} ${g('source')}`);
  }
}
console.log('\n  divisor sets per runtime (the private-copy check):');
for (const [rt, kinds] of Object.entries(divisorSets)) for (const [kind, set] of Object.entries(kinds)) console.log(`    ${pad(rt, 11)} ${pad(kind, 26)} ${[...set].sort((a, b) => a - b).join(' ')}`);
console.log('\n  coefficient families riding H as their unit:');
console.log('    ' + families.map((f) => `${f.family} (${f.rows})`).join(' · '));
console.log('\n  live readers by physical twin (code hits per runtime):');
for (const [id, , twin] of TWINS) {
  const r = twinReaders[id]; if (!r) continue;
  console.log(`    ${pad(id, 22)} ${Object.entries(r).map(([rt, n]) => `${rt} ${n}`).join(' · ')}\n      twin: ${twin}`);
}
if (twinReaders.unmapped) console.log(`    ${pad('unmapped', 22)} ${Object.entries(twinReaders.unmapped).map(([rt, n]) => `${rt} ${n}`).join(' · ')}`);
console.log('\n  measured — the device against its twin:');
for (const [id, mm] of Object.entries(measured)) {
  console.log(`    ${id}  [${mm.unit}]`);
  for (const row of mm.rows) console.log('      ' + Object.entries(row).map(([k, v]) => `${k} ${typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(1) : v.toPrecision(3)) : v}`).join('  '));
}
console.log(`\n  unclassified code lines (read these): ${hits.filter((h) => h.class === 'unclassified').length}`);
for (const h of hits.filter((h) => h.class === 'unclassified').slice(0, 40)) console.log(`    ${h.file}:${h.line}  [${h.token}]  ${h.text.slice(0, 110)}`);

if (process.argv.includes('--write')) {
  const out = {
    _description: 'Plan 09 step 1 — every reader of the five frozen-era-device constants, the era clock and the cycle counters across the runtimes, classified per hit (comb / counter / calendar / scene / plumbing / source / comment / diagnostic / test / explore / unclassified), with the literal divisor conventions (H / N, N * H, 8H, EIGHT_H, / 13, 270.0 +) searched as literals (the plan 07 R10 private-copy lesson) and the per-runtime divisor sets side by side. Generated by tools/explore/era-device-readers.mjs --write; the inputs block hashes every file with a hit, so the audit goes stale when a reader changes.',
    tokens: { constants: CONSTANTS, counters: COUNTERS, literals: LITERALS.map((l) => l[0]) },
    summary: { hits: hits.length, codeHits: codeHits.length, files: filesWithHits.length, excludedClasses: EXCLUDED, byTokenRuntime, byClass: tally((h) => h.class), codeHitsByFile: Object.fromEntries(Object.entries(tally((h) => (EXCLUDED.includes(h.class) ? '_excluded' : h.file))).filter(([k]) => k !== '_excluded').sort()) },
    divisorSets: Object.fromEntries(Object.entries(divisorSets).map(([rt, kinds]) => [rt, Object.fromEntries(Object.entries(kinds).map(([k, s]) => [k, [...s].sort((a, b) => a - b)]))])),
    coefficientFamilies: families,
    twins: Object.fromEntries(TWINS.map(([id, , twin]) => [id, { twin, readers: twinReaders[id] ?? {}, measured: measured[id] ?? null }])),
    unmappedReaders: twinReaders.unmapped ?? {},
    hits,
    meta: { script: SELF_REL, plan: 'holisticuniverse docs/plans/09 IP-retire-the-frozen-era-device.md §3 step 1' },
    inputs: buildInputsBlock(`node ${SELF_REL} --write`, [SELF_REL, 'data/nbody-secular-series.json', ...filesWithHits.filter((f) => f !== SELF_REL)]),
  };
  writeFileSync(join(ROOT, OUT_REL), JSON.stringify(out, null, 1) + '\n');
  console.log(`\nwrote ${OUT_REL}`);
}
void byFileCode;
