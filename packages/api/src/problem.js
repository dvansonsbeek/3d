/**
 * RFC 9457 `application/problem+json` helpers (§7a revision 3).
 *
 * Every error is a typed problem document — never HTTP-200 prose, never a
 * bare string. Validity-domain refusals carry machine-readable bounds as
 * extension members so a client can adapt without parsing English.
 */

const TYPE_BASE = 'https://holisticuniverse.com/api/problems/';

/**
 * Build a problem response object.
 *
 * @param {number} status      HTTP status code
 * @param {string} slug        problem type slug (appended to the type base URI)
 * @param {string} title       short human summary (stable per type)
 * @param {string} detail      occurrence-specific explanation
 * @param {Record<string, unknown>} [extensions]  machine-readable extension members
 * @returns {{status: number, headers: Record<string, string>, body: string}}
 */
export function problem(status, slug, title, detail, extensions = {}) {
  const doc = { type: TYPE_BASE + slug, title, status, detail, ...extensions };
  return {
    status,
    headers: { 'content-type': 'application/problem+json; charset=utf-8' },
    body: JSON.stringify(doc),
  };
}

/** @param {string} path @returns {{status: number, headers: Record<string, string>, body: string}} */
export const notFound = (path) =>
  problem(404, 'not-found', 'Resource not found', `No resource at ${path}.`, { instance: path });

/** @param {string} method @param {string} path @returns {{status: number, headers: Record<string, string>, body: string}} */
export const methodNotAllowed = (method, path) =>
  problem(405, 'method-not-allowed', 'Method not allowed', `${method} is not supported at ${path}.`, {
    instance: path,
  });
