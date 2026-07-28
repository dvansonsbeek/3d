/**
 * NULL TESTS FOR THE ΔT-STACK ↔ CLIMATE CORRESPONDENCE (part 1 of 2)
 * ===================================================================
 * Regenerates two of the four statistics quoted in
 *   docs/102 § "Defensible scientific position" item 7
 *   docs/99  § sub-Milankovitch stack rate
 *   website  /model/timekeeping § "The Bond 2001 IRD comparison"
 *
 *   1. BAND-LEVEL SIGN SCORE. The shipped sign-convention check samples ONE
 *      hand-picked year per named climate period. This scores EVERY year in
 *      each period against its warm/cold label — the honest counterpart.
 *      Mirrors src/script.js lcrBandSignScore(), which shows it in the modal.
 *
 *   2. CROSSING-TIMING MONTE CARLO. The stack's typed zero-crossings are
 *      matched to 10 named climate transitions (the console test
 *      "All cycles (4-flag stack) ↔ climate transitions"). This asks whether
 *      that match beats chance, by scattering the same 7 TROUGH + 3 PEAK
 *      events at random through the same window and matching them to the same
 *      typed crossings.
 *
 * Companion: tools/explore/climate-band-phase.js (band-limited + windowed
 * phase tests). Both are diagnostics — neither writes to any shipped artifact.
 *
 * Run:  node tools/explore/climate-crossing-null.js
 */
const path = require('path');
const dt = require(path.join(__dirname, '..', 'lib', 'deep-time.js'));

// The console test gates on the FLAGS-ONLY stack: the Core-mantle swing is
// core-supplied angular momentum, not climate, so it is excluded from the
// crossing geometry (mirrors src/script.js).
const flagsOnly = (y) => dt.dtCycleLodCorrectionSum(y) - dt.resonatorSwingLodCorrection(y);

// Σ_stack as the shipped sign panel uses it — flags + swing.
const sigmaStack = (y) => dt.dtCycleLodCorrectionSum(y);

// ── 1. Band-level sign score ────────────────────────────────────────────────
// Named periods, mainstream literature dates (mirrors LCR_CLIMATE_PERIODS).
// Only sub-Milankovitch periods (≤1000 yr span) inside the validated window:
// the named events the stack is claimed to time, not glacial envelopes.
const PERIODS = [
  { start: -3850, end: -3750, type: 'cold', name: 'Bond 4 event' },
  { start: -2250, end: -2150, type: 'cold', name: '4.2 ka event / Bond 3' },
  { start: -1200, end: -1100, type: 'cold', name: 'Late Bronze Age Collapse' },
  { start:  -800, end:  -400, type: 'cold', name: 'Iron Age cold epoch' },
  { start:  -250, end:   400, type: 'warm', name: 'Roman Warm Period' },
  { start:   536, end:   660, type: 'cold', name: 'Late Antique Little Ice Age' },
  { start:   950, end:  1250, type: 'warm', name: 'Medieval Warm Period' },
  { start:  1300, end:  1850, type: 'cold', name: 'Little Ice Age' },
];
const WIN_LO = -4000, WIN_HI = 1800;

function bandSignScore() {
  let tot = 0, ok = 0;
  console.log('\n── 1. SIGN RULE ACROSS FULL NAMED PERIODS ─────────────────────────');
  console.log('   (every year scored, not one hand-picked year per period)\n');
  console.log('   period                          span            % correct');
  for (const p of PERIODS) {
    const a = Math.max(p.start, WIN_LO), b = Math.min(p.end, WIN_HI);
    if (b <= a) continue;
    const want = p.type === 'warm' ? 1 : -1;
    let n = 0, c = 0;
    for (let y = a; y <= b; y += 5) { n++; if (Math.sign(sigmaStack(y)) === want) c++; }
    tot += n; ok += c;
    const pct = 100 * c / n;
    console.log(`   ${p.name.padEnd(30)}${(a + '..' + b).padEnd(16)}${pct.toFixed(0).padStart(4)}%`
      + (pct === 0 ? '   <-- wrong sign throughout' : ''));
  }
  const pooled = 100 * ok / tot;
  console.log(`\n   POOLED: ${pooled.toFixed(1)}% of years carry the correct sign (coin flip = 50%).`);
  return pooled;
}

// ── 2. Crossing-timing Monte Carlo ──────────────────────────────────────────
const SCAN_LO = -9000, SCAN_HI = 5000, STEP = 5, DYR = 50;

function typedCrossings() {
  const rates = [];
  for (let y = SCAN_LO; y <= SCAN_HI; y += STEP)
    rates.push({ year: y, rate: ((flagsOnly(y + DYR) - flagsOnly(y - DYR)) / (2 * DYR)) * 100 * 1000 });
  const cr = [];
  for (let i = 1; i < rates.length; i++) {
    const r1 = rates[i - 1].rate, r2 = rates[i].rate;
    if (r1 * r2 < 0) {
      const y1 = rates[i - 1].year, y2 = rates[i].year;
      cr.push({ year: Math.round(y1 + (y2 - y1) * (-r1) / (r2 - r1)),
                type: r1 > 0 ? 'PEAK' : 'TROUGH' });
    }
  }
  return cr;
}

