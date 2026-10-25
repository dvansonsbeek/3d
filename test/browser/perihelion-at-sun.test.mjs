/**
 * Perihelion-at-Sun gate (headless, hermetic).
 *
 * BORN FROM the owner's Show/Hide audit: the "Real Perihelion" chip showed
 * the retired K device's pivot wheel, ~90° off the chain, and three sibling
 * chips (Ecliptic Dur. 1/2, Fixed Perihelion) showed the retired geometric
 * construction. The chain planets now carry a "Perihelion at Sun" marker
 * placed from the chain elements of date (Sun + a(1−e)·p̂ through the frame
 * bridge, the Planet Orbit Analysis' own P construction), and the device
 * chips are gone for them (Pluto, Halley's and Eros keep theirs: no chain).
 *
 * The gate asserts, for Mercury and Jupiter at the landing epoch:
 *  1. the marker's distance from the Sun equals the chain's a(1−e);
 *  2. it lies in the orbit plane (no component along the orbit normal);
 *  3. its J2000 ecliptic longitude agrees with the chain's ϖ to the
 *     projection term (< 0.5°; Mercury's 7° inclination gives ~0.3°);
 * and the Show/Hide grid itself (owner audit): a chain planet's group is
 * exactly planet · Perihelion at Sun · Perihelion at Earth — no device
 * wheels, no eccentricity-cycle wobble centre; Pluto, Halley's and Eros are
 * the body chip only; the Moon is body · Apsidal Precession · Nodal
 * Precession, its canceller wheels and leveling cycle gone.
 *
 * FAIL-PROVEN: ESSRT_PERI_SUN_PLANT=1 shifts the expected distance by 1 %.
 */
import { openSimulator } from './harness.mjs';

const PLANT = process.env.ESSRT_PERI_SUN_PLANT === '1' ? 1.01 : 1;
const sim = await openSimulator();
let fail = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); if (!ok) fail++; };
const wrap = (d) => ((d + 540) % 360) - 180;

