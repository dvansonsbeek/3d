// validate-resonator.js — runtime validation sweep for the Core-mantle swing
// (Resonator driver), toggle OFF vs ON, against the CURRENT production chain.
// Pipeline role (tools/fit/README.md Step 7c): run after every
// `dt-corrections-fit.js --joint --write` + constant sync to confirm the
// shipped world end-to-end. Formerly scripts/core_mantle_resonator_stage3_
// validation.js (Stage 3.3 of the resonator integration).
//
// Checks:
//   1. J2000 invariants (ΔT(0) = 0; pure-physics LOD untouched; Layer-3
//      LOD shift = the documented +0.0988 ms/day closure item)
//   2. Stephenson-window residual RMS (−720..2016) OFF vs ON
//   3. Espenak instrumental-window RMS (1650..2015, production deltaTStart)
//   4. Era landmarks (L-5b §2-style samples)
//   5. Deep-time sanity: ΔT and Layer-3 LOD identical OFF vs ON at ±1, ±10,
//      ±200 Myr (episode + taper must vanish)
//
// Output: data/core-mantle-resonator-stage3-validation.json
// Run:    node tools/fit/validate-resonator.js

const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
// Single source of truth (joint-world value 58.48 since the flip)
const DELTA_T_START = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '..', 'public', 'input', 'astro-reference.json'),
  'utf8')).earthOrbital.deltaTStart;

function freshDT(resonatorOn) {
  for (const k of Object.keys(require.cache)) delete require.cache[k];
  // JOINT world: resonator is default-ON, opt-out via DT_RESONATOR_DISABLED=1.
  if (resonatorOn) delete process.env.DT_RESONATOR_DISABLED;
  else process.env.DT_RESONATOR_DISABLED = '1';
  return require(path.join(REPO, 'tools', 'lib', 'deep-time.js'));
}

function stephSpline() {
  const segs = JSON.parse(fs.readFileSync(
    path.join(REPO, 'public/input/stephenson-2016-deltaT-polynomial.json'), 'utf8')).segments;
  return (y) => {
    for (const s of segs) {
      if (y >= s.y0 && y <= s.y1) {
        const t = (y - s.y0) / (s.y1 - s.y0);
        return s.a[0] + s.a[1] * t + s.a[2] * t * t + s.a[3] * t * t * t;
      }
    }
    return NaN;
  };
}

function sweep(on) {
  const DT = freshDT(on);
  const steph = stephSpline();
  const out = {};

  // 1. invariants
  out.dt_j2000 = DT.meanDeltaTSecondsAtAge(0);
  out.lod_pure_j2000 = DT.meanLodSecondsAtAge(0);
  out.lod_layer3_j2000 = DT.meanLodSecondsWithCorrectionsAtAge(0);

  // 2. Stephenson residual
  let n = 0, ss = 0, sm = 0;
  const landmarks = {};
  for (let y = -720; y <= 2016; y += 10) {
    const sv = steph(y), mv = DT.meanDeltaTSecondsAtAge((2000 - y) / 1e6);
    if (!isFinite(sv) || !isFinite(mv)) continue;
    const r = sv - (DELTA_T_START + mv);
    ss += r * r; sm += r; n++;
    if ([-700, -400, 0, 500, 900, 1400, 1700].includes(y)) landmarks[y] = r;
  }
  const mean = sm / n;
  out.steph_rms_demeaned = Math.sqrt(ss / n - mean * mean);
  out.landmarks = landmarks;

  // 3. Espenak window (raw residual vs spline over 1650..2015, de-meaned RMS)
  let ne = 0, sse = 0, sme = 0;
  for (let y = 1650; y <= 2015; y += 5) {
    const sv = steph(y), mv = DT.meanDeltaTSecondsAtAge((2000 - y) / 1e6);
    const r = sv - (DELTA_T_START + mv);
    sse += r * r; sme += r; ne++;
  }
  const meane = sme / ne;
  out.espenak_window_rms = Math.sqrt(sse / ne - meane * meane);

  // 5. deep-time samples
  out.deep = {};
  for (const tMa of [-200, -10, -1, 1, 10, 200]) {
    out.deep[tMa] = {
      dt: DT.meanDeltaTSecondsAtAge(tMa),
      lod3: DT.meanLodSecondsWithCorrectionsAtAge(tMa),
    };
  }
  return out;
}

