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
 * FAIL-PROVEN: ESSRT_WOBBLE_PLANT=1 tightens the tolerances 10,000× —
 * red on the same build that passes clean (verified at introduction; the
 * first 100× attempt still PASSED — the geometric construction leaves only
 * ~0.002° of solstice-solve residual).
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
  check('no page errors', sim.errors.length === 0, sim.errors.slice(0, 2).join('|'));
} finally { await sim.dispose(); }
console.log(fail === 0 ? 'WOBBLE-CENTER: ALL PASS' : `WOBBLE-CENTER: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
