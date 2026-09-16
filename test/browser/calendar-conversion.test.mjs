/**
 * Perihelion-calendar conversion gate (headless, hermetic).
 *
 * BORN WITH the year-walk hint-cache change (plan 02 §11 round 10): the
 * JD ↔ perihelion-calendar converters walked year-by-year from the epoch
 * (O(|epoch distance|), 2.46 ms/call at +1.5 Myr — the last unbounded-
 * growth term in deep-time updates). The hint-cache rewrite claims BIT-
 * IDENTICAL results; this suite is the claim's independent witness,
 * recorded from the pre-change implementation.
 *
 * Four check families:
 *  1. GOLDENS — 66 curated epoch-relative offsets (epoch/day/year
 *     boundaries, leap years under BOTH rules, the Revised-Julian mod-900
 *     century rule, ±1.5 Myr deep points), exact string equality against
 *     the pre-change recording.
 *  2. ROUND-TRIP EXACT — midnight-lattice JDs must convert to 00:00:00
 *     and invert to the same JD exactly.
 *  3. ROUND-TRIP TOLERANCE — fractional times invert within the seconds
 *     rounding (0.5 s).
 *  4. ORDER-INDEPENDENCE — the same JD list evaluated ascending,
 *     descending and shuffled (with inverse calls interleaved) must give
 *     identical strings: a stale or mis-restored walk hint fails HERE.
 *
 * FAIL-PROVEN: ESSRT_CAL_PLANT=1 perturbs one expected golden — the suite
 * must go red on the same build it passes clean (verified at introduction).
 */
import { openSimulator } from './harness.mjs';

// [offsetDaysFromEpoch, date, time] — recorded from the pre-hint-cache build
const GOLDENS = [[-0.6,"-0001-12-31","21:36:00"],[-0.5,"0000-01-01","00:00:00"],[-0.4,"0000-01-01","02:24:00"],[-0.1,"0000-01-01","09:36:00"],[0,"0000-01-01","12:00:00"],[0.1,"0000-01-01","14:24:00"],[0.4,"0000-01-01","21:36:00"],[0.5,"0000-01-02","00:00:00"],[0.9,"0000-01-02","09:36:00"],[1,"0000-01-02","12:00:00"],[1.5,"0000-01-03","00:00:00"],[364.5,"0001-01-01","00:00:00"],[365.5,"0001-01-02","00:00:00"],[366.5,"0001-01-03","00:00:00"],[730.5,"0002-01-02","00:00:00"],[1460.5,"0004-01-02","00:00:00"],[1461.5,"0004-01-03","00:00:00"],[-364.5,"-0001-01-02","00:00:00"],[-365.5,"-0001-01-01","00:00:00"],[-366.5,"-0002-12-31","00:00:00"],[-1460.5,"-0004-01-02","00:00:00"],[-1461.5,"-0004-01-01","00:00:00"],[36524.47,"0100-01-01","23:16:48"],[36724.97,"0100-07-21","11:16:48"],[73048.69,"0200-01-02","04:33:36"],[73249.19,"0200-07-20","16:33:36"],[109572.91,"0300-01-01","09:50:24"],[109773.41,"0300-07-20","21:50:24"],[219145.57,"0600-01-02","01:40:48"],[219346.07,"0600-07-20","13:40:48"],[255669.79,"0700-01-01","06:57:36"],[255870.29,"0700-07-20","18:57:36"],[328718.23000000004,"0900-01-01","17:31:12"],[328918.73000000004,"0900-07-21","05:31:12"],[401766.67000000004,"1100-01-02","04:04:48"],[401967.17000000004,"1100-07-20","16:04:48"],[657436.2100000001,"1800-01-01","17:02:24"],[657636.7100000001,"1800-07-21","05:02:24"],[730484.65,"2000-01-02","03:36:00"],[730685.15,"2000-07-20","15:36:00"],[949629.9700000001,"2600-01-01","11:16:48"],[949830.4700000001,"2600-07-20","23:16:48"],[-36524.095,"-0100-01-02","09:43:12"],[-36400.595,"-0100-05-04","21:43:12"],[-73048.315,"-0200-01-03","04:26:24"],[-72924.815,"-0200-05-05","16:26:24"],[-219145.195,"-0600-01-06","07:19:12"],[-219021.695,"-0600-05-08","19:19:12"],[-328717.85500000004,"-0900-01-08","15:28:48"],[-328594.35500000004,"-0900-05-11","03:28:48"],[-3652421.8750000005,"-10000-03-19","15:00:00"],[-3652298.3750000005,"-10000-07-21","03:00:00"],[3652422.1250000005,"10000-01-01","15:00:00"],[3652545.6250000005,"10000-05-05","03:00:00"],[-36524219.875,"-99998-02-19","15:00:00"],[-36524096.375,"-99998-06-23","03:00:00"],[36524220.125,"99999-12-30","15:00:00"],[36524343.625,"100000-05-03","03:00:00"],[-109572659.87500001,"-299994-05-29","15:00:00"],[-109572536.37500001,"-299994-09-30","03:00:00"],[109572660.12500001,"299999-12-25","15:00:00"],[109572783.62500001,"300000-04-28","03:00:00"],[-547863299.875,"-1499968-01-13","15:00:00"],[-547863176.375,"-1499968-05-16","03:00:00"],[547863300.125,"1499999-11-29","15:00:00"],[547863423.625,"1500000-04-01","03:00:00"]];

