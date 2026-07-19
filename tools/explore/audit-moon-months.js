/**
 * audit-moon-months.js
 *
 * Step 2 of the framework-native lunar-physics program.
 *
 * Audit how the five Moon months (sidereal / synodic / tropical /
 * anomalistic / nodal) are computed today, with three questions:
 *
 *   Q1. Asymmetry of inputs. Synodic and tropical are DERIVED from
 *       moonSiderealMonth via H mechanics. Sidereal, anomalistic, nodal
 *       come from three INDEPENDENT observational inputs. Is that
 *       structurally necessary or historical?
 *
 *   Q2. H-rationality of the apsidal/nodal cycle counts. The framework
 *       rationalizes each input independently, but the *consequences* —
 *       N_apsidal_per_H = N_sid − N_ano and N_nodal_per_H = N_nod − N_sid —
 *       fall out as integers too. Are those integers H-meaningful
 *       (divisors of H, or simple lattice multiples), or
 *       arbitrary integers determined purely by observation?
 *
 *   Q3. Deep-time correctness. The current code treats all three input
 *       months as time-independent constants. Physically, as the Moon
 *       recedes (T_M grows) and Earth's rotation slows, the ratios
 *       T_ano/T_sid and T_nod/T_sid both drift — they're functions of
 *       Brown's m = T_M/T_S, which evolves. Where in the codebase, if
 *       anywhere, does this drift get modeled? (Spoiler: it doesn't.)
 *
 * Read-only audit — produces a report + JSON, no edits.
 */

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const H = C.H;
const totalDaysInH = C.totalDaysInH;

// ─── Decode integer cycle counts per H ───────────────────────────────────

// The framework forms a period as totalDaysInH / N for an integer N.
// Inverting: N = totalDaysInH / period.

const N_sid       = Math.round(totalDaysInH / C.moonSiderealMonth);
const N_ano       = Math.round(totalDaysInH / C.moonAnomalisticMonth);
const N_nod       = Math.round(totalDaysInH / C.moonNodalMonth);
const N_syn       = Math.round(totalDaysInH / C.moonSynodicMonth);
const N_trop      = Math.round(totalDaysInH / C.moonTropicalMonth);

const N_apsidalE  = Math.round(totalDaysInH / C.moonApsidalPrecessionDaysEarth);
const N_apsidalI  = Math.round(totalDaysInH / C.moonApsidalPrecessionDaysICRF);
const N_nodalE    = Math.round(totalDaysInH / C.moonNodalPrecessionDaysEarth);
const N_nodalI    = Math.round(totalDaysInH / C.moonNodalPrecessionDaysICRF);

// ─── Q1. Compare derived-from-sidereal vs independent ────────────────────
//
// Synodic relation (from constants.js line 275):
//   N_syn = N_sid_input_round - 1 + 13 - H
// Tropical relation (line 276):
//   N_trop = N_sid_input_round - 1 + 13
//
// Anomalistic / nodal relation IF they were Brown-derived from sidereal:
//   N_apsidal = N_sid - N_ano   (perigee advances → fewer anomalistic per H)
//   N_nodal   = N_nod - N_sid   (node regresses → MORE nodal per H than sidereal)

const N_sid_input_round = Math.round(totalDaysInH / C.moonSiderealMonth);
const N_syn_derived  = N_sid_input_round - 1 + 13 - H;
const N_trop_derived = N_sid_input_round - 1 + 13;

// ─── Q2. H-meaningfulness of the cycle-count integers ────────────────────

// Auto-derived prime factorization of H (H = 23 × 61 × 239 under H=335,317)
function factorize(n) {
  const f = [], seen = new Set();
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) { if (!seen.has(d)) { f.push(d); seen.add(d); } n = n / d; }
    d++;
  }
  if (n > 1 && !seen.has(n)) f.push(n);
  return f;
}
const H_factors = factorize(H);

function smallFactors(n) {
  const out = [];
  let x = n;
  for (const p of [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]) {
    while (x % p === 0) { out.push(p); x /= p; }
    if (x === 1) break;
  }
  if (x > 1) out.push(x);
  return out;
}

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

function hOverlap(n) {
  // How many of H's prime factors (auto-derived) divide n?
  return H_factors.filter(p => n % p === 0);
}

const integers = {
  N_sid, N_ano, N_nod, N_syn, N_trop,
  N_apsidalE, N_apsidalI, N_nodalE, N_nodalI,
};

