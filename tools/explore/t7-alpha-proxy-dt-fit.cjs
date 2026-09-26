#!/usr/bin/env node
/**
 * T7 / WP2 — the ΔT joint fitter (report mode) with α(t) on three ice-history proxies
 * (holisticuniverse plan 06 §9 item 12; tables from tools/explore/t7-alpha-proxy-tables.py).
 *
 *     node tools/explore/t7-alpha-proxy-dt-fit.cjs            run the three fits, print the comparison
 *     node tools/explore/t7-alpha-proxy-dt-fit.cjs --write    also write data/t7-alpha-proxy-dt-fit.json
 *
 * THE D7 RUNNER PATTERN — in-process override, report mode only, nothing shipped: for each proxy a child
 * process replaces the α channel factory (@essrt/physics/climate/l1-orbital createAlphaGiaChannel) in
 * require.cache BEFORE tools/lib/deep-time.js loads, with an alphaAt that reads the table (linear, 10-yr
 * grid; α₀ beyond 300 kyr), then runs packages/fitting/src/dt-corrections-fit.cjs with --joint and
 * DT_CORRECTIONS_DISABLED=1 (never --write). The 'shipped' table is the hook's parity check against the
 * unpatched fitter (the same run without the override). Scored on the fitter's own BEST row: Espenak RMS
 * (the 1650–2010 canon), full RMS (Stephenson −720..2017), deltaTStart, USNO anchor, amplitudes.
 * DECISION RULE (pre-registered in plan 06 §9 item 12): adopt the proxy with the best eclipse-era ΔT after
 * refit; on a tie keep the shipped one.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const TABLES_REL = 'data/t7-alpha-proxy-tables.json';
const OUT_REL = 'data/t7-alpha-proxy-dt-fit.json';
const SELF_REL = 'tools/explore/t7-alpha-proxy-dt-fit.cjs';
const INPUTS = [TABLES_REL, 'packages/fitting/src/dt-corrections-fit.cjs', 'tools/lib/deep-time.js',
  'packages/physics/src/climate/l1-orbital.cjs', 'public/input/climate-formula-coefficients.json', SELF_REL];

// ── child mode: patch the α channel, run the fitter ────────────────────────
if (process.env.T7_ALPHA_PROXY) {
  const tables = JSON.parse(fs.readFileSync(path.join(ROOT, TABLES_REL), 'utf8'));
  const T = tables.tables[process.env.T7_ALPHA_PROXY];
  const alpha0 = tables.config.alpha0;
  const tk = T.t_kyr_bp, al = T.alpha, step = tk[1] - tk[0];
  const alphaAt = (year) => {
    const t = (2000 - year) / 1000;
    if (t <= tk[0]) return al[0];
    if (t >= tk[tk.length - 1]) return alpha0;
    const i = Math.min(tk.length - 2, Math.floor((t - tk[0]) / step)), f = (t - tk[i]) / step;
    return al[i] + (al[i + 1] - al[i]) * f;
  };
  const modPath = require.resolve('@essrt/physics/climate/l1-orbital', { paths: [path.join(ROOT, 'tools', 'lib')] });
  const real = require(modPath);
  require.cache[modPath].exports = { ...real, createAlphaGiaChannel: (cfg) => ({ ...real.createAlphaGiaChannel(cfg), alphaAt, kPerPermille: T.k }) };
  process.env.DT_CORRECTIONS_DISABLED = '1';
  process.argv = [process.argv[0], path.join(ROOT, 'tools/fit/dt-corrections-fit.js'), '--joint'];
  require(path.join(ROOT, 'packages/fitting/src/dt-corrections-fit.cjs'));
} else {
  // ── parent mode: the unpatched baseline + the three proxies ──────────────
  const parse = (out) => {
    const best = /BEST: USNO ([\d.]+)\s+deltaTStart ([-\d.]+) s\s+Espenak RMS ([\d.]+) s\s+full ([\d.]+) s/.exec(out);
    if (!best) throw new Error('BEST row not found in fitter output');
    const amps = {};
    for (const m of out.matchAll(/^\s{4}(\w+)\s+([-\d.]+) s(?:\s+\((cap [\d.]+)(?: — AT CAP)?\)|\s+\(free\)|.*)$/gm)) amps[m[1]] = Number(m[2]);
    return { usno: Number(best[1]), deltaTStart: Number(best[2]), espenakRmsS: Number(best[3]), fullRmsS: Number(best[4]), amplitudesS: amps };
  };
  const run = (proxy) => {
    const env = { ...process.env, DT_CORRECTIONS_DISABLED: '1' };
    if (proxy) env.T7_ALPHA_PROXY = proxy;
    const args = proxy ? [__filename] : [path.join(ROOT, 'tools/fit/dt-corrections-fit.js'), '--joint'];
    const r = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`fitter exited ${r.status} for ${proxy || 'baseline'}:\n${(r.stderr || '').slice(-2000)}`);
    return parse(r.stdout);
  };
  const t0 = Date.now();
  const results = { baseline_unpatched: run(null) };
  for (const p of ['shipped', 'fixed', 'lr04']) results[p] = run(p);
  const b = results.baseline_unpatched;
  const verdict = {
    hook_parity_shipped_minus_baseline_s: { espenak: results.shipped.espenakRmsS - b.espenakRmsS, full: results.shipped.fullRmsS - b.fullRmsS },
    fixed_minus_shipped_s: { espenak: results.fixed.espenakRmsS - results.shipped.espenakRmsS, full: results.fixed.fullRmsS - results.shipped.fullRmsS },
    lr04_minus_shipped_s: { espenak: results.lr04.espenakRmsS - results.shipped.espenakRmsS, full: results.lr04.fullRmsS - results.shipped.fullRmsS },
    best_proxy_by_espenak_rms: ['shipped', 'fixed', 'lr04'].reduce((a, p) => (results[p].espenakRmsS < results[a].espenakRmsS ? p : a), 'shipped'),
    best_proxy_by_full_rms: ['shipped', 'fixed', 'lr04'].reduce((a, p) => (results[p].fullRmsS < results[a].fullRmsS ? p : a), 'shipped'),
  };
  verdict.decision = (verdict.best_proxy_by_espenak_rms === 'shipped' && verdict.best_proxy_by_full_rms === 'shipped')
    ? 'KEEP the shipped L1 as the α(t) ice-history proxy (pre-registered rule: best eclipse-era ΔT after refit wins; tie → shipped)'
    : `the ${verdict.best_proxy_by_espenak_rms} / ${verdict.best_proxy_by_full_rms} proxy scores better — an owner decision`;
  console.log('T7 / WP2 — α(t) ice-history proxies through the ΔT joint fitter (report mode)');
  console.log(`  ${'proxy'.padEnd(20)} ${'USNO'.padStart(11)} ${'dTStart'.padStart(8)} ${'Espenak'.padStart(8)} ${'full'.padStart(7)}   bond  kick1`);
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${k.padEnd(20)} ${v.usno.toFixed(4).padStart(11)} ${v.deltaTStart.toFixed(2).padStart(8)} ${v.espenakRmsS.toFixed(2).padStart(8)} ${v.fullRmsS.toFixed(2).padStart(7)} ${String(v.amplitudesS.bond ?? '').padStart(6)} ${String(v.amplitudesS.res_kick1 ?? '').padStart(6)}`);
  }
  console.log(`  hook parity (shipped − baseline): Espenak ${verdict.hook_parity_shipped_minus_baseline_s.espenak.toFixed(2)} s · full ${verdict.hook_parity_shipped_minus_baseline_s.full.toFixed(2)} s`);
  console.log(`  ${verdict.decision}`);
  if (process.argv.includes('--write')) {
    const sha = (rel) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
    const out = {
      _description: 'T7 / WP2 — the ΔT joint fitter (report mode, never --write) with α(t) on three ice-history proxies: the shipped post-MPT L1 (hook parity), the T7 fixed-phase forcing, the LR04 record itself. Regenerate: python3 tools/explore/t7-alpha-proxy-tables.py --write && node tools/explore/t7-alpha-proxy-dt-fit.cjs --write',
      results, verdict,
      meta: { generated_by: SELF_REL, command: `node ${SELF_REL} --write`, runtime_sec: (Date.now() - t0) / 1000, node: process.version,
        inputs: INPUTS.map((rel) => ({ path: rel, sha256: sha(rel) })) },
    };
    fs.writeFileSync(path.join(ROOT, OUT_REL), JSON.stringify(out, null, 1) + '\n');
    console.log(`wrote ${OUT_REL}`);
  }
}
