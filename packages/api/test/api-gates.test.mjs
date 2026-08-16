/**
 * API GATES (§7a step 3): determinism + provenance, fail-proven BEFORE any
 * physics endpoint exists.
 *
 * Both gates are validators exercised in BOTH directions in this suite:
 * each is first shown to REJECT a deliberately broken response (the
 * fail-proof — a gate that cannot fail proves nothing), then required to
 * accept every real response.
 *
 *   node packages/api/test/api-gates.test.mjs   (exit 1 on fail)
 */
import { createApi } from '../src/app.js';
import { envelopeDefects, REQUIRED_META_FIELDS } from '../src/envelope.js';

const failures = [];
const { handle } = createApi();

// ── Determinism gate: same request twice ⇒ byte-identical body + same ETag ──
/** @param {{status:number, headers:Record<string,string>, body:string}} a @param {{status:number, headers:Record<string,string>, body:string}} b @returns {string[]} */
const determinismDefects = (a, b) => {
  const defects = [];
  if (a.body !== b.body) defects.push('body differs between identical requests');
  if (a.headers.etag !== b.headers.etag) defects.push('etag differs between identical requests');
  if (!a.headers.etag) defects.push('no strong etag on success response');
  return defects;
};

// Fail-proof: the checker must reject a nondeterministic pair.
{
  const real = handle({ method: 'GET', path: '/v1/versions' });
  const fake = { ...real, body: real.body.slice(0, -1) + ' ', headers: { ...real.headers, etag: '"different"' } };
  if (determinismDefects(real, fake).length === 0) failures.push('FAIL-PROOF: determinism checker accepted a differing pair');
}
// Real: /versions and /versions/{id} twice each.
const LIVE_VERSION = JSON.parse(handle({ method: 'GET', path: '/v1/versions' }).body).data.current;
for (const path of ['/v1/versions', `/v1/versions/${LIVE_VERSION}`]) {
  const a = handle({ method: 'GET', path });
  const b = handle({ method: 'GET', path });
  if (a.status !== 200) { failures.push(`${path}: status ${a.status}`); continue; }
  for (const d of determinismDefects(a, b)) failures.push(`${path}: ${d}`);
}

// ── Provenance gate: every success meta carries the full contract ───────────
// Fail-proof: the checker must reject a meta missing any required field.
for (const field of REQUIRED_META_FIELDS) {
  const complete = JSON.parse(handle({ method: 'GET', path: '/v1/versions' }).body).meta;
  const broken = { ...complete };
  delete broken[field];
  if (!envelopeDefects(broken).includes(field)) {
    failures.push(`FAIL-PROOF: envelope checker missed a deleted "${field}"`);
  }
}
// Real responses must be defect-free and self-consistent with the model identity.
// The pinned id is read from the live listing (LIVE_VERSION above) —
// hardcoding it broke on the v10.0 → v11.0 bump (the version event is
// exactly what this must survive).
const CURRENT_VERSION = LIVE_VERSION;
{
  const res = JSON.parse(handle({ method: 'GET', path: `/v1/versions/${CURRENT_VERSION}` }).body);
  const defects = envelopeDefects(res.meta);
  for (const d of defects) failures.push(`meta missing "${d}"`);
  if (res.meta.modelVersion !== res.data.modelVersion) failures.push('meta/data modelVersion mismatch');
  if (!/^doi:10\./.test(String(res.meta.citation))) failures.push(`citation malformed: ${res.meta.citation}`);
  if (!String(res.meta.inputEcho && JSON.stringify(res.meta.inputEcho)).includes(`/v1/versions/${CURRENT_VERSION}`)) {
    failures.push('inputEcho does not echo the request');
  }
}

// ── Immutability caching: pinned resource is immutable, listing is not ──────
{
  const pinned = handle({ method: 'GET', path: `/v1/versions/${CURRENT_VERSION}` });
  const listing = handle({ method: 'GET', path: '/v1/versions' });
  if (!/immutable/.test(pinned.headers['cache-control'] ?? '')) failures.push('pinned version not cache-immutable');
  if (/immutable/.test(listing.headers['cache-control'] ?? '')) failures.push('mutable listing marked immutable');
}

