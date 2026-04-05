// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE VECTOR BALANCE CONFIGURATION SEARCH
// ═══════════════════════════════════════════════════════════════════════════
//
// Incorporates ALL lessons learned:
//   - Locked ascending nodes (all at same rate) → best vector stability
//   - Jupiter+Saturn dominate perturbation → larger d reduces variation
//   - Venus+Neptune share ICRF frequency → potential cancellation
//   - Ju-Sa inclination beat = H/13 (axial precession period)
//   - Eccentricity adjustments must be ≤5% from observed
//   - All 8 LL bounds must pass
//   - Both scalar balances >99%
//   - Trend direction match ≥6/8
//
// Scoring (max 1000 points):
//   - Vector min balance:      0-300 pts (98%=300, 90%=200, 80%=100)
//   - Vector stability (1/var): 0-200 pts
//   - Scalar incl balance:     0-100 pts (threshold: >99.9%)
//   - Scalar ecc balance:      0-150 pts (with ≤5% ecc adjustments)
//   - LL bounds:               0-100 pts (12.5 per planet)
//   - Trend direction:         0-50 pts (6.25 per match)
//   - Mirror symmetry bonus:   0-50 pts
//   - Small ecc adjustments:   0-50 pts (less change = more points)
//
// Usage: node tools/explore/vector-balance-comprehensive.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const fs = require('fs');
const path = require('path');

const H = C.H;
const balancedYear = C.balancedYear;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const genPrec = H / 13;
const SUPER_PERIOD = 8 * H;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const llBounds = {
  mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
};

const jplTrends = {
  mercury: -0.00595, venus: -0.00079, earth: 0,
  mars: -0.00813, jupiter: -0.00184, saturn: +0.00194,
  uranus: -0.00243, neptune: +0.00035,
};

// Fixed planet data
const MASS = {}, SMA = {}, ECC_BASE = {}, ECC_J2000 = {};
for (const key of PLANET_KEYS) {
  MASS[key] = C.massFraction[key];
  ECC_J2000[key] = C.eccJ2000[key];
  if (key === 'earth') {
    SMA[key] = 1.0; ECC_BASE[key] = C.eccentricityBase;
  } else {
    SMA[key] = C.derived[key].orbitDistance;
    ECC_BASE[key] = C.planets[key].orbitalEccentricityBase;
  }
}

