/**
 * MCP GATES (Phase 16) — the acceptance criterion is "an agent answers the
 * §7 queries end-to-end", so the suite drives the dispatcher exactly like
 * an MCP client: initialize handshake, tools/list discovery, tools/call for
 * each query class, and the failure modes an agent will hit.
 *
 * The dispatcher is pure (no sockets, no stdio), so every gate is a direct
 * function of the JSON-RPC message — the same determinism contract as the
 * HTTP gates.
 *
 *   node packages/api/test/mcp-gates.test.mjs   (exit 1 on fail)
 */
import { createMcp, toolCoveredRoutes, ROUTE_TEMPLATES, MCP_PROTOCOL_VERSION } from '../src/mcp.js';
import { envelopeDefects } from '../src/envelope.js';

const { dispatch } = createMcp();
/** @type {string[]} */
const failures = [];
let nextId = 0;
/** @param {string} method @param {object} [params] @returns {any} */
const call = (method, params) => dispatch({ jsonrpc: '2.0', id: ++nextId, method, params });
/** @param {string} name @param {object} [args] @returns {{res: any, doc: any}} */
const toolCall = (name, args) => {
  const res = call('tools/call', { name, arguments: args });
  let doc = null;
  try { doc = JSON.parse(res?.result?.content?.[0]?.text ?? ''); } catch { /* checked below */ }
  return { res, doc };
};

// ── Handshake ───────────────────────────────────────────────────────────────
{
  const init = call('initialize', { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'gate', version: '0' } });
  if (init?.result?.protocolVersion !== MCP_PROTOCOL_VERSION) failures.push(`initialize protocolVersion: ${init?.result?.protocolVersion}`);
  if (!init?.result?.capabilities?.tools) failures.push('initialize: no tools capability');
  if (!init?.result?.serverInfo?.name) failures.push('initialize: no serverInfo');
  if (dispatch({ jsonrpc: '2.0', method: 'notifications/initialized' }) !== null) failures.push('initialized notification must produce no response');
  const ping = call('ping');
  if (!ping?.result || Object.keys(ping.result).length !== 0) failures.push('ping must return an empty result');
}

// ── Conformance: every HTTP route reachable through a tool, both directions ──
{
  const covered = toolCoveredRoutes();
  for (const r of ROUTE_TEMPLATES) if (!covered.includes(r)) failures.push(`route ${r} not covered by any MCP tool`);
  for (const c of covered) if (!ROUTE_TEMPLATES.includes(c)) failures.push(`tool covers unknown route ${c}`);
  const list = call('tools/list');
  const tools = list?.result?.tools ?? [];
  if (tools.length === 0) failures.push('tools/list returned no tools');
  for (const t of tools) {
    if (!t.name || !t.description || t.inputSchema?.type !== 'object') failures.push(`tool ${t.name}: incomplete definition`);
  }
}