// ─── Q3. Deep-time drift of T_ano/T_sid and T_nod/T_sid ──────────────────
//
// From Step 1: ω̇/n_M ≈ (3/4)·m² (leading) + higher orders. So:
//   T_ano = T_sid / (1 − ω̇/n_M)  →  T_ano/T_sid = 1 + ω̇/n_M (+ small)
//   T_nod = T_sid / (1 + |Ω̇|/n_M) →  T_nod/T_sid = 1 − |Ω̇|/n_M (+ small)
//
// As Moon recedes, T_M grows, m grows, and BOTH ratios drift away from 1.
// Today's m = 0.0748; at half the current Earth-Moon distance (geological
// past), T_M was shorter, m was smaller, ratios were closer to 1.
//
// We don't have a deep-time T_M model in the framework yet, but we can
// at least quantify the present-day sensitivity dr/dT_M.

const T_M = C.moonSiderealMonth;
const T_S = C.meanSiderealYearDays;
const m   = T_M / T_S;
const apsidalDimensionless = T_M / C.moonApsidalPrecessionDaysICRF;
const nodalDimensionless   = T_M / C.moonNodalPrecessionDaysICRF;
const ratio_ano = C.moonAnomalisticMonth / C.moonSiderealMonth;
const ratio_nod = C.moonNodalMonth / C.moonSiderealMonth;

// Sensitivity: d(ratio_ano)/d(T_M) ≈ d((3/4)m²)/dT_M = (3/2)·m / T_S
const dRatioAno_dT_M = 1.5 * m / T_S;     // per day of T_M change
const dRatioNod_dT_M = -1.5 * m / T_S;    // sign: opposite

// ─── Report ──────────────────────────────────────────────────────────────

const H_HEAD = '═══════════════════════════════════════════════════════════════';
const R_RULE = '───────────────────────────────────────────────────────────────';

console.log(H_HEAD);
console.log(' MOON MONTHS AUDIT — Step 2 (read-only)');
console.log(H_HEAD);
console.log('');
console.log(` H            = ${H}   ( = ${H_factors.join(' × ')} )`);
console.log(` totalDaysInH = ${totalDaysInH.toFixed(6)} d`);
console.log('');

console.log(R_RULE);
console.log(' Q1. INPUT ASYMMETRY');
console.log(R_RULE);
console.log(' Today, the framework rationalizes each month differently:');
console.log('');
console.log(`   sidereal   from moonSiderealMonthInput     INDEPENDENT INPUT`);
console.log(`   anomalistic from moonAnomalisticMonthInput  INDEPENDENT INPUT`);
console.log(`   nodal      from moonNodalMonthInput        INDEPENDENT INPUT`);
console.log(`   synodic    DERIVED from sidereal (+ H/13)  no separate input`);
console.log(`   tropical   DERIVED from sidereal (+ H/13)  no separate input`);
console.log('');
console.log(' Check derived-vs-actual for synodic & tropical:');
console.log(`   N_syn  derived = ${N_syn_derived}   actual = ${N_syn}   ${N_syn_derived === N_syn ? '✓ MATCH' : '✗ MISMATCH'}`);
console.log(`   N_trop derived = ${N_trop_derived}   actual = ${N_trop}   ${N_trop_derived === N_trop ? '✓ MATCH' : '✗ MISMATCH'}`);
console.log('');
console.log(' If anomalistic/nodal were also derived from sidereal via Brown:');
console.log('   N_apsidal_implied = N_sid − N_ano (perigee cycles per H)');
console.log(`     = ${N_sid} − ${N_ano} = ${N_sid - N_ano}     vs actual N_apsidalI = ${N_apsidalI}`);
console.log('   N_nodal_implied   = N_nod − N_sid (nodal cycles per H, retrograde)');
console.log(`     = ${N_nod} − ${N_sid} = ${N_nod - N_sid}     vs actual N_nodalI = ${N_nodalI}`);
console.log('');

console.log(R_RULE);
console.log(' Q2. H-MEANINGFULNESS OF CYCLE-COUNT INTEGERS');
console.log(R_RULE);
console.log(' For each integer, list small prime factorization and which of');
console.log(` H's prime factors {${H_factors.join(', ')}} divide it.`);
console.log('');
for (const [name, n] of Object.entries(integers)) {
  const factors = smallFactors(n);
  const overlap = hOverlap(n);
  const g = gcd(n, H);
  console.log(`   ${name.padEnd(12)} = ${String(n).padStart(10)}  = ${factors.join('·').padEnd(28)}  H-factors∩: {${overlap.join(',')}}  gcd(N,H)=${g}`);
}
console.log('');
console.log(' Reading: if a cycle count N shares prime factors with H, that');
console.log(' precession would be commensurate with the Earth Fundamental Cycle.');
console.log(' If no shared factors → the cycle is genuinely transcendental wrt H.');
console.log('');