// ── Slice-1: determinism + envelope over EVERY route ────────────────────────
const SAMPLE_REQUESTS = [
  '/v1/epoch?year=2000',
  '/v1/epoch?jd=2451545',
  '/v1/epoch?start=2000&stop=2100&step=50',
  '/v1/cardinal-points?year=2000&types=SS,VE',
  '/v1/earth?year=2000',
  '/v1/earth?years=2000,1000,-2000',
  '/v1/moon?year=2000',
  '/v1/bodies',
  '/v1/bodies/mercury',
  '/v1/bodies/saturn?year=1000',
  '/v1/values',
  '/v1/values/usnoLodJ2000',
  '/v1/derivations/axialPrecession',
  '/v1/climate?year=2000',
  '/v1/climate?start=0&stop=100000&step=50000',
  '/v1/cross-validation/obliquity-berger1978?years=2000,-100000',
  '/v1/cross-validation/deltat-stephenson2016?year=1000',
  '/v1/eclipses/solar?startYear=2024&stopYear=2025',
  '/v1/eclipses/lunar?startJd=2460310.5&stopJd=2460676.5',
];
/** @param {string} url @returns {{path: string, query: Record<string, string>}} */
const parseUrl = (url) => {
  const [path, qs] = url.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs ?? '')) };
};
for (const url of SAMPLE_REQUESTS) {
  const { path, query } = parseUrl(url);
  const a = handle({ method: 'GET', path, query });
  const b = handle({ method: 'GET', path, query });
  if (a.status !== 200) { failures.push(`${url}: status ${a.status} — ${a.body.slice(0, 120)}`); continue; }
  for (const d of determinismDefects(a, b)) failures.push(`${url}: ${d}`);
  const parsed = JSON.parse(a.body);
  for (const d of envelopeDefects(parsed.meta)) failures.push(`${url}: meta missing "${d}"`);
}

// ── Semantic anchors ────────────────────────────────────────────────────────
{
  /** @param {string} url @returns {any} */
  const dataOf = (url) => { const { path, query } = parseUrl(url); return JSON.parse(handle({ method: 'GET', path, query }).body).data; };
  const ep = dataOf('/v1/epoch?year=2000').epochs[0];
  if (Math.abs(ep.h - 335317) > 1e-6) failures.push(`epoch H@2000: ${ep.h}`);
  const dev = dataOf('/v1/epoch?year=-379998000').epochs[0];
  if (Math.round(dev.h) !== 306189) failures.push(`epoch H@Devonian: ${dev.h}`);
  const earth = dataOf('/v1/earth?year=2000').years[0];
  if (Math.abs(earth.obliquityDeg - 23.4393) > 0.0002) failures.push(`earth obliquity@2000: ${earth.obliquityDeg}`);
  const ss = dataOf('/v1/cardinal-points?year=2000&types=SS').years[0].points.SS;
  if (Math.abs(ss.jd - 2451716.575) > 0.1) failures.push(`SS 2000 JD: ${ss.jd}`);
  const val = dataOf('/v1/values/usnoLodJ2000');
  if (val.value !== '86,400.0017') failures.push(`values/usnoLodJ2000: ${val.value}`);
  const deriv = dataOf('/v1/derivations/axialPrecession');
  if (deriv.latticeDivisor !== 13) failures.push(`derivations/axialPrecession divisor: ${deriv.latticeDivisor}`);
  const merc = dataOf('/v1/bodies/mercury');
  if (Math.round(merc.record.perihelionEclipticYears) !== 243867) failures.push(`mercury ecl period: ${merc.record.perihelionEclipticYears}`);
  if (!merc.accuracy || !merc.accuracy.statement) failures.push('bodies/mercury: missing accuracy statement');
  // JD input equivalence: same instant via jd= and via year= must agree.
  const viaJd = dataOf('/v1/earth?jd=2451545').years[0];
  const viaYearNum = JSON.parse(handle({ method: 'GET', path: '/v1/epoch', query: { jd: '2451545' } }).body).data.epochs[0].year;
  const viaYear = dataOf(`/v1/earth?year=${viaYearNum}`).years[0];
  if (viaJd.obliquityDeg !== viaYear.obliquityDeg) failures.push('jd= vs year= inequivalent on /v1/earth');
}

