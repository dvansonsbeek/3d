/**
 * timed-babylonian-lunar-eclipses.js
 *
 * THE DISCRIMINATING TEST between the two e_E-channel attributions:
 * compare model-predicted lunar-eclipse phase times against DOCUMENTED
 * (recorded, not computed) Babylonian timings — the classical corpus
 * preserved in Ptolemy's Almagest (IV.6, IV.9, V.14), observed at Babylon.
 * These are the same records Fotheringham, Newcomb and Stephenson built the
 * ΔT literature on; here they are used WITHOUT any conventional-theory
 * reduction: the recorded statement ("middle at midnight", "began more than
 * an hour after moonrise", "one equinoctial hour before midnight", "N hours
 * of night had passed") is converted to UT using only local astronomy at
 * Babylon (sunset / sunrise / moonrise / apparent midnight computed from the
 * model's own Sun and Moon + standard Earth rotation), so NO Espenak/Meeus
 * ΔT or eclipse canon enters the comparison.
 *
 * Why this discriminates: the framework H/16 e_E law (e-max 1246) and the
 * secular-theory attribution (Meeus arguments) differ by ΔM' ≈ −36…−45° at
 * these epochs. That shifts predicted eclipse times by up to ~±2 h with an
 * event-by-event signature (∝ sin M') that NO smooth ΔT curve can absorb.
 * A handful of hour-quality recorded timings is therefore decisive.
 *
 * Modes (same scene-graph machinery as L-2/L-4 offline):
 *   node tools/explore/timed-babylonian-lunar-eclipses.js            (framework args)
 *   MOON_ARGS_PURE_MEEUS=1 node tools/explore/...                    (pure Meeus A/B)
 *
 * ΔT: framework's own chain (frameworkDeltaT, J2000-zero convention — same
 * as the browser's _eclDeltaT used by audit-26). Identical in both modes, so
 * any mode difference below is PURELY the Moon-argument attribution.
 *
 * CORPUS PROVENANCE / CAUTION: dates are standard (astronomical year
 * numbering, proleptic Julian calendar); timing statements encoded from the
 * standard Almagest translations (Toomer) with a per-event confidence tag.
 * Verify against Stephenson (1997) "Historical Eclipses and Earth's
 * Rotation" Ch. 6 tables before any doc/paper integration. Recorded-time
 * uncertainty bands (±) are deliberately generous.
 */

const { computePlanetPosition, thetaToRaDeg, phiToDecDeg } = require('../lib/scene-graph');
const DT = require('../lib/deep-time');

const d2r = Math.PI / 180;
const J2000_JD = 2451545.0;
const AU_KM = 149597870.7;
const BABYLON = { latDeg: 32.5424, lonEastDeg: 44.4207 };

// ─── Meeus Ch.25 Sun (same source the framework eclipse machinery uses) ────
function sunState(jd_tt) {
  const T = (jd_tt - J2000_JD) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * d2r;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const Ceq = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
            + 0.000289 * Math.sin(3 * M);
  const trueLon = (((L0 + Ceq) % 360) + 360) % 360;
  const v = M + Ceq * d2r;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(v));
  const eps = (23.439291 - 0.0130042 * T) * d2r;
  const lam = trueLon * d2r;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
  const dec = Math.asin(Math.sin(lam) * Math.sin(eps));
  return { lonDeg: trueLon, raDeg: ((ra / d2r) + 360) % 360, decDeg: dec / d2r, distAU: R, epsRad: eps };
}

// ─── Moon geocentric state from scene graph (mode-switched arguments) ──────
function moonState(jd_tt) {
  // The scene graph's jd axis is UT (it applies the framework's UT→TT shift
  // internally — the Phase 9.16 convention, mirrored into tools during the
  // earth-chain TT-alignment fix). This tool works on a TT axis, so convert
  // TT→UT before querying; the model re-applies ΔT internally, netting the
  // certified TT semantics (round-trip error ~microseconds).
  const pos = computePlanetPosition('moon', ttToUt(jd_tt));
  const ra = thetaToRaDeg(pos.ra) * d2r;
  const dec = phiToDecDeg(pos.dec) * d2r;
  const T = (jd_tt - J2000_JD) / 36525;
  const eps = (23.439291 - 0.0130042 * T) * d2r;
  const sinBeta = Math.sin(dec) * Math.cos(eps) - Math.cos(dec) * Math.sin(eps) * Math.sin(ra);
  const beta = Math.asin(sinBeta);
  const lam = Math.atan2(Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps), Math.cos(ra));
  return {
    lonDeg: (((lam / d2r) % 360) + 360) % 360,
    betaDeg: beta / d2r,
    raDeg: ((ra / d2r) + 360) % 360,
    decDeg: dec / d2r,
    distKm: pos.distAU * AU_KM,
  };
}