const PLANT = process.env.ESSRT_CAL_PLANT === '1';
const sim = await openSimulator();
let fail = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); if (!ok) fail++; };
// deterministic PRNG so CI and local runs test the identical point set
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.calPerihelionAt, null, { timeout: 60000 });

  // 1 — goldens
  const expected = PLANT ? GOLDENS.map((g, i) => (i === 7 ? [g[0], g[1], '00:00:01'] : g)) : GOLDENS;
  const got = await sim.page.evaluate((offs) => {
    const T = window.__test__, E = T.calPerihelionEpochJD();
    return offs.map((d) => { const r = T.calPerihelionAt(E + d); return [r.date, r.time]; });
  }, GOLDENS.map((g) => g[0]));
  let goldenBad = 0, firstBad = '';
  for (let i = 0; i < expected.length; i++) {
    if (got[i][0] !== expected[i][1] || got[i][1] !== expected[i][2]) {
      goldenBad++;
      if (!firstBad) firstBad = `offset ${expected[i][0]}: got ${got[i][0]} ${got[i][1]}, expected ${expected[i][1]} ${expected[i][2]}`;
    }
  }
  check(`goldens (${expected.length} curated offsets, both calendar rules, ±1.5 Myr)`, goldenBad === 0, firstBad || 'all exact');

  // 2 — round-trip exact on the midnight lattice
  const rnd = mulberry32(0xE55127);
  const midnightOffsets = Array.from({ length: 300 }, () => Math.round((rnd() - 0.5) * 2 * 547e6));
  const rt = await sim.page.evaluate((offs) => {
    const T = window.__test__, E = T.calPerihelionEpochJD();
    let bad = 0, first = '';
    for (const n of offs) {
      const jd = E - 0.5 + n;
      const r = T.calPerihelionAt(jd);
      const back = T.calPerihelionJD(r.date, r.time);
      if (r.time !== '00:00:00' || back !== jd) { bad++; if (!first) first = `n=${n}: ${r.date} ${r.time} → ${back} vs ${jd}`; }
    }
    return { bad, first };
  }, midnightOffsets);
  check('round-trip EXACT on 300 midnight-lattice JDs (±1.5 Myr)', rt.bad === 0, rt.first || 'all exact');

  // 3 — round-trip within seconds rounding for fractional times
  const fracOffsets = Array.from({ length: 200 }, () => (rnd() - 0.5) * 2 * 547e6);
  const rf = await sim.page.evaluate((offs) => {
    const T = window.__test__, E = T.calPerihelionEpochJD();
    const TOL = 0.5 / 86400 + 1e-9;
    let bad = 0, first = '', worst = 0;
    for (const d of offs) {
      const jd = E + d;
      const r = T.calPerihelionAt(jd);
      const back = T.calPerihelionJD(r.date, r.time);
      const err = Math.abs(back - jd);
      if (err > worst) worst = err;
      if (err > TOL) { bad++; if (!first) first = `d=${d}: err ${err * 86400} s`; }
    }
    return { bad, first, worstS: worst * 86400 };
  }, fracOffsets);
  check('round-trip ≤ 0.5 s on 200 fractional JDs (±1.5 Myr)', rf.bad === 0, rf.first || `worst ${rf.worstS.toFixed(3)} s`);

  // 4 — order-independence (the hint-cache guard)
  const ordOffsets = Array.from({ length: 150 }, () => (rnd() - 0.5) * 2 * 547e6);
  const oi = await sim.page.evaluate((offs) => {
    const T = window.__test__, E = T.calPerihelionEpochJD();
    const evalList = (list, interleave) => list.map((d, i) => {
      const r = T.calPerihelionAt(E + d);
      if (interleave && i % 7 === 0) T.calPerihelionJD(r.date, '00:00:00');   // disturb any cached state
      return r.date + ' ' + r.time;
    });
    const asc = evalList([...offs].sort((a, b) => a - b), false);
    const desc = evalList([...offs].sort((a, b) => b - a), true).reverse();
    // shuffled: reverse-of-middle-out, deterministic
    const idx = offs.map((_, i) => i).sort((a, b) => ((a * 2654435761) % 997) - ((b * 2654435761) % 997));
    const shufSorted = new Array(offs.length);
    const sorted = [...offs].sort((a, b) => a - b);
    const shufVals = evalList(idx.map((i) => sorted[i]), true);
    idx.forEach((sortedPos, k) => { shufSorted[sortedPos] = shufVals[k]; });
    let bad = 0, first = '';
    for (let i = 0; i < asc.length; i++) {
      if (asc[i] !== desc[i] || asc[i] !== shufSorted[i]) { bad++; if (!first) first = `i=${i}: asc "${asc[i]}" desc "${desc[i]}" shuf "${shufSorted[i]}"`; }
    }
    return { bad, first };
  }, ordOffsets);
  check('order-independence: 150 JDs, three visit orders + interleaved inverse calls', oi.bad === 0, oi.first || 'identical');

  check('no page errors', sim.errors.length === 0, sim.errors.slice(0, 2).join('|'));
} finally { await sim.dispose(); }
console.log(fail === 0 ? 'CALENDAR-CONVERSION: ALL PASS' : `CALENDAR-CONVERSION: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
