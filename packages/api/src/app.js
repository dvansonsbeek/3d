/**
 * @essrt/api — the request handler (§7a slice 1).
 *
 * A pure function of the request: `createApi()` assembles the model once and
 * returns `handle({method, path, query, headers?})` → `{status, headers,
 * body}`. node:http wrapping lives in server.js; tests call `handle`
 * directly, so determinism is testable without sockets. No surface contains
 * physics — every number comes from the assembled model (boundaries-lint
 * enforced).
 *
 * Routes: /versions discovery + the slice-1 groups (epoch, cardinal-points,
 * earth, moon, bodies, values, derivations). The OpenAPI 3.1 contract lives
 * in ../openapi.json; the conformance gate keeps handler and contract equal.
 */
import { readFileSync } from 'node:fs';
import { createModel, DEFAULT_CONSTANTS } from '../../physics/src/index.js';
import * as curves from '../../physics/src/reference/published-curves.cjs';
import { MODEL_VALUES, MODEL_VALUES_META } from '../../model-values/src/index.js';
import { envelope, API_VERSION } from './envelope.js';
import { problem, notFound, methodNotAllowed } from './problem.js';
import { parseEpochs } from './time.js';

/**
 * Route templates implemented by the handler — exported so the OpenAPI
 * conformance gate can diff handler vs contract in both directions.
 * @type {readonly string[]}
 */
export const ROUTE_TEMPLATES = Object.freeze([
  '/v1/versions',
  '/v1/versions/{id}',
  '/v1/epoch',
  '/v1/cardinal-points',
  '/v1/earth',
  '/v1/moon',
  '/v1/bodies',
  '/v1/bodies/{body}',
  '/v1/values',
  '/v1/values/{key}',
  '/v1/derivations/{quantity}',
  '/v1/climate',
  '/v1/cross-validation/{curve}',
  '/v1/counterfactual',
]);

/** Cross-validation curves: model quantity vs the published reference. */
const CURVES = Object.freeze({
  'obliquity-berger1978': { published: curves.obliquityBerger1978, model: 'obliquityDeg', unit: 'deg' },
  'eccentricity-berger1978': { published: curves.eccBerger1978, model: 'eccentricity', unit: '' },
  'obliquity-la2004': { published: curves.obliquityLa2004, model: 'obliquityDeg', unit: 'deg' },
  'eccentricity-la2004': { published: curves.eccLa2004, model: 'eccentricity', unit: '' },
  'deltat-stephenson2016': { published: null, model: 'deltaTSeconds', unit: 's' },
});
const STEPHENSON_POLY = JSON.parse(readFileSync(new URL('../../../public/input/stephenson-2016-deltaT-polynomial.json', import.meta.url), 'utf8'));

/** Counterfactual limits: overrides count and value type. */
const MAX_OVERRIDES = 20;

/** The §9 honesty statement served with every planetary-position payload. */
const PLANET_ACCURACY = Object.freeze({
  statement: 'Structural-model geocentric elements. Planetary position residuals are 0.016°–0.090° vs JPL Horizons (1800–2200 AD) — suitable for visualisation, education and structural analysis; not for spacecraft navigation. Deep-time behaviour has no comparable reference.',
  residualDegRange: [0.016, 0.09],
  reference: 'JPL Horizons, 1800–2200 AD',
});

const EPOCH_SECTIONS = Object.freeze(['h', 'lod', 'alpha', 'deltaT', 'siderealYearSeconds', 'moonDistanceKm']);
const CARDINAL_TYPES = Object.freeze(['SS', 'WS', 'VE', 'AE']);

/**
 * @returns {{ handle: (req: {method: string, path: string, query?: Record<string, string>, body?: string}) => {status: number, headers: Record<string, string>, body: string}, model: ReturnType<typeof createModel> }}
 */
