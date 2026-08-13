/**
 * The response envelope (§7a): every successful payload is
 * `{ meta, data }`, where meta is the provenance block that makes the
 * response self-describing and reproducible — the ESGF/Materials-Project
 * pattern. `inputEcho` carries the canonicalized request (the CDS lesson:
 * the request is the reproducibility artifact).
 */
import { createHash } from 'node:crypto';

/** The API contract version (URL-path axis; distinct from the model axis). */
export const API_VERSION = 'v1';

/**
 * Fields every meta block must carry. Exported so the gate test validates
 * the CONTRACT, not an example — a missing field fails the suite.
 * @type {readonly string[]}
 */
export const REQUIRED_META_FIELDS = Object.freeze([
  'apiVersion', 'modelVersion', 'constantsHash', 'coefficientsHash',
  'timescale', 'inputEcho', 'citation',
]);

/**
 * Validate a meta block against the provenance contract.
 * @param {Record<string, unknown>} meta
 * @returns {string[]} the missing/empty field names (empty array = valid)
 */
export function envelopeDefects(meta) {
  const defects = [];
  for (const f of REQUIRED_META_FIELDS) {
    if (meta === null || typeof meta !== 'object' || meta[f] === undefined || meta[f] === null || meta[f] === '') {
      defects.push(f);
    }
  }
  return defects;
}

/**
 * Build a success response: envelope + strong ETag over the exact body bytes
 * (the testable determinism claim — same version + request ⇒ same ETag).
 *
 * @param {object} args
 * @param {{modelVersion: string, constantsHash: string, coefficientsHash: string, preprintDoi: string}} args.identity
 * @param {Record<string, unknown>} args.inputEcho   canonicalized request input
 * @param {unknown} args.data
 * @param {string} [args.timescale]   'TT' unless a route says otherwise
 * @param {boolean} [args.immutable]  version-pinned responses cache forever
 * @returns {{status: number, headers: Record<string, string>, body: string}}
 */
export function envelope({ identity, inputEcho, data, timescale = 'TT', immutable = false }) {
  const meta = {
    apiVersion: API_VERSION,
    modelVersion: identity.modelVersion,
    constantsHash: identity.constantsHash,
    coefficientsHash: identity.coefficientsHash,
    timescale,
    inputEcho,
    citation: `doi:${identity.preprintDoi}`,
  };
  const body = JSON.stringify({ meta, data });
  const etag = '"' + createHash('sha256').update(body).digest('hex').slice(0, 32) + '"';
  return {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      etag,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    },
    body,
  };
}