const off = sweep(false);
const on = sweep(true);

console.log('══ Stage 3.3 validation sweep (production chain, shipped constants) ══');
console.log(`1. ΔT(J2000):          OFF ${off.dt_j2000}  ON ${on.dt_j2000}   (both must be 0)`);
console.log(`   LOD pure (J2000):   OFF ${off.lod_pure_j2000.toFixed(9)}  ON ${on.lod_pure_j2000.toFixed(9)}  (must match)`);
console.log(`   LOD Layer-3 (J2000): OFF ${off.lod_layer3_j2000.toFixed(9)}  ON ${on.lod_layer3_j2000.toFixed(9)}`);
console.log(`   → Layer-3 shift: ${((on.lod_layer3_j2000 - off.lod_layer3_j2000) * 1000).toFixed(4)} ms  (joint world: resonator-alone δLOD(2000) ≈ +0.786 ms/day; the TOTAL closes the USNO anchor exactly — verified separately)`);
console.log(`2. Stephenson RMS (−720..2016): OFF ${off.steph_rms_demeaned.toFixed(1)} s  →  ON ${on.steph_rms_demeaned.toFixed(1)} s  (joint world target: OFF = raw+flags-off state, ON ≈ 32.4)`);
console.log('   landmarks (yr: OFF → ON):');
for (const y of Object.keys(off.landmarks)) {
  console.log(`     ${String(y).padStart(5)}: ${off.landmarks[y].toFixed(0).padStart(5)} → ${on.landmarks[y].toFixed(0).padStart(5)} s`);
}
console.log(`3. Espenak window RMS (1650..2015): OFF ${off.espenak_window_rms.toFixed(2)} s  →  ON ${on.espenak_window_rms.toFixed(2)} s`);
console.log('5. deep-time ΔT and Layer-3 LOD (must be identical OFF vs ON):');
let deepOk = true;
for (const tMa of Object.keys(off.deep)) {
  const dDt = Math.abs(off.deep[tMa].dt - on.deep[tMa].dt);
  const dL = Math.abs(off.deep[tMa].lod3 - on.deep[tMa].lod3);
  deepOk = deepOk && dDt < 1e-6 && dL < 1e-9;
  console.log(`     t=${String(tMa).padStart(4)} Ma: |ΔdT| = ${dDt.toExponential(1)} s, |ΔLOD3| = ${dL.toExponential(1)} s`);
}
const pass = off.dt_j2000 === 0 && on.dt_j2000 === 0
  && Math.abs(off.lod_pure_j2000 - on.lod_pure_j2000) < 1e-12
  && on.steph_rms_demeaned < 40 && deepOk;
console.log(`\nVERDICT: ${pass ? 'ALL CHECKS PASS' : 'CHECK FAILURES — see above'}`);

fs.writeFileSync(path.join(REPO, 'data', 'core-mantle-resonator-stage3-validation.json'),
  JSON.stringify({
    _meta: { description: 'Stage 3.3 runtime validation sweep: production chain with the Core-mantle swing toggle OFF vs ON (shipped constants, production deltaTStart). Companion: stage3-stability (epochs = convention) and the Stage 3.2 closure hook in dt-corrections-fit.js (resonator-aware closure improves Espenak 21.66 → 17.32 s in dry run — default-ON-time decision).' },
    off, on, pass,
  }, null, 2));
console.log('Wrote data/core-mantle-resonator-stage3-validation.json');