// ── The §7 queries end-to-end (each result a full provenance envelope) ──────
{
  /** @type {Array<[string, object|undefined, (data: any) => string|null]>} */
  const QUERIES = [
    ['essrt_versions', undefined, (d) => (d.current ? null : 'no current version')],
    ['essrt_epoch', { year: -379998000 }, (d) => (Math.round(d.epochs[0].h) === 306189 ? null : `Devonian H: ${d.epochs[0].h}`)],
    ['essrt_epoch', { jd: 2451545 }, (d) => (Math.abs(d.epochs[0].h - 335317) < 1e-3 ? null : `H via jd: ${d.epochs[0].h}`)],
    ['essrt_cardinal_points', { year: 2000, types: 'SS' }, (d) => (Math.abs(d.years[0].points.SS.jd - 2451716.575) < 0.1 ? null : `SS JD: ${d.years[0].points.SS.jd}`)],
    ['essrt_earth', { year: 2000 }, (d) => (Math.abs(d.years[0].obliquityDeg - 23.4393) < 0.0002 ? null : `obliquity: ${d.years[0].obliquityDeg}`)],
    ['essrt_moon', { year: 2000 }, (d) => (Math.abs(d.years[0].distanceKm - 384400) < 1000 ? null : `moon distance: ${d.years[0].distanceKm}`)],
    ['essrt_bodies', { body: 'mercury' }, (d) => (Math.round(d.record.perihelionEclipticYears) === 243867 ? null : `mercury: ${d.record.perihelionEclipticYears}`)],
    ['essrt_values', { key: 'usnoLodJ2000' }, (d) => (d.value === '86,400.0018' ? null : `usnoLodJ2000: ${d.value}`)],   // ecc-unification 7c re-close
    ['essrt_derivations', { quantity: 'axialPrecession' }, (d) => (d.latticeDivisor === 13 ? null : `divisor: ${d.latticeDivisor}`)],
    ['essrt_climate', { year: 2000 }, (d) => (typeof d.years[0].l1OrbitalPermil === 'number' ? null : 'no L1 value')],
    ['essrt_cross_validation', { curve: 'obliquity-berger1978', year: 2000 }, (d) => (Math.abs(d.years[0].model - d.years[0].published) < 0.05 ? null : `Berger delta: ${d.years[0].delta}`)],
    ['essrt_eclipses', { kind: 'solar', startYear: 2024, stopYear: 2025 }, (d) => (d.count === 2 && d.events[0].type === 'Total' && Math.abs(d.events[0].jd - 2460409.263) < 0.01 ? null : `2024 solar: ${JSON.stringify(d.events?.map((/** @type {any} */ e) => e.type))}`)],
    ['essrt_counterfactual', { overrides: { 'foundational.holisticyearLength': 400000 }, year: 2000 }, (d) => (Math.abs(d.epoch.h - 400000) < 1e-6 ? null : `cf H: ${d.epoch.h}`)],
  ];
  for (const [name, args, verify] of QUERIES) {
    const { res, doc } = toolCall(name, args);
    if (!doc) { failures.push(`${name}: no parseable envelope (${JSON.stringify(res).slice(0, 120)})`); continue; }
    if (res.result.isError) { failures.push(`${name}: isError (${doc.detail ?? doc.title})`); continue; }
    for (const d of envelopeDefects(doc.meta)) failures.push(`${name}: meta missing "${d}"`);
    const verdict = verify(doc.data);
    if (verdict) failures.push(`${name}: ${verdict}`);
  }
  // Counterfactual identity: its envelope must carry its OWN constants hash.
  const base = toolCall('essrt_versions').doc.meta.constantsHash;
  const cf = toolCall('essrt_counterfactual', { overrides: { 'foundational.holisticyearLength': 400000 } }).doc;
  if (cf.meta.constantsHash === base) failures.push('counterfactual via MCP served the DEFAULT hash');
}

// ── Failure modes an agent will hit ─────────────────────────────────────────
{
  const unknownTool = call('tools/call', { name: 'essrt_nope' });
  if (unknownTool?.error?.code !== -32602) failures.push(`unknown tool: ${JSON.stringify(unknownTool?.error)}`);
  const unknownMethod = call('resources/list');
  if (unknownMethod?.error?.code !== -32601) failures.push(`unknown method: ${JSON.stringify(unknownMethod?.error)}`);
  const invalid = /** @type {any} */ (dispatch({ id: 1, method: 'tools/list' }));   // missing jsonrpc
  if (invalid?.error?.code !== -32600) failures.push('invalid request not -32600');
  // A refused query surfaces the RFC 9457 problem with isError, not a crash.
  const ood = toolCall('essrt_epoch', { year: 600000000 });
  if (!ood.res.result.isError || ood.doc.status !== 422) failures.push(`out-of-domain via MCP: ${JSON.stringify(ood.doc).slice(0, 100)}`);
  const badWindow = toolCall('essrt_eclipses', { kind: 'solar' });
  if (!badWindow.res.result.isError || badWindow.doc.status !== 400) failures.push('eclipses without window not a 400 problem');
}

// ── Determinism: same tool call twice ⇒ byte-identical envelope ─────────────
{
  const a = toolCall('essrt_epoch', { year: 2000 }).res.result.content[0].text;
  const b = toolCall('essrt_epoch', { year: 2000 }).res.result.content[0].text;
  if (a !== b) failures.push('MCP tool call nondeterministic');
}

if (failures.length) {
  console.error(`mcp gates — ${failures.length} FAILURE(S):`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log('mcp gates — handshake + route/tool conformance (both directions) + 13 §7 queries end-to-end (envelope-verified) + counterfactual own-hash + error mapping + determinism: PASS');
