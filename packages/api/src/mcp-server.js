/**
 * MCP stdio transport (Phase 16) — the only file that touches stdin/stdout.
 *
 * Newline-delimited JSON-RPC 2.0 per the MCP stdio transport: one message
 * per line in, one response per line out; notifications produce no output.
 * All protocol logic lives in the pure dispatcher (mcp.js); logging goes to
 * stderr so stdout stays a clean protocol channel.
 *
 *   node packages/api/src/mcp-server.js
 *
 * Register in an MCP client as a stdio server with that command (the repo
 * ships .mcp.json for Claude Code).
 */
import process from 'node:process';
import { createInterface } from 'node:readline';
import { createMcp, MCP_PROTOCOL_VERSION } from './mcp.js';

export function startMcpServer() {
  const { dispatch } = createMcp();
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on('line', (line) => {
    const text = line.trim();
    if (!text) return;
    /** @type {any} */
    let msg;
    try { msg = JSON.parse(text); } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } }) + '\n');
      return;
    }
    const res = dispatch(msg);
    if (res !== null) process.stdout.write(JSON.stringify(res) + '\n');
  });
  process.stderr.write(`essrt-model MCP server (protocol ${MCP_PROTOCOL_VERSION}) on stdio\n`);
  return rl;
}

startMcpServer();
