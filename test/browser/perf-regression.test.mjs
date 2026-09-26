/**
 * Deep-time performance regression gate (headless, hermetic).
 *
 * BORN FROM A MEASURED CLASS (2026-09-15/16, plan 02 §11 rounds 4–8): four
 * separate deep-time performance regressions shipped unnoticed because
 * nothing gated cost — (a) the C-VIS inclination scanner rebuilt every
 * frame past ±250 kyr, (b) the chain orbit rings resampled 7×257 vertices
 * per frame at travel speed, (c) the D4b cardinal panel solve re-ran every
 * full update once one solve exceeded its own 300 ms hold (28× full-update
 * cost at +300 kyr, owner-bisected), (d) the Sun-SSB chart rebuilt 1,608
 * chain evaluations per 5-Hz render. All were RATIO regressions: deep-time
 * cost exploding relative to the in-table baseline.
 *
 * THE GATE IS RATIO-BASED, NOT WALL-CLOCK-BASED: absolute times vary ~4×
 * across runners, but the deep/in-table ratio is a property of the CODE
 * (the ±250 kyr chain-cycle table edge is the shipped boundary). Margins
 * are ≥ 2× above today's measured healthy state and ≥ 4× below the
 * regression class they exist to catch. One absolute bound exists (the
 * C-VIS throttled frame) with ~60× headroom over the measured value.
 *
 * FAIL-PROVEN (the project convention): ESSRT_PERF_TIGHTEN=0.01 shrinks
 * every threshold 100× — the suite goes red on the same build it passes
 * at 1.0 (verified at introduction). Use it to re-prove the gate fails.
 *
 * Healthy reference (2026-09-16, WSL2 dev box, per update-pair):
 *   full update   +100k 8 ms · +300k 11 ms (ratio 1.4) · +1.5M 22 ms (2.7)
 *   light update  +100k 2 ms · +300k  5 ms (ratio 2.5) · +1.5M 15 ms (7)
 *   C-VIS frame   0.03 ms   ·  trace sample ratio ~3
 * (Between 2026-09-23 and 2026-09-26 the rows read ~106/125/167 ms: the
 * cold-jump row's −5.34 Myr scene state, restored by every probe, added a
 * ~53-ms perihelion-calendar hint walk per update — see the reset below
 * the cold-jump row. Those readings were the artefact, not the update.)
 *
 * THE COLD-JUMP ROW (plan 06 R4 follow-up, a class the steady-state rows
 * cannot see): the FIRST evaluation at a deep epoch on a fresh page builds
 * the one-family sampler's deep tier and the certified Sun's mean-longitude
 * table. Measured: that first jump to −5.34 Myr cost 22 s where the first
 * jump to −100 kyr cost ~0.5 s (the table walked outward in 1-yr/100-yr
 * steps and rebuilt the deep tier ~125 times); after the fix 1.7 s. The
 * row is the ratio first(−5.34 Myr) / first(−100 kyr): healthy 3.0–3.1
 * (three fresh pages), the regression class ~40; limit 8.
 *
 * TWO TRAVEL-SPEED ROWS (the owner's "waiting time before Play / stutter
 * at 1000 yr/s", bisected 2026-09-26 — both classes invisible to the rows
 * above, which never press Play):
 *   5. RING RESAMPLE — the seven chain rings resample 257 vertices each when
 *      the epoch moves 10 yr (4×/s floor); at 1000 yr/s that is every
 *      frame. R9 put a ΔT Simpson integration under every chain read, so
 *      one resample cost 7 × 257 of them — 35 % of the frame, measured. The
 *      row is resample(fresh jd) / in-table full update (per pair): the
 *      samplers now bridge UT→TT once per resample and step in Julian years.
 *   6. PLAY START — on a FRESH page (the suite's probes would warm what this
 *      row measures): Play → first date change, over the median frame gap
 *      while playing at the default speed. R4c left the post-landing tier
 *      model's ±250-kyr chain-cycle tables to the first RENDERED frame — the
 *      first Play frame (~1.3 s); the landing block now requests one paused
 *      frame and drops the umbra memo, so the build lands in load idle time.
 *   Limits set from both builds measured on the same box (see the row
 *   comments); the pre-fix build fails both rows, the fixed build passes.
 */
/* global performance, requestAnimationFrame -- the timing calls live inside page.evaluate callbacks, which execute in the browser */
import { openSimulator } from './harness.mjs';

const TIGHTEN = Number(process.env.ESSRT_PERF_TIGHTEN || 1);
const jdOf = (y) => 2451545.0 + (y - 2000) * 365.25;