// ── Eclipses: the 2024 canon, UT timescale, refusals ────────────────────────
{
  const solar = JSON.parse(handle({ method: 'GET', path: '/v1/eclipses/solar', query: { startYear: '2024', stopYear: '2025' } }).body);
  if (solar.meta.timescale !== 'UT') failures.push(`eclipses timescale: ${solar.meta.timescale}, want UT`);
  if (solar.data.count !== 2) failures.push(`eclipses solar 2024 count: ${solar.data.count}, want 2`);
  const apr8 = solar.data.events[0];
  if (!apr8 || apr8.type !== 'Total' || Math.abs(apr8.jd - 2460409.263) > 0.01) {
    failures.push(`eclipses: 2024-04-08 Total not found (got ${apr8 && `${apr8.jd} ${apr8.type}`})`);
  }
  if (apr8 && !(apr8.jdTT > apr8.jd)) failures.push('eclipses: jdTT must exceed jd (positive deltaT in 2024)');
  const lunar = JSON.parse(handle({ method: 'GET', path: '/v1/eclipses/lunar', query: { startJd: '2460310.5', stopJd: '2460676.5' } }).body);
  if (lunar.data.count !== 2 || lunar.data.events[1].type !== 'Partial') {
    failures.push(`eclipses lunar 2024: count ${lunar.data.count}, [1] ${lunar.data.events[1] && lunar.data.events[1].type}`);
  }
  // Refusals: no window / both window forms → 400; oversized window → 422; unknown kind → 404.
  const cases = [
    ['/v1/eclipses/solar', 400],
    ['/v1/eclipses/solar?startYear=2000&stopYear=2001&startJd=1&stopJd=2', 400],
    ['/v1/eclipses/solar?startYear=2000&stopYear=1999', 400],
    ['/v1/eclipses/solar?startYear=0&stopYear=1000', 422],
    ['/v1/eclipses/annular?startYear=2024&stopYear=2025', 404],
  ];
  for (const [url, want] of cases) {
    const { path, query } = parseUrl(String(url));
    const r = handle({ method: 'GET', path, query });
    if (r.status !== want) failures.push(`eclipses refusal ${url}: status ${r.status}, want ${want}`);
    if (!/problem\+json/.test(r.headers['content-type'] ?? '')) failures.push(`eclipses refusal ${url}: not problem+json`);
  }
}

// ── Counterfactual POST: determinism, own hash, flow, refusals ──────────────
{
  const body = JSON.stringify({ overrides: { 'foundational.holisticyearLength': 400000 }, year: 2000 });
  const a = handle({ method: 'POST', path: '/v1/counterfactual', body });
  const b = handle({ method: 'POST', path: '/v1/counterfactual', body });
  if (a.status !== 200) failures.push(`counterfactual: status ${a.status} — ${a.body.slice(0, 140)}`);
  else {
    if (a.body !== b.body) failures.push('counterfactual: nondeterministic');
    const doc = JSON.parse(a.body);
    for (const d of envelopeDefects(doc.meta)) failures.push(`counterfactual meta missing "${d}"`);
    const base = JSON.parse(handle({ method: 'GET', path: '/v1/versions' }).body).meta.constantsHash;
    if (doc.meta.constantsHash === base) failures.push('counterfactual: served the DEFAULT hash');
    if (Math.abs(doc.data.epoch.h - 400000) > 1e-6) failures.push(`counterfactual H did not flow: ${doc.data.epoch.h}`);
    if (!/no-store/.test(a.headers['cache-control'] ?? '')) failures.push('counterfactual not no-store');
  }
  // Refusals: validation-target injection, unknown path, non-numeric value, bad JSON.
  const cases = [
    [JSON.stringify({ overrides: { 'laplaceLagrangeBounds': 1 } }), 422],
    [JSON.stringify({ overrides: { 'foundational.notAThing': 1 } }), 422],
    [JSON.stringify({ overrides: { 'foundational.holisticyearLength': 'big' } }), 422],
    ['{nope', 400],
  ];
  for (const [cfBody, want] of cases) {
    const r = handle({ method: 'POST', path: '/v1/counterfactual', body: String(cfBody) });
    if (r.status !== want) failures.push(`counterfactual refusal (${String(cfBody).slice(0, 40)}): status ${r.status}, want ${want}`);
    if (!/problem\+json/.test(r.headers['content-type'] ?? '')) failures.push('counterfactual refusal not problem+json');
  }
}