// ─── Shadow geometry (Danjon-rule umbra, as in the browser lunar finder) ───
function shadowSeparationDeg(jd_tt) {
  const m = moonState(jd_tt);
  const s = sunState(jd_tt);
  const shadowLon = (s.lonDeg + 180) % 360;
  let dLon = m.lonDeg - shadowLon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const sep = Math.sqrt((dLon * Math.cos(m.betaDeg * d2r)) ** 2 + m.betaDeg ** 2);
  const piM = Math.asin(6378.14 / m.distKm) / d2r;
  const sSun = (959.63 / 3600) / s.distAU;
  const piS = (8.794 / 3600) / s.distAU;
  const uRad = 1.02 * (0.99834 * piM - sSun + piS);   // umbral radius, deg
  const sMoon = 0.2725 * piM;                          // Moon semidiameter, deg
  return { sep, uRad, sMoon };
}

// ─── Root/extremum finders ─────────────────────────────────────────────────
function findOppositionTT(jdGuess) {
  const f = (jd) => {
    const m = moonState(jd), s = sunState(jd);
    let d = m.lonDeg - s.lonDeg - 180;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };
  let a = jdGuess - 1.5, b = jdGuess + 1.5;
  let fa = f(a);
  let step = 0.125, t = a;
  let lo = null, hi = null;
  while (t < b) {
    const t2 = t + step, f2 = f(t2);
    if (fa <= 0 && f2 > 0) { lo = t; hi = t2; break; }
    t = t2; fa = f2;
  }
  if (lo === null) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) <= 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function findMidEclipseTT(jdOpp) {
  // golden-section on separation around opposition
  const g = (jd) => shadowSeparationDeg(jd).sep;
  let a = jdOpp - 0.12, b = jdOpp + 0.12;
  const phi = (Math.sqrt(5) - 1) / 2;
  let c = b - phi * (b - a), d = a + phi * (b - a);
  let fc = g(c), fd = g(d);
  for (let i = 0; i < 50; i++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - phi * (b - a); fc = g(c); }
    else { a = c; c = d; fc = fd; d = a + phi * (b - a); fd = g(d); }
  }
  return (a + b) / 2;
}