console.log(R_RULE);
console.log(' Q3. DEEP-TIME BEHAVIOUR (where does the framework model it?)');
console.log(R_RULE);
console.log('');
console.log(` Current J2000 ratios:`);
console.log(`   T_ano / T_sid = ${ratio_ano.toFixed(10)}   (excess: ${((ratio_ano - 1) * 100).toFixed(5)}%)`);
console.log(`   T_nod / T_sid = ${ratio_nod.toFixed(10)}   (deficit: ${((1 - ratio_nod) * 100).toFixed(5)}%)`);
console.log('');
console.log(` Brown's theory says these ratios scale with m² = (T_M/T_S)²:`);
console.log(`   m today        = ${m.toFixed(10)}`);
console.log(`   m²             = ${(m * m).toExponential(6)}`);
console.log(`   apsidal dim    = T_M/T_apse = ${apsidalDimensionless.toExponential(6)}`);
console.log(`   nodal dim      = T_M/T_node = ${nodalDimensionless.toExponential(6)}`);
console.log('');
console.log(` Sensitivity to T_M drift (per day of T_M change):`);
console.log(`   d(T_ano/T_sid)/dT_M = ${dRatioAno_dT_M.toExponential(4)} / day`);
console.log(`   d(T_nod/T_sid)/dT_M = ${dRatioNod_dT_M.toExponential(4)} / day`);
console.log('');
console.log(' Where does the framework model this drift?');
console.log('   • moonSiderealMonthInput     CONSTANT  (J2000 anchor only)');
console.log('   • moonAnomalisticMonthInput  CONSTANT  (J2000 anchor only)');
console.log('   • moonNodalMonthInput        CONSTANT  (J2000 anchor only)');
console.log('   • All three derived months   CONSTANT  (no t-dependence)');
console.log('   → Deep-time evolution of months is NOT modeled.');
console.log('   → Farhat polynomial provides T_M(t) for distance only,');
console.log('     not for anomalistic/nodal coupling.');
console.log('');

console.log(H_HEAD);
console.log(' SUMMARY & OPTIONS');
console.log(H_HEAD);
console.log('');
console.log(' OPTION A — Keep three independent inputs.');
console.log('   Pros: 100% J2000 accuracy (matches observation exactly).');
console.log('   Cons: Three "free parameters". No structural unification.');
console.log('         Deep-time evolution requires three independent models.');
console.log('');
console.log(' OPTION B — Derive anomalistic & nodal from sidereal via Brown.');
console.log('   Pros: Single input (sidereal month). Tight unification with');
console.log('         Step 1. Deep-time evolution follows m(t) automatically.');
console.log('   Cons: Brown apsidal undershoots by ~0.3%; nodal off by ~5%.');
console.log('         Worse J2000 accuracy than today.');
console.log('');
console.log(' OPTION C — Hybrid: keep J2000 anchors, derive deep-time DRIFT');
console.log('   from Brown\'s m²·(1 + dm/m).');
console.log('   Pros: J2000 accuracy preserved. Deep-time evolution gets');
console.log('         physics-grade scaling without 5% nodal error today.');
console.log('   Cons: More complex; needs a clean separation of "anchor" vs');
console.log('         "drift" in the constants pipeline.');
console.log('');

// ─── Persist JSON ────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', '..', 'data');
const outFile = path.join(outDir, 'moon-months-audit.json');

const report = {
  H,
  totalDaysInH,
  cycleCounts: integers,
  derivedFromSidereal: {
    N_syn_derived,  N_syn_actual: N_syn,   match_syn: N_syn_derived === N_syn,
    N_trop_derived, N_trop_actual: N_trop, match_trop: N_trop_derived === N_trop,
  },
  brownImplied: {
    N_apsidal_implied: N_sid - N_ano,
    N_apsidal_actual:  N_apsidalI,
    N_nodal_implied:   N_nod - N_sid,
    N_nodal_actual:    N_nodalI,
  },
  hMeaningfulness: Object.fromEntries(
    Object.entries(integers).map(([k, n]) => [k, {
      value: n,
      smallFactors: smallFactors(n),
      hFactorsDividing: hOverlap(n),
      gcdWithH: gcd(n, H),
    }])
  ),
  deepTime: {
    j2000: { T_M, T_S, m, ratio_ano, ratio_nod, apsidalDimensionless, nodalDimensionless },
    sensitivity: { dRatioAno_dT_M, dRatioNod_dT_M },
    modeledInFramework: false,
  },
};

fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
console.log(` Written: ${path.relative(process.cwd(), outFile)}`);