// ── Cross-validation semantics ──────────────────────────────────────────────
{
  const res = JSON.parse(handle({ method: 'GET', path: '/v1/cross-validation/obliquity-berger1978', query: { year: '2000' } }).body);
  const row = res.data.years[0];
  if (Math.abs(row.model - row.published) > 0.05) failures.push(`obliquity model vs Berger @2000 diverges: ${row.delta}`);
  const unknown = handle({ method: 'GET', path: '/v1/cross-validation/nope', query: { year: '2000' } });
  if (unknown.status !== 404) failures.push('unknown curve not 404');
}

// ── Refusals: out-of-domain, range cap, unknown section/type/key ────────────
{
  /** @param {string} url @returns {{status: number, body: string, headers: Record<string, string>}} */
  const res = (url) => { const { path, query } = parseUrl(url); return handle({ method: 'GET', path, query }); };
  const outOfDomain = res('/v1/epoch?year=600000000');
  if (outOfDomain.status !== 422) failures.push(`out-of-domain status: ${outOfDomain.status}`);
  const oodDoc = JSON.parse(outOfDomain.body);
  if (!oodDoc.validRange || oodDoc.validRange.maxYear === undefined) failures.push('out-of-domain problem lacks machine-readable validRange');
  const tooMany = res('/v1/epoch?start=0&stop=1000000&step=1');
  if (tooMany.status !== 422 || !JSON.parse(tooMany.body).maxPoints) failures.push('range cap problem lacks maxPoints');
  if (res('/v1/epoch?year=2000&sections=nope').status !== 400) failures.push('unknown section not refused');
  if (res('/v1/values/notAKey').status !== 404) failures.push('unknown value key not 404');
  if (res('/v1/bodies/pluto').status !== 404) failures.push('unknown body not 404');
  // CSV negotiation
  const csv = res('/v1/epoch?start=2000&stop=2010&step=5&format=csv');
  if (!/text\/csv/.test(csv.headers['content-type'] ?? '') || !csv.body.startsWith('year,')) failures.push('csv format not served');
}

// ── OpenAPI conformance: handler routes ≡ contract paths, both directions ──
{
  const { readFileSync } = await import('node:fs');
  const { ROUTE_TEMPLATES } = await import('../src/app.js');
  const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));
  const specPaths = Object.keys(spec.paths);
  for (const r of ROUTE_TEMPLATES) if (!specPaths.includes(r)) failures.push(`route ${r} missing from openapi.json`);
  for (const p of specPaths) if (!ROUTE_TEMPLATES.includes(p)) failures.push(`openapi path ${p} not implemented`);
}

// ── RFC 9457: errors are problem+json with typed members, correct statuses ──
{
  const missing = handle({ method: 'GET', path: '/v1/nope' });
  const badMethod = handle({ method: 'POST', path: '/v1/versions' });
  const unknownVersion = handle({ method: 'GET', path: '/v1/versions/v99.9' });
  /** @type {Array<[string, {status: number, headers: Record<string, string>, body: string}, number]>} */
  const errorCases = [['404', missing, 404], ['405', badMethod, 405], ['unknown version', unknownVersion, 404]];
  for (const [label, res, status] of errorCases) {
    if (res.status !== status) failures.push(`${label}: status ${res.status}`);
    if (!/application\/problem\+json/.test(res.headers['content-type'] ?? '')) failures.push(`${label}: not problem+json`);
    const doc = JSON.parse(res.body);
    for (const f of ['type', 'title', 'status', 'detail']) {
      if (doc[f] === undefined) failures.push(`${label}: problem missing "${f}"`);
    }
  }
}