const sim = await openSimulator();
let fail = 0;
const gate = (name, value, limit, unit) => {
  const lim = limit * TIGHTEN;
  const ok = value <= lim;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  — ${value.toFixed(2)} ${unit} (limit ${lim.toFixed(2)})`);
  if (!ok) fail++;
};
// median of three batch runs, per-call ms
const median3 = async (fn, arg) => {
  const runs = [];
  for (let r = 0; r < 3; r++) runs.push(await sim.page.evaluate(fn, arg));
  return runs.sort((a, b) => a - b)[1];
};

try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.vfpPISeriesLoaded(), null, { timeout: 60000 });

  // ── 0. COLD JUMP (the R4 class): the first evaluation at a deep epoch on
  // this fresh page — BEFORE any warmup, since the warmup is what it measures.
  const cold = await sim.page.evaluate(({ near, deep }) => {
    const T = window.__test__;
    const t0 = performance.now(); T.sceneSunRaDecAt(near); const t1 = performance.now();
    T.sceneSunRaDecAt(deep); const t2 = performance.now();
    return { nearMs: t1 - t0, deepMs: t2 - t1 };
  }, { near: jdOf(-100000), deep: jdOf(-5340000) });
  console.log(`      cold jump ms (first eval on a fresh page): −100k ${cold.nearMs.toFixed(0)} · −5.34M ${cold.deepMs.toFixed(0)}`);
  gate('cold jump: first(−5.34M) / first(−100k) ratio', cold.deepMs / cold.nearMs, 8, 'x');
  // Bring the scene back to a modern epoch (measured 2026-09-26): the cold
  // jump leaves o.julianDay at −5.34 Myr, and every hybridSpinProbe below
  // restores that JD after its own jump — so each update paid the
  // perihelion-calendar converter's year-by-year hint walk TWICE across
  // 5.4 Myr (~10 ms per Myr): the in-table full update read 106 ms per pair
  // where the true cost is 3–6 ms, and the constant ~53 ms in numerator and
  // denominator compressed every ratio below toward 1 (a 28× class would
  // have read ~4.5 against the limit 6). Rows 1–5 now measure the update.
  await sim.page.evaluate((jd) => window.__test__.sceneSunRaDecAt(jd), jdOf(2000));

  // ── warmup: one-time lazy builds (cycle tables, samplers, chains) ──
  await sim.page.evaluate((jds) => jds.forEach((jd) => {
    window.__test__.hybridSpinProbe(jd);
    window.__test__.moonSceneState(jd);
  }), [jdOf(100000), jdOf(300000), jdOf(1500000)]);

  // ── 1. FULL scene update (the D4b regression class) ──
  const fullAt = (y) => median3(({ jds }) => {
    const t0 = performance.now();
    for (const jd of jds) window.__test__.hybridSpinProbe(jd);
    return (performance.now() - t0) / jds.length;
  }, { jds: Array.from({ length: 10 }, (_, i) => jdOf(y + i * 400)) });
  const fullBase = await fullAt(100000);
  const fullDeep = await fullAt(300000);
  const fullFar = await fullAt(1500000);
  console.log(`      full update ms/pair: +100k ${fullBase.toFixed(1)} · +300k ${fullDeep.toFixed(1)} · +1.5M ${fullFar.toFixed(1)}`);
  gate('full update: deep(+300k) / in-table ratio', fullDeep / fullBase, 6, 'x');
  gate('full update: far(+1.5M) / in-table ratio', fullFar / fullBase, 15, 'x');

  // ── 2. LIGHT scene update (the chain-cycles fallback class) ──
  const lightAt = (y) => median3(({ jds }) => {
    const t0 = performance.now();
    for (const jd of jds) window.__test__.moonSceneState(jd);
    return (performance.now() - t0) / jds.length;
  }, { jds: Array.from({ length: 20 }, (_, i) => jdOf(y + i * 400)) });
  const lightBase = await lightAt(100000);
  const lightDeep = await lightAt(300000);
  const lightFar = await lightAt(1500000);
  console.log(`      light update ms/pair: +100k ${lightBase.toFixed(1)} · +300k ${lightDeep.toFixed(1)} · +1.5M ${lightFar.toFixed(1)}`);
  gate('light update: deep(+300k) / in-table ratio', lightDeep / lightBase, 8, 'x');
  gate('light update: far(+1.5M) / in-table ratio', lightFar / lightBase, 20, 'x');

  // ── 3. C-VIS toggles: throttled steady-state frame (the round-4 class) ──
  const cvisMs = await sim.page.evaluate(() => {
    window.__test__.visInvPlaneProbe();          // cold build
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) window.__test__.visInvPlaneProbe();
    return (performance.now() - t0) / 100;
  });
  gate('C-VIS toggles: throttled frame cost', cvisMs, 2, 'ms');

  // ── 4. Trace fill sampling (the round-7/8 class; one-clock loop) ──
  const traceAt = (off) => median3(({ off }) => {
    const t0 = performance.now();
    window.__test__.visTraceSampleProbe('PERIHELION-OF-EARTH', off, 50, 50);
    return (performance.now() - t0) / 50;
  }, { off });
  const traceBase = await traceAt(0);
  const traceDeep = await traceAt(300000);
  console.log(`      trace sample ms: modern ${traceBase.toFixed(2)} · +300k ${traceDeep.toFixed(2)}`);
  gate('trace fill: deep(+300k) / modern ratio', traceDeep / traceBase, 10, 'x');

  // ── 5. Ring resample (the R9 class): one forced resample of the seven
  // chain rings at a fresh in-table jd (the shipped one-bridge year route),
  // per ring, against the LIVE cost of the regression class — one ring's 257
  // vertices read through the per-JD route, a ΔT integration per vertex. A
  // re-route of the rings through per-JD reads reads 1.0 here; healthy 0.08
  // (measured: 2.4 vs 31.5 ms per ring); limit 0.5. The pre-fix build fails
  // the row by the missing hook (NaN) — its class cost is the per-JD figure. ──
  // three DISTINCT jds (the per-JD route's exact-key memo would serve a repeat)
  const ringRuns = [];
  for (let k = 0; k < 3; k++) {
    ringRuns.push(await sim.page.evaluate((jd) => {
      const r = window.__test__.ringResampleProbe ? window.__test__.ringResampleProbe(jd) : null;
      return r ? { ...r, ratio: r.ringMs / 7 / r.perJdRingMs } : { ringMs: NaN, perJdRingMs: NaN, ratio: NaN };   // no hook → NaN → the row FAILS, never skips
    }, jdOf(100000) + 4321 + k * 97.3));
  }
  ringRuns.sort((a, b) => a.ratio - b.ratio);
  const ringRaw = ringRuns[1], ring = ringRaw.ratio;
  console.log(`      ring resample ms: 7 rings ${ringRaw.ringMs.toFixed(1)} (${(ringRaw.ringMs / 7).toFixed(1)} per ring) · one ring via the per-JD route ${ringRaw.perJdRingMs.toFixed(1)}`);
  gate('ring resample: per-ring year route / per-JD route ratio', ring, 0.5, 'x');

  if (sim.errors.length) { console.log('FAIL  page errors — ' + sim.errors.slice(0, 3).join('|')); fail++; }
} finally { await sim.dispose(); }

// ── 6. Play start (the R4c class) — a FRESH page, nothing warmed by probes ──
{
  const fresh = await openSimulator();
  try {
    await fresh.page.waitForFunction(() => window.__test__ && window.__test__.vfpPISeriesLoaded(), null, { timeout: 60000 });
    await fresh.page.waitForTimeout(2500);   // the landing block's paused frame (and the initial render) settle
    const dateText = () => fresh.page.evaluate(() => { const el = [...document.querySelectorAll('input')].find((i) => /^\d{4}-\d\d-\d\d$/.test(i.value)); return el ? el.value : '?'; });
    const before = await dateText();
    const t0 = Date.now();
    const clicked = await fresh.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Play/.test(x.textContent || '')); if (!b) return false; b.click(); return true; });
    if (!clicked) { console.log('FAIL  play start — Play button not found'); fail++; }
    let firstMs = NaN;
    while (Date.now() - t0 < 15000) { if ((await dateText()) !== before) { firstMs = Date.now() - t0; break; } await fresh.page.waitForTimeout(20); }
    const steady = await fresh.page.evaluate(async (ms) => {
      const gaps = []; let last = performance.now(); const start = last;
      await new Promise((res) => { const step = (t) => { gaps.push(t - last); last = t; if (t - start < ms) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      gaps.sort((a, b) => a - b);
      return gaps[Math.floor(gaps.length / 2)];
    }, 3000);
    console.log(`      play start: Play → first date change ${firstMs.toFixed(0)} ms · steady frame gap ${steady.toFixed(0)} ms (default speed)`);
    gate('play start: first-change delay / steady frame gap ratio', firstMs / steady, 5, 'x');
    if (fresh.errors.length) { console.log('FAIL  page errors (fresh page) — ' + fresh.errors.slice(0, 3).join('|')); fail++; }
  } finally { await fresh.dispose(); }
}

console.log(fail === 0 ? 'PERF-REGRESSION: ALL PASS' : `PERF-REGRESSION: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
