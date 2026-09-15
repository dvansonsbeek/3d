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
 */
/* global performance -- the timing calls live inside page.evaluate callbacks, which execute in the browser */
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

  if (sim.errors.length) { console.log('FAIL  page errors — ' + sim.errors.slice(0, 3).join('|')); fail++; }
} finally { await sim.dispose(); }

console.log(fail === 0 ? 'PERF-REGRESSION: ALL PASS' : `PERF-REGRESSION: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
