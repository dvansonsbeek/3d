// A solar tide of date in the deep day length against the paleo record (doc 99 §"The J₂ → α conversion factor";
// the LOD-budget decision closed on it). PRINT-ONLY — no repo write. The reader is ONE home, tools/lib/solar-tide-paleo.js
// (the registry's solarTide* keys read the same functions).
//
//   node tools/explore/solar-tide-paleo-test.mjs
//
// Measured: shipped 0 of 29 outside; 5.6 % → 6 (the flagship Wells 380 +1.23 % against its 0.3–1.1 band, Williams 620
// +8.1 %, Wu 650 −3.7 %); 17 % → 19; 21 % → 19; 27 % → 22. The record bounds the NET non-lunar braking over the
// Phanerozoic to a few per cent of the lunar transfer — the 10-Myr La2004 drift measures that solution's convention,
// not nature's solar share. The cited history's own LOD column (Farhat et al. 2022, astrogeo22 columns.lodHours) is
// printed beside the chain: it sits slightly ABOVE the lunar-only day in the past (no net solar braking there either).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const data = (f) => { try { return require(ROOT + 'data/' + f); } catch { return undefined; } };
const { createModel } = await import(ROOT + 'packages/physics/src/index.js');
const { SOLAR_TIDE_SHARES, createSolarTidePaleoReader } = require(ROOT + 'tools/lib/solar-tide-paleo.js');
const m = createModel(undefined, { secularSeriesArtifact: data('nbody-secular-series.json'), spinCheckpointsArtifact: data('spin-axis-checkpoints.json'), lunarCheckpointsArtifact: data('lunar-cumulative-checkpoints.json'), obliquityBeatTableArtifact: data('obliquity-beat-table.json') ?? null });
const AG = require(ROOT + 'data/astrogeo22-earth-moon.json');
const reader = createSolarTidePaleoReader(m, require(ROOT + 'data/paleo-validation-anchors.json'));
const equalLags = SOLAR_TIDE_SHARES.equalLags;
const R0 = [SOLAR_TIDE_SHARES.j2000Pair, SOLAR_TIDE_SHARES.dissipationBudget, equalLags, SOLAR_TIDE_SHARES.la2004Measured];
const names = ['5.6 % (the J2000 pair)', '17 % (the dissipation budget)', `${(equalLags * 100).toFixed(1)} % (equal lags)`, '27 % (La2004 measured)'];

console.log(`the day of date, hours — the lunar-only chain, then with a solar tide of date at r₀ = ${names.join(', ')} · r(t)/r₀ · the cited history's own LOD column`);
for (const t of [0, 10, 50, 100, 200, 300, 400, 500, 650, 1000, 2460]) {
  const lod = reader.lodAt(t), idx = AG.columns.ageMa.indexOf(t);
  console.log(`  ${String(t).padStart(5)} Ma: lunar-only ${(lod / 3600).toFixed(3)} | ${R0.map((r0) => ((lod - reader.solarDeltaLodSeconds(t, r0)) / 3600).toFixed(3)).join(' | ')} | ${((reader.aAt(t) / reader.aAt(0)) ** 6).toFixed(3)} | Farhat ${idx >= 0 ? Number(AG.columns.lodHours[idx]).toFixed(3) : '—'}`);
}
console.log(`\nanchor                        | lunar-only (shipped)            | ${names.map((n) => n.padEnd(29)).join(' | ')}`);
const reads = R0.map((r0) => reader.readAt(r0));
for (let i = 0; i < reader.anchorCount; i++) {
  const base = reads[0][i].shipped;
  console.log(`  ${reads[0][i].id.padEnd(28)} | ${(base.ok ? '  ' : '✗ ') + base.label.padEnd(29)} | ${reads.map((rows) => (rows[i].withSolar.ok ? '  ' : '✗ ') + rows[i].withSolar.label.padEnd(27)).join(' | ')}`);
}
console.log(`\nanchors outside their expectation: shipped ${reads[0].filter((x) => !x.shipped.ok).length} of ${reader.anchorCount} · ${R0.map((r0, i) => `r₀ ${(r0 * 100).toFixed(1)} %: ${reads[i].filter((x) => !x.withSolar.ok).length}`).join(' · ')}`);
console.log(`the largest share at which no anchor leaves its expectation (the record's bound on the net non-lunar braking): ${(reader.boundShare() * 100).toFixed(1)} % of the lunar transfer`);
console.log('(a documented-deviation band is left by an improvement as well as by a worsening — the gate fails both)');
