#!/usr/bin/env node
/**
 * UMBRA SCENE→NODE TWIN — the feasibility probe for §12h follow-up item 2
 * ========================================================================
 *
 * Reproduces the browser's `umbraFromSceneAtJd` (script.js:45117 — the
 * scene-state umbra centerline the audit-26 and Babylon −135 campaigns
 * ride) in pure Node, verified against the regression fixture's
 * `ecl.umbraScene@JD` probes:
 *
 *   MEASURED: ≤ 0.001 km at ALL six fixture JDs — the three modern
 *   (2024 Dallas, 1999 Constanța, 2023 annular) AND the three ancient
 *   Babylonian probes. The first verified run read 0.19–0.21 km modern /
 *   7–9 km ancient; both residuals were ONE bug — the engine's UT→TT
 *   helper used a linear 365.2425 t_Ma while the browser uses the
 *   calendar decimal year (fixed in tools/lib/scene-graph.js
 *   _jdTTToolsFromUT). Far below the audit's 300/1000 km verdict
 *   thresholds and its 6–20 km scan sampling floor.
 *
 * THE CHAIN (each piece was isolated before composing):
 *   · Sun + Earth: scene-graph scaffold world positions
 *     (`computePlanetPosition` navigation; sub-solar point verified to
 *     ~0.1° against reality first — proves the orientation chain alone).
 *   · Moon: NOT the scaffold moon — the browser render loop overrides
 *     the Moon pivot with the Meeus Ch. 47 series position each frame
 *     (script.js:53465-77: spherical(ra, dec, meeusDistKm) in the
 *     earth.rotationAxis LOCAL frame → world). The scaffold moon differs
 *     by several arcmin at eclipse JDs (measured γ 0.223 vs 0.353 at
 *     Dallas) — using it puts the umbra ~1000-1800 km off. The engine's
 *     `computePlanetPosition('moon', jd)` already returns the overridden
 *     ra/dec (theta/phi) + meeusDistKm, so the twin just places the
 *     series vector in the rotAxis frame like the browser does.
 *   · Earth spin: planetObj world rotation = rotAxis world rotation ·
 *     Ry(rotationSpeed · pos), rotationSpeed = 2π · SI_TROPICAL_YEAR_DAYS
 *     · 86400 / siderealDaySec_J2000 (script.js:5333 — Earth is NOT
 *     _dtRotN-tagged, so the constant-J2000-rate branch applies in deep
 *     time too), pos = the integrated posFromJD.
 *   · Sphere piercing + lat/lon: browser algorithm verbatim
 *     (R_E scene = (12756.27/2 / AU_km) · 100; lon = atan2(z, −x)).
 *
 * Run: node tools/explore/umbra-scene-node-twin.js
 * Exit 1 if any fixture gap exceeds 1 km (regression guard for the
 * eventual audit-26/Babylon generator port).
 */

const path = require('path');
const SG = require(path.join(__dirname, '../lib/scene-graph.js'));
const DT = require(path.join(__dirname, '../lib/deep-time.js'));
const C = require(path.join(__dirname, '../lib/constants.js'));

const EARTH_DIAMETER_KM = C.EARTH_DIAMETER_KM; // single source: astro-reference bodyDiametersKm.earth
const SI_TROPICAL_YEAR_DAYS = (C.meanSolarYearDays * C.meanLengthOfDay) / 86400;
const SIDEREAL_DAY_SEC_J2000 = 86400 * C.inputMeanSolarYear / (C.inputMeanSolarYear + 1);
const ROTATION_SPEED = Math.PI * 2 * SI_TROPICAL_YEAR_DAYS * 86400 / SIDEREAL_DAY_SEC_J2000;
const R_E_SCENE = (EARTH_DIAMETER_KM / 2 / C.currentAUDistance) * 100;

const rotPart = (m) => { const e = m.e; return [[e[0], e[4], e[8]], [e[1], e[5], e[9]], [e[2], e[6], e[10]]]; };
const apply = (R, v) => [
  R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
  R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
  R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2],
];
const applyT = (R, v) => [
  R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2],
  R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2],
  R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2],
];

/** 20.3c Step 2: the 18.6-yr nutation (Ω term only — the DERIVED term:
 *  tools/explore/derive-nutation-torque-integration.js recovers the
 *  amplitudes at 100.3%/100.1% from the framework torque law; the IAU 1980
 *  block in astro-reference is the validation reference). Ω uses the
 *  attributed J2000 anchor + the FRAMEWORK node rate. Applied to the
 *  GROUND MAPPING only: the bodies' missing common-mode nutation cancels
 *  in the shadow direction; what remains is where the Earth sits under it.
 *  @param {number} jd @returns {{dPsiRad: number, dEpsRad: number, epsRad: number}} */
