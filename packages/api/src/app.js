/**
 * @essrt/api — the request handler (§7a step 3 skeleton).
 *
 * A pure function of the request: `createApi()` assembles the model once and
 * returns `handle({method, path, query})` → `{status, headers, body}`.
 * node:http wrapping lives in server.js; tests call `handle` directly, so
 * determinism is testable without sockets. No surface contains physics —
 * every number comes from the assembled model (the boundaries lint enforces
 * the direction).
 *
 * Skeleton routes: the /versions discovery pair. Slice-1 physics endpoints
 * arrive contract-first against the OpenAPI spec (§7a step 4).
 */
import { createModel } from '../../physics/src/index.js';
import { envelope, API_VERSION } from './envelope.js';
import { notFound, methodNotAllowed } from './problem.js';

/**
 * @returns {{ handle: (req: {method: string, path: string, query?: Record<string, string>}) => {status: number, headers: Record<string, string>, body: string}, model: ReturnType<typeof createModel> }}
 */
export function createApi() {
  const model = createModel();
  const id = model.identity;

  /** The one shipped model release, described for discovery. */
  const versionRecord = Object.freeze({
    modelVersion: id.modelVersion,
    status: 'current',
    constantsHash: id.constantsHash,
    coefficientsHash: id.coefficientsHash,
    citation: `doi:${id.preprintDoi}`,
    validitySpan: { minYear: -498e6, maxYear: 502e6, note: 'refused outside, never extrapolated' },
  });

  /** @param {{method: string, path: string, query?: Record<string, string>}} req */
  const handle = (req) => {
    const method = req.method.toUpperCase();
    const path = req.path.replace(/\/+$/, '') || '/';

    if (path === `/${API_VERSION}/versions`) {
      if (method !== 'GET') return methodNotAllowed(method, path);
      return envelope({
        identity: id,
        inputEcho: { path },
        data: { versions: [versionRecord], current: id.modelVersion },
      });
    }

    const versionMatch = path.match(new RegExp(`^/${API_VERSION}/versions/([A-Za-z0-9.\\-]+)$`));
    if (versionMatch) {
      if (method !== 'GET') return methodNotAllowed(method, path);
      const requested = versionMatch[1];
      if (requested !== id.modelVersion) return notFound(path);
      return envelope({
        identity: id,
        inputEcho: { path, version: requested },
        data: versionRecord,
        immutable: true,
      });
    }

    return notFound(path);
  };

  return { handle, model };
}
