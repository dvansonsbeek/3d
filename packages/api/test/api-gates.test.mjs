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