function nutationAt(jd) {
  const N = C.NUTATION_LEADING_TERMS_ARCSEC;
  const omDeg = N.omegaNodeJ2000Deg - 360 * (jd - 2451545.0) / C.moonNodalPrecessionDaysEarth;
  const om = omDeg * Math.PI / 180;
  const AS = Math.PI / 180 / 3600;
  return {
    dPsiRad: N.psiOmega * Math.sin(om) * AS,
    dEpsRad: N.epsOmega * Math.cos(om) * AS,
    epsRad: C.earthtiltMean * Math.PI / 180,
  };
}

/** Node twin of browser umbraFromSceneAtJd. Returns {lat, lon} or null. */
function umbraFromSceneAtJdNode(jd) {
  const res = SG.computePlanetPosition('moon', jd);   // navigates + animates
  const g = SG._getGraphForProbe();
  const sun = g.sunNodes.pivot.getWorldPosition();
  const earth = g.earthNodes.rotAxis.getWorldPosition();
  const R = rotPart(g.earthNodes.rotAxis.worldMatrix);

  // Moon: series override placed in the rotAxis local (equatorial) frame,
  // exactly like the browser's _moonVisualCorrection scene write.
  const r = res.meeusDistKm * 100 / C.currentAUDistance;
  const th = res.ra, ph = res.dec;
  const vLocal = [r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph), r * Math.sin(ph) * Math.cos(th)];
  const moonGeo = apply(R, vLocal);
  const sunGeo = [sun[0] - earth[0], sun[1] - earth[1], sun[2] - earth[2]];

  // B1: solar annual aberration — the apparent Sun lags the geometric Sun
  // by κ/r along the ecliptic (κ = 20.4955″). The scene Sun is geometric;
  // JPL, the NASA canon and the sky are apparent. Rotation about world Y
  // (the ecliptic pole); the −sign was measured against JPL (framework Sun
  // RA 17.93245° → 17.92714°, toward JPL 17.91943° at 2024-04-08 18:42).
  // MATCHED PAIR with src/script.js umbraFromSceneAtJd — change both or
  // neither.
  {
    const rAu = Math.hypot(sunGeo[0], sunGeo[1], sunGeo[2]) / 100;
    const a = -(C.ABERRATION_CONSTANT_ARCSEC / 3600) * (Math.PI / 180) / rAu;
    const c0 = Math.cos(a), s0 = Math.sin(a);
    const x = c0 * sunGeo[0] + s0 * sunGeo[2];
    sunGeo[2] = -s0 * sunGeo[0] + c0 * sunGeo[2];
    sunGeo[0] = x;
  }

  // 20.3c: the solstitial-axis plane tilt — the scene sun's ecliptic
  // latitude sits 20.0″·cos λ BELOW the true apparent sun (measured against
  // JPL over 120 points spanning 2000–2049; CONSTANT across the two
  // 25-year halves at −19.9″/−20.0″ — a calibration-class layer-phase
  // offset, not secular drift; node on the solstitial axis, matching the
  // scene's solstice-anchor construction). This single term IS the
  // seasonal relative-dec error at eclipses (+13.6″ Apr / −22″ Aug).
  // Applied by rebuilding the vector from corrected ecliptic angles.
  // MEASUREMENT-CALIBRATED constant (observationally-defined class);
  // source attribution in the of-date layer phases is the banked follow-up.
  {
    const rr = Math.hypot(sunGeo[0], sunGeo[1], sunGeo[2]);
    const lamW = Math.atan2(sunGeo[0], sunGeo[2]);
    const bet = Math.asin(sunGeo[1] / rr);
    // World-frame law, measured over 1970–2049 (144 JPL points, decadal
    // structure at 0.8″ RMS): scene sun DEC − truth =
    //   [−7.2″ + 4.8″·cosΩ]·sin(λw) + 15.2″·cos(λw)
    // The cosΩ oscillation rides the model's OWN lunar node (the derived
    // nutation driver; projection factor measured); the two constants are
    // frame-calibration class (80-year-stable, era-split proven).
    // FRAME-INVARIANT argument: sun azimuth relative to the axis-tilt
    // direction (the solstitial colure) — each engine computes it in its
    // own world frame; the twin-parity gate caught the frame-dependent
    // first form (the engines' world yaws differ by ~68° by construction).
    const om = (C.NUTATION_LEADING_TERMS_ARCSEC.omegaNodeJ2000Deg
      - 360 * (jd - 2451545.0) / C.moonNodalPrecessionDaysEarth) * (Math.PI / 180);
    const axAz = Math.atan2(R[0][1], R[2][1]);   // axis dir = R column 2 (x,z)
    const phi = lamW - axAz;
    const dDecLaw = 16.6 * Math.sin(phi) + (1.0 - 4.9 * Math.cos(om)) * Math.cos(phi);
    const dBet = -(dDecLaw / 3600) * (Math.PI / 180);
    const b2 = bet + dBet;
    const scale = Math.cos(b2) / Math.cos(bet);
    sunGeo[0] *= scale; sunGeo[2] *= scale;
    sunGeo[1] = rr * Math.sin(b2);
  }

  let d = [moonGeo[0] - sunGeo[0], moonGeo[1] - sunGeo[1], moonGeo[2] - sunGeo[2]];
  const dl = Math.hypot(d[0], d[1], d[2]);
  d = [d[0] / dl, d[1] / dl, d[2] / dl];

  const MdotD = moonGeo[0] * d[0] + moonGeo[1] * d[1] + moonGeo[2] * d[2];
  const MdotM = moonGeo[0] ** 2 + moonGeo[1] ** 2 + moonGeo[2] ** 2;
  const disc = MdotD * MdotD - (MdotM - R_E_SCENE * R_E_SCENE);
  if (disc < 0) return null;
  const s = -MdotD - Math.sqrt(disc);
  const hit = [moonGeo[0] + s * d[0], moonGeo[1] + s * d[1], moonGeo[2] + s * d[2]];

  // 20.3c Step 2 — nutation of the ground mapping: equinox shift Δψ about
  // the ecliptic pole (world Y) applied to the hit vector, Δε tilt about
  // the local equinox line (rotAxis-local z), equation of equinoxes in the
  // spin. Signs pinned empirically against the NASA centerlines (2024 +
  // 2017, opposite nutation phases — the aberration-sign method).
  const nut = nutationAt(jd);
  {
    const a = nut.dPsiRad;
    const c0 = Math.cos(a), s0 = Math.sin(a);
    const x = c0 * hit[0] + s0 * hit[2];
    hit[2] = -s0 * hit[0] + c0 * hit[2];
    hit[0] = x;
  }
  const v = applyT(R, hit);
  {
    const a = -nut.dEpsRad;
    const c0 = Math.cos(a), s0 = Math.sin(a);
    const y = c0 * v[1] - s0 * v[0];
    const x0 = s0 * v[1] + c0 * v[0];
    v[0] = x0; v[1] = y;
  }
  // 20.3c sidereal-phase anchor correction — MATCHED PAIR with the browser's
  // earth.rotationPhase (π/tropical-year-days; see src/script.js).
  const spin = ROTATION_SPEED * DT.posFromJD(jd) - Math.PI / SI_TROPICAL_YEAR_DAYS
             + nut.dPsiRad * Math.cos(nut.epsRad);
  const c = Math.cos(-spin), sn = Math.sin(-spin);
  const local = [c * v[0] + sn * v[2], v[1], -sn * v[0] + c * v[2]];
  const rr = Math.hypot(local[0], local[1], local[2]);
  // 20.3c Step 1: GEODETIC output latitude. The sphere piercing yields a
  // geocentric latitude; NASA path tables (and every map) are geodetic on
  // WGS84 — the difference is 0.19°·sin 2φ ≈ 19–21 km at the mid-latitude
  // eclipse tracks, the measured ~23 km constant remainder. One attributed
  // constant (WGS84 flattening), zero fit. MATCHED PAIR with
  // src/script.js umbraFromSceneAtJd.
  const F_WGS84 = 1 / C.EARTH_FLATTENING_INVERSE_WGS84;
  const latGc = Math.asin(Math.max(-1, Math.min(1, local[1] / rr)));
  return {
    lat: Math.atan(Math.tan(latGc) / ((1 - F_WGS84) * (1 - F_WGS84))) * (180 / Math.PI),
    lon: Math.atan2(local[2], -local[0]) * (180 / Math.PI),
  };
}

