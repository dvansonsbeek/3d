#!/usr/bin/env node
// THE SCENE'S SOLAR MEASUREMENTS AGAINST THE PUBLISHED LAWS, epoch by epoch —
// reads scene-sample-events.cjs output and checks every measured column and
// every year length against the model (owner, 2026-09-30: "all calculations
// should match what we measure in the scene").
//
//   A. levels: RA at the cardinals; the solstice declination against ε of date;
//      e from the distance extremes against the series; the Sun's certified
//      longitude at perihelion against the apsidal line of date; the published
//      cardinal instants against the scene crossings (minus aberration+nutation).
//   B. year lengths over the window: the planetary completion terms
//      (sunLonDegAtJD − sunLonCompletedDegAtJD, up to ~10″ per event — the
//      6.44″ lunar equation and the 1,783-yr inequality) are REMOVED per event
//      first, so a ±200-yr window resolves milliseconds; sidereal = the
//      cumulative sidereal angle (one turn per event minus the world-angle
//      advance), four-cardinal mean so the equation of centre cancels;
//      tropical/anomalistic = least-squares slopes of the event instants.
//
//   node tools/explore/scene-sample-check.cjs <epoch> [<epoch> …]
//   (each epoch's sample file: tools/explore/scene-sample-<epoch>.local.json)
//
// Read-only against the model. The gated form of this check is
// tools/verify/scene-year-lengths.js.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const rq = require('module').createRequire(path.join(ROOT, 'package.json'));
const C = require(path.join(ROOT, 'tools/lib/constants.js'));
const DT = require(path.join(ROOT, 'tools/lib/deep-time.js'));
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const P = rq('@essrt/physics');
const { jdToDecimalYear } = rq('@essrt/physics/moon/arguments');
const BRIDGE = P.DEFAULT_CONSTANTS.earthOrbital.deltaTStart;
const M = DOH.createOneSourceMovement();
const YL = M.yearLengths;
const model = P.createModel(undefined, { secularSeriesArtifact: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/nbody-secular-series.json'), 'utf8')) });
const E = model.eclipse;
const jdTT = (jd) => jd + (BRIDGE + DT.meanDeltaTSecondsAtAge((C.startmodelYear - jdToDecimalYear(jd)) / 1e6)) / 86400;
const engineYear = (jd) => 2000 + (jdTT(jd) - C.j2000JD) / 365.25;
const fin = (jd) => jd + BRIDGE / 86400;
const w180 = (d) => ((d + 540) % 360 + 360) % 360 - 180;
const EPOCHS = process.argv.slice(2).map(Number);
const CARD = ['VE', 'SS', 'AE', 'WS'], TARGET = { VE: 0, SS: 90, AE: 180, WS: 270 };
const lsq = (x, y) => { const n = x.length; let sx = 0, sy = 0; for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; } const mx = sx / n, my = sy / n; let a = 0, b = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; } const s = a / b; let r = 0; for (let i = 0; i < n; i++) r += (y[i] - my - s * (x[i] - mx)) ** 2; return { slope: s, rms: Math.sqrt(r / n) }; };
const f3 = (v) => (v >= 0 ? '+' : '') + v.toFixed(3);
const out = [];
for (const ep of EPOCHS) {
  const file = path.join(__dirname, `scene-sample-${ep}.local.json`);
  if (!fs.existsSync(file)) { console.log(`\n##### epoch ${ep}: no sample file (${path.relative(ROOT, file)}) — run scene-sample-events.cjs ${ep} first`); continue; }
  const rows = {};
  for (const f of JSON.parse(fs.readFileSync(file, 'utf8')).rows) (rows[f[0]] ||= []).push({ idx: f[1], jd: f[2], ra: f[3], dec: f[4], wa: f[5], wob: f[6] });
  const HALF = (rows.VE.length - 1) / 2;
  for (const t of Object.keys(rows)) {
    const r = rows[t]; let acc = 0;
    for (let i = 0; i < r.length; i++) {
      const e = r[i];
      e.tt = jdTT(e.jd) * 86400;                       // TT seconds
      e.y = engineYear(e.jd);
      const bare = E.sunLonDegAtJD(fin(e.jd)), done = E.sunLonCompletedDegAtJD(fin(e.jd));
      e.lam = done;                                    // the certified (completed, geometric) longitude of date
      e.compl = w180(bare - done);                     // λ_scene = bare − compl
      e.n = w180(E.sunLonDegAtJD(fin(e.jd) + 0.5) - E.sunLonDegAtJD(fin(e.jd) - 0.5));   // deg per day
      e.ttBare = e.tt - (e.compl / e.n) * 86400 * (jdTT(e.jd + 0.5) - jdTT(e.jd - 0.5));   // the bare Sun's event, TT s
      if (i > 0) acc += w180(e.wa - r[i - 1].wa);
      e.phi = (e.idx - r[0].idx) * 360 - acc;          // sidereal angle travelled since the first row (scene Sun)
      e.phiBare = e.phi + e.compl;
    }
  }
  const mid = (t) => rows[t][HALF];
  const yc = CARD.reduce((s, t) => s + mid(t).y, 0) / 4;
  const wOf = (i) => 1 - ((i - HALF) / (HALF + 0.5)) ** 2;      // the slope fit's weighting of local rates
  const wMean = (fn, t) => { let s = 0, w = 0; rows[t].forEach((e, i) => { const k = wOf(i); s += k * fn(e.y); w += k; }); return s / w; };
  console.log(`\n##### epoch ${ep}  (engine year of the centre ${yc.toFixed(1)}, window ±${HALF} yr, ${Object.values(rows).reduce((s, r) => s + r.length, 0)} events)`);

  // ── A. levels ──
  const raMax = Math.max(...CARD.flatMap((t) => rows[t].map((e) => Math.abs(w180(e.ra - TARGET[t])) * 3600)));
  const lamMax = Math.max(...CARD.flatMap((t) => rows[t].map((e) => Math.abs(w180(e.lam - TARGET[t])) * 3600)));
  const epsD = [...rows.SS.map((e) => (e.dec - M.epsDeg(e.y)) * 3600), ...rows.WS.map((e) => (-e.dec - M.epsDeg(e.y)) * 3600)];
  const epsMax = Math.max(...epsD.map(Math.abs));
  const eMeas = (mid('APH').wob - mid('PERI').wob) / (mid('APH').wob + mid('PERI').wob), eLaw = M.e(yc);
  const periD = rows.PERI.map((e) => w180(e.lam - (M.periOfDateDeg(e.y) + 180)) * 3600);
  const aphD = rows.APH.map((e) => w180(e.lam - M.periOfDateDeg(e.y)) * 3600);
  const periMax = Math.max(...periD.map(Math.abs), ...aphD.map(Math.abs));
  let instOff = 0, instResMax = 0, nI = 0;
  for (const t of CARD) for (const i of [0, HALF, 2 * HALF]) {
    const e = rows[t][i];
    const inst = model.cardinal.jdNearUT(e.jd, t);
    const appMinusGeo = w180(E.sunApparentLonDegAtJD(fin(inst)) - E.sunLonCompletedDegAtJD(fin(inst)));   // Δψ − κ, deg
    const off = (inst - e.jd) * 86400, pred = (-appMinusGeo / e.n) * 86400;
    instOff += off; nI++; instResMax = Math.max(instResMax, Math.abs(off - pred));
  }
  console.log(`A  RA at the cardinals: max |dev| ${raMax.toFixed(3)}″ · certified longitude at the events: max |dev| ${lamMax.toFixed(3)}″`);
  console.log(`   obliquity (solstice declination − ε of date): max |dev| ${epsMax.toFixed(4)}″ · ε(centre) ${M.epsDeg(yc).toFixed(6)}°`);
  console.log(`   eccentricity from the distance extremes ${eMeas.toFixed(7)} vs the series ${eLaw.toFixed(7)} (Δ ${(eMeas - eLaw).toExponential(2)}) · PERI ${mid('PERI').wob.toFixed(6)} APH ${mid('APH').wob.toFixed(6)} AU`);
  console.log(`   Sun's longitude at perihelion/aphelion − the apsidal line of date: max |dev| ${periMax.toFixed(2)}″`);
  console.log(`   published cardinal instant − scene crossing: mean ${(instOff / nI / 60).toFixed(2)} min; minus the aberration+nutation shift: max |residual| ${instResMax.toFixed(3)} s`);

  // ── B. year lengths ──
  const idx = rows.VE.map((e) => e.idx);
  const yr = {}, yrRaw = {};
  for (const t of [...CARD, 'PERI', 'APH']) { yr[t] = lsq(idx, rows[t].map((e) => e.ttBare)).slope; yrRaw[t] = lsq(idx, rows[t].map((e) => e.tt)).slope; }
  const trop = CARD.reduce((s, t) => s + yr[t], 0) / 4, tropRaw = CARD.reduce((s, t) => s + yrRaw[t], 0) / 4;
  const tropLaw = wMean(YL.tropicalYearSecondsAtYear, 'SS');
  const pbar = idx.map((_, i) => CARD.reduce((s, t) => s + rows[t][i].phiBare, 0) / 4);
  const praw = idx.map((_, i) => CARD.reduce((s, t) => s + rows[t][i].phi, 0) / 4);
  const tEv = idx.map((_, i) => CARD.reduce((s, t) => s + rows[t][i].tt, 0) / 4);
  const fitB = lsq(tEv, pbar), fitR = lsq(tEv, praw);
  const sid = 360 / fitB.slope, sidRaw = 360 / fitR.slope;
  const sidLaw = wMean(YL.siderealYearSecondsAtYear, 'SS');
  const anom = (yr.PERI + yr.APH) / 2, anomLaw = wMean(YL.anomalisticYearSecondsAtYear, 'PERI');
  const D = 86400;
  console.log('B  year length of date, SI seconds → shown as SI days; Δ = scene − law in seconds');
  console.log('   quantity            scene (SI d)      law (SI d)       Δ s     raw scene Δ s (periodic terms left in)');
  const line = (name, m, l, raw) => console.log('   ' + name.padEnd(18) + (m / D).toFixed(9).padStart(14) + (l / D).toFixed(9).padStart(16) + f3(m - l).padStart(10) + (raw === undefined ? '' : f3(raw - l).padStart(12)));
  line('sidereal', sid, sidLaw, sidRaw);
  line('tropical (mean)', trop, tropLaw, tropRaw);
  for (const t of CARD) line(`  ${t}-to-${t}`, yr[t], wMean((y) => YL.cardinal.yearLengthSeconds(y, t), t), yrRaw[t]);
  line('anomalistic', anom, anomLaw, (yrRaw.PERI + yrRaw.APH) / 2);
  console.log(`     (PERI ${f3(yr.PERI - anomLaw)} s, APH ${f3(yr.APH - anomLaw)} s)`);
  const pAx = sid * trop / ((sid - trop) * 365.25 * 86400), pAxLaw = wMean(YL.axialPrecessionYearsAtYear, 'SS');
  const pPeri = anom * trop / ((anom - trop) * 365.25 * 86400), pPeriLaw = wMean(YL.perihelionPrecessionYearsAtYear, 'PERI');
  const pAps = anom * sid / ((anom - sid) * 365.25 * 86400), pApsLaw = wMean(YL.inclinationPrecessionYearsAtYear, 'PERI');
  console.log(`   beats from the scene pairs, Julian yr: axial ${pAx.toFixed(1)} vs law ${pAxLaw.toFixed(1)} (Δ ${f3(pAx - pAxLaw)}) · perihelion-of-date ${pPeri.toFixed(0)} vs ${pPeriLaw.toFixed(0)} · apsidal ${pAps.toFixed(0)} vs ${pApsLaw.toFixed(0)}`);
  console.log(`   fit scatter: sidereal phase ${(fitB.rms * 3600).toFixed(2)}″ (raw ${(fitR.rms * 3600).toFixed(2)}″)`);
  out.push({ ep, yc, dSid: sid - sidLaw, dTrop: trop - tropLaw, dAnom: anom - anomLaw, dAx: pAx - pAxLaw, raMax, epsMax, de: eMeas - eLaw, periMax, instResMax, sid, trop, anom, sidLaw, tropLaw, anomLaw });
}
console.log('\n===== summary: scene − law');
console.log('epoch        Δsid s   Δtrop s   Δanom s   Δaxial yr   RA max″   ε max″   e Δ        peri″   instants s');
for (const o of out) console.log(String(o.ep).padStart(9) + f3(o.dSid).padStart(10) + f3(o.dTrop).padStart(10) + f3(o.dAnom).padStart(10) + f3(o.dAx).padStart(11) + o.raMax.toFixed(3).padStart(10) + o.epsMax.toFixed(3).padStart(9) + o.de.toExponential(1).padStart(10) + o.periMax.toFixed(1).padStart(8) + o.instResMax.toFixed(2).padStart(10));
fs.writeFileSync(path.join(__dirname, 'scene-sample-check.local.json'), JSON.stringify(out, null, 1));
