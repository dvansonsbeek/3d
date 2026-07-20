#!/usr/bin/env node
// ============================================================================
// Process paleoclimate proxy data (GISP2 Alley 2000 + Moberg 2005 NH temp)
// into a compact JSON file for the LOD-Climate Rhythm modal.
//
// Inputs:
//   public/input/proxy/gisp2-alley2000-raw.txt   — Greenland ice-core temperature
//   public/input/proxy/moberg2005-raw.txt        — Northern Hemisphere anomaly
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
// We render as ANOMALY vs Late Holocene mean (last 3 kyr) so the y-axis is
// comparable with Moberg (which is a NH anomaly).

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
  return {
    name: 'GISP2 (Alley 2000)',
    region: 'Greenland (Summit)',
    reference: 'Alley R.B. 2000. Quaternary Science Reviews 19:213-226.',
    unit: '°C anomaly vs 1050 BCE–1950 CE mean',
    baseline: `${meanLate.toFixed(2)} °C absolute`,
    range: [data[0][0], data[data.length - 1][0]],
    n: data.length,
    data,
  };
}

// ── Moberg et al. 2005 ──────────────────────────────────────────────────────
// Format: year followed by 8 columns; first column after year is the NH
// reconstruction, remaining 7 are supplementary series (mostly -9.9999).
// Data starts at line 94 (year=1). Covers 1-1979 CE, annual resolution.
// We downsample to decadal means for cleaner rendering.

function loadMoberg() {
  const raw = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'input', 'proxy', 'moberg2005-raw.txt'),
    'utf8'
  );
  const lines = raw.split('\n');
  const points = [];
  for (const line of lines) {
    const m = line.trim().match(/^([0-9]+)\s+([-+]?[0-9]*\.?[0-9]+)\s+/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const anomaly = parseFloat(m[2]);
    if (year < 1 || year > 2050) continue;
    if (Math.abs(anomaly + 9.9999) < 1e-4) continue;
    points.push({ year, anomaly });
  }
  // Decadal binning.
  const binWidth = 10;
  const bins = new Map();
  for (const p of points) {
    const binYear = Math.floor(p.year / binWidth) * binWidth;
    if (!bins.has(binYear)) bins.set(binYear, { sum: 0, n: 0 });
    const b = bins.get(binYear);
    b.sum += p.anomaly;
    b.n += 1;
  }
  const data = Array.from(bins.entries())
    .map(([year, { sum, n }]) => [year + binWidth / 2, +(sum / n).toFixed(3)])
    .sort((a, b) => a[0] - b[0]);
  return {
    name: 'Moberg 2005',
    region: 'Northern Hemisphere',
    reference: 'Moberg A. et al. 2005. Nature 433:613-617.',
    unit: '°C anomaly vs 1961–1990 mean',
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
      'public/input/proxy/moberg2005-raw.txt',
    ],
    note: 'Compact proxy JSON for LOD-Climate Rhythm modal. Both series expressed as °C anomalies but against different baselines (see per-source unit field).',
  },
  sources: [loadMoberg(), loadGisp2()],
};

const outPath = path.join(__dirname, '..', 'public', 'input', 'climate-proxy.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`✓ Wrote ${outPath}`);
for (const s of output.sources) {
  console.log(`  ${s.name}: ${s.n} points, range ${s.range[0]}–${s.range[1]} CE, unit ${s.unit}`);
}
