/**
 * Shared time-input parsing (§7a revision 1 — the Horizons standard):
 * every epoch endpoint accepts a single epoch (`year=` | `jd=`), an explicit
 * list (`years=` | `jds=`, comma-separated), or a range
 * (`start=` + `stop=` + `step=`, in model years). JDs are JD(TT) and convert
 * through the model's own time axis — never a caller-side formula.
 *
 * Refusals are RFC 9457 problems with machine-readable bounds: out-of-domain
 * epochs are refused, never extrapolated (§8), and ranges beyond the row cap
 * name the cap.
 */
import { problem } from './problem.js';

export const MAX_POINTS = 10000;
export const VALIDITY = Object.freeze({ minYear: -498e6, maxYear: 502e6 });

/**
 * @param {Record<string, string>} query
 * @param {{ yearFromJD: (jd: number) => number }} time  the model's time axis
 * @returns {{ years: number[], echo: Record<string, unknown> } | { problem: {status: number, headers: Record<string, string>, body: string} }}
 */
export function parseEpochs(query, time) {
  /** @type {number[]} */
  let years = [];
  /** @type {Record<string, unknown>} */
  let echo = {};

  const bad = /** @param {string} detail */ (detail) => ({
    problem: problem(400, 'invalid-time-input', 'Invalid time input', detail, {
      accepted: ['year', 'jd', 'years', 'jds', 'start+stop+step'],
    }),
  });

  if (query.year !== undefined) {
    const y = Number(query.year);
    if (!Number.isFinite(y)) return bad(`year "${query.year}" is not a number.`);
    years = [y];
    echo = { year: y };
  } else if (query.jd !== undefined) {
    const jd = Number(query.jd);
    if (!Number.isFinite(jd)) return bad(`jd "${query.jd}" is not a number.`);
    years = [time.yearFromJD(jd)];
    echo = { jd, timescale: 'TT' };
  } else if (query.years !== undefined || query.jds !== undefined) {
    const raw = (query.years ?? query.jds ?? '').split(',');
    const nums = raw.map(Number);
    if (nums.some((n) => !Number.isFinite(n))) return bad('epoch list contains a non-number.');
    if (nums.length > MAX_POINTS) {
      return {
        problem: problem(422, 'range-too-large', 'Too many epochs', `${nums.length} epochs requested.`, {
          maxPoints: MAX_POINTS,
        }),
      };
    }
    years = query.years !== undefined ? nums : nums.map((jd) => time.yearFromJD(jd));
    echo = query.years !== undefined ? { years: nums } : { jds: nums, timescale: 'TT' };
  } else if (query.start !== undefined && query.stop !== undefined && query.step !== undefined) {
    const start = Number(query.start);
    const stop = Number(query.stop);
    const step = Number(query.step);
    if (![start, stop, step].every(Number.isFinite) || step <= 0 || stop < start) {
      return bad('range needs numeric start <= stop and step > 0.');
    }
    const count = Math.floor((stop - start) / step) + 1;
    if (count > MAX_POINTS) {
      return {
        problem: problem(422, 'range-too-large', 'Range too large', `${count} points at this step.`, {
          maxPoints: MAX_POINTS,
        }),
      };
    }
    for (let y = start; y <= stop; y += step) years.push(y);
    echo = { start, stop, step };
  } else {
    return bad('provide year=, jd=, years=, jds=, or start=&stop=&step=.');
  }

  for (const y of years) {
    if (y < VALIDITY.minYear || y > VALIDITY.maxYear) {
      return {
        problem: problem(422, 'out-of-validity-range', 'Epoch outside the validated domain',
          `Year ${y} is outside the model's validity span; the model refuses rather than extrapolates.`,
          { validRange: VALIDITY }),
      };
    }
  }
  return { years, echo };
}
