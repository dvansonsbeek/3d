// Plan 32 — a read INSIDE the composed model: the lunar argument dispatcher (`moonArgs`) is not on the
// published surface, so the composer's chain (packages/physics/src/model.js `assembleModel`) is run
// here slice by slice, in its order and with its forward bindings, on the shipped constants and the
// three governed artifacts the harness's model() carries. Research only — nothing here is a model path.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const P = join(ROOT, 'packages', 'physics', 'src');

// The slice order has ONE home, model.js MODEL_SLICES — this sweep walks it through composeThrough (the
// plan-34 cascade failed on a hand-written twin of the list kept here).

let _ctx = null;
/** The composer's context after every slice — the shipped constants, the shipped fitted set, the banks seated. */
export async function composedContext() {
  if (_ctx) return _ctx;
  const { DEFAULT_CONSTANTS, FITTED_COEFFICIENTS } = await import(join(P, 'index.js'));
  const late = {};
  let c = {
    C: Object.freeze({ ...DEFAULT_CONSTANTS }), F: FITTED_COEFFICIENTS, laws: {},
    secularSeriesArtifact: require(join(ROOT, 'data', 'nbody-secular-series.json')),
    options: { giaEllipticityOfDate: true, spinCheckpointsArtifact: require(join(ROOT, 'data', 'spin-axis-checkpoints.json')), lunarCheckpointsArtifact: require(join(ROOT, 'data', 'lunar-cumulative-checkpoints.json')) },
    late,
  };
  // the composer's own walk through the last merged slice (the surface is returned by assembleModel, not merged)
  const { composeThrough } = await import(join(P, 'model.js'));
  c = composeThrough(c, 'cardinal-instants');
  _ctx = c;
  return c;
}

const w180 = (d) => ((d + 540) % 360 + 360) % 360 - 180;

/** The secular-ë completion carriers at the taper edge and beyond: the frozen offsets L′, ϖ and Ω
 *  carry past ±SECULAR_COMPLETION_TAPER_YEARS (degrees), read at ±300 cy and at ±10,000 cy (identical by
 *  construction — the carrier saturates), with the ϖ/Ω scalings they ride on. */
export async function lunarCompletionSaturation() {
  const { moonArgs } = await composedContext();
  const at = (T) => ({ T, lpDeg: moonArgs.lpSecularCompletion(T), ...(() => { const s = moonArgs.apsidalNodalSecularCompletion(T); return { perigeeDeg: s.w, nodeDeg: s.om }; })() });
  const past = at(-300), future = at(300), deepPast = at(-10000), deepFuture = at(10000);
  return { past, future, saturated: Math.abs(deepPast.lpDeg - past.lpDeg) < 1e-12 && Math.abs(deepFuture.lpDeg - future.lpDeg) < 1e-12, perigeeOverLp: past.perigeeDeg / past.lpDeg, nodeOverLp: past.nodeDeg / past.lpDeg };
}

/** The model's lunar arguments against the pure Meeus Ch. 47 polynomials (model − polynomial,
 *  arcseconds) at Julian-year epochs, with the polynomials' own T³ + T⁴ tails of the perigee
 *  ϖ = L′ − M′ and the node Ω = L′ − F beside the model's departure in each. */
export async function lunarArgumentsAgainstMeeus(years = [-3000, -2500, -2000, -1500, -1000, -584, -500, -135, 0, 500, 1000, 1500, 2500, 3000, 4000, 5000]) {
  const { moonArgs, j2000JD, julianCenturyDays } = await composedContext();
  const { meeusArgumentTailArcsec } = await import('./probes.mjs');
  return years.map((year) => {
    const jd = j2000JD + (year - 2000) * 365.25, T = (jd - j2000JD) / julianCenturyDays;
    const a = moonArgs.argsAt(jd), p = moonArgs.pureMeeusArgs(jd);
    const d = Object.fromEntries(['Lp', 'D', 'M', 'Mp', 'F'].map((k) => [k, w180(a[k] - p[k]) * 3600]));
    const tail = meeusArgumentTailArcsec(T);
    return { year, T, modelMinusPolynomialArcsec: d, perigeeArcsec: d.Lp - d.Mp, nodeArcsec: d.Lp - d.F, polynomialTailArcsec: { perigee: tail.perigee, node: tail.node }, shareOfTailCarried: { perigee: 1 + (d.Lp - d.Mp) / tail.perigee, node: 1 + (d.Lp - d.F) / tail.node } };
  });
}
