/**
 * Wobble-center solstice-direction gate (headless, hermetic).
 *
 * BORN WITH K8b-1 slice 1 (plan 02 §11): the owner found the legacy
 * H/13-clock marker 58° off the solstice sun at +1.1 Myr. The marker now
 * rides GEOMETRY — the rendered spin axis (the polar line's own
 * orientation source) projected into the rendered sun plane — and this
 * gate pins the two constructions that make it correct at every epoch:
 *
 *  1. SOLSTICE ALIGNMENT — at each test year's solved summer solstice,
 *     the sun's azimuth (around Earth, world frame) equals the marker's.
 *  2. THE DEC INVARIANT — dec(marker seen from Earth) ≡ 90° − the
 *     rendered obliquity, at EVERY epoch and any radius (the marker is
 *     Earth-anchored with an in-plane offset, so direction and distance
 *     decouple identically — the owner's "too far would change the
 *     obliquity" concern, closed by construction).
 *
 * Baseline record (pre-fix, 2026-09-16): marker−sun −58.08° and
 * dec-invariant error 11.5° at JD 407,870,915 (obliquity max, ≈ +1.11 Myr).
 *
 *  3. THE TRACE — the Tracing chip "Wobble" draws the marker's path. The
 *     marker had no trace parameters (vertexCount = NaN → an empty line;
 *     owner: "nothing is happening"): with the trace on and three seconds
 *     of playback at 1000 yr/s (a date jump resets every trace; only
 *     playback fills one), the line must fill with finite vertices at the
 *     marker's display radius around Earth.
 *
 * FAIL-PROVEN: ESSRT_WOBBLE_PLANT=1 tightens the tolerances 10,000× —
 * red on the same build that passes clean (verified at introduction; the
 * first 100× attempt still PASSED — the geometric construction leaves only
 * ~0.002° of solstice-solve residual); the trace check's vertex floor
 * scales the same way.
 */
import { openSimulator } from './harness.mjs';

const TIGHTEN = process.env.ESSRT_WOBBLE_PLANT === '1' ? 1e-4 : 1;
const AZ_TOL_DEG = 0.5 * TIGHTEN;      // measured residual ≤ 0.07° (solstice-solve + sun-offset conventions)
const DEC_TOL_DEG = 0.01 * TIGHTEN;    // measured ≤ 0.0001°
const wrap = (d) => ((d + 540) % 360) - 180;
const jdOf = (y) => 2451545.0 + (y - 2000) * 365.25;

const sim = await openSimulator();
let fail = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); if (!ok) fail++; };
try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.wobbleCenterProbe && window.__test__.cardinalPanelProbe, null, { timeout: 60000 });
  for (const y of [2000, 100000, -100000, 1112000]) {
    const r = await sim.page.evaluate((jd) => {
      const T = window.__test__;
      const cp = T.cardinalPanelProbe(jd);          // solves the year's cardinals
      return { ssJD: cp.SS.jd, probe: T.wobbleCenterProbe(cp.SS.jd) };
    }, jdOf(y));
    const p = r.probe;
    const azErr = wrap(p.markerAzDeg - p.sunAzDeg);
    const decErr = p.markerDecDeg - (90 - p.obliquityEarthDeg);
    check(`year ${y}: marker az ≡ solstice-sun az`, Math.abs(azErr) <= AZ_TOL_DEG, `Δ ${azErr.toFixed(3)}° (tol ${AZ_TOL_DEG})`);
    check(`year ${y}: dec(marker) ≡ 90° − obliquity`, Math.abs(decErr) <= DEC_TOL_DEG, `Δ ${decErr.toFixed(5)}° (tol ${DEC_TOL_DEG})`);
  }
  // 3. the trace, the way the owner drives it: the chip on, the time step at
  //    1000 years, Play until the line holds the floor's worth of vertices
  //    (the fill is ≤ 100 samples a FRAME, so a wall-clock wait would count
  //    the runner's frame rate — a loaded machine gave 152 in 3 s where an
  //    idle one gave 540; a date jump resets every trace, so only playback
  //    fills one), Pause, read the line back
  const MIN_FILLED = 200 / TIGHTEN;
  const tr = await sim.page.evaluate(async (floor) => {
    const T = window.__test__;
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    T.jumpJD(2451545.0);
    await wait(300);
    if (!T.traceEnable('EARTH-WOBBLE-CENTER', true)) return null;
    const sel = [...document.querySelectorAll('#gui select')].find((s) => [...s.options].some((op) => op.textContent.trim() === '1000 years'));
    if (!sel) return { noSelect: true };
    sel.value = [...sel.options].find((op) => op.textContent.trim() === '1000 years').value;
    sel.dispatchEvent(new window.Event('change', { bubbles: true }));
    const play = [...document.querySelectorAll('#gui button')].find((b) => /Play/.test(b.textContent || ''));
    if (!play) return { noPlay: true };
    play.click();
    const t0 = Date.now();
    let p = null;
    while (Date.now() - t0 < 20000) {   // bounded: the plant's floor is never reached
      p = T.traceProbe('EARTH-WOBBLE-CENTER');
      if (p && p.filled >= floor) break;
      await wait(400);
    }
    play.click();   // pause
    await wait(300);
    p = T.traceProbe('EARTH-WOBBLE-CENTER');
    T.traceEnable('EARTH-WOBBLE-CENTER', false);
    T.jumpJD(2451545.0);
    return { ...p, seconds: (Date.now() - t0) / 1000 };
  }, MIN_FILLED);
  check('wobble trace: parameters set (traceLength / traceStep)', !!tr && Number.isFinite(tr.traceLength) && Number.isFinite(tr.traceStep) && tr.vertices > 0, tr ? `${tr.vertices} vertices, step ${tr.traceStep}` : 'probe missing');
  check('wobble trace: fills with finite vertices under playback at 1000 yr/s', !!tr && tr.filled >= MIN_FILLED && tr.visible, tr ? `${tr.filled} filled (floor ${MIN_FILLED}) after ${tr.seconds.toFixed(1)} s, visible ${tr.visible}` : '');
  check('wobble trace: the path sits at the marker radius around Earth', !!tr && tr.filled > 0 && Math.abs(tr.rMinUnits - tr.orbitRadiusUnits) <= 0.2 * tr.orbitRadiusUnits && Math.abs(tr.rMaxUnits - tr.orbitRadiusUnits) <= 0.2 * tr.orbitRadiusUnits, tr && tr.filled ? `r ${tr.rMinUnits.toFixed(4)}–${tr.rMaxUnits.toFixed(4)} vs ${tr.orbitRadiusUnits.toFixed(4)} units` : '');
  check('no page errors', sim.errors.length === 0, sim.errors.slice(0, 2).join('|'));
} finally { await sim.dispose(); }
console.log(fail === 0 ? 'WOBBLE-CENTER: ALL PASS' : `WOBBLE-CENTER: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
