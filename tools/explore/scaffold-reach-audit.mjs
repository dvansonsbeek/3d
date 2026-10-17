#!/usr/bin/env node
/**
 * Plan 11 step 0 — THE SCAFFOLD-REACH AUDIT.
 *
 *   node tools/explore/scaffold-reach-audit.mjs            # print the table
 *   node tools/explore/scaffold-reach-audit.mjs --write    # + data/scaffold-reach-audit.json
 *   node tools/explore/scaffold-reach-audit.mjs --leaf earth.earthtiltMean   # one leaf, verbose
 *
 * QUESTION. `public/input/model-parameters.json` is to be retired (plan 11).
 * Three fifths of its leaves are the K-device scene scaffold's recorded J2000
 * POSE; the plan's claim is that no observable rides them (the engine places
 * the Earth frame, the Sun and the Moon; the planets are the chain). A claim
 * about reach is measured, not argued: this instrument perturbs every leaf
 * ONE AT A TIME and records which measured surface moves.
 *
 * METHOD. For each leaf: a child process installs an `fs.readFileSync` hook
 * that serves a perturbed copy of model-parameters.json to
 * `tools/lib/constants.js` (so every derived constant in the Node twin —
 * `earthRAAngle`, `eccentricityBaseDerived`, `perihelionPhaseOffset`, the
 * planet geometry — recomputes from the perturbed leaf exactly as a JSON edit
 * would), then measures:
 *   - the Node scene twin: every body's RA/Dec/distance at six JDs
 *     (`computePlanetPosition`) and the Sun's WORLD angle (`getSunWorldAngle`
 *     — the world-axis reader the K wheels are known to reach);
 *   - the cardinal engine: JD / RA / year length of the four crossings;
 *   - the deep-time chain: the LOD of date at five ages;
 *   - the package model: `createModel(C′)` with the same leaf perturbed on a
 *     clone of DEFAULT_CONSTANTS — Earth's elements of date, the year and day
 *     lengths, the cardinal instant, the Moon of date, the apparent Sun, ΔT,
 *     the planets' elements, the clock.
 * The baseline is the same probe set unperturbed. Reach = the largest
 * relative change per probe family (angles wrapped to ±180°). Below 1e-11 is
 * float noise and counts as ZERO reach.
 *
 * Perturbation: ×(1 + 1e-3) for numbers (1e-3 absolute for zeros), the first
 * element for arrays, booleans flipped; strings are not perturbed (names,
 * types, mirror pairs — classification, not values).
 *
 * NOT covered here: the browser-only readers (the Framework-Verification pose
 * rows, the NASA-convention umbra diagnostic, the CSV World Angle) — the Node
 * twin's `getSunWorldAngle` is their twin; the browser build is step 0b.
 */

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SELF_REL = 'tools/explore/scaffold-reach-audit.mjs';
const SELF = join(ROOT, SELF_REL);
const MP_REL = 'public/input/model-parameters.json';
const MP_PATH = join(ROOT, MP_REL);
const OUT_REL = 'data/scaffold-reach-audit.json';
const REL_PERTURB = 1e-3;
const NOISE = 1e-11;

const JDS = [1608421.835171, 1671853.759762, 2451545.0, 2460310.5, 2451545.0 - 100000 * 365.25, 2451545.0 + 100000 * 365.25];
const YEARS = [-100000, -2000, 2000, 12000];
// The Node scene twin builds the Sun, the Moon and the seven chain planets; the
// four no-chain bodies (Pluto, Halley, Eros, Ceres) exist only in the browser
// scene — their scene reach is step 0b's; the package tier below carries them.
const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
// The package model's planet surface is the seven chain planets too: the four
// no-chain bodies are rendered ONLY by the browser scene (step 0b).
const PKG_BODIES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
// Deep ages: the recession regime acts beyond jointMa = 1000 Ma and the cubic/
// quartic α terms only grow at hundreds of Ma — a shallow probe set would read
// them as zero reach (measured on the first run: 0…2.5 Ma saw nothing).
const AGES_MA = [0, 0.001, 0.38, 1, 2.5, 100, 380, 1000, 2000, 3900];
// The ΔT stack's taper acts beyond ±300 kyr; the package ΔT probe reaches past it.
const DEEP_YEARS = [-3000000, -1000000, -350000, 350000, 1000000];

