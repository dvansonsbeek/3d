// U2 part 4: THE TIDAL-ALIGNMENT RECURRENCE SPECTRUM (uncommitted).
// WHY ~1,470 yr? The Keeling-Whorf-class hypothesis: extreme tides recur
// when syzygy (synodic), perigee (anomalistic) and node (draconic) - and
// for seasonal/orbital modulation, Earth's perihelion (anomalistic year) -
// re-align. The recurrence spectrum is exact arithmetic over the
// framework's OWN month chain. If a dominant recurrence sits near
// 8H/1830 = 1466 yr, the Bond tone acquires a lunar-tidal mechanism
// candidate - with a DIRECT LOD coupling (tidal dissipation = angular
// momentum transfer), no climate middleman required.
//
// Method: for k synodic months (T = k*Psyn), the alignment error is the
// time offset of perigee (mod anomalistic), node (mod HALF draconic -
// tides care about the node line, not the node sign), and optionally
// perihelion (mod anomalistic year). Record-setting minima of the
// weighted error = the recurrence ladder.
//
//   node tools/explore/u2-tidal-recurrence-spectrum.mjs
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const C = require2('/home/dennis/code/3d/tools/lib/constants.js');

const Psyn = C.moonSynodicMonth;          // days
const Pano = C.moonAnomalisticMonth;
const Pdra = C.moonNodalMonth;
const Pyr = C.meanAnomalisticYearDays;    // Earth perihelion recurrence
const SY = C.meanSolarYearDays;

const off = (T, P) => {
  const f = ((T / P) % 1 + 1) % 1;
  return Math.min(f, 1 - f) * P;          // days from exact alignment
};

console.log(`months (framework): synodic ${Psyn} · anomalistic ${Pano} · draconic ${Pdra}`);
console.log(`anomalistic year: ${Pyr} d\n`);

function ladder(useYear, label) {
  console.log(`${label} — record-setting alignment recurrences:`);
  console.log('  k(syn) |   years | perigee off (d) | node off (d) | perihelion off (d) | score (d)');
  let best = Infinity;
  const records = [];
  for (let k = 100; k <= 42000; k++) {
    const T = k * Psyn;
    const da = off(T, Pano);
    const dd = off(T, Pdra / 2);
    const dy = useYear ? off(T, Pyr) : 0;
    // weights: perigee dominates tidal amplitude (distance^3); node line
    // second; perihelion (solar tide + seasonality) weakest.
    const score = Math.hypot(da, dd * 0.7, dy * 0.25);
    if (score < best * 0.92) {
      best = score;
      records.push({ k, yr: T / SY, da, dd, dy, score });
    }
  }
  for (const r of records) {
    const near = Math.abs(r.yr - 1465.9) / 1465.9 < 0.05 ? '  ◄ BOND WINDOW' :
      (Math.abs(r.yr - 1800) / 1800 < 0.05 ? '  (Keeling–Whorf 1800)' : '');
    console.log(`  ${String(r.k).padStart(6)} | ${r.yr.toFixed(1).padStart(7)} | ${r.da.toFixed(3).padStart(9)} | ${r.dd.toFixed(3).padStart(9)} | ${useYear ? r.dy.toFixed(3).padStart(9) : '      —'} | ${r.score.toFixed(3)}${near}`);
  }
  console.log();
  return records;
}

const r3 = ladder(false, '3-WAY (syzygy–perigee–node)');
const r4 = ladder(true, '4-WAY (+ Earth perihelion)');

// where do the Bond and K–W windows rank? best score inside each window
// vs the global ladder at that horizon:
for (const [name, target] of [['Bond 1466', 1465.9], ['K–W 1800', 1800]]) {
  let bestIn = null;
  for (let k = 100; k <= 42000; k++) {
    const T = k * Psyn, yr = T / SY;
    if (Math.abs(yr - target) / target > 0.04) continue;
    const s = Math.hypot(off(T, Pano), off(T, Pdra / 2) * 0.7, off(T, Pyr) * 0.25);
    if (!bestIn || s < bestIn.s) bestIn = { k, yr, s };
  }
  console.log(`${name}: best 4-way alignment in ±4% window: k=${bestIn.k} (${bestIn.yr.toFixed(1)} yr), score ${bestIn.s.toFixed(3)} d`);
}