// ── Observer tier (lunar visibility): annotation, identity, refusals ────────
{
  /** @param {string} pathAndQuery @returns {{status:number, body:any}} */
  const res = (pathAndQuery) => {
    const [p, qs] = pathAndQuery.split('?');
    const query = Object.fromEntries(new URLSearchParams(qs ?? ''));
    const r = handle({ method: 'GET', path: p, query });
    return { status: r.status, body: JSON.parse(r.body) };
  };
  const plain = res('/v1/eclipses/lunar?startYear=2024&stopYear=2025');
  const rio = res('/v1/eclipses/lunar?startYear=2024&stopYear=2025&lat=-22.9&lon=-43.2');
  const antipode = res('/v1/eclipses/lunar?startYear=2024&stopYear=2025&lat=22.9&lon=136.8');
  if (plain.body.data.events.some((/** @type {any} */ e) => e.visible !== undefined)) failures.push('observer fields present without observer');
  if (plain.body.data.visibleCount !== undefined) failures.push('visibleCount present without observer');
  if (rio.status !== 200 || rio.body.data.count === 0) failures.push('observer request failed or found no events');
  for (const [i, e] of rio.body.data.events.entries()) {
    if (typeof e.moonAltitudeDeg !== 'number' || typeof e.visible !== 'boolean') failures.push(`event ${i}: observer fields missing`);
    // Structural identity: the exact antipode sees the negated geometric
    // altitude — sin(alt) flips sign under (lat, lon) → (−lat, lon+180°).
    // Self-checking with no external truth; fails on any convention slip.
    const anti = antipode.body.data.events[i];
    if (Math.abs(e.moonAltitudeDeg + anti.moonAltitudeDeg) > 1e-9) failures.push(`event ${i}: antipodal altitude identity broken (${e.moonAltitudeDeg} vs ${anti.moonAltitudeDeg})`);
  }
  if (rio.body.data.visibleCount !== rio.body.data.events.filter((/** @type {any} */ e) => e.visible).length) failures.push('visibleCount disagrees with per-event flags');
  // Semantic anchor: both 2024 lunar eclipses (Mar 25 penumbral, Sep 18
  // partial) were in fact visible from Rio de Janeiro — altitudes 27°/69°.
  if (rio.body.data.visibleCount !== 2) failures.push(`semantic anchor: Rio 2024 visibleCount ${rio.body.data.visibleCount}, expected 2`);
  const only = res('/v1/eclipses/lunar?startYear=2024&stopYear=2025&lat=-22.9&lon=-43.2&visibleOnly=true');
  if (only.body.data.events.length !== only.body.data.visibleCount) failures.push('visibleOnly did not filter to visibleCount');
  if (only.body.data.events.some((/** @type {any} */ e) => !e.visible)) failures.push('visibleOnly returned an invisible event');
  // Refusals — each must be the documented problem, not a silent answer.
  /** @type {Array<[string, string, number, string]>} */
  const refusals = [
    ['solar + observer', '/v1/eclipses/solar?startYear=2024&stopYear=2025&lat=0&lon=0', 422, 'solar-location-unavailable'],
    ['lat without lon', '/v1/eclipses/lunar?startYear=2024&stopYear=2025&lat=10', 400, 'invalid-observer'],
    ['lat out of range', '/v1/eclipses/lunar?startYear=2024&stopYear=2025&lat=91&lon=0', 400, 'invalid-observer'],
    ['visibleOnly without observer', '/v1/eclipses/lunar?startYear=2024&stopYear=2025&visibleOnly=true', 400, 'invalid-observer'],
    ['observer at deep time', '/v1/eclipses/lunar?startYear=-20000&stopYear=-19900&lat=0&lon=0', 422, 'observer-outside-era'],
  ];
  for (const [label, pq, status, type] of refusals) {
    const r = res(pq);
    if (r.status !== status) failures.push(`observer refusal "${label}": status ${r.status}, expected ${status}`);
    else if (!String(r.body.type).endsWith(type)) failures.push(`observer refusal "${label}": problem type ${r.body.type}`);
  }
  // Determinism on the new parameter path.
  const a = handle({ method: 'GET', path: '/v1/eclipses/lunar', query: { startYear: '2024', stopYear: '2025', lat: '-22.9', lon: '-43.2' } });
  const b = handle({ method: 'GET', path: '/v1/eclipses/lunar', query: { startYear: '2024', stopYear: '2025', lat: '-22.9', lon: '-43.2' } });
  for (const d of determinismDefects(a, b)) failures.push(`observer determinism: ${d}`);
}

if (failures.length) {
  console.error(`api gates — ${failures.length} FAILURE(S):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log('api gates — determinism (fail-proven) + provenance envelope (fail-proven per field) + immutability caching + RFC 9457 errors + observer tier (antipodal identity + refusals): PASS');