// ─── leaves ──────────────────────────────────────────────────────────────────
function leaves(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) out.push(...leaves(v, p));
    else if (typeof v === 'string') continue;
    else out.push({ path: p, value: v });
  }
  return out;
}
function perturbAt(obj, path) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k];
  const k = keys[keys.length - 1];
  const v = o[k];
  if (typeof v === 'number') o[k] = v === 0 ? REL_PERTURB : v * (1 + REL_PERTURB);
  else if (typeof v === 'boolean') o[k] = !v;
  else if (Array.isArray(v) && typeof v[0] === 'number') o[k] = [v[0] * (1 + REL_PERTURB), ...v.slice(1)];
  return o[k];
}

// ─── the child: one measurement under one perturbation ───────────────────────
async function childMain(leafPath) {
  const require = createRequire(join(ROOT, 'package.json'));
  const fs = require('fs');
  const mp = JSON.parse(readFileSync(MP_PATH, 'utf8'));
  if (leafPath) perturbAt(mp, leafPath);
  const text = JSON.stringify(mp);
  const orig = fs.readFileSync;
  fs.readFileSync = function (p, ...a) {
    if (typeof p === 'string' && p.replace(/\\/g, '/').endsWith(MP_REL)) return text;
    return orig.call(this, p, ...a);
  };
  const out = {};
  const put = (k, f) => { try { const v = f(); out[k] = typeof v === 'number' ? v : (v === undefined ? null : v); } catch (e) { out[k] = `ERR:${(e && e.message || e).toString().slice(0, 60)}`; } };

  // Node twin
  const C = require(join(ROOT, 'tools/lib/constants.js'));
  for (const k of ['earthRAAngle', 'earthInvPlaneInclinationMean', 'eccentricityBaseDerived', 'perihelionPhaseOffset', 'startModelYearWithCorrection', 'meanSolarYearDays', 'balancedJD'])
    put(`constants.${k}`, () => C[k]);
  const SG = require(join(ROOT, 'tools/lib/scene-graph.js'));
  for (const jd of JDS) {
    for (const b of BODIES) {
      put(`scene.${b}.ra@${jd}`, () => SG.computePlanetPosition(b, jd).ra);
      put(`scene.${b}.dec@${jd}`, () => SG.computePlanetPosition(b, jd).dec);
      put(`scene.${b}.distAU@${jd}`, () => SG.computePlanetPosition(b, jd).distAU);
    }
    put(`worldAxis.sunWorldAngle@${jd}`, () => SG.getSunWorldAngle(jd));
  }
  const OE = require(join(ROOT, 'tools/lib/orbital-engine.js'));
  for (const y of YEARS) for (const t of ['SS', 'WS', 'VE', 'AE']) {
    put(`cardinal.jd.${t}@${y}`, () => OE.computeSolsticeJD(y, t));
    put(`cardinal.ra.${t}@${y}`, () => OE.computeSolsticeRA(y, t));
    put(`cardinal.yearLen.${t}@${y}`, () => OE.computeSolsticeYearLength(y, t));
  }
  const DT = require(join(ROOT, 'tools/lib/deep-time.js'));
  for (const t of AGES_MA) {
    put(`deeptime.lodSeconds@${t}Ma`, () => DT.meanLodSecondsAtAge(t));
    put(`deeptime.moonDistanceKm@${t}Ma`, () => DT.meanMoonDistanceCorrectedAtAge(t));
  }

  // Package tier — the same leaf perturbed on DEFAULT_CONSTANTS
  const P = await import(join(ROOT, 'packages/physics/src/index.js'));
  const Cp = structuredClone(P.DEFAULT_CONSTANTS);
  if (leafPath) { try { perturbAt(Cp, leafPath); } catch { /* a leaf the package does not embed */ } }
  const m = P.createModel(Cp);
  for (const y of YEARS) {
    put(`pkg.earth.peri@${y}`, () => m.earth.perihelionLongitudeDeg(y));
    put(`pkg.earth.obl@${y}`, () => m.earth.obliquityDeg(y));
    put(`pkg.earth.e@${y}`, () => m.earth.eccentricity(y));
    put(`pkg.earth.incl@${y}`, () => m.earth.inclinationDeg(y));
    put(`pkg.lengths.trop@${y}`, () => m.lengths.tropicalYearDays(y));
    put(`pkg.lengths.anom@${y}`, () => m.lengths.anomalisticYearDays(y));
    put(`pkg.lengths.lodReal@${y}`, () => m.lengths.lodRealSeconds(y));
    put(`pkg.lengths.stellar@${y}`, () => m.lengths.stellarDaySeconds(y));
    put(`pkg.cardinal.SS@${y}`, () => m.cardinal.jd(y, 'SS'));
    put(`pkg.deltaT@${y}`, () => m.epoch.deltaTSecondsAtYear(y));
    put(`pkg.clock.Tp@${y}`, () => m.lunisolar.meanPeriodYearsAtYear(y));
    put(`pkg.moon.distKm@${y}`, () => m.moon.distanceKmAtYear(y));
    for (const b of PKG_BODIES) {
      put(`pkg.planets.${b}.peri@${y}`, () => m.planets.perihelionLongitudeDeg(b, y));
      put(`pkg.planets.${b}.e@${y}`, () => m.planets.eccentricity(b, y));
      put(`pkg.planets.${b}.incl@${y}`, () => m.planets.invPlaneInclinationDeg(b, y));
    }
  }
  for (const y of DEEP_YEARS) {
    put(`pkg.deltaT@${y}`, () => m.epoch.deltaTSecondsAtYear(y));
    put(`pkg.moon.distKm@${y}`, () => m.moon.distanceKmAtYear(y));
    put(`pkg.lengths.lodReal@${y}`, () => m.lengths.lodRealSeconds(y));
    put(`pkg.clock.Tp@${y}`, () => m.lunisolar.meanPeriodYearsAtYear(y));
  }
  for (const jd of JDS) {
    put(`pkg.moon.lon@${jd}`, () => m.moon.lonDegAtJD(jd));
    put(`pkg.moon.beta@${jd}`, () => m.moon.betaDegAtJD(jd));
    put(`pkg.sun.apparentLon@${jd}`, () => m.eclipse.sunApparentLonDegAtJD(jd));
  }
  process.stdout.write(JSON.stringify(out));
}

