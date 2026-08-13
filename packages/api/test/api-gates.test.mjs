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
for (const path of ['/v1/versions', '/v1/versions/v10.0']) {
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
{
  const res = JSON.parse(handle({ method: 'GET', path: '/v1/versions/v10.0' }).body);
  const defects = envelopeDefects(res.meta);
  for (const d of defects) failures.push(`meta missing "${d}"`);
  if (res.meta.modelVersion !== res.data.modelVersion) failures.push('meta/data modelVersion mismatch');
  if (!/^doi:10\./.test(String(res.meta.citation))) failures.push(`citation malformed: ${res.meta.citation}`);
  if (!String(res.meta.inputEcho && JSON.stringify(res.meta.inputEcho)).includes('/v1/versions/v10.0')) {
    failures.push('inputEcho does not echo the request');
  }
}

// ── Immutability caching: pinned resource is immutable, listing is not ──────
{
  const pinned = handle({ method: 'GET', path: '/v1/versions/v10.0' });
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

if (failures.length) {
  console.error(`api gates — ${failures.length} FAILURE(S):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log('api gates — determinism (fail-proven) + provenance envelope (fail-proven per field) + immutability caching + RFC 9457 errors: PASS');