try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.periSunMarkerProbe, null, { timeout: 60000 });
  for (const planet of ['Mercury', 'Jupiter']) {
    const r = await sim.page.evaluate((p) => window.__test__.periSunMarkerProbe(p), planet);
    check(`${planet}: marker distance from the Sun = a(1−e)`, !!r && Math.abs(r.distAU - r.aPeriAU * PLANT) < 1e-6, r ? `${r.distAU.toFixed(8)} vs ${(r.aPeriAU * PLANT).toFixed(8)} AU` : 'probe returned null');
    check(`${planet}: marker lies in the orbit plane`, !!r && Math.abs(r.normalComponentAU) < 1e-9, r ? `${r.normalComponentAU.toExponential(2)} AU along the normal` : '');
    check(`${planet}: marker longitude ≈ the chain's ϖ`, !!r && Math.abs(wrap(r.lonJ2000Deg - r.lonPeriDeg)) < 0.5, r ? `${r.lonJ2000Deg.toFixed(3)}° vs ϖ ${r.lonPeriDeg.toFixed(3)}°` : '');
  }
  const chips = await sim.page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.trace-chip-label').forEach((lab) => {
      const grid = lab.nextElementSibling;
      if (grid && grid.classList.contains('trace-chip-grid')) out[lab.textContent.trim()] = [...grid.querySelectorAll('.trace-chip')].map((c) => c.textContent.trim());
    });
    return out;
  });
  const chain = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
  check('chain planets: planet · Perihelion at Sun · Perihelion at Earth, nothing else', chain.every((p) => same(chips[p], [p, 'Perihelion at Sun', 'Perihelion at Earth'])), chain.map((p) => `${p}: ${(chips[p] || []).join('/')}`).join(' · '));
  check('Pluto, Halley\'s, Eros: no Show/Hide group (owner-ruled)', !chips['Pluto'] && !chips["Halley's"] && !chips['Eros'] && !chips['Other'], Object.keys(chips).join('/'));
  check('Moon: body · Apsidal Precession · Nodal Precession, nothing else', same(chips['Moon'], ['Moon', 'Apsidal Precession', 'Nodal Precession']), (chips['Moon'] || []).join('/'));
  check('Sun: body · Sun barycenter · Sun barycenter at Earth, nothing else', same(chips['Sun'], ['Sun', 'Sun barycenter', 'Sun barycenter at Earth']), (chips['Sun'] || []).join('/'));
  check('Earth: body · Wobble Center · Perihelion, nothing else (the five K precession wheels have no chips)', same(chips['Earth'], ['Earth', 'Wobble Center', 'Perihelion']), (chips['Earth'] || []).join('/'));

  // the Sun-barycenter marker: the same mass-weighted sum as the Sun panel's
  // Sun-SSB rows (computeSunSSBOffset), in world axes — identical magnitude
  const sb = await sim.page.evaluate(() => window.__test__.ssbMarkerProbe());
  check('Sun barycenter marker: |Sun → SSB| ≡ the Sun panel\'s Sun-SSB offset', !!sb && Math.abs(sb.offsetKm - sb.panelMagnitudeKm * PLANT) < 1e-6 * sb.panelMagnitudeKm, sb ? `${sb.offsetKm.toFixed(3)} vs ${(sb.panelMagnitudeKm * PLANT).toFixed(3)} km (${sb.dominantPlanet} dominant)` : 'probe returned null');
  check('Sun barycenter marker: the ±25-yr path is filled', !!sb && sb.pathPoints >= 200, sb ? `${sb.pathPoints} points` : '');
  check('Sun barycenter at Earth: the same vector, Earth as origin', !!sb && sb.earthViewSameVectorUnits < 1e-9 && sb.earthViewOriginAtEarthUnits < 1e-9, sb ? `Δvector ${sb.earthViewSameVectorUnits.toExponential(1)} units, origin offset ${sb.earthViewOriginAtEarthUnits.toExponential(1)} units` : '');

  // the Moon's two precessions as markers (they replaced the device wheels'
  // chips, which showed nothing at any zoom): the perigee at a(1−e) in the
  // orbit plane at the argument F − M′, the nodes on the ecliptic at L′ − F
  const mm = await sim.page.evaluate(() => window.__test__.moonMarkerProbe());
  const wrapd = (d) => ((d + 540) % 360) - 180;
  check('Moon perigee marker: distance = a(1−e)', !!mm && Math.abs(mm.perigee.distAU - mm.aPeriAU * PLANT) < 1e-9, mm ? `${mm.perigee.distAU.toFixed(9)} vs ${(mm.aPeriAU * PLANT).toFixed(9)} AU` : 'probe returned null');
  check('Moon perigee marker: longitude/latitude of date from L′ − M′ in the inclined plane', !!mm && Math.abs(wrapd(mm.perigee.lon - mm.perigeeExpectedLonDeg)) < 1e-6 && Math.abs(mm.perigee.lat - mm.perigeeExpectedLatDeg) < 1e-6, mm ? `λ ${mm.perigee.lon.toFixed(4)}° (exp ${mm.perigeeExpectedLonDeg.toFixed(4)}), β ${mm.perigee.lat.toFixed(4)}° (exp ${mm.perigeeExpectedLatDeg.toFixed(4)})` : '');
  // Plan 11 step 3 — the Moon RING is engine-placed from the same arguments:
  // the stack's apsidal arm points at the apogee (perigee at ϖ = L′ − M′), the
  // placed orbit plane's ascending node sits at Ω = L′ − F, the arm is a·e and
  // the plane's tilt the registry inclination — so ring ≡ markers ≡ the Moon.
  // Fail-proven through the same PLANT (the expected longitudes shift 1°).
  const mr = await sim.page.evaluate(() => window.__test__.moonRingProbe());
  const plantDeg = PLANT === 1 ? 0 : 1;
  check('Moon ring: the perigee direction is the arguments\' ϖ = L′ − M′', !!mr && Math.abs(wrapd(mr.perigeeLonDeg - mr.perigeeExpectedLonDeg - plantDeg)) < 1e-6, mr ? `${mr.perigeeLonDeg.toFixed(7)}° vs ${mr.perigeeExpectedLonDeg.toFixed(7)}°` : 'probe returned null');
  check('Moon ring: the ascending node is the arguments\' Ω = L′ − F', !!mr && Math.abs(wrapd(mr.nodeLonDeg - mr.nodeExpectedLonDeg - plantDeg)) < 1e-6, mr ? `${mr.nodeLonDeg.toFixed(7)}° vs ${mr.nodeExpectedLonDeg.toFixed(7)}°` : '');
  check('Moon ring: the eccentric arm is a·e and the plane tilt the registry inclination', !!mr && Math.abs(mr.offsetScene - mr.offsetExpectedScene) < 1e-9 && Math.abs(mr.incDeg - mr.incExpectedDeg) < 1e-6, mr ? `arm ${mr.offsetScene.toFixed(9)} vs ${mr.offsetExpectedScene.toFixed(9)}, inc ${mr.incDeg.toFixed(6)}° vs ${mr.incExpectedDeg}°` : '');
  check('Moon ring ≡ markers: the ring node and the node marker share one longitude', !!mr && !!mm && Math.abs(wrapd(mr.nodeLonDeg - mm.ascNode.lon)) < 1e-6, mr && mm ? `${mr.nodeLonDeg.toFixed(7)}° vs ${mm.ascNode.lon.toFixed(7)}°` : '');

  // Plan 11 step 3 — the planets' POLES: each chain planet's rotation axis is
  // placed in world from the spin channel's pole of date through the frame
  // bridge (Saturn: its rings are the axis's child; Venus: the retrograde
  // spinner, pole south of its orbit — the angular-momentum sense). The
  // rendered obliquity (axis vs the chain's orbit normal of date) is the
  // channel's. Fail-proven through the PLANT (the expected pole is rotated 1°).
  for (const planet of ['Saturn', 'Venus']) {
    const pp = await sim.page.evaluate((p) => window.__test__.planetPoleProbe(p), planet);
    const chordLimit = PLANT === 1 ? 1e-9 : -1;   // the plant makes the limit unreachable
    check(`${planet}: the rendered axis IS the spin channel's pole of date through R`, !!pp && pp.poleChord < chordLimit, pp ? `chord ${pp.poleChord.toExponential(2)}` : 'probe returned null');
    // (the channel interpolates the obliquity in ANGLE and the pole in the
    // VECTOR between its samples — a few µdeg apart at the landing epoch,
    // ≤ 3″ at −1 Myr for Mars; the spin-channel gate pins the pair)
    check(`${planet}: the rendered obliquity to the orbit of date is the channel's`, !!pp && Math.abs(pp.obliquityRenderedDeg - pp.obliquityChannelDeg * PLANT) < 1e-4, pp ? `${pp.obliquityRenderedDeg.toFixed(7)}° vs ${pp.obliquityChannelDeg.toFixed(7)}°` : '');
    if (pp && pp.ringNormalDot !== null) check(`${planet}: the ring plane is the equator (its normal is the placed axis)`, Math.abs(pp.ringNormalDot - 1) < 1e-9, `|n̂·ŝ| = ${pp.ringNormalDot.toFixed(12)}`);
  }
  check('Venus spins about a pole south of its orbit (retrograde, angular-momentum sense)', await sim.page.evaluate(() => { const p = window.__test__.planetPoleProbe('Venus'); return !!p && p.spinRetrograde && p.obliquityChannelDeg > 90; }), '');

  // Plan 11 step 4 — the world frame IS the J2000 ecliptic (the K-device
  // scaffold's pose is gone): R's pole column is world Y exactly, the J2000
  // equinox sits at the one recorded view azimuth, and Earth's rendered axis is
  // the engine frame of date through R — the Earth placement itself, never
  // gated before. Fail-proven through the PLANT (the azimuth shifts 1°).
  const wf = await sim.page.evaluate(() => window.__test__.worldFrameProbe());
  check('world frame: R maps the J2000 ecliptic pole onto world Y exactly', !!wf && wf.poleIsWorldY, wf ? JSON.stringify(wf.poleColumn) : 'probe returned null');
  check('world frame: the J2000 equinox sits at the recorded view azimuth', !!wf && Math.abs(wrapd(wf.equinoxAzimuthDeg - wf.equinoxAzimuthLiteralDeg - plantDeg)) < 1e-9, wf ? `${wf.equinoxAzimuthDeg}° vs ${wf.equinoxAzimuthLiteralDeg}°` : '');
  // The VIEW CONVENTION itself, against the frame's columns and not the literal
  // (the row above is a tautology on the literal): the J2000 equinox along
  // world +X, so the June-solstice Sun of the landing epoch stands at +90° in
  // the top view — the browser's own pose before plan 11 (measured 90.0066°
  // on the pre-plan-11 bundle), the frame the skydome texture and the default
  // camera were authored against. Step 4 shipped the NODE twin's 158.2265°
  // (180° − the retired inclination anchor 21.7735°) and turned the browser's
  // world 68.2265° about the pole while every observable stayed bit-identical;
  // the owner saw the Sun open at 158° instead of 90°.
  check('world frame: the J2000 equinox IS world +X (the solstice Sun at +90° in the top view)', !!wf && Math.abs(wf.equinoxColumn[0] - 1) < 1e-12 && Math.abs(wf.equinoxColumn[1]) < 1e-12 && Math.abs(wf.equinoxColumn[2] + plantDeg) < 1e-12, wf ? `equinox column ${JSON.stringify(wf.equinoxColumn)}` : '');
  check('Earth frame: the rendered axis IS the engine frame of date through R (pole and equinox)', !!wf && wf.seriesLive && wf.axisPoleChord < 1e-9 && wf.axisEquinoxChord < 1e-9, wf ? `pole chord ${wf.seriesLive ? wf.axisPoleChord.toExponential(2) : 'n/a'}, equinox chord ${wf.seriesLive ? wf.axisEquinoxChord.toExponential(2) : 'n/a'} (series ${wf.seriesLive ? 'live' : 'not loaded'})` : '');
  // The star and constellation catalogs (J2000 RA/Dec) are aligned once at
  // module init; they must sit on the J2000 equatorial frame through R. Born
  // from the owner's "the Sun is at 160° against the constellations where it
  // was at 90°" after plan 11 step 4 (the axis's rest pose became 0 and the
  // engine places it only at the first update, after the alignment). Measured
  // on the pre-fix build (then at the Node twin's azimuth 158.2265°): pole
  // tilt 23.4393° and equinox offset 68.2265° — the whole world-frame pose
  // missing from the sky; fail-proven by that run.
  const sf = await sim.page.evaluate(() => window.__test__.starFrameProbe());
  for (const k of ['stars', 'constellations']) {
    const f = sf && sf[k];
    check(`star field: the ${k} container sits on the J2000 equatorial frame through R (pole and equinox)`, !!f && f.poleChord < 1e-9 && f.equinoxChord < 1e-9, f ? `pole chord ${f.poleChord.toExponential(2)} (tilt ${f.poleTiltDeg.toFixed(4)}°), equinox chord ${f.equinoxChord.toExponential(2)} (offset ${f.equinoxOffsetDeg.toFixed(4)}°)` : 'probe returned null');
  }
  check('Moon nodes: on the ecliptic of date at L′ − F and L′ − F + 180°, at distance a', !!mm && Math.abs(wrapd(mm.ascNode.lon - mm.nodeLonExpectedDeg)) < 1e-6 && Math.abs(wrapd(mm.descNode.lon - mm.nodeLonExpectedDeg - 180)) < 1e-6 && Math.abs(mm.ascNode.lat) < 1e-6 && Math.abs(mm.descNode.lat) < 1e-6 && Math.abs(mm.ascNode.distAU - mm.aAU) < 1e-9, mm ? `asc λ ${mm.ascNode.lon.toFixed(4)}° β ${mm.ascNode.lat.toExponential(1)}°, desc λ ${mm.descNode.lon.toFixed(4)}°, Ω = L′ − F = ${mm.nodeLonExpectedDeg.toFixed(4)}°` : '');
  // Focusing a chain planet shows its orbit-plane grid: it must pass through
  // the rendered Sun with its normal along the chain's orbit normal of date.
  // Born from the owner's "the tilt of Mercury's path floats above the Sun":
  // the grid hung on the scaffold's inert annual wheel, 1.36 AU from the Sun
  // since the plan 07/09 arc (measured on the Node twin: 6.7 units in August,
  // 135.6 units by 14 October), invisible to goldens that record observables.
  for (const planet of ['Mercury', 'Jupiter']) {
    const op = await sim.page.evaluate((p) => window.__test__.orbitPlaneProbe(p), planet);
    check(`${planet}: the orbit-plane grid passes through the rendered Sun with the chain's orbit normal`, !!op && op.visible && op.centreToSunSceneUnits < 1e-9 && op.normalChord < 1e-12, op ? `centre − Sun ${op.centreToSunSceneUnits.toExponential(2)} units (${op.centreToSunAU.toFixed(4)} AU), normal chord ${op.normalChord.toExponential(2)} (${op.normalTiltDeg.toFixed(4)}° off; i of date ${op.inclDateDeg.toFixed(4)}°), visible ${op.visible}` : 'probe returned null');
  }
  // The Planet Info eye ("Hide helper objects") governs the focused planet's
  // helper visuals too — its elements-of-date label (fades in when the camera
  // is at the body) and its orbit-plane grid — not only Earth's two markers.
  // Born from the owner: "zooming into a planet shows extra information; for
  // Earth the eye hides it, for the planets it should too." Fail-proven on the
  // pre-fix build: the label stayed at opacity 1 and the grid visible after
  // the click.
  {
    await sim.page.evaluate(() => window.__test__.helperVisualsProbe('Mercury'));   // focus + zoom in (the probe moves the camera to the body)
    await sim.page.waitForTimeout(700);   // the label fade loop runs on the loop's DOM tick
    const shown = await sim.page.evaluate(() => window.__test__.helperVisualsProbe('Mercury'));
    check('helper eye: with the camera at Mercury its elements label is shown and its orbit-plane grid is visible', !!shown && shown.eyePresent && shown.helpersVisible && shown.labelOpacity > 0.5 && shown.gridVisible, shown ? `opacity ${shown.labelOpacity}, grid ${shown.gridVisible}, eye ${shown.eyePresent}` : 'probe returned null');
    await sim.page.click('.pl-handle-eye');
    await sim.page.waitForTimeout(700);
    const hidden = await sim.page.evaluate(() => window.__test__.helperVisualsProbe('Mercury'));
    check('helper eye: one click hides the planet\'s elements label AND its orbit-plane grid', !!hidden && !hidden.helpersVisible && hidden.labelOpacity === 0 && !hidden.gridVisible, hidden ? `flag ${hidden.helpersVisible}, opacity ${hidden.labelOpacity}, grid ${hidden.gridVisible}` : '');
    await sim.page.click('.pl-handle-eye');
    await sim.page.waitForTimeout(700);
    const back = await sim.page.evaluate(() => window.__test__.helperVisualsProbe('Mercury'));
    check('helper eye: a second click restores both', !!back && back.helpersVisible && back.labelOpacity > 0.5 && back.gridVisible, back ? `opacity ${back.labelOpacity}, grid ${back.gridVisible}` : '');
    await sim.page.evaluate(() => window.__test__.restoreFocus('Earth'));
  }
  // A chip click must WAKE the paused loop (owner: "Perihelion at Earth" appeared
  // only on a camera move or Play once the paused loop truly idled — the monitor
  // ticks used to wake every frame and hid the class). Fail-proven on the
  // pre-fix build: 0 active frames after the click.
  await sim.page.waitForTimeout(1500);   // let the landing settle so the counters start from an idle loop
  const wake = await sim.page.evaluate(async () => {
    window.__test__.wakeStats(true);
    const chip = [...document.querySelectorAll('.trace-chip')].find((c) => c.title === 'Mercury Perihelion At Sun');
    if (!chip) return null;
    chip.click();
    await new Promise((r) => setTimeout(r, 400));
    const s = window.__test__.wakeStats(false);
    const pressed = chip.getAttribute('aria-pressed') === 'true';
    chip.click();   // leave the scene as found
    return { active: s.active, frames: s.frames, pressed };
  });
  check('a Show/Hide chip click wakes the paused loop (the frame that draws the marker)', !!wake && wake.active >= 1 && wake.pressed, wake ? `${wake.active} of ${wake.frames} frames active after the click · chip pressed ${wake.pressed}` : 'chip not found');
  // Plan 20 T2 — the deep-epoch and jumped-state rows (born from the script.js
  // review's frame/epoch findings, each measured before the fix):
  //  • at a deep epoch the Moon stack's GEOMETRY follows a(t) — the apsidal
  //    arm is a(t)·e and the drawn ring's radius a(t) (createPlanet froze both
  //    at build; measured at −400 Ma: 0.014107 vs 0.013520 and 0.25695 vs
  //    0.24627 while the placed Moon sat at 0.24854);
  //  • at a deep epoch the TRACE path's perihelion-marker radius is the
  //    rendered marker's a·e of date (it read the container's build offset —
  //    Jupiter 24.02 vs 30.02 units at −400 Ma, 24.02 vs 25.37 even at J2000);
  //  • the Moon's distance row reads the PLACED mesh on the first frame after a
  //    jump (it read the pre-override position — 440 km off, measured);
  //  • a synchronous jump with the Tracing button on leaves the scene posed at
  //    the JUMP, not at the trace's last sample (the Sun's RA read 8.6° off).
  // The PLANT (1 %) shifts the expected geometry so the first two rows cannot hold.
  // The epoch: −100 Ma (the Moon's a ~1 % smaller; the −400 Ma reading above
  // cost 131 s of spin walk per run — the same defects, a fifth of the time).
  const DEEP_YEAR = -100e6;
  const t0 = Date.now();
  const deep = await sim.page.evaluate(async ({ deepJD, midJD }) => {
    const T = window.__test__; const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    T.jumpJD(2451545.0); await wait(400); T.jumpJD(2451545.0);
    const ringJ2000 = T.moonRingProbe();
    const sunSettled = T.sunSceneNow();
    T.setTracing(true); T.traceEnable('Sun', true); T.jumpJD(midJD); T.jumpJD(2451545.0); const sunTraced = T.sunSceneNow(); const sunFill = T.traceProbe('Sun').filled;
    T.setTracing(false);
    T.jumpJD(midJD); const moonFirst = T.moonDistanceProbe();
    const periDateMid = T.perihelionDateProbe();   // year 1000 (jumped above)
    T.jumpJD(deepJD); await wait(1500); T.jumpJD(deepJD);   // the loop syncs the epoch anchors, the second jump poses on them
    const ring = T.moonRingProbe(); const peri = T.periMarkerTraceRadiusProbe('PERIHELION JUPITER');
    const periDateDeep = T.perihelionDateProbe();
    T.jumpJD(2451545.0); await wait(1000); T.jumpJD(2451545.0);
    const periDateJ2000 = T.perihelionDateProbe();
    return { ringJ2000, ring, peri, moonFirst, sunSettled, sunTraced, sunFill, periDateJ2000, periDateMid, periDateDeep };
  }, { deepJD: 2451545.0 + (DEEP_YEAR - 2000) * 365.25, midJD: 2451545.0 + (1000 - 2000) * 365.25 });
  console.log(`      (deep-epoch rows took ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const mr2 = deep.ring, pj = deep.peri;
  check('−100 Ma: the epoch moved the Moon\'s a (sanity)', !!mr2 && Math.abs(mr2.ringExpectedScene - deep.ringJ2000.ringExpectedScene) > 1e-3, mr2 ? `${deep.ringJ2000.ringExpectedScene.toFixed(5)} → ${mr2.ringExpectedScene.toFixed(5)} units` : 'probe returned null');
  check('−100 Ma: the Moon ring\'s apsidal arm is a(t)·e', !!mr2 && Math.abs(mr2.offsetScene - mr2.offsetExpectedScene * PLANT) < 1e-9, mr2 ? `${mr2.offsetScene.toFixed(9)} vs ${(mr2.offsetExpectedScene * PLANT).toFixed(9)}` : '');
  check('−100 Ma: the drawn Moon ring\'s radius is a(t)', !!mr2 && Math.abs(mr2.ringRadiusScene - mr2.ringExpectedScene * PLANT) < 1e-9, mr2 ? `${mr2.ringRadiusScene.toFixed(9)} vs ${(mr2.ringExpectedScene * PLANT).toFixed(9)} (placed Moon at ${mr2.moonMeshDistScene.toFixed(5)})` : '');
  check('−100 Ma: the traced perihelion marker rides the rendered marker\'s a·e of date (Jupiter)', !!pj && Math.abs(pj.traceRadiusUnits - pj.markerRadiusUnits * PLANT) < 1e-9 && Math.abs(pj.markerRadiusUnits - pj.j2000Units) > 0.1, pj ? `trace ${pj.traceRadiusUnits.toFixed(6)} vs marker ${(pj.markerRadiusUnits * PLANT).toFixed(6)} units (J2000 container offset ${pj.j2000Units.toFixed(3)})` : 'probe returned null');
  const md = deep.moonFirst;
  check('first update after a jump: the Moon\'s distance row reads the placed mesh', !!md && Math.abs(md.distAU - md.worldDistAU) < 1e-12, md ? `${md.distAU.toFixed(12)} vs ${md.worldDistAU.toFixed(12)} AU` : '');
  // the perihelion-date rows ride the certified Sun (plan 20 §1b.11): the Sun's
  // longitude at the solved instant IS the target, at J2000, year 1000 and the
  // deep epoch — to a microdegree, or to eight ulps of the JULIAN DAY in solar
  // motion where that is coarser (−100 Ma: |JD| ~3.7e10 d, ulp ~8e-6 d ≈ 1e-5°
  // of solar longitude — the solve's floating-point floor)
  for (const [tag, pd] of [['J2000', deep.periDateJ2000], ['year 1000', deep.periDateMid], [`${DEEP_YEAR / 1e6} Ma`, deep.periDateDeep]]) {
    const d = pd ? Math.abs(wrap(pd.lonAtJdDeg - pd.targetDeg * PLANT)) : NaN;
    const tol = pd ? Math.max(1e-6, 8 * Math.abs(pd.jd) * Number.EPSILON * (360 / 365.25)) : 0;
    check(`perihelion date (${tag}): the certified Sun's longitude at the solved instant is ϖ + 180°`, Number.isFinite(d) && d < tol && Number.isFinite(pd.jd), pd ? `Δ ${d.toExponential(2)}° (tol ${tol.toExponential(1)}) · ${pd.dateStr} (civil year ${pd.year})` : 'probe returned null');
  }
  const sunLimit = PLANT === 1 ? 1e-9 : -1;
  check('a synchronous jump with the Tracing button on poses the scene at the jump (not the trace\'s last sample)', deep.sunFill > 0 && Math.abs(deep.sunTraced.raDeg - deep.sunSettled.raDeg) < sunLimit && Math.abs(deep.sunTraced.decDeg - deep.sunSettled.decDeg) < sunLimit, `Sun RA ${deep.sunTraced.raDeg.toFixed(6)} vs settled ${deep.sunSettled.raDeg.toFixed(6)}° (${deep.sunFill} trace samples filled)`);

  check('page came up without errors', sim.errors.length === 0, sim.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('suite ran to completion', false, String((e && e.stack) || e));
} finally {
  await sim.dispose();
}
console.log(fail === 0 ? '\nperihelion-at-sun: PASS' : `\nperihelion-at-sun: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
