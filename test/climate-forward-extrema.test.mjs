// The forward figure's markers have ONE home (packages/physics/src/climate/forward-extrema.cjs; doc 111 §1.52):
// the list the simulator's future tab draws, the model-values registry publishes and the prose cites. This gate
// reads that list on the shipped coefficients and holds it to its own rule — every marker inside the forward half
// and outside the edge margin, on the grid, honouring its threshold, sorted — and shows the margin is real: the
// curve's own window minimum lies inside it and is unmarked (the rule's documented blind spot, published as a key).
// It then reads the registry's generated package against the module, so a rule edit that moves the list without
// `values:package:write` fails here by name.
//
// Plant: ESSRT_CLIMATE_FORWARD_PLANT=1 evaluates the list under a lowered glacial threshold (4.5 → 4.0 ‰) — the
// registry comparison then FAILS (the gate is shown to see a rule change).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CLIMATE_FORWARD_MARKER_RULE: RULE, computeClimateForwardExtrema, evalClimateFormulaProxyUnits } = require('../packages/physics/src/climate/forward-extrema.cjs');
const coeffs = JSON.parse(readFileSync(path.join(ROOT, 'public/input/climate-formula-coefficients.json'), 'utf8'));
const { CLIMATE_FORMULA_COEFFS: EMBED } = (await import('../packages/physics/src/constants/coefficients.js')).FITTED_COEFFICIENTS;

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failed++; };

const plant = process.env.ESSRT_CLIMATE_FORWARD_PLANT === '1';
const rule = plant ? { ...RULE, glacialMinPermil: 4.0 } : RULE;
const fwd = computeClimateForwardExtrema(coeffs, rule);
const [tLo, tHi] = RULE.windowKyrBP;

check('the embed carries the JSON\'s regimes (the browser and this gate read one set; the embed strips only the stamp)', JSON.stringify(EMBED.regimes) === JSON.stringify(coeffs.regimes));
check('the rule is the figure\'s: post-MPT regime, ±250 kyr in 1,000 samples, ±32 samples, 0.3 ‰, 4.5 / 3.7 ‰',
  RULE.regimeKey === 'lr04-post-mpt' && tLo === -250 && tHi === 250 && RULE.samples === 1000 && RULE.halfWidthSamples === 32 && RULE.prominencePermil === 0.3 && RULE.glacialMinPermil === 4.5 && RULE.interglacialMaxPermil === 3.7);
check('the grid is the window over its samples, the edge margin the half width on it', fwd.gridKyr === (tHi - tLo) / RULE.samples && fwd.edgeMarginKyr === RULE.halfWidthSamples * fwd.gridKyr, `${fwd.gridKyr} kyr, ${fwd.edgeMarginKyr} kyr`);
check('the figure marks at least one glacial and one interglacial', fwd.glacials.length >= 1 && fwd.interglacials.length >= 1, `${fwd.glacials.length} / ${fwd.interglacials.length}`);

const inWindow = (m) => m.kyrFromNow > 0 && m.kyrFromNow <= -tLo;
const onGrid = (m) => Math.abs(m.kyrFromNow / fwd.gridKyr - Math.round(m.kyrFromNow / fwd.gridKyr)) < 1e-9;
const outsideMargin = (m) => m.kyrFromNow >= fwd.edgeMarginKyr && m.kyrFromNow <= -tLo - fwd.edgeMarginKyr;
const sorted = (ms) => ms.every((m, i) => i === 0 || m.kyrFromNow > ms[i - 1].kyrFromNow);
const all = [...fwd.glacials, ...fwd.interglacials];
check('every marker lies in the forward half of the window', all.every(inWindow));
check('every marker sits on the grid', all.every(onGrid));
check('every marker keeps the edge margin on both sides', all.every(outsideMargin));
check('both lists are sorted by time from now', sorted(fwd.glacials) && sorted(fwd.interglacials));
check('every glacial marker meets its threshold', fwd.glacials.every((m) => m.permil >= rule.glacialMinPermil));
check('every interglacial marker meets its threshold', fwd.interglacials.every((m) => m.permil <= rule.interglacialMaxPermil));
check('a marker\'s δ¹⁸O is the formula\'s value there', all.every((m) => m.permil === evalClimateFormulaProxyUnits(coeffs, -m.kyrFromNow, RULE.regimeKey, 'all')));
check('a glacial marker is a local maximum of the curve over its half width', fwd.glacials.every((m) => {
  for (let j = 1; j <= RULE.halfWidthSamples; j++) { const d = j * fwd.gridKyr; if (evalClimateFormulaProxyUnits(coeffs, -m.kyrFromNow - d, RULE.regimeKey, 'all') >= m.permil || evalClimateFormulaProxyUnits(coeffs, -m.kyrFromNow + d, RULE.regimeKey, 'all') >= m.permil) return false; }
  return true;
}));
check('the curve\'s own forward minimum is inside the edge margin and therefore unmarked (the documented blind spot)',
  !outsideMargin(fwd.curveMinimum) && !fwd.interglacials.some((m) => m.kyrFromNow === fwd.curveMinimum.kyrFromNow),
  `${fwd.curveMinimum.kyrFromNow} kyr, ${fwd.curveMinimum.permil.toFixed(2)} ‰`);
check('the curve\'s forward maximum is a marked glacial (the strongest one)', fwd.glacials.some((m) => m.kyrFromNow === fwd.curveMaximum.kyrFromNow && m.permil === fwd.curveMaximum.permil));

// The registry's generated package carries this list (values:package:write) — the prose's supply.
const gen = JSON.parse(readFileSync(path.join(ROOT, 'packages/model-values/src/model-values.generated.json'), 'utf8'));
const V = gen.values || gen;
const kyr = (v) => String(Math.round(v));
const list = (ms) => { const s = ms.map((m) => kyr(m.kyrFromNow)); return s.length > 1 ? s.slice(0, -1).join(', ') + ' and ' + s[s.length - 1] : (s[0] || '—'); };
check('the registry publishes the glacial list the module computes', V.climateForwardGlacialKyrList === list(fwd.glacials), `${V.climateForwardGlacialKyrList} vs ${list(fwd.glacials)}`);
check('the registry publishes the interglacial list the module computes', V.climateForwardInterglacialKyrList === list(fwd.interglacials), `${V.climateForwardInterglacialKyrList} vs ${list(fwd.interglacials)}`);
check('the registry publishes the next glacial the module computes', V.climateForwardNextGlacialKyr === kyr(fwd.glacials[0].kyrFromNow));
check('the registry publishes the rule\'s thresholds', V.climateForwardGlacialThresholdPermil === rule.glacialMinPermil.toFixed(1) && V.climateForwardInterglacialThresholdPermil === rule.interglacialMaxPermil.toFixed(1));

console.log(failed ? `\nclimate-forward-extrema: ${failed} FAILED` : '\nclimate-forward-extrema: all PASS');
process.exit(failed ? 1 : 0);
