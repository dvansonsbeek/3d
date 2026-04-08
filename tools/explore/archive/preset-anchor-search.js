// ═══════════════════════════════════════════════════════════════
// PRESET + 8-ANCHOR SEARCH
//
// Refines the jpl-feasible-search results in two ways:
//
// 1. Re-ranks the 350 survivors by a COMBINED score
//    (trend_err) + α * (number of d/antiPhase changes vs Config #1)
//    so we prefer minimal structural changes from the current model.
//
// 2. For each survivor, checks whether each planet's best phase
//    angle coincides (within tolerance) with that planet's ICRF
//    perihelion at one of the 8 balanced-year anchors:
//
//        anchor_n = BY − n·H,  for n ∈ {0,1,2,...,7}
//        ϖ_ICRF(anchor_n) = periLongJ2000 + icrfRate * (anchor_n − 2000)
//
//    A survivor that aligns ALL 7 planets to anchors (each possibly
//    a DIFFERENT n, since planets return at 8H regardless) is the
//    physically meaningful "balanced epoch" solution.
//
// The output is sorted in two views:
//   View A: by total trend error (best JPL fit)
//   View B: by combined score (trend + structural cost), filtered
//           to those with ≥ 5/7 anchor alignments
//
// All operations use the JPL J2000-fixed frame (the corrected
// observable, see jpl-frame-reconciliation.js).
//
// Usage: node tools/explore/preset-anchor-search.js [--alpha 5]
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const argv = process.argv.slice(2);
const ALPHA = (() => { const i = argv.indexOf('--alpha'); return i >= 0 ? parseFloat(argv[i+1]) : 5; })();
const ANCHOR_TOL_DEG = 1.5;

const PRESETS_PATH = path.join(__dirname, '..', '..', 'data', 'jpl-feasible-presets.json');

// Config #1 reference for structural-distance scoring
const CONFIG1 = {
  mercury: { d: 21, antiPhase: false },
  venus:   { d: 34, antiPhase: false },
  mars:    { d: 5,  antiPhase: false },
  jupiter: { d: 5,  antiPhase: false },
  saturn:  { d: 3,  antiPhase: true  },
  uranus:  { d: 21, antiPhase: false },
  neptune: { d: 34, antiPhase: false },
};

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const BY = C.balancedYear;
const genPrecRate = 1 / (H / 13);

// Per-planet ICRF rate
const icrfRate = {};
for (const k of PLANETS) {
  const eclP = C.planets[k].perihelionEclipticYears;
  icrfRate[k] = 360 / (1 / (1 / eclP - genPrecRate));   // deg/yr
}

// ICRF perihelion at the 8 balanced-year anchors, per planet
function anchorPhases(key) {
  const periJ = C.planets[key].longitudePerihelion;
  const r = icrfRate[key];
  const out = [];
  for (let n = 0; n < 8; n++) {
    const yAnchor = BY - n * H;
    const peri = periJ + r * (yAnchor - 2000);
    out.push({ n, year: yAnchor, phase: ((peri % 360) + 360) % 360 });
  }
  return out;
}
const ANCHORS = {};
for (const k of PLANETS) ANCHORS[k] = anchorPhases(k);

// Test if a phase matches ANY of the 8 anchors for a given planet
function matchAnchor(key, phase) {
  for (const a of ANCHORS[key]) {
    let d = phase - a.phase;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    if (Math.abs(d) <= ANCHOR_TOL_DEG) return { n: a.n, year: a.year, anchorPhase: a.phase, delta: d };
  }
  return null;
}

// Count d/antiPhase differences from Config #1
function structuralDistance(cfg) {
  let n = 0;
  for (const k of PLANETS) {
    if (cfg[k].d !== CONFIG1[k].d) n++;
    if (cfg[k].antiPhase !== CONFIG1[k].antiPhase) n++;
  }
  return n;
}

// ═══════════════════════════════════════════════════════════════
// LOAD AND ANALYZE
// ═══════════════════════════════════════════════════════════════

