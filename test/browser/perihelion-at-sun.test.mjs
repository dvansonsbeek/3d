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
  check('Moon nodes: on the ecliptic of date at L′ − F and L′ − F + 180°, at distance a', !!mm && Math.abs(wrapd(mm.ascNode.lon - mm.nodeLonExpectedDeg)) < 1e-6 && Math.abs(wrapd(mm.descNode.lon - mm.nodeLonExpectedDeg - 180)) < 1e-6 && Math.abs(mm.ascNode.lat) < 1e-6 && Math.abs(mm.descNode.lat) < 1e-6 && Math.abs(mm.ascNode.distAU - mm.aAU) < 1e-9, mm ? `asc λ ${mm.ascNode.lon.toFixed(4)}° β ${mm.ascNode.lat.toExponential(1)}°, desc λ ${mm.descNode.lon.toFixed(4)}°, Ω = L′ − F = ${mm.nodeLonExpectedDeg.toFixed(4)}°` : '');
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
  check('page came up without errors', sim.errors.length === 0, sim.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('suite ran to completion', false, String((e && e.stack) || e));
} finally {
  await sim.dispose();
}
console.log(fail === 0 ? '\nperihelion-at-sun: PASS' : `\nperihelion-at-sun: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
