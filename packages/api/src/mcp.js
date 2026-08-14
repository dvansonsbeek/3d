/**
 * MCP surface over the api handler (Phase 16) — the pure dispatcher.
 *
 * One service, two transports: server.js speaks HTTP, mcp-server.js speaks
 * MCP over stdio. Both delegate every query to the SAME `handle()` — no
 * physics, no route logic, no envelope construction here (adapters never
 * duplicate each other's surface, §2b — which is why this lives inside
 * packages/api rather than a sibling package that could not import it).
 *
 * The protocol layer is deliberately hand-rolled: the subset MCP requires
 * for a tools-only server (initialize / initialized / ping / tools/list /
 * tools/call over newline-delimited JSON-RPC 2.0) is small and stable, and
 * a zero-dependency implementation keeps the package's determinism gates
 * meaningful (the dispatcher is a pure function of the message).
 *
 * Every tool result is the api's envelope JSON verbatim (meta + data), so
 * an agent gets the same provenance contract as an HTTP consumer: model
 * version, hashes, timescale, input echo, citation. Errors surface the
 * RFC 9457 problem body with isError: true.
 */
import { createApi, ROUTE_TEMPLATES } from './app.js';
import { API_VERSION } from './envelope.js';

/** The MCP protocol revision this server implements. */
export const MCP_PROTOCOL_VERSION = '2025-06-18';

const SERVER_INFO = Object.freeze({ name: 'essrt-model', version: '0.1.0' });

/** Shared time-window properties for epoch-parameterized tools. */
const TIME_PROPS = {
  year: { type: 'number', description: 'single epoch as a model year (SI axis)' },
  jd: { type: 'number', description: 'single epoch as JD(TT)' },
  years: { type: 'string', description: 'comma-separated model years (max 10000)' },
  jds: { type: 'string', description: 'comma-separated JD(TT) epochs (max 10000)' },
  start: { type: 'number', description: 'range start (model year)' },
  stop: { type: 'number', description: 'range stop (model year)' },
  step: { type: 'number', description: 'range step in years (> 0)' },
};

/**
 * Tool registry: name → { description, inputSchema, request(args) }.
 * `request` maps validated tool arguments onto the SAME request shape the
 * HTTP transport uses; every route template must stay reachable through
 * some tool (the conformance gate diffs both directions).
 */
