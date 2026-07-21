#!/usr/bin/env node
// ============================================================================
// Process paleoclimate proxy data (GISP2 Alley 2000 + Bond 2001 IRD) into
// a compact JSON file for the LOD-Climate Rhythm modal.
//
// Inputs:
//   public/input/proxy/gisp2-alley2000-raw.txt   — Greenland ice-core temperature
//   public/input/proxy/bond2001-raw.txt          — North Atlantic drift-ice stack
//
// Output:
//   public/input/climate-proxy.json — { sources: [{name, unit, range, data:[[year,T],…]}] }
// ============================================================================

const fs = require('fs');
const path = require('path');

// ── GISP2 Alley 2000 ────────────────────────────────────────────────────────
// Format: two columns (age_kyr_BP, temperature_C), starts at line 76.
// Age convention: 0 kyr BP = 1950 CE. temperature is Greenland (~-30 to -45°C).
// We convert age → calendar year (year_CE = 1950 - age_kyr × 1000)
// and downsample by binning to ~250 uniform samples over the useful range.
// We render as ANOMALY vs Late Holocene mean (last 3 kyr) so it reads on
// the same "positive = warm" convention as Bond 2001 IRD.

function loadGisp2() {
  const raw = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'input', 'proxy', 'gisp2-alley2000-raw.txt'),
    'utf8'
  );
  const lines = raw.split('\n');
  const points = [];
  for (const line of lines) {
    const m = line.trim().match(/^([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*$/);
    if (!m) continue;
    const age_kyr = parseFloat(m[1]);
    const temp_C = parseFloat(m[2]);
    // Skip accumulation section — it's a second table further down.
    // Guard: temperature should be roughly in [-45, -25] °C for Greenland.
    if (temp_C > -10 || temp_C < -60) continue;
    // Bound to Holocene + LGM tail (0-30 kyr).
    if (age_kyr > 30 || age_kyr < 0) continue;
    const year_CE = Math.round(1950 - age_kyr * 1000);
    points.push({ year: year_CE, temp_C });
  }
  // Sort ascending by year and dedupe (some age rows repeat).
  points.sort((a, b) => a.year - b.year);
  const dedup = [];
  for (const p of points) {
    if (dedup.length && dedup[dedup.length - 1].year === p.year) {
      // average duplicate rows at same year
      dedup[dedup.length - 1].temp_C = (dedup[dedup.length - 1].temp_C + p.temp_C) / 2;
      continue;
    }
    dedup.push({ ...p });
  }
  // Anomaly baseline: mean of last 3000 years (Late Holocene reference).
  const lateHolocene = dedup.filter(p => p.year >= -1050 && p.year <= 1950);
  const meanLate = lateHolocene.reduce((s, p) => s + p.temp_C, 0) / lateHolocene.length;
  // Convert to anomaly and downsample by 100-yr binning.
  const binWidth = 100;
  const bins = new Map();
  for (const p of dedup) {
    const binYear = Math.floor(p.year / binWidth) * binWidth;
    if (!bins.has(binYear)) bins.set(binYear, { sum: 0, n: 0 });
    const b = bins.get(binYear);
    b.sum += (p.temp_C - meanLate);
    b.n += 1;
  }
  const data = Array.from(bins.entries())
    .map(([year, { sum, n }]) => [year + binWidth / 2, +(sum / n).toFixed(3)])
    .sort((a, b) => a[0] - b[0]);
  // Two chart-only anchor points appended for visual continuity to the
  // modern era (GISP2 core itself ends ~1855 AD). These are approximate
  // estimates of Greenland Summit temperature anomaly vs the 1050 BC–1950 AD
  // Holocene mean, based on GISP2 borehole extension + GEOSummit instrumental
  // (Vinther 2006-style stitching):
  //   1950 AD: near baseline (essentially the reference epoch)
  //   2000 AD: modern warming, roughly +1.5 °C above Holocene mean
  // Stored under `dataChartExtension` so the chart draws them but the
  // correlation panel ignores them (the framework doesn't model the
  // anthropogenic warming these points reflect).
  const dataChartExtension = [
    [1950, +0.3],
    [2000, +1.5],
  ];
  return {
    name: 'GISP2 (Alley 2000)',
    region: 'Greenland (Summit)',
    reference: 'Alley R.B. 2000. Quaternary Science Reviews 19:213-226.',
    unit: '°C anomaly vs 1050 BC–1950 AD mean',
    baseline: `${meanLate.toFixed(2)} °C absolute`,
    range: [data[0][0], data[data.length - 1][0]],
    n: data.length,
    data,
    dataChartExtension,
    extensionNote: 'The two anchor points [1950, +0.3] and [2000, +1.5] are appended for chart continuity only (GISP2 core ends ~1855 AD). Approximate anomaly estimates based on instrumental Greenland Summit temperature vs 1050 BC–1950 AD Holocene mean. Excluded from correlation analysis.',
  };
}

// ── Bond et al. 2001 IRD (North Atlantic drift-ice) stack ─────────────────
// Format: 10-column table, columns 9-10 = "all 4 stacked" age vs % HSG
// (Hematite-Stained Grains), the exact signal Bond used to identify his
// Bond 0-8 cold events. Age in years BP (1950 CE = 0).
//
// Physical meaning: HIGH IRD = more drift-ice = COLD anomaly.
// To match the "warm anomaly = positive" convention of temperature proxies,
// we store the values NEGATED (so positive = warm anomaly). This lets the
// correlation panel compare all proxies with the same sign convention as
// the framework's Σ_stack.

function loadBond2001() {
  const raw = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'input', 'proxy', 'bond2001-raw.txt'),
    'utf8'
  );
  const lines = raw.split('\n');
  const points = [];
  for (const line of lines) {
    // Data rows have 10 whitespace-separated numeric columns. Pick columns
    // 9 (age BP) + 10 (stacked HSG %). Skip header, non-data lines.
    const parts = line.trim().split(/\s+/);
    if (parts.length < 10) continue;
    const age  = parseFloat(parts[8]);   // col 9 (0-indexed 8)
    const hsg  = parseFloat(parts[9]);   // col 10 (0-indexed 9)
    if (!Number.isFinite(age) || !Number.isFinite(hsg)) continue;
    if (age < 0 || age > 12000) continue;
    const year_CE = Math.round(1950 - age);
    points.push({ year: year_CE, hsg });
  }
  points.sort((a, b) => a.year - b.year);
  // Compute the mean HSG across the record to convert to anomaly.
  const mean = points.reduce((s, p) => s + p.hsg, 0) / points.length;
  // Store as anomaly-vs-mean, NEGATED so positive = warm anomaly.
  const data = points.map(p => [p.year, +((-1) * (p.hsg - mean)).toFixed(3)]);
  return {
    name: 'Bond 2001 IRD',
    region: 'North Atlantic (MC52, VM29-191, MC21, GGC22 stacked)',
    reference: 'Bond G.C. et al. 2001. Science 294:2130-2136.',
    unit: 'inverse-IRD anomaly (positive = warm), vs record mean',
    baseline: `mean HSG = ${mean.toFixed(2)} % of grains`,
    note: 'HIGH IRD = MORE ice-rafted debris = COLD event. Values are NEGATED (×−1) so positive = warm anomaly, matching GISP2/temperature convention for direct correlation comparison. Original signal available in bond2001-raw.txt.',
    climateProxy: 'ird',
    range: [data[0][0], data[data.length - 1][0]],
    n: data.length,
    data,
  };
}

const output = {
  _meta: {
    generator: 'scripts/process_climate_proxy.js',
    source_files: [
      'public/input/proxy/gisp2-alley2000-raw.txt',
      'public/input/proxy/bond2001-raw.txt',
    ],
    note: 'Compact proxy JSON for LOD-Climate Rhythm modal. All series expressed with "positive = warm anomaly" convention (GISP2 is already a temperature anomaly; Bond 2001 IRD is NEGATED because raw IRD is inversely related to warmth).',
  },
  sources: [loadGisp2(), loadBond2001()],
};

const outPath = path.join(__dirname, '..', 'public', 'input', 'climate-proxy.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`✓ Wrote ${outPath}`);
for (const s of output.sources) {
  console.log(`  ${s.name}: ${s.n} points, range ${s.range[0]}–${s.range[1]} CE, unit ${s.unit}`);
}