function findUmbralContactTT(jdMid, direction) {
  // root of sep − (u + sMoon), searching outward from mid-eclipse
  const h = (jd) => { const s = shadowSeparationDeg(jd); return s.sep - (s.uRad + s.sMoon); };
  let a = jdMid, b = jdMid + direction * 0.20;
  if (h(a) >= 0) return null;   // no umbral eclipse
  let lo = a, hi = b;
  if (h(hi) < 0) return null;
  for (let i = 0; i < 55; i++) {
    const mid = (lo + hi) / 2;
    if (h(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── Earth-rotation-side local astronomy (standard, model-independent) ─────
function gmstDeg(jd_ut) {
  const D = jd_ut - J2000_JD;
  const T = D / 36525;
  return ((280.46061837 + 360.98564736629 * D + 0.000387933 * T * T) % 360 + 360) % 360;
}
function altitudeDeg(jd_ut, raDeg, decDeg) {
  const lha = (gmstDeg(jd_ut) + BABYLON.lonEastDeg - raDeg) * d2r;
  const lat = BABYLON.latDeg * d2r, dec = decDeg * d2r;
  return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(lha)) / d2r;
}
function ttToUt(jd_tt) { return jd_tt - DT.frameworkDeltaT(jd_tt) / 86400; }

/** Find crossing of body altitude through h0 in UT window [a,b] (rising if dirUp). */
function findAltCrossingUT(aUt, bUt, h0, dirUp, bodyFn) {
  const f = (jdUt) => {
    const body = bodyFn(jdUt + DT.frameworkDeltaT(jdUt) / 86400);
    return altitudeDeg(jdUt, body.raDeg, body.decDeg) - h0;
  };
  const step = (bUt - aUt) / 96;
  let t = aUt, ft = f(t);
  while (t < bUt) {
    const t2 = t + step, f2 = f(t2);
    if ((dirUp && ft < 0 && f2 >= 0) || (!dirUp && ft > 0 && f2 <= 0)) {
      let lo = t, hi = t2;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2, fm = f(mid);
        if ((dirUp && fm < 0) || (!dirUp && fm > 0)) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    t = t2; ft = f2;
  }
  return null;
}

/** Local apparent time (hours, 0=apparent midnight) at Babylon for a UT jd. */
function localApparentHours(jd_ut) {
  const s = sunState(jd_ut + DT.frameworkDeltaT(jd_ut) / 86400);
  const lhaSun = ((gmstDeg(jd_ut) + BABYLON.lonEastDeg - s.raDeg) % 360 + 360) % 360;
  return ((lhaSun / 15) + 12) % 24;
}

function calToJD(year, month, day, hourUT) {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const B = (year > 1582) ? (2 - Math.floor(y / 100) + Math.floor(Math.floor(y / 100) / 4)) : 0;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hourUT / 24 + B - 1524.5;
}

// ─── The corpus (Almagest, observed at Babylon) ────────────────────────────
// phase: which model time the record clocks. reduction: how the recorded
// statement becomes a UT via local astronomy. band_h: generous record
// uncertainty (reading + statement precision), hours.
const CORPUS = [
  {
    label: '-720 Mar 19/20  Mardokempad 1 (Almagest IV.6)',
    guessTT: calToJD(-720, 3, 19, 21), confidence: 'high',
    recordText: 'total; eclipse began well over an hour after moonrise',
    recordedDigits: 12,
    phase: 'first_contact', reduction: { type: 'after_moonrise', offsetH: 1.25 }, band_h: 0.5,
  },
  {
    label: '-719 Mar  8/9   Mardokempad 2 (Almagest IV.6)',
    guessTT: calToJD(-719, 3, 8, 21), confidence: 'high',
    recordText: 'partial, 3 digits from the south; middle at midnight',
    recordedDigits: 3,
    phase: 'mid', reduction: { type: 'local_apparent_hours', hours: 0.0 }, band_h: 0.5,
  },
  {
    label: '-719 Sep  1/2   Mardokempad 2 (Almagest IV.6)',
    guessTT: calToJD(-719, 9, 1, 18), confidence: 'low (vague statement)',
    recordText: 'partial from the north; began after moonrise',
    recordedDigits: null,
    phase: 'first_contact', reduction: { type: 'after_moonrise', offsetH: 0.75 }, band_h: 0.75,
  },
  {
    label: '-522 Jul 16/17  Kambyses 7    (Almagest V.14)',
    guessTT: calToJD(-522, 7, 16, 20), confidence: 'high',
    recordText: 'eclipsed half from the north, one equinoctial hour before midnight',
    recordedDigits: 6,
    phase: 'mid', reduction: { type: 'local_apparent_hours', hours: 23.0 }, band_h: 0.5,
  },
  {
    label: '-501 Nov 19/20  Darius 20     (Almagest IV.9)',
    guessTT: calToJD(-501, 11, 19, 20), confidence: 'medium (verify hours count)',
    recordText: 'partial from the south; when 6 1/3 hours of night had passed',
    recordedDigits: 3,
    phase: 'mid', reduction: { type: 'after_sunset_equinoctial', offsetH: 6.333 }, band_h: 0.75,
  },
  {
    label: '-490 Apr 25/26  Darius 31     (Almagest IV.9)',
    guessTT: calToJD(-490, 4, 25, 20), confidence: 'medium (seasonal hours)',
    recordText: 'partial 2 digits from the south; at the middle of the sixth hour of night',
    recordedDigits: 2,
    phase: 'mid', reduction: { type: 'after_sunset_seasonal', seasonalHours: 5.5 }, band_h: 0.6,
  },
];

// ─── Run ───────────────────────────────────────────────────────────────────
const MODE = process.env.MOON_ARGS_PURE_MEEUS === '1' ? 'PURE MEEUS (secular-theory args)' : 'FRAMEWORK (H/16 e_E law args)';
console.log('═'.repeat(100));
console.log('  Timed Babylonian lunar eclipses (documented records) vs model — mode: ' + MODE);
console.log('  Record→UT via local astronomy only (no external ΔT, no eclipse canon). ΔT: framework chain.');
console.log('═'.repeat(100));
console.log('  Event                                          ΔT(s)   mag(dig)  rec(dig)  model−record(min)   band(±min)');
console.log('  ' + '─'.repeat(96));

const rows = [];
for (const ev of CORPUS) {
  const opp = findOppositionTT(ev.guessTT);
  if (opp === null) { console.log(`  ${ev.label}  — NO OPPOSITION FOUND`); continue; }
  const midTT = findMidEclipseTT(opp);
  const s = shadowSeparationDeg(midTT);
  const magDigits = 12 * (s.uRad + s.sMoon - s.sep) / (2 * s.sMoon);
  const c1TT = findUmbralContactTT(midTT, -1);
  const dTsec = DT.frameworkDeltaT(midTT);

  const phaseTT = ev.phase === 'first_contact' ? c1TT : midTT;
  if (phaseTT === null) {
    console.log(`  ${ev.label.padEnd(46)} ${dTsec.toFixed(0).padStart(6)}  ${magDigits.toFixed(1).padStart(7)}  — model predicts NO umbral eclipse (record disagrees)`);
    rows.push({ ev, delta: null });
    continue;
  }
  const phaseUT = ttToUt(phaseTT);

  // reduce the recorded statement to a UT
  const midUTguess = ttToUt(midTT);
  let recordUT = null, note = '';
  const r = ev.reduction;
  if (r.type === 'local_apparent_hours') {
    // find UT near phaseUT where local apparent time = r.hours
    const lat0 = localApparentHours(phaseUT);
    let dh = r.hours - lat0;
    while (dh > 12) dh -= 24;
    while (dh < -12) dh += 24;
    recordUT = phaseUT + dh / 24;   // solar rate ≈ 1; adequate at these scales
  } else if (r.type === 'after_moonrise') {
    const rise = findAltCrossingUT(midUTguess - 10 / 24, midUTguess + 2 / 24, 0.125, true, moonState);
    if (rise === null) { note = 'no moonrise found'; }
    else recordUT = rise + r.offsetH / 24;
  } else if (r.type === 'after_sunset_equinoctial' || r.type === 'after_sunset_seasonal') {
    const sunset = findAltCrossingUT(midUTguess - 12 / 24, midUTguess, -0.833, false, sunState);
    const sunrise = findAltCrossingUT(midUTguess, midUTguess + 12 / 24, -0.833, true, sunState);
    if (sunset === null || sunrise === null) { note = 'no sunset/sunrise found'; }
    else if (r.type === 'after_sunset_equinoctial') recordUT = sunset + r.offsetH / 24;
    else recordUT = sunset + (r.seasonalHours / 12) * (sunrise - sunset);
  }

  if (recordUT === null) {
    console.log(`  ${ev.label.padEnd(46)} ${dTsec.toFixed(0).padStart(6)}  ${magDigits.toFixed(1).padStart(7)}  reduction failed: ${note}`);
    rows.push({ ev, delta: null });
    continue;
  }
  const deltaMin = (phaseUT - recordUT) * 1440;
  rows.push({ ev, delta: deltaMin, magDigits });
  console.log(`  ${ev.label.padEnd(46)} ${dTsec.toFixed(0).padStart(6)}  ${magDigits.toFixed(1).padStart(7)}  ${String(ev.recordedDigits ?? '—').padStart(7)}  ${deltaMin >= 0 ? '+' : ''}${deltaMin.toFixed(0).padStart(6)} min          ±${(ev.band_h * 60).toFixed(0)}`);
}

const ok = rows.filter(r => r.delta !== null);
if (ok.length) {
  const mean = ok.reduce((a, r) => a + r.delta, 0) / ok.length;
  const rms = Math.sqrt(ok.reduce((a, r) => a + r.delta * r.delta, 0) / ok.length);
  const within = ok.filter(r => Math.abs(r.delta) <= r.ev.band_h * 60).length;
  console.log('  ' + '─'.repeat(96));
  console.log(`  N=${ok.length}   mean ${mean >= 0 ? '+' : ''}${mean.toFixed(0)} min   RMS ${rms.toFixed(0)} min   within record band: ${within}/${ok.length}`);
  console.log('  (a smooth ΔT offset shifts the MEAN; attribution errors show as large RMS about the mean)');
}
console.log('═'.repeat(100));