const TOOLS = Object.freeze({
  essrt_versions: {
    description: 'List ESSRT model releases: model version, constants/coefficients hashes, citation DOI, validity span.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'optional release id for the pinned record' } } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: a?.id ? `/${API_VERSION}/versions/${a.id}` : `/${API_VERSION}/versions` }),
    covers: ['/v1/versions', '/v1/versions/{id}'],
  },
  essrt_epoch: {
    description: 'Deep-time epoch quantities at year(s)/JD(s): Earth Fundamental Cycle H, length of day, alpha, deltaT, sidereal-year seconds, Moon distance. Valid ±500 Myr; refused outside, never extrapolated.',
    inputSchema: { type: 'object', properties: { ...TIME_PROPS, sections: { type: 'string', description: 'comma-list of h,lod,alpha,deltaT,siderealYearSeconds,moonDistanceKm' } } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/epoch`, query: queryOf(a) }),
    covers: ['/v1/epoch'],
  },
  essrt_cardinal_points: {
    description: 'Solstice/equinox JD, right ascension and per-point year length at epoch(s). Types: SS, WS, VE, AE.',
    inputSchema: { type: 'object', properties: { ...TIME_PROPS, types: { type: 'string', description: 'comma-list of SS,WS,VE,AE' } } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/cardinal-points`, query: queryOf(a) }),
    covers: ['/v1/cardinal-points'],
  },
  essrt_earth: {
    description: 'Earth elements at epoch(s): obliquity, eccentricity, inclination, perihelion longitude, ascending node.',
    inputSchema: { type: 'object', properties: { ...TIME_PROPS } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/earth`, query: queryOf(a) }),
    covers: ['/v1/earth'],
  },
  essrt_moon: {
    description: 'Moon distance and sidereal month at epoch(s).',
    inputSchema: { type: 'object', properties: { ...TIME_PROPS } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/moon`, query: queryOf(a) }),
    covers: ['/v1/moon'],
  },
  essrt_bodies: {
    description: 'List bodies, or one body\'s structural record + elements at epoch(s). Every payload carries the accuracy statement.',
    inputSchema: { type: 'object', properties: { body: { type: 'string', description: 'mercury..neptune; omit for the list' }, year: TIME_PROPS.year, jd: TIME_PROPS.jd } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: a?.body ? `/${API_VERSION}/bodies/${a.body}` : `/${API_VERSION}/bodies`, query: queryOf(a, ['year', 'jd']) }),
    covers: ['/v1/bodies', '/v1/bodies/{body}'],
  },
  essrt_values: {
    description: 'The rendered model-values registry: key list, or one rendered value by key.',
    inputSchema: { type: 'object', properties: { key: { type: 'string', description: 'registry key; omit for the key list' } } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: a?.key ? `/${API_VERSION}/values/${a.key}` : `/${API_VERSION}/values` }),
    covers: ['/v1/values', '/v1/values/{key}'],
  },
  essrt_derivations: {
    description: 'Structural derivation for a quantity: formula, H-lattice divisor, period, doc pointer, registry key.',
    inputSchema: { type: 'object', properties: { quantity: { type: 'string', description: 'e.g. axialPrecession, inclinationPrecession, bondCycle' } }, required: ['quantity'] },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/derivations/${a.quantity}` }),
    covers: ['/v1/derivations/{quantity}'],
  },
  essrt_climate: {
    description: 'L1 orbital-forcing component (permil) at epoch(s) — the 32-component 8H lattice formula.',
    inputSchema: { type: 'object', properties: { ...TIME_PROPS } },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/climate`, query: queryOf(a) }),
    covers: ['/v1/climate'],
  },
  essrt_cross_validation: {
    description: 'Model vs a published reference curve at epoch(s). Curves: obliquity-berger1978, eccentricity-berger1978, obliquity-la2004, eccentricity-la2004, deltat-stephenson2016.',
    inputSchema: { type: 'object', properties: { curve: { type: 'string' }, ...TIME_PROPS }, required: ['curve'] },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/cross-validation/${a.curve}`, query: queryOf(a) }),
    covers: ['/v1/cross-validation/{curve}'],
  },
  essrt_eclipses: {
    description: 'Geocentric eclipse search over a window (max 500 years): type, greatest-eclipse JD (UT axis, jdTT alongside), magnitudes, Moon distance. kind: solar or lunar. Window: startYear+stopYear or startJd+stopJd. Ground tracks are a documented non-goal.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['solar', 'lunar'] }, startYear: { type: 'number' }, stopYear: { type: 'number' }, startJd: { type: 'number' }, stopJd: { type: 'number' } }, required: ['kind'] },
    request: (/** @type {any} */ a) => ({ method: 'GET', path: `/${API_VERSION}/eclipses/${a.kind}`, query: queryOf(a, ['startYear', 'stopYear', 'startJd', 'stopJd']) }),
    covers: ['/v1/eclipses/{kind}'],
  },
  essrt_counterfactual: {
    description: 'Inject overridden constants (dotted paths, max 20) and evaluate the resulting solar system at a year. Outputs carry the counterfactual\'s OWN constants hash; validation targets are refused.',
    inputSchema: { type: 'object', properties: { overrides: { type: 'object', description: '{ "<dotted.path>": number }', additionalProperties: { type: 'number' } }, year: { type: 'number', default: 2000 } }, required: ['overrides'] },
    request: (/** @type {any} */ a) => ({ method: 'POST', path: `/${API_VERSION}/counterfactual`, body: JSON.stringify({ overrides: a.overrides, year: a.year }) }),
    covers: ['/v1/counterfactual'],
  },
});

/**
 * Project tool args onto an HTTP query object (strings, defined-only).
 * @param {any} a @param {string[]} [keys] @returns {Record<string, string>}
 */
function queryOf(a, keys) {
  /** @type {Record<string, string>} */
  const q = {};
  if (!a) return q;
  const allowed = keys ?? Object.keys(a).filter((k) => k !== 'kind' && k !== 'curve' && k !== 'quantity' && k !== 'body' && k !== 'key' && k !== 'id');
  for (const k of allowed) if (a[k] !== undefined) q[k] = String(a[k]);
  return q;
}

/** Route-template coverage of the tool registry (for the conformance gate).
 * @returns {string[]} */
export function toolCoveredRoutes() {
  return Object.values(TOOLS).flatMap((t) => t.covers);
}

/** @param {string|number|null} id @param {number} code @param {string} message */
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
/** @param {string|number|null} id @param {unknown} result */
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });

/**
 * Create the MCP dispatcher: a pure function of the JSON-RPC message.
 * Notifications return null (nothing is written back).
 * @returns {{ dispatch: (message: any) => object | null, tools: typeof TOOLS }}
 */
export function createMcp() {
  const { handle } = createApi();

  /** @param {any} msg @returns {object | null} */
  const dispatch = (msg) => {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return rpcError(msg?.id ?? null, -32600, 'Invalid JSON-RPC 2.0 request.');
    }
    const { id, method, params } = msg;
    const isNotification = id === undefined;

    if (method === 'initialize') {
      return rpcResult(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: 'Deterministic queries over the ESSRT geocentric solar-system model. Every result is a provenance envelope: meta (model version, constants/coefficients hashes, timescale, input echo, citation DOI) + data. Out-of-domain epochs are refused, never extrapolated.',
      });
    }
    if (method === 'notifications/initialized') return null;
    if (method === 'ping') return rpcResult(id, {});
    if (isNotification) return null;   // unknown notifications are dropped, per spec

    if (method === 'tools/list') {
      return rpcResult(id, {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    }
    if (method === 'tools/call') {
      const name = params?.name;
      const tool = /** @type {Record<string, any>} */ (TOOLS)[name];
      if (!tool) return rpcError(id, -32602, `Unknown tool "${name}".`);
      let req;
      try { req = tool.request(params?.arguments ?? {}); } catch (e) {
        return rpcError(id, -32602, `Invalid arguments for "${name}": ${e instanceof Error ? e.message : e}`);
      }
      const res = handle(req);
      return rpcResult(id, {
        content: [{ type: 'text', text: res.body }],
        isError: res.status >= 400,
      });
    }
    return rpcError(id, -32601, `Method "${method}" not found.`);
  };

  return { dispatch, tools: TOOLS };
}

/** Route templates implemented by the HTTP handler — re-exported so the
 * conformance gate can assert tool coverage without importing app.js twice. */
export { ROUTE_TEMPLATES };