export function createApi() {
  const model = createModel();
  const id = model.identity;

  /** Derivations metadata: structural explanation per quantity (§7 "derivations"). */
  const DERIVATIONS = Object.freeze({
    axialPrecession: { formula: 'H / 13', latticeDivisor: 13, periodYears: model.computeLatticePeriodsYears().axialPrecessionPeriodYears, doc: 'docs/10-fibonacci-laws.md', registryKey: 'axialPrecYears' },
    inclinationPrecession: { formula: 'H / 3', latticeDivisor: 3, periodYears: model.computeLatticePeriodsYears().inclinationPrecessionPeriodYears, doc: 'docs/10-fibonacci-laws.md', registryKey: 'inclPrecYears' },
    perihelionPrecession: { formula: 'H / 16', latticeDivisor: 16, periodYears: model.computeLatticePeriodsYears().perihelionPrecessionPeriodYears, doc: 'docs/10-fibonacci-laws.md', registryKey: 'periPrecYears' },
    eclipticPrecession: { formula: 'H / 5', latticeDivisor: 5, periodYears: null, doc: 'docs/10-fibonacci-laws.md', registryKey: 'eclPrecYears' },
    obliquityCycle: { formula: 'H / 8', latticeDivisor: 8, periodYears: null, doc: 'docs/10-fibonacci-laws.md', registryKey: 'obliqCycleYears' },
    solarSystemResonanceCycle: { formula: '8 × H', latticeDivisor: null, periodYears: null, doc: 'docs/55-solar-system-resonance-cycle-periods.md', registryKey: 'eightH' },
    law6Lock: { formula: '8H / 65', latticeDivisor: 65, periodYears: null, doc: 'docs/10-fibonacci-laws.md', registryKey: 'saturnPeriPeriod' },
    bondCycle: { formula: '8H / 1830', latticeDivisor: 1830, periodYears: null, doc: 'docs/104-millennial-rotation-swing.md', registryKey: 'bondYr' },
    hallstattCycle: { formula: '8H / 1104', latticeDivisor: 1104, periodYears: null, doc: 'docs/104-millennial-rotation-swing.md', registryKey: 'hallstattYr' },
  });

  const versionRecord = Object.freeze({
    modelVersion: id.modelVersion,
    status: 'current',
    constantsHash: id.constantsHash,
    coefficientsHash: id.coefficientsHash,
    citation: `doi:${id.preprintDoi}`,
    validitySpan: { minYear: -498e6, maxYear: 502e6, note: 'refused outside, never extrapolated' },
  });

  /** @param {Record<string, string>} query @returns {{ years: number[], echo: Record<string, unknown> } | { problem: {status: number, headers: Record<string, string>, body: string} }} */
  const epochs = (query) => parseEpochs(query, model.time);

  /** @param {number} year @param {string[]} sections @returns {Record<string, unknown>} */
  const epochRecord = (year, sections) => {
    /** @type {Record<string, unknown>} */
    const rec = { year, jd: model.time.jdFromYear(year) };
    if (sections.includes('h')) rec.h = model.epoch.hAtYear(year);
    if (sections.includes('lod')) rec.lodSeconds = model.epoch.lodSecondsAtYear(year);
    if (sections.includes('alpha')) rec.alpha = model.epoch.alphaAtYear(year);
    if (sections.includes('deltaT')) rec.deltaTSeconds = model.epoch.deltaTSecondsAtYear(year);
    if (sections.includes('siderealYearSeconds')) rec.siderealYearSeconds = model.epoch.siderealYearSecondsAtYear(year);
    if (sections.includes('moonDistanceKm')) rec.moonDistanceKm = model.epoch.moonDistanceKmAtYear(year);
    return rec;
  };

  /** CSV rendering for epoch time series. @param {Array<Record<string, unknown>>} rows @returns {string} */
  const toCsv = (rows) => {
    if (rows.length === 0) return '';
    const cols = Object.keys(rows[0]);
    const lines = [cols.join(',')];
    for (const r of rows) lines.push(cols.map((c) => String(r[c])).join(','));
    return lines.join('\n') + '\n';
  };

  /** @param {{method: string, path: string, query?: Record<string, string>}} req */
  const handle = (req) => {
    const method = req.method.toUpperCase();
    const path = req.path.replace(/\/+$/, '') || '/';
    const query = req.query ?? {};
    const get = () => method === 'GET';

    // ── /versions ───────────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/versions`) {
      if (!get()) return methodNotAllowed(method, path);
      return envelope({ identity: id, inputEcho: { path }, data: { versions: [versionRecord], current: id.modelVersion } });
    }
    const versionMatch = path.match(new RegExp(`^/${API_VERSION}/versions/([A-Za-z0-9.\\-]+)$`));
    if (versionMatch) {
      if (!get()) return methodNotAllowed(method, path);
      if (versionMatch[1] !== id.modelVersion) return notFound(path);
      return envelope({ identity: id, inputEcho: { path, version: versionMatch[1] }, data: versionRecord, immutable: true });
    }

    // ── /epoch ──────────────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/epoch`) {
      if (!get()) return methodNotAllowed(method, path);
      const t = epochs(query);
      if ('problem' in t) return t.problem;
      const sections = query.sections ? query.sections.split(',') : [...EPOCH_SECTIONS];
      const unknown = sections.filter((s) => !EPOCH_SECTIONS.includes(s));
      if (unknown.length) {
        return problem(400, 'unknown-section', 'Unknown section', `No section(s): ${unknown.join(', ')}.`, { sections: EPOCH_SECTIONS });
      }
      const rows = t.years.map((y) => epochRecord(y, sections));
      if (query.format === 'csv') {
        return { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'public, max-age=300' }, body: toCsv(rows) };
      }
      return envelope({ identity: id, inputEcho: { path, ...t.echo, sections }, data: { epochs: rows } });
    }

    // ── /cardinal-points ────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/cardinal-points`) {
      if (!get()) return methodNotAllowed(method, path);
      const t = epochs(query);
      if ('problem' in t) return t.problem;
      const types = query.types ? query.types.split(',') : [...CARDINAL_TYPES];
      const unknown = types.filter((s) => !CARDINAL_TYPES.includes(s));
      if (unknown.length) {
        return problem(400, 'unknown-cardinal-type', 'Unknown cardinal-point type', `No type(s): ${unknown.join(', ')}.`, { types: CARDINAL_TYPES });
      }
      const rows = t.years.map((y) => ({
        year: y,
        points: Object.fromEntries(types.map((type) => [type, {
          jd: model.cardinal.jd(y, type),
          raDeg: model.cardinal.raDeg(y, type),
          yearLengthDays: model.cardinal.yearLengthDays(y, type),
        }])),
      }));
      return envelope({ identity: id, inputEcho: { path, ...t.echo, types }, data: { years: rows } });
    }

    // ── /earth ──────────────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/earth`) {
      if (!get()) return methodNotAllowed(method, path);
      const t = epochs(query);
      if ('problem' in t) return t.problem;
      const rows = t.years.map((y) => ({
        year: y,
        obliquityDeg: model.earth.obliquityDeg(y),
        eccentricity: model.earth.eccentricity(y),
        inclinationDeg: model.earth.inclinationDeg(y),
        perihelionLongitudeDeg: model.earth.perihelionLongitudeDeg(y),
        ascendingNodeDeg: model.earth.ascendingNodeDeg(y),
      }));
      return envelope({ identity: id, inputEcho: { path, ...t.echo }, data: { years: rows } });
    }

    // ── /moon ───────────────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/moon`) {
      if (!get()) return methodNotAllowed(method, path);
      const t = epochs(query);
      if ('problem' in t) return t.problem;
      const rows = t.years.map((y) => ({
        year: y,
        distanceKm: model.moon.distanceKmAtYear(y),
        siderealMonthDays: model.moon.siderealMonthDaysAtYear(y),
      }));
      return envelope({ identity: id, inputEcho: { path, ...t.echo }, data: { years: rows } });
    }

    // ── /bodies ─────────────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/bodies`) {
      if (!get()) return methodNotAllowed(method, path);
      return envelope({
        identity: id,
        inputEcho: { path },
        data: { bodies: model.planets.keys, accuracy: PLANET_ACCURACY },
      });
    }
    const bodyMatch = path.match(new RegExp(`^/${API_VERSION}/bodies/([a-z]+)$`));
    if (bodyMatch) {
      if (!get()) return methodNotAllowed(method, path);
      const key = bodyMatch[1];
      const record = model.planets.record(key);
      if (!record) {
        return problem(404, 'unknown-body', 'Unknown body', `No body "${key}".`, { bodies: model.planets.keys, instance: path });
      }
      const t = query.year !== undefined || query.jd !== undefined ? epochs(query) : { years: [2000], echo: { year: 2000, defaulted: true } };
      if ('problem' in t) return t.problem;
      const atYears = t.years.map((y) => ({
        year: y,
        perihelionLongitudeDeg: model.planets.perihelionLongitudeDeg(key, y),
        ascendingNodeInvPlaneDeg: model.planets.ascendingNodeInvPlaneDeg(key, y),
        invPlaneInclinationDeg: model.planets.invPlaneInclinationDeg(key, y),
      }));
      return envelope({
        identity: id,
        inputEcho: { path, body: key, ...t.echo },
        data: { body: key, record, at: atYears, accuracy: PLANET_ACCURACY },
      });
    }

    // ── /values ─────────────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/values`) {
      if (!get()) return methodNotAllowed(method, path);
      return envelope({
        identity: id,
        inputEcho: { path },
        data: { keyCount: MODEL_VALUES_META.keyCount, coefficients: MODEL_VALUES_META.coefficients, keys: Object.keys(MODEL_VALUES).sort() },
      });
    }
    const valueMatch = path.match(new RegExp(`^/${API_VERSION}/values/([A-Za-z0-9_]+)$`));
    if (valueMatch) {
      if (!get()) return methodNotAllowed(method, path);
      const key = valueMatch[1];
      const value = /** @type {Record<string, string>} */ (MODEL_VALUES)[key];
      if (value === undefined) {
        return problem(404, 'unknown-value-key', 'Unknown value key', `No registry key "${key}".`, { instance: path });
      }
      return envelope({ identity: id, inputEcho: { path, key }, data: { key, value } });
    }

    // ── /climate ────────────────────────────────────────────────────────────
    if (path === `/${API_VERSION}/climate`) {
      if (!get()) return methodNotAllowed(method, path);
      const t = epochs(query);
      if ('problem' in t) return t.problem;
      const rows = t.years.map((y) => ({ year: y, l1OrbitalPermil: model.climate.l1OrbitalPermil(y) }));
      return envelope({ identity: id, inputEcho: { path, ...t.echo }, data: { years: rows, note: 'L1 orbital forcing component (permil), the 32-component 8H lattice formula — docs/91.' } });
    }

    // ── /cross-validation ───────────────────────────────────────────────────
    const curveMatch = path.match(new RegExp(`^/${API_VERSION}/cross-validation/([a-z0-9\\-]+)$`));
    if (curveMatch) {
      if (!get()) return methodNotAllowed(method, path);
      const curveKey = curveMatch[1];
      const curve = /** @type {Record<string, any>} */ (CURVES)[curveKey];
      if (!curve) {
        return problem(404, 'unknown-curve', 'Unknown cross-validation curve', `No curve "${curveKey}".`, { curves: Object.keys(CURVES), instance: path });
      }
      const t = epochs(query);
      if ('problem' in t) return t.problem;
      const rows = t.years.map((y) => {
        const modelValue = curve.model === 'deltaTSeconds' ? model.epoch.deltaTSecondsAtYear(y)
          : curve.model === 'obliquityDeg' ? model.earth.obliquityDeg(y)
            : model.earth.eccentricity(y);
        const published = curveKey === 'deltat-stephenson2016'
          ? curves.stephensonDeltaT(y, STEPHENSON_POLY)
          : curve.published(y);
        return { year: y, model: modelValue, published, delta: published === null ? null : modelValue - published };
      });
      return envelope({ identity: id, inputEcho: { path, curve: curveKey, ...t.echo }, data: { curve: curveKey, unit: curve.unit, years: rows, note: 'The model is the source; the published curve is the comparison reference (cross-validate in one place).' } });
    }

    // ── /counterfactual (POST) ──────────────────────────────────────────────
    if (path === `/${API_VERSION}/counterfactual`) {
      if (method !== 'POST') return methodNotAllowed(method, path);
      /** @type {any} */
      let parsed;
      try { parsed = JSON.parse(/** @type {any} */ (req).body ?? ''); } catch {
        return problem(400, 'invalid-json', 'Invalid JSON body', 'The request body must be a JSON object.');
      }
      const overrides = parsed?.overrides;
      const year = Number(parsed?.year ?? 2000);
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
        return problem(400, 'invalid-counterfactual', 'Invalid counterfactual request', 'Body must be { "overrides": { "<dotted.path>": number }, "year": <number> }.');
      }
      const entries = Object.entries(overrides);
      if (entries.length === 0 || entries.length > MAX_OVERRIDES) {
        return problem(422, 'override-count', 'Override count out of range', `1..${MAX_OVERRIDES} overrides supported.`, { maxOverrides: MAX_OVERRIDES });
      }
      const altered = JSON.parse(JSON.stringify(DEFAULT_CONSTANTS));
      for (const [dotted, value] of entries) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return problem(422, 'invalid-override-value', 'Override values must be finite numbers', `"${dotted}" is ${typeof value}.`);
        }
        const parts = dotted.split('.');
        let node = altered;
        for (let i = 0; i < parts.length - 1; i++) {
          node = node?.[parts[i]];
          if (node === undefined || node === null || typeof node !== 'object') {
            return problem(422, 'unknown-override-path', 'Unknown constants path', `"${dotted}" does not exist in the injectable constants.`, { path: dotted });
          }
        }
        const leaf = parts[parts.length - 1];
        if (typeof node[leaf] !== 'number') {
          return problem(422, 'unknown-override-path', 'Unknown constants path', `"${dotted}" does not name a numeric constant.`, { path: dotted });
        }
        node[leaf] = value;
      }
      /** @type {ReturnType<typeof createModel>} */
      let cf;
      try { cf = createModel(altered); } catch (e) {
        return problem(422, 'validation-target-injection', 'Validation targets cannot be injected', String(e instanceof Error ? e.message : e));
      }
      const data = {
        overrides,
        year,
        latticePeriodsYears: cf.computeLatticePeriodsYears(),
        epoch: { h: cf.epoch.hAtYear(year), lodSeconds: cf.epoch.lodSecondsAtYear(year), deltaTSeconds: cf.epoch.deltaTSecondsAtYear(year) },
        earth: { obliquityDeg: cf.earth.obliquityDeg(year), eccentricity: cf.earth.eccentricity(year), inclinationDeg: cf.earth.inclinationDeg(year) },
      };
      const res = envelope({ identity: cf.identity, inputEcho: { path, overrides, year }, data });
      res.headers['cache-control'] = 'no-store';
      return res;
    }

    // ── /derivations ────────────────────────────────────────────────────────
    const derivMatch = path.match(new RegExp(`^/${API_VERSION}/derivations/([A-Za-z0-9]+)$`));
    if (derivMatch) {
      if (!get()) return methodNotAllowed(method, path);
      const q = derivMatch[1];
      const d = /** @type {Record<string, unknown>} */ (DERIVATIONS)[q];
      if (!d) {
        return problem(404, 'unknown-quantity', 'Unknown derivation quantity', `No derivation for "${q}".`, { quantities: Object.keys(DERIVATIONS), instance: path });
      }
      return envelope({ identity: id, inputEcho: { path, quantity: q }, data: { quantity: q, ...d } });
    }

    return notFound(path);
  };

  return { handle, model };
}
