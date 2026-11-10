// Plan 32 — series 3: the 45 paleo anchors (data/paleo-validation-anchors.json) − the cited history's
// chain, through the gate's own predictors (tools/verify/paleo-anchors.js PREDICT), as RELATIVE
// residuals (observed / predicted − 1) so the four quantities share one axis. Hypothesis 3: the
// Phanerozoic misfits are STEPS that follow the continents, not a period.

import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dt = require(join(ROOT, 'tools', 'lib', 'deep-time.js'));
const C = require(join(ROOT, 'tools', 'lib', 'constants.js'));

const PREDICT = {
  daysPerYear: (ageMa) => dt.meanYearInDaysAtAge(ageMa),
  lodHr: (ageMa) => dt.meanLodSecondsAtAge(ageMa) / 3600,
  moonDistanceRE: (ageMa) => dt.meanMoonDistanceCorrectedAtAge(ageMa) / C.earthParallaxRadiusKm,
  moonDistanceRawRE: (ageMa) => dt.meanMoonDistanceAtAge(ageMa) / C.earthParallaxRadiusKm,
  precArcsecPerYr: (ageMa) => dt.meanLunisolarPrecessionRateArcsecPerYrAtAge(ageMa),
};

/** All anchors with their relative residual and the gate's tolerance (as a weight 1/tol²). */
export function paleoRows() {
  const spec = JSON.parse(readFileSync(join(ROOT, 'data', 'paleo-validation-anchors.json'), 'utf8'));
  const out = [];
  for (const a of spec.anchors) {
    const f = PREDICT[a.quantity]; if (!f) continue;
    const pred = f(a.ageMa);
    // an anchor published as a RANGE (Wu et al. 2024's per-100-Myr LOD and Moon-distance rows,
    // the Pangaea-interval deviations among them) enters at its midpoint with the half-width as
    // its tolerance — these are the rows hypothesis 3 is about
    const isRange = !Number.isFinite(a.observed) && Array.isArray(a.observedRange);
    const observed = isRange ? (a.observedRange[0] + a.observedRange[1]) / 2 : a.observed;
    if (!Number.isFinite(pred) || !Number.isFinite(observed)) continue;
    const rel = observed / pred - 1;
    const tolRel = isRange ? Math.max(Math.abs(a.observedRange[1] - a.observedRange[0]) / 2 / Math.abs(pred), 1e-3)
      : a.expectation && a.expectation.type === 'relativePct' ? a.expectation.tolerancePct / 100 : (a.expectation && Number.isFinite(a.expectation.tolerance) ? a.expectation.tolerance / Math.abs(pred) : 0.05);
    out.push({ id: a.id, ageMa: a.ageMa, quantity: a.quantity, observed, isRange, predicted: pred, rel, tolRel, source: a.source });
  }
  return out.sort((a, b) => a.ageMa - b.ageMa);
}

/** Series 3 — t in Myr before 2000 (negative = the past), y the relative residual, w = 1/tol². */
export function seriesPaleo({ maxAgeMa = Infinity } = {}) {
  const rows = paleoRows().filter((r) => r.ageMa <= maxAgeMa);
  return { id: maxAgeMa === Infinity ? 'paleo-anchors' : `paleo-anchors-le${maxAgeMa}Ma`, t: rows.map((r) => -r.ageMa), y: rows.map((r) => r.rel), w: rows.map((r) => 1 / (r.tolRel * r.tolRel)), rows, meta: { record: 'data/paleo-validation-anchors.json (45 rows: coral/bivalve day counts, tidal rhythmites, cyclostratigraphic precession rates)', model: 'the cited history\'s chain through tools/verify/paleo-anchors.js PREDICT', unit: 'relative (observed/predicted − 1)', cadence: 'irregular (t in Myr, negative = the past)', n: rows.length } };
}