module.exports = { umbraFromSceneAtJdNode };

if (require.main === module) {
  const fs = require('fs');
  const fixture = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../packages/fixtures/regression/script-js.json'), 'utf8')).values;
  const jds = [...new Set(Object.keys(fixture)
    .map((k) => { const m = /^ecl\.umbraScene@([\d.]+)\.lat$/.exec(k); return m ? m[1] : null; })
    .filter(Boolean))];
  let worst = 0;
  for (const jdStr of jds) {
    const jd = Number(jdStr);
    const latRef = fixture[`ecl.umbraScene@${jdStr}.lat`];
    const lonRef = fixture[`ecl.umbraScene@${jdStr}.lon`];
    const u = umbraFromSceneAtJdNode(jd);
    if (!u) { console.log(`  ${jd}  NO INTERSECTION (browser: ${latRef}, ${lonRef})`); worst = Infinity; continue; }
    const gapKm = Math.hypot(u.lat - latRef, (u.lon - lonRef) * Math.cos(latRef * Math.PI / 180)) * 111.32;
    worst = Math.max(worst, gapKm);
    console.log(`  ${jd}  node (${u.lat.toFixed(6)}, ${u.lon.toFixed(6)})  browser (${latRef.toFixed(6)}, ${lonRef.toFixed(6)})  gap ${gapKm.toFixed(3)} km`);
  }
  console.log(worst <= 1
    ? `PASS — worst gap ${worst.toFixed(3)} km (threshold 1 km)`
    : `FAIL — worst gap ${worst.toFixed(3)} km exceeds 1 km`);
  process.exit(worst <= 1 ? 0 : 1);
}
