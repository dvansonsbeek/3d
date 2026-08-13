/**
 * Thin node:http wrapper around the pure handler — the only file that touches
 * the network. Build-only in Phase 15; hosting, auth and rate limiting are a
 * later decision (rate limiting at the adapter, never in physics — §8).
 *
 *   node packages/api/src/server.js [port]
 */
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { createApi } from './app.js';

/**
 * @param {number} [port]
 * @returns {import('node:http').Server}
 */
export function startServer(port = 8787) {
  const { handle } = createApi();
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    /** @type {Buffer[]} */
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const out = handle({
        method: req.method ?? 'GET',
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined,
      });
      res.writeHead(out.status, out.headers);
      res.end(out.body);
    });
  });
  server.listen(port);
  return server;
}