// Load presets
const presetsPath = path.resolve(__dirname, '..', '..', 'data', 'balance-presets.json');
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8')).presets;

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function evaluatePreset(row) {
  const d = { mercury: row[2], venus: row[4], earth: 3, mars: row[6], jupiter: row[8], saturn: row[10], uranus: row[12], neptune: row[14] };
  const groups = { mercury: row[3]===1, venus: row[5]===1, earth: false, mars: row[7]===1, jupiter: row[9]===1, saturn: row[11]===1, uranus: row[13]===1, neptune: row[15]===1 };

  // Build planet state
  const planets = {};
  for (const key of PLANET_KEYS) {
    const p = key === 'earth' ? null : C.planets[key];
    const pd = {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      mass: MASS[key], sma: SMA[key], ecc: ECC_BASE[key],
      eclP: key === 'earth' ? H/16 : p.perihelionEclipticYears,
      periLong: key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion,
      inclJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000,
      omegaJ2000: key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane,
      d: d[key], antiPhase: groups[key],
    };
    pd.icrfP = key === 'earth' ? H/3 : 1/(1/pd.eclP - 1/genPrec);
    pd.icrfRate = 360 / pd.icrfP;
    pd.amp = PSI / (pd.d * Math.sqrt(pd.mass));
    pd.L = pd.mass * Math.sqrt(pd.sma * (1 - pd.ecc*pd.ecc));
    pd.ascNodeRate = -360 * 55 / SUPER_PERIOD; // locked

    const periAtBY = ((pd.periLong + pd.icrfRate*(balancedYear-2000)) % 360 + 360) % 360;
    pd.phaseAngle = pd.antiPhase ? periAtBY : ((periAtBY-180+360)%360);
    const antiSign = pd.antiPhase ? -1 : 1;
    pd.mean = pd.inclJ2000 - antiSign * pd.amp * Math.cos((pd.periLong - pd.phaseAngle)*DEG2RAD);
    planets[key] = pd;
  }

  // 1. LL bounds
  let llPass = 0;
  for (const key of PLANET_KEYS) {
    const p = planets[key]; const ll = llBounds[key];
    if (p.mean-p.amp >= ll.min-0.01 && p.mean+p.amp <= ll.max+0.01) llPass++;
  }
  if (llPass < 8) return null; // HARD CONSTRAINT: all 8 must pass

  // 2. Trend direction
  let dirPass = 0;
  for (const key of PLANET_KEYS) {
    if (key === 'earth') { dirPass++; continue; }
    const p = planets[key]; const e = planets.earth;
    const pI1 = (yr) => { const peri=p.periLong+p.icrfRate*(yr-2000); const s=p.antiPhase?-1:1; return p.mean+s*p.amp*Math.cos((peri-p.phaseAngle)*DEG2RAD); };
    const eI1 = (yr) => { const peri=e.periLong+e.icrfRate*(yr-2000); return e.mean+e.amp*Math.cos((peri-e.phaseAngle)*DEG2RAD); };
    const eclI = (yr) => {
      const pi=pI1(yr)*DEG2RAD, ei=eI1(yr)*DEG2RAD;
      const po=(p.omegaJ2000+p.ascNodeRate*(yr-2000))*DEG2RAD, eo=(e.omegaJ2000+e.ascNodeRate*(yr-2000))*DEG2RAD;
      const dot=Math.sin(pi)*Math.sin(ei)*(Math.sin(po)*Math.sin(eo)+Math.cos(po)*Math.cos(eo))+Math.cos(pi)*Math.cos(ei);
      return Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI;
    };
    const trend = (eclI(2100)-eclI(1900))/2;
    if ((jplTrends[key]>=0)===(trend>=0)) dirPass++;
  }

  // 3. Vector balance
  const step = SUPER_PERIOD / 150;
  let vecMin=100, vecMax=0, vecSum=0;
  for (let i=0; i<=150; i++) {
    const year = balancedYear + i*step;
    let sx=0,sy=0,tm=0;
    for (const key of PLANET_KEYS) {
      const p=planets[key]; const as=p.antiPhase?-1:1;
      const peri=p.periLong+p.icrfRate*(year-2000);
      const incl=p.mean+as*p.amp*Math.cos((peri-p.phaseAngle)*DEG2RAD);
      const omega=(p.omegaJ2000+p.ascNodeRate*(year-2000))*DEG2RAD;
      const mag=p.L*Math.sin(incl*DEG2RAD);
      sx+=mag*Math.cos(omega); sy+=mag*Math.sin(omega); tm+=Math.abs(mag);
    }
    const bal=tm>0?(1-Math.sqrt(sx*sx+sy*sy)/tm)*100:100;
    vecSum+=bal; if(bal<vecMin)vecMin=bal; if(bal>vecMax)vecMax=bal;
  }
  const vecMean = vecSum/151;
  const vecVar = vecMax - vecMin;

  // 4. Scalar balances
  let wIn=0,wAnti=0,vIn=0,vAnti=0;
  for (const key of PLANET_KEYS) {
    const w = Math.sqrt(MASS[key]*SMA[key]*(1-ECC_BASE[key]**2))/d[key];
    const v = Math.sqrt(MASS[key])*Math.pow(SMA[key],1.5)*ECC_BASE[key]/Math.sqrt(d[key]);
    if (groups[key]) { wAnti+=w; vAnti+=v; } else { wIn+=w; vIn+=v; }
  }
  const inclBal = (1-Math.abs(wIn-wAnti)/(wIn+wAnti))*100;
  const eccBal = (1-Math.abs(vIn-vAnti)/(vIn+vAnti))*100;

  // 5. Eccentricity balance with ≤5% adjustments (optimize outer 4)
  let bestEccBal = eccBal;
  let bestEccAdj = {};
  let totalAdjPct = 0;

  if (eccBal < 99) {
    // Try to restore balance by adjusting outer planet eccentricities ≤5%
    const outer = ['jupiter','saturn','uranus','neptune'];
    const steps5 = [0.95, 0.96, 0.97, 0.98, 0.99, 1.0, 1.01, 1.02, 1.03, 1.04, 1.05];
    let bestCombined = eccBal;

    for (const fJu of steps5) {
      for (const fSa of steps5) {
        for (const fUr of steps5) {
          for (const fNe of steps5) {
            const testEcc = { ...ECC_BASE,
              jupiter: ECC_BASE.jupiter*fJu, saturn: ECC_BASE.saturn*fSa,
              uranus: ECC_BASE.uranus*fUr, neptune: ECC_BASE.neptune*fNe };
            let tVin=0,tVanti=0,tWin=0,tWanti=0;
            for (const k of PLANET_KEYS) {
              const tv = Math.sqrt(MASS[k])*Math.pow(SMA[k],1.5)*testEcc[k]/Math.sqrt(d[k]);
              const tw = Math.sqrt(MASS[k]*SMA[k]*(1-testEcc[k]**2))/d[k];
              if (groups[k]) { tVanti+=tv; tWanti+=tw; } else { tVin+=tv; tWin+=tw; }
            }
            const tEccBal = (1-Math.abs(tVin-tVanti)/(tVin+tVanti))*100;
            const tInclBal = (1-Math.abs(tWin-tWanti)/(tWin+tWanti))*100;
            if (tEccBal > bestCombined && tInclBal > 99.9) {
              bestCombined = tEccBal;
              bestEccBal = tEccBal;
              bestEccAdj = { jupiter:fJu, saturn:fSa, uranus:fUr, neptune:fNe };
              totalAdjPct = Math.abs(fJu-1)+Math.abs(fSa-1)+Math.abs(fUr-1)+Math.abs(fNe-1);
            }
          }
        }
      }
    }
  } else {
    bestEccBal = eccBal;
  }

  // 6. Mirror symmetry
  const mirror = (d.mercury===d.uranus && d.venus===d.neptune && d.mars===d.jupiter && d.earth===d.saturn);
  const partialMirror = [d.mercury===d.uranus, d.venus===d.neptune, d.mars===d.jupiter].filter(x=>x).length;

  // 7. Score
  let score = 0;
  // Vector min (0-300)
  score += Math.max(0, Math.min(300, (vecMin - 60) * 300 / 40));
  // Vector stability (0-200, lower var = better)
  score += Math.max(0, Math.min(200, (40 - vecVar) * 200 / 35));
  // Scalar incl (0-100)
  score += Math.min(100, Math.max(0, (inclBal - 99) * 100));
  // Scalar ecc with adjustments (0-150)
  score += Math.min(150, Math.max(0, (bestEccBal - 90) * 15));
  // LL bounds (0-100) — already filtered to 8/8
  score += 100;
  // Trend direction (0-50)
  score += dirPass * 50 / 8;
  // Mirror symmetry (0-50)
  score += mirror ? 50 : partialMirror * 12;
  // Small ecc adjustments (0-50, less = better)
  score += Math.max(0, 50 - totalAdjPct * 250);

  const dLabel = `Me${d.mercury} Ve${d.venus} Ma${d.mars} Ju${d.jupiter} Sa${d.saturn} Ur${d.uranus} Ne${d.neptune}`;
  const antiLabel = PLANET_KEYS.filter(k => groups[k]).map(k=>k.charAt(0).toUpperCase()+k.slice(1)).join('+') || '(none)';

  return {
    scenario: row[0], scalarBal: row[1],
    dLabel, antiLabel, d, groups,
    llPass, dirPass, inclBal, eccBal, bestEccBal, bestEccAdj, totalAdjPct,
    vecMin, vecMean, vecVar, mirror, partialMirror, score,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN SCAN
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     COMPREHENSIVE CONFIGURATION SEARCH                                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Scanning ${presets.length} presets (all ≥99.994% scalar inclination balance)`);
console.log('Hard filter: 8/8 LL bounds must pass');
console.log('Eccentricity adjustments limited to ≤5% per planet');
console.log('Ascending nodes: all locked at same rate');
console.log('');

const results = [];
let filtered = 0;

for (let i = 0; i < presets.length; i++) {
  const result = evaluatePreset(presets[i]);
  if (result) {
    result.index = i + 1;
    results.push(result);
  } else {
    filtered++;
  }
}

console.log(`Results: ${results.length} configs pass 8/8 LL bounds (${filtered} filtered out)`);
console.log('');

// Sort by overall score
results.sort((a, b) => b.score - a.score);

// ═══════════════════════════════════════════════════════════════════════════
// TOP RESULTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('TOP 30 BY OVERALL SCORE');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Rk │ #    │ Sc │ Score │ Anti-phase             │ d-values                         │ Dir│ Ecc% │ Ecc%adj│ Vec min│ Vec var│ Mirr');
console.log('───┼──────┼────┼───────┼────────────────────────┼──────────────────────────────────┼────┼──────┼────────┼────────┼────────┼─────');

for (let i = 0; i < Math.min(30, results.length); i++) {
  const r = results[i];
  console.log(
    (i+1).toString().padStart(2) + ' │ ' +
    r.index.toString().padStart(4) + ' │ ' +
    r.scenario.padStart(2) + ' │ ' +
    r.score.toFixed(0).padStart(5) + ' │ ' +
    r.antiLabel.padEnd(22) + ' │ ' +
    r.dLabel.padEnd(32) + ' │ ' +
    (r.dirPass+'/8').padStart(3) + ' │ ' +
    r.eccBal.toFixed(1).padStart(4) + ' │ ' +
    r.bestEccBal.toFixed(1).padStart(6) + ' │ ' +
    r.vecMin.toFixed(1).padStart(6) + ' │ ' +
    r.vecVar.toFixed(1).padStart(6) + ' │ ' +
    (r.mirror ? '  ✓' : r.partialMirror + '/3')
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETAILED TOP 5
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('DETAILED TOP 5');
console.log('═══════════════════════════════════════════════════════════════════════════');

for (let i = 0; i < Math.min(5, results.length); i++) {
  const r = results[i];
  console.log(`\n--- #${i+1}: Preset ${r.index} (Scenario ${r.scenario}, Score: ${r.score.toFixed(0)}) ---`);
  console.log(`  d-values:     ${r.dLabel}`);
  console.log(`  Anti-phase:   ${r.antiLabel}`);
  console.log(`  LL bounds:    ${r.llPass}/8`);
  console.log(`  Direction:    ${r.dirPass}/8`);
  console.log(`  Scalar incl:  ${r.inclBal.toFixed(6)}%`);
  console.log(`  Scalar ecc:   ${r.eccBal.toFixed(4)}% (current) → ${r.bestEccBal.toFixed(4)}% (with ≤5% adj)`);
  console.log(`  Vector min:   ${r.vecMin.toFixed(4)}%`);
  console.log(`  Vector var:   ${r.vecVar.toFixed(4)} pp`);
  console.log(`  Mirror:       ${r.mirror ? 'Yes (full)' : r.partialMirror + '/3 pairs'}`);
  if (Object.keys(r.bestEccAdj).length > 0) {
    console.log('  Ecc adjustments:');
    for (const [k,v] of Object.entries(r.bestEccAdj)) {
      if (Math.abs(v-1) > 0.001) console.log(`    ${k}: ×${v.toFixed(3)} (${((v-1)*100).toFixed(1)}%)`);
    }
  }

  // Per-planet summary
  console.log('  Planet     │ d  │ Group     │ Amplitude │ Mean      │ Range');
  for (const key of PLANET_KEYS) {
    const dd = r.d[key]; const g = r.groups[key];
    const amp = PSI / (dd * Math.sqrt(MASS[key]));
    const icrfP = key==='earth'? H/3 : 1/(1/(key==='earth'?H/16:C.planets[key].perihelionEclipticYears)-1/genPrec);
    const icrfRate = 360/icrfP;
    const periLong = key==='earth'? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : C.planets[key].longitudePerihelion;
    const inclJ2000 = key==='earth'? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : C.planets[key].invPlaneInclinationJ2000;
    const periAtBY = ((periLong + icrfRate*(balancedYear-2000))%360+360)%360;
    const phase = g ? periAtBY : ((periAtBY-180+360)%360);
    const antiSign = g ? -1 : 1;
    const mean = inclJ2000 - antiSign*amp*Math.cos((periLong-phase)*DEG2RAD);
    console.log('  ' + (key.charAt(0).toUpperCase()+key.slice(1)).padEnd(10) + ' │ ' +
      dd.toString().padStart(2) + ' │ ' + (g?'anti-phase':'in-phase').padEnd(9) + ' │ ' +
      amp.toFixed(4).padStart(9) + '° │ ' + mean.toFixed(4).padStart(9) + '° │ ' +
      (mean-amp).toFixed(3) + '° – ' + (mean+amp).toFixed(3) + '°');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON WITH CURRENT CONFIG #1
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('COMPARISON: CURRENT CONFIG #1 vs TOP CANDIDATE');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

// Config #1 stats (from earlier analysis)
const c1 = evaluatePreset(presets[0]); // Preset 1 = Config #1
if (c1) {
  const top = results[0];
  console.log('                          │ Config #1              │ Top candidate');
  console.log('──────────────────────────┼────────────────────────┼────────────────────────');
  console.log(`d-values                  │ ${c1.dLabel.padEnd(22)} │ ${top.dLabel}`);
  console.log(`Anti-phase                │ ${c1.antiLabel.padEnd(22)} │ ${top.antiLabel}`);
  console.log(`Scalar incl               │ ${c1.inclBal.toFixed(4).padStart(20)}% │ ${top.inclBal.toFixed(4).padStart(20)}%`);
  console.log(`Scalar ecc (current)      │ ${c1.eccBal.toFixed(4).padStart(20)}% │ ${top.eccBal.toFixed(4).padStart(20)}%`);
  console.log(`Scalar ecc (≤5% adj)      │ ${c1.bestEccBal.toFixed(4).padStart(20)}% │ ${top.bestEccBal.toFixed(4).padStart(20)}%`);
  console.log(`Vector min (locked)       │ ${c1.vecMin.toFixed(4).padStart(20)}% │ ${top.vecMin.toFixed(4).padStart(20)}%`);
  console.log(`Vector var (locked)       │ ${c1.vecVar.toFixed(4).padStart(17)} pp │ ${top.vecVar.toFixed(4).padStart(17)} pp`);
  console.log(`LL bounds                 │ ${(c1.llPass+'/8').padStart(20)}  │ ${(top.llPass+'/8').padStart(20)}`);
  console.log(`Direction match           │ ${(c1.dirPass+'/8').padStart(20)}  │ ${(top.dirPass+'/8').padStart(20)}`);
  console.log(`Mirror symmetry           │ ${(c1.mirror?'✓ Full':'✗ '+c1.partialMirror+'/3').padStart(20)}  │ ${(top.mirror?'✓ Full':'✗ '+top.partialMirror+'/3').padStart(20)}`);
  console.log(`Overall score             │ ${c1.score.toFixed(0).padStart(20)}  │ ${top.score.toFixed(0).padStart(20)}`);
} else {
  console.log('Config #1 does not pass 8/8 LL bounds (Saturn fails)');
}
console.log('');