// The 10 named transitions used by the console test, with the crossing type
// each is expected to match (PEAK = warm episode starts, TROUGH = cold starts).
const EVENTS = [
  [-6200, 'TROUGH', '8.2 ka cold event'],
  [-3800, 'TROUGH', 'Bond 4 cold event'],
  [-2200, 'TROUGH', '4.2 ka drought / Bond 3'],
  [-1200, 'TROUGH', 'Late Bronze Age Collapse'],
  [ -800, 'TROUGH', 'Iron Age cold epoch'],
  [ -250, 'PEAK',   'Roman Warm Period start'],
  [  536, 'TROUGH', 'Late Antique Little Ice Age'],
  [  950, 'PEAK',   'Medieval Warm Period start'],
  [ 1300, 'TROUGH', 'Little Ice Age start'],
  [ 1850, 'PEAK',   'Modern warm period start'],
];

function crossingNull(cr) {
  const byType = { PEAK: cr.filter(c => c.type === 'PEAK'), TROUGH: cr.filter(c => c.type === 'TROUGH') };
  const near = (y, t) => Math.min(...byType[t].map(c => Math.abs(c.year - y)));
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  console.log('\n── 2. CROSSING TIMING vs NAMED TRANSITIONS ────────────────────────\n');
  console.log(`   ${cr.length} typed crossings in [${SCAN_LO}, ${SCAN_HI}]`
    + `  (${byType.PEAK.length} PEAK / ${byType.TROUGH.length} TROUGH)`);
  console.log(`   mean spacing per type = ${((SCAN_HI - SCAN_LO) / byType.PEAK.length).toFixed(0)} yr\n`);
  console.log('   event                          type     framework    offset');
  const offs = [];
  for (const [y, t, name] of EVENTS) {
    let best = null;
    for (const c of byType[t]) { const d = Math.abs(c.year - y); if (!best || d < best.d) best = { ...c, d }; }
    offs.push(best.d);
    const sgn = best.year - y >= 0 ? '+' : '';
    console.log(`   ${name.padEnd(30)}${t.padEnd(9)}${String(best.year).padStart(7)}   ${sgn}${best.year - y}`);
  }
  const obsMed = med(offs), obsMean = offs.reduce((a, b) => a + b, 0) / offs.length;
  console.log(`\n   OBSERVED median |offset| = ${obsMed} yr,  mean = ${obsMean.toFixed(0)} yr`);

  // Null: same 7 TROUGH + 3 PEAK events scattered at random in the same window,
  // matched to the same typed crossings. Deterministic PRNG for reproducibility.
  let seed = 987; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const types = EVENTS.map(e => e[1]);
  const N = 200000;
  let geMed = 0, geMean = 0; const meds = [];
  for (let i = 0; i < N; i++) {
    const o = types.map(t => near(SCAN_LO + rnd() * (SCAN_HI - SCAN_LO), t));
    const m = med(o), mn = o.reduce((a, b) => a + b, 0) / o.length;
    meds.push(m);
    if (m <= obsMed) geMed++;
    if (mn <= obsMean) geMean++;
  }
  meds.sort((a, b) => a - b);
  console.log(`   NULL     median |offset|: 5th pct ${meds[(N * 0.05) | 0].toFixed(0)},`
    + ` median ${meds[(N * 0.5) | 0].toFixed(0)}, 95th pct ${meds[(N * 0.95) | 0].toFixed(0)} yr`);
  console.log(`\n   p (a random event set matches at least as well)`);
  console.log(`      by median = ${(geMed / N).toFixed(3)}`);
  console.log(`      by mean   = ${(geMean / N).toFixed(3)}`);
  console.log('\n   NOTE: "10/10 within ±500 yr" is near-guaranteed by construction —');
  console.log('   with ~1,170-yr typed spacing almost nothing in the window CAN sit');
  console.log('   more than ~580 yr from a matching crossing. Do not quote that row.');
  return { obsMed, obsMean, pMed: geMed / N, pMean: geMean / N };
}

console.log('='.repeat(70));
console.log('  ΔT-STACK ↔ CLIMATE: NULL TESTS (sign score + crossing timing)');
console.log('='.repeat(70));
const pooled = bandSignScore();
const cr = typedCrossings();
const res = crossingNull(cr);
console.log('\n' + '='.repeat(70));
console.log('  SUMMARY');
console.log('='.repeat(70));
console.log(`  band-level sign score      ${pooled.toFixed(1)}%   (chance 50%)`);
console.log(`  crossing median |offset|   ${res.obsMed} yr, p = ${res.pMed.toFixed(2)}`);
console.log('  Neither reaches significance. See docs/102 item 7.');