// ─── the parent: baseline, every leaf, the table ─────────────────────────────
function runChild(leafPath) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, SCAFFOLD_REACH_CHILD: '1', SCAFFOLD_REACH_LEAF: leafPath || '' };
    const ch = spawn(process.execPath, [SELF], { env, cwd: ROOT });
    let out = ''; let err = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('close', (code) => {
      if (code !== 0) return reject(new Error(`leaf ${leafPath || 'BASELINE'} exit ${code}: ${err.slice(-400)}`));
      try { resolve(JSON.parse(out)); } catch (e) { reject(new Error(`leaf ${leafPath}: bad JSON (${e.message}); stderr ${err.slice(-200)}`)); }
    });
  });
}
const isAngle = (k) => /\.ra@|\.dec@|\.peri@|\.obl@|\.incl@|\.lon@|\.beta@|apparentLon|sunWorldAngle|cardinal\.ra/.test(k);
function relDiff(k, a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return (a === b ? 0 : Infinity);
  let d = b - a;
  if (isAngle(k)) { d = ((d % 360) + 540) % 360 - 180; return Math.abs(d) / 360; }
  return Math.abs(d) / Math.max(Math.abs(a), 1e-30);
}
const familyOf = (k) => k.startsWith('scene.') ? `scene.${k.split('.')[1]}` : k.split(/[.@]/)[0] === 'pkg' ? `pkg.${k.split('.')[1]}` : k.split(/[.@]/)[0];

async function pool(items, n, fn) {
  const results = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const j = i++; results[j] = await fn(items[j], j); } }));
  return results;
}