const data = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));
console.log('═══════════════════════════════════════════════════════════════');
console.log('  PRESET + 8-ANCHOR SEARCH');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Loaded ${data.survivors.length} JPL-frame survivors`);
console.log(`  Anchor tolerance: ±${ANCHOR_TOL_DEG}°`);
console.log(`  Combined score = trend_err + ${ALPHA} × (number of d/antiPhase changes from Config #1)`);
console.log('');

// Annotate each survivor
const annotated = data.survivors.map(s => {
  const dist = structuralDistance(s.config);
  const matches = {};
  let nMatch = 0;
  for (const k of PLANETS) {
    const m = matchAnchor(k, s.best_phases[k].phase_deg);
    matches[k] = m;
    if (m) nMatch++;
  }
  return {
    ...s,
    structDist: dist,
    anchorMatches: matches,
    nAnchorMatch: nMatch,
    combined: s.total_trend_err_arcsec + ALPHA * dist,
  };
});

// ─── VIEW A: top 15 by raw trend error ───
console.log('═══ VIEW A: top 15 by trend error (no structural penalty) ═══');
console.log('  Rank │ TotErr │ ΔConfig#1 │ #Anchors │ d-config');
console.log('  ─────┼────────┼───────────┼──────────┼─────────────────────────');
const byErr = [...annotated].sort((a, b) => a.total_trend_err_arcsec - b.total_trend_err_arcsec);
for (let i = 0; i < Math.min(15, byErr.length); i++) {
  const s = byErr[i];
  const dStr = PLANETS.map(k => `${s.config[k].d}${s.config[k].antiPhase?'A':'i'}`).join(' ');
  console.log(
    '  ' + (i+1).toString().padStart(4) + ' │ ' +
    s.total_trend_err_arcsec.toFixed(2).padStart(6) + ' │   ' +
    s.structDist.toString().padStart(2) + '/14   │   ' +
    s.nAnchorMatch + '/7    │ ' + dStr
  );
}
console.log('');

// ─── VIEW B: top 15 by combined score ───
console.log('═══ VIEW B: top 15 by combined (trend + structural) score ═══');
console.log('  Rank │ Combined │ TotErr │ ΔConfig#1 │ #Anchors │ d-config');
console.log('  ─────┼──────────┼────────┼───────────┼──────────┼─────────────────────────');
const byCombined = [...annotated].sort((a, b) => a.combined - b.combined);
for (let i = 0; i < Math.min(15, byCombined.length); i++) {
  const s = byCombined[i];
  const dStr = PLANETS.map(k => `${s.config[k].d}${s.config[k].antiPhase?'A':'i'}`).join(' ');
  console.log(
    '  ' + (i+1).toString().padStart(4) + ' │ ' +
    s.combined.toFixed(2).padStart(8) + ' │ ' +
    s.total_trend_err_arcsec.toFixed(2).padStart(6) + ' │   ' +
    s.structDist.toString().padStart(2) + '/14   │   ' +
    s.nAnchorMatch + '/7    │ ' + dStr
  );
}
console.log('');

// ─── VIEW C: top 15 by anchor count (most anchored), then trend err ───
console.log('═══ VIEW C: top 15 most-anchored survivors ═══');
console.log('  Rank │ #Anchors │ TotErr │ ΔConfig#1 │ d-config');
console.log('  ─────┼──────────┼────────┼───────────┼─────────────────────────');
const byAnchor = [...annotated].sort((a, b) => (b.nAnchorMatch - a.nAnchorMatch) || (a.total_trend_err_arcsec - b.total_trend_err_arcsec));
for (let i = 0; i < Math.min(15, byAnchor.length); i++) {
  const s = byAnchor[i];
  const dStr = PLANETS.map(k => `${s.config[k].d}${s.config[k].antiPhase?'A':'i'}`).join(' ');
  console.log(
    '  ' + (i+1).toString().padStart(4) + ' │   ' +
    s.nAnchorMatch + '/7    │ ' +
    s.total_trend_err_arcsec.toFixed(2).padStart(6) + ' │   ' +
    s.structDist.toString().padStart(2) + '/14   │ ' + dStr
  );
}
console.log('');

// ─── Summary stats ───
console.log('═══ SUMMARY STATISTICS ═══');
const distHist = new Array(15).fill(0);
const anchHist = new Array(8).fill(0);
for (const s of annotated) {
  distHist[s.structDist]++;
  anchHist[s.nAnchorMatch]++;
}
console.log('  Survivors by structural distance from Config #1:');
for (let i = 0; i < distHist.length; i++) {
  if (distHist[i] > 0) console.log(`    Δ = ${i.toString().padStart(2)}/14:  ${distHist[i]} presets`);
}
console.log('');
console.log('  Survivors by number of anchor matches:');
for (let i = 0; i < 8; i++) {
  if (anchHist[i] > 0) console.log(`    ${i}/7 anchors:  ${anchHist[i]} presets`);
}
console.log('');

// ─── Detail of best anchored solution ───
const bestAnchored = byAnchor[0];
if (bestAnchored && bestAnchored.nAnchorMatch >= 5) {
  console.log('═══ DETAIL: best anchored survivor ═══');
  console.log(`  TotErr ${bestAnchored.total_trend_err_arcsec}″/cy, Δ${bestAnchored.structDist}/14, anchors ${bestAnchored.nAnchorMatch}/7`);
  console.log('');
  console.log('  Planet   │ d  │ grp  │ Phase   │ Anchor n │ Anchor year   │ Δphase  │ Trend err');
  console.log('  ─────────┼────┼──────┼─────────┼──────────┼───────────────┼─────────┼──────────');
  for (const k of PLANETS) {
    const cfg = bestAnchored.config[k];
    const bp = bestAnchored.best_phases[k];
    const m = bestAnchored.anchorMatches[k];
    const anchInfo = m ? `n=${m.n}` : '   ─';
    const anchYr = m ? m.year.toString().padStart(11) : '          ─';
    const dph = m ? ((m.delta>=0?'+':'') + m.delta.toFixed(2) + '°').padStart(7) : '      ─';
    console.log(
      '  ' + k.padEnd(8) + ' │ ' +
      cfg.d.toString().padStart(2) + ' │ ' +
      (cfg.antiPhase?'anti':'in  ') + ' │ ' +
      (bp.phase_deg.toFixed(1) + '°').padStart(7) + ' │   ' +
      anchInfo.padEnd(6) + ' │ ' + anchYr + '   │ ' +
      dph + ' │ ' + bp.err_arcsec_per_cy.toFixed(2).padStart(7)
    );
  }
}
console.log('');