async function parentMain() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const only = args.includes('--leaf') ? args[args.indexOf('--leaf') + 1] : null;
  const mp = JSON.parse(readFileSync(MP_PATH, 'utf8'));
  const all = leaves(mp).filter((l) => !only || l.path === only);
  console.log(`scaffold-reach audit — ${all.length} leaves · perturbation ×(1+${REL_PERTURB}) · noise floor ${NOISE}`);
  const t0 = Date.now();
  const base = await runChild(null);
  const probeKeys = Object.keys(base);
  const errs = probeKeys.filter((k) => typeof base[k] === 'string' && base[k].startsWith('ERR'));
  console.log(`baseline: ${probeKeys.length} probes (${errs.length} erroring: ${errs.slice(0, 4).join(', ')}${errs.length > 4 ? ', …' : ''}) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const rows = await pool(all, 4, async (leaf, i) => {
    const r = await runChild(leaf.path);
    const reach = {}; const top = [];
    for (const k of probeKeys) {
      if (errs.includes(k)) continue;
      const d = relDiff(k, base[k], r[k]);
      const f = familyOf(k);
      if (!(f in reach) || d > reach[f]) reach[f] = d;
      if (d > NOISE) top.push([k, d]);
    }
    top.sort((a, b) => b[1] - a[1]);
    const families = Object.entries(reach).filter(([, d]) => d > NOISE).map(([f]) => f);
    process.stderr.write(`  [${String(i + 1).padStart(3)}/${all.length}] ${leaf.path.padEnd(52)} ${families.length ? families.join(' ') : 'ZERO reach'}\n`);
    return { path: leaf.path, value: leaf.value, reachByFamily: reach, families, top: top.slice(0, 6).map(([k, d]) => ({ probe: k, rel: d })) };
  });
  // table
  console.log('\nleaf                                                 | reach (families whose probes moved > noise)');
  console.log('-----------------------------------------------------|------------------------------------------');
  for (const r of rows) console.log(`${r.path.padEnd(53)}| ${r.families.length ? r.families.join(' · ') : 'ZERO'}`);
  const zero = rows.filter((r) => !r.families.length).map((r) => r.path);
  const worldOnly = rows.filter((r) => r.families.length && r.families.every((f) => f === 'worldAxis' || f === 'constants')).map((r) => r.path);
  console.log(`\nZERO reach (${zero.length}): ${zero.join(', ')}`);
  console.log(`world-axis / derived-constant reach only (${worldOnly.length}): ${worldOnly.join(', ')}`);
  console.log(`elapsed ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  if (write) {
    const require = createRequire(join(ROOT, 'package.json'));
    const { buildInputsBlock } = require(join(ROOT, 'tools/lib/artifact-inputs.js'));
    const doc = {
      _description: 'Plan 11 step 0 — the scaffold-reach audit: every leaf of public/input/model-parameters.json perturbed one at a time (×(1+1e-3); booleans flipped; strings not perturbed) in a child process that serves the perturbed JSON to tools/lib/constants.js and the same leaf to a clone of DEFAULT_CONSTANTS, measuring the Node scene twin (RA/Dec/distance of 13 bodies at 6 JDs, the Sun world angle), the cardinal engine, the deep-time LOD and the package model (createModel: Earth elements, lengths, cardinal, Moon, apparent Sun, ΔT, planets, the clock). reachByFamily = the largest relative change per probe family (angles wrapped, /360); below 1e-11 is float noise = zero reach. GENERATED by node tools/explore/scaffold-reach-audit.mjs --write.',
      perturbationRel: REL_PERTURB, noiseFloor: NOISE, probes: probeKeys.length, erroringProbes: errs,
      jds: JDS, years: YEARS, bodies: BODIES,
      summary: { zeroReach: zero, worldAxisOrDerivedOnly: worldOnly, leaves: rows.length },
      leaves: rows,
      inputs: buildInputsBlock(`node ${SELF_REL} --write`, [SELF_REL, MP_REL, 'tools/lib/constants.js', 'tools/lib/scene-graph.js', 'tools/lib/orbital-engine.js', 'tools/lib/deep-time.js', 'packages/physics/src/model.js']),
    };
    writeFileSync(join(ROOT, OUT_REL), JSON.stringify(doc, null, 2) + '\n');
    console.log(`✓ wrote ${OUT_REL}`);
  }
}

if (process.env.SCAFFOLD_REACH_CHILD === '1') {
  childMain(process.env.SCAFFOLD_REACH_LEAF || null).catch((e) => { process.stderr.write(String(e && e.stack || e)); process.exit(1); });
} else {
  parentMain().catch((e) => { console.error(e); process.exit(1); });
}
