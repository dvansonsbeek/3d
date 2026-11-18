/**
 * THE SKY OF DATE — plan 28 §B/C's browser gate (doc 111 §1.48).
 *
 * Reads the scene's catalogue sky through __test__ (skyState, starDirectionAt, skyUpdate, the
 * landing hooks) in headless Chromium:
 *   1. THE REFEREE — the scene's direction of five high-motion stars at ±10 kyr and ±100 kyr from
 *      J2000 against astropy's SkyCoord.apply_space_motion on the same catalogue values
 *      (data/star-motion-reference.json, scripts/star_motion_reference.py --write): within 1″ at
 *      10 kyr and 10″ at 100 kyr (measured 0.02″ / 4″ — the Rømer term the rigorous model carries).
 *   2. PURITY — a star's direction at a year is the same number in any order of asking, and a
 *      landing re-read at the same year reproduces the state bit-for-bit.
 *   3. THE FADES — the recognisability of five constellations at −48 kyr (the Big Dipper nearly
 *      gone at RMS 4.6°, Orion at 2.4° still readable), everything gone at −198 kyr, the layer
 *      'orbits' to ±50 Myr, 'handover' at −55 Myr, 'statistical' at −70 Myr; the Milky Way dome
 *      untouched by the regime.
 *   4. THE COUNTS — the scene's loaded counts ≡ the catalogue file's _meta (41,394 / 8,870 / 367
 *      names / 204 strokes); the background is the catalogue's faint tier (two Points, no random field).
 * Fail-proven via ESSRT_SKY_PLANT=1 (the scene's reading shifted 2″ before the referee compare).
 */
import { readFileSync } from 'node:fs';
import { openSimulator } from './harness.mjs';

const PLANT = process.env.ESSRT_SKY_PLANT === '1';
const REF = JSON.parse(readFileSync(new URL('../../data/star-motion-reference.json', import.meta.url), 'utf8'));
const CAT = JSON.parse(readFileSync(new URL('../../public/input/stars.json', import.meta.url), 'utf8'));
const sim = await openSimulator();
let fail = 0;
const check = (/** @type {string} */ n, /** @type {boolean} */ ok, /** @type {string} */ d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); if (!ok) fail++; };
const D2R = Math.PI / 180;

await sim.page.waitForFunction(() => window.__test__ && window.__test__.skyLoaded && window.__test__.skyLoaded(), null, { timeout: 120000 });

// 1. the referee — per star: the scene's GEOMETRIC place (the inertial velocity, where the star IS at the instant)
// against the record's geometric place (pyerfa starpv + pvu) within the plan's 1″ / 10″ for EVERY star — the
// residual is the tidal curvature of the Galactic orbit; and against astropy's APPARENT place (the same line placed
// at the emission instant) within the recorded light-time term plus that tolerance: the referee's model is the
// inertial-velocity line at the emission instant, both terms ~1e-4 of the motion with opposite signs (doc 111 §1.48).
// A wrong unit or sign fails by degrees.
let n = 0; const worst = [];
const LT_TOL = REF.tolerancesArcsec.lightTimeArcsec || 0.05;
for (const [hipStr, rec] of Object.entries(REF.stars)) {
  const hip = Number(hipStr);
  let w10 = 0, w100 = 0, wApp = 0;
  for (const p of rec.positions) {
    if (p.year === 2000) continue;
    const d = await sim.page.evaluate(({ hip, y }) => window.__test__.starDirectionAt(hip, y), { hip, y: p.year });
    if (!d) { check(`referee: HIP ${hip} at ${p.year} is in the scene`, false, 'null'); continue; }
    const plant = PLANT ? 2 / 3600 : 0;
    const sepTo = (q) => { const dra = ((d.raDeg + plant) - q.raDeg) * Math.cos(q.decDeg * D2R) * 3600, ddec = (d.decDeg - q.decDeg) * 3600; return Math.hypot(dra, ddec); };
    const sep = sepTo(p.geometric), sepApp = sepTo(p);
    n++;
    if (Math.abs(p.year - 2000) <= 10000) w10 = Math.max(w10, sep); else w100 = Math.max(w100, sep);
    // the apparent place sits the light-time term from the geometric one: the scene's distance to it is at most the
    // term plus the scene's own residual (the triangle inequality), and at least the term minus it
    const tolHere = Math.abs(p.year - 2000) <= 10000 ? rec.toleranceArcsec['10kyr'] : rec.toleranceArcsec['100kyr'];
    wApp = Math.max(wApp, Math.abs(sepApp - p.lightTimeArcsec) - Math.min(sep, tolHere) - LT_TOL);
  }
  const tol = rec.toleranceArcsec;
  worst.push({ hip, name: rec.name || hip, w10, w100, wApp, ok: w10 <= tol['10kyr'] && w100 <= tol['100kyr'] && wApp <= 0, tol, lt100: Math.max(...rec.positions.filter((p) => Math.abs(p.year - 2000) > 10000).map((p) => p.lightTimeArcsec)) });
}
check(`referee: ${n} star-epochs of five stars within 1″ / 10″ of the GEOMETRIC place of ERFA's space motion (±10 kyr / ±100 kyr), and the recorded light-time term from astropy's apparent place`, worst.every((w) => w.ok), worst.map((w) => `${w.name} ${w.w10.toFixed(2)}″/${w.w100.toFixed(1)}″ (≤ ${w.tol['10kyr']}/${w.tol['100kyr']}; light-time ${w.lt100.toFixed(1)}″ at 100 kyr)`).join(', '));

// 2. purity
const pur = await sim.page.evaluate(() => {
  const T = window.__test__;
  const a1 = T.starDirectionAt(32349, 52000), b1 = T.starDirectionAt(69673, -30000);
  const b2 = T.starDirectionAt(69673, -30000), a2 = T.starDirectionAt(32349, 52000);
  return { sameA: JSON.stringify(a1) === JSON.stringify(a2), sameB: JSON.stringify(b1) === JSON.stringify(b2) };
});
check('purity: a star\'s direction at a year is the same number in any order of asking', pur.sameA && pur.sameB, JSON.stringify(pur));

// 3. the fades and the regime (landings through the pane's own hook)
const land = async (/** @type {string} */ y) => {
  await sim.page.evaluate((y) => { window.__test__.enterYearOfDate(y, '00:00:00'); window.__test__.skyUpdate(true); }, y);
  await sim.page.waitForTimeout(1200);
  // the positions of date land asynchronously (a deep return after the worker evicted its far nodes rebuilds them, ~1.5 s)
  await sim.page.waitForFunction(() => window.__test__.skySettled(), null, { timeout: 60000 });
  return sim.page.evaluate(() => { const S = window.__test__.skyState(); const g = {}; for (const k of ['UMa', 'Ori', 'Leo', 'Cas', 'Sco']) g[k] = S.groups[k] ? { rms: S.groups[k].rmsDeg, op: S.groups[k].opacity } : null; return { year: S.year, regime: S.regime, fade: S.regimeFade, g, dome: window.__test__.skyDomeProbe().brightness }; });
};
const s48 = await land('-48000 d172');
check('fades at −48 kyr: the Big Dipper nearly gone (RMS 4–5.5°, opacity < 0.25), Orion still readable (RMS 1.5–3.5°, opacity 0.4–0.9)', s48.regime === 'orbits' && s48.g.UMa && s48.g.UMa.rms > 4 && s48.g.UMa.rms < 5.5 && s48.g.UMa.op < 0.25 && s48.g.Ori && s48.g.Ori.rms > 1.5 && s48.g.Ori.rms < 3.5 && s48.g.Ori.op > 0.4 && s48.g.Ori.op < 0.9, JSON.stringify(s48.g));
const s198 = await land('-198000 d172');
check('fades at −198 kyr: every shape gone (opacity 0 for UMa, Ori, Leo, Cas, Sco)', s198.regime === 'orbits' && ['UMa', 'Ori', 'Leo', 'Cas', 'Sco'].every((k) => s198.g[k] && s198.g[k].op === 0), JSON.stringify(s198.g));
// PLAN 28 §D: the catalogue regime is the stars' Galactic ORBITS to ±50 Myr (ONE home sky/galactic-orbits);
// the handover to the statistical sky is 50–60 Myr; the statistical sky beyond.
const s998 = await land('-998000 d172');
const s10m = await land('-10000000 d172');
const s55m = await land('-55000000 d172');
const s70m = await land('-70000000 d172');
check('regime: orbits at −998 kyr and −10 Myr, handover at −55 Myr (0 < fade < 1), statistical at −70 Myr; the dome\'s brightness untouched', s998.regime === 'orbits' && s998.fade === 1 && s10m.regime === 'orbits' && s10m.fade === 1 && s55m.regime === 'handover' && s55m.fade > 0 && s55m.fade < 1 && s70m.regime === 'statistical' && s70m.fade === 0 && s48.dome === s70m.dome, `fade ${s998.fade} / ${s10m.fade} / ${s55m.fade.toFixed(3)} / ${s70m.fade}, dome ${s48.dome}`);
// The handover is PER STAR (the owner: "at 1.1 Myr the sky is more or less empty" — a tier-wide cross-fade
// halved every star at the midpoint): at the window's midpoint (fade 0.5) half the stars are still in the
// catalogue at full light and half have become their statistical twins; a star's two alphas sum to 1; the Sun never hands over.
await land('-55000000 d172');
const ho = await sim.page.evaluate(() => { const T = window.__test__; const S = T.skyState(); return { fade: S.regimeFade, share: S.catalogueShare, sirius: T.starHandoverAlpha(32349), groombridge: T.starHandoverAlpha(57939) }; });
check('the handover is per star: at −55 Myr (fade 0.50) the catalogue share is 0.48–0.52, each star\'s catalogue + statistical alphas sum to 1', Math.abs(ho.fade - 0.5) < 0.01 && ho.share > 0.48 && ho.share < 0.52 && Math.abs(ho.sirius.catalogue + ho.sirius.statistical - 1) < 1e-9 && Math.abs(ho.groombridge.catalogue + ho.groombridge.statistical - 1) < 1e-9, `fade ${ho.fade.toFixed(3)}, share ${ho.share.toFixed(3)}, Sirius ${ho.sirius.catalogue.toFixed(2)}/${ho.sirius.statistical.toFixed(2)} (phase ${ho.sirius.phase.toFixed(3)})`);
// The orbits (plan 28 §D): inside ±1 Myr the orbit and the straight line agree to a fraction of a per cent (the
// referee rows above hold), at 20 Myr a star 19 pc away has moved ~290 pc and the straight line is 6 % off its
// orbit (the Node referee, star-catalogue.js); the sky's positions of date come from the orbit worker, settled.
const orb = await sim.page.evaluate(() => { const T = window.__test__; const S = T.skyState(); const a = T.starDirectionAt(32349, 2000), b = T.starDirectionAt(32349, 20002000); return { worker: S.worker, settled: S.settled, siriusNow: a.distPc, sirius20: b.distPc, amp: a.amplitudeFraction, gaia: S.gaia }; });
// The sprites' size follows the renderer's pixel ratio (gl_PointSize is in device pixels): the adaptive ratio's 2 → 1
// drop had drawn every star twice as large on screen (the owner: "sometimes the stars seem brighter").
const pr = await sim.page.evaluate(() => { const S = window.__test__.skyState(); return { ratio: S.pixelRatio, setting: S.starsizeBase, base: S.baseSizeDevicePx }; });
check('the sprites\' base size in device pixels is the setting × the renderer\'s pixel ratio / 2 (the look accepted on a ratio-2 display)', pr.ratio > 0 && pr.setting > 0 && Math.abs(pr.base - pr.setting * pr.ratio / 2) < 1e-9, `ratio ${pr.ratio}, setting ${pr.setting}, base ${pr.base} device px`);
check('the orbit worker answers (positions settled, updates > 0); Sirius 2.64 pc today and 100–1000 pc at +20 Myr on its orbit (radial amplitude < 15 % of R₀)', orb.worker && orb.worker.updates > 0 && orb.settled === true && Math.abs(orb.siriusNow - 2.637) < 0.01 && orb.sirius20 > 100 && orb.sirius20 < 1000 && orb.amp < 0.15, `worker ${JSON.stringify(orb.worker)}, settled ${orb.settled}, Sirius ${orb.siriusNow.toFixed(3)} → ${orb.sirius20.toFixed(0)} pc, amp ${orb.amp.toFixed(3)}`);
// The node PREFETCH: after a landing the worker builds the nodes within ±2 of the current one in idle ticks (the
// direction of travel first), so a landing one node on finds its node cached (hit), while a jump across the regime
// still builds its chain (no hit); and a prefetched node IS the landing's node bit for bit — Sirius's drawn position
// (the worker's Float32 buffer) ≡ the main thread's own integration from the epoch on the same schedule.
const settle = () => sim.page.waitForFunction(() => window.__test__.skySettled(), null, { timeout: 60000 });
await land('3000000 d172'); await settle();
await sim.page.waitForTimeout(2500);   // the idle prefetch (four nodes of the named tier, ~60 ms each)
const pf0 = await sim.page.evaluate(() => window.__test__.skyState().worker);
await land('7000000 d172'); await settle();
const pf1 = await sim.page.evaluate(() => { const T = window.__test__; const S = T.skyState(); const u = T.starPositionUnits(32349); const d = T.starDirectionAt(32349, S.year); return { worker: S.worker, year: S.year, drawn: u.units.map((v) => v / u.unitsPerPc), direct: d.local.map((v) => v * d.distPc) }; });
const pfOff = Math.hypot(...pf1.drawn.map((v, k) => v - pf1.direct[k])) / Math.hypot(...pf1.direct);
// (this landing follows −70 Myr and +7 Myr: a single 'deep' sampler for both directions had the future landing replace
// the past-built one and this landing threw "outside the built range" — the deep sampler is per direction now)
let landedBack = true;
try { await land('-47000000 d172'); await settle(); } catch (e) { landedBack = false; console.log('  landing at −47 Myr after +7 Myr threw:', String(e && e.message || e).split('\n')[0]); }
const pf2 = await sim.page.evaluate(() => window.__test__.skyState().worker);
check('a deep landing after one in the other direction lands (−70 → +7 → −47 Myr: the deep sampler is per direction)', landedBack && Math.abs(pf2.nodes.hip.nodeIndex + 9) === 0, `landed ${landedBack}, node ${pf2.nodes && pf2.nodes.hip.nodeIndex}`);
check('the node prefetch: after a landing at +3 Myr the worker has prefetched nodes; +7 Myr lands on node 1 cached (hit), −47 Myr on node −9 uncached; the drawn Sirius ≡ the main thread\'s integration (< 1e-6)', pf0.prefetched >= 2 && !!pf1.worker.nodes && pf1.worker.nodes.hip.nodeIndex === 1 && pf1.worker.nodes.hip.hit === true && !!pf2.nodes && pf2.nodes.hip.nodeIndex === -9 && pf2.nodes.hip.hit === false && pfOff < 1e-6, `prefetched ${pf0.prefetched} → ${pf1.worker.prefetched} nodes in ${pf1.worker.prefetchMs && pf1.worker.prefetchMs.toFixed(0)} ms, nodes ${JSON.stringify(pf1.worker.nodes)} / ${JSON.stringify(pf2.nodes)}, Sirius off ${pfOff.toExponential(2)}`);
// BIRTHS: a star whose lifetime is over is replaced by the next generation of its luminosity — its statistical twin
// drawn at a seeded place at the same latitude and distance. At J2000 nobody has been replaced; at +30 Myr every
// star with τ ≤ 30 Myr has (1,780 of the catalogue: the brightest, M_V < −3.6), Rigel (τ 4.4 Myr) in its sixth
// generation at another place than its generation-0 twin (the same distance), Sirius (τ 1.1 Gyr) in its own; the
// generation and the place are pure in the year (the same after landing elsewhere and back).
const tauOf = (M) => 1e10 * Math.pow(10 ** ((4.83 - M) / 2.5), -2.5 / 3.5);
const cci = Object.fromEntries(CAT.columns.map((c, i) => [c, i]));
const nDead30 = CAT.stars.filter((r) => tauOf(r[cci.vmag] - 5 * Math.log10(r[cci.distPc] / 10)) <= 3e7).length;
await land('2000 d172'); await settle();
const b0 = await sim.page.evaluate(() => window.__test__.skyState().births);
await land('2000000 d172'); await settle();
const b2 = await sim.page.evaluate(() => { const T = window.__test__; return { births: T.skyState().births, built: T.skyState().statisticalTierBuilt, rigel: T.twinGenerationAt(24436) }; });
// A star keeps its NAME while it is drawn (the owner, at +2 Myr: "only the constellations are not needed, the names
// should be there"): at +2 Myr the shapes have long dissolved (the lines faded out) but most of the 367 named stars
// still carry their name (measured 335; at +30 Myr 103, the fast stars having left and the short-lived replaced); the
// names fade only with the catalogue (−70 Myr: 0, the statistical row below).
const nm2 = await sim.page.evaluate(() => { const S = window.__test__.skyState(); return { names: S.namesShowing, labels: S.labels, ori: S.groups.Ori && S.groups.Ori.opacity }; });
check('the star names stay while the stars are drawn: at +2 Myr at least 300 of the 367 named stars show their name while Orion\'s lines have faded out', nm2.names >= 300 && nm2.labels === 367 && nm2.ori === 0, `names showing ${nm2.names} of ${nm2.labels}, Orion's lines ${nm2.ori}`);
await land('30000000 d172'); await settle();
const b30 = await sim.page.evaluate(() => { const T = window.__test__; return { births: T.skyState().births, built: T.skyState().statisticalTierBuilt, rigel: T.twinGenerationAt(24436), sirius: T.twinGenerationAt(32349) }; });
await land('2000 d172'); await settle();
await land('30000000 d172'); await settle();
const b30b = await sim.page.evaluate(() => window.__test__.twinGenerationAt(24436));
const rigelMoved = b2.rigel && b2.rigel.position && b30.rigel.position && Math.hypot(...b30.rigel.position.map((v, k) => v - b2.rigel.position[k])) > 1e-3 * Math.hypot(...b2.rigel.position) && Math.abs(Math.hypot(...b30.rigel.position) / Math.hypot(...b2.rigel.position) - 1) < 1e-6;
check(`births: nobody replaced at J2000; at +30 Myr ${nDead30} stars (τ ≤ 30 Myr) replaced by their next generation; Rigel's twin in generation 6 at another place (the same distance) than at +2 Myr (generation 0), Sirius in generation 0; pure in the year`, b0 && b0.born === 0 && b2.rigel && b2.rigel.gen === 0 && b30.built === true && Math.abs(b30.births.born - nDead30) <= 3 && b30.rigel.gen === 6 && b30.sirius.gen === 0 && rigelMoved && JSON.stringify(b30b) === JSON.stringify(b30.rigel) && b30.births.shortLived === 3192, `born ${b0 && b0.born} / ${b30.births && b30.births.born} (expected ${nDead30}), Rigel gen ${b2.rigel && b2.rigel.gen} → ${b30.rigel && b30.rigel.gen} (τ ${b30.rigel && (b30.rigel.tau / 1e6).toFixed(2)} Myr), Sirius gen ${b30.sirius && b30.sirius.gen}, moved ${rigelMoved}, short-lived ${b30.births && b30.births.shortLived}`);
// THE SUPERNOVA ILLUSTRATION (the follow-up; ONE home sky/supernova): the catalogue's candidates (M_V ≤ −2.5) and
// their band instants, sorted; the event after J2000 is the shortest-lived candidate's own end, the one before it
// its earlier generation at the mirror instant. Jump to next: the simulation lands on the peak (the engine year of
// the landing ≡ the event's to a day), the flash is alive at its peak magnitude at the star's distance, and the
// camera faces it; jump to prev twice: an earlier generation at a seeded place; nothing beyond the regime.
const rot = (q, v) => { const [x, y, z, w] = q; const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2]; return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
const sn0 = await sim.page.evaluate(() => { const T = window.__test__; return { st: T.supernovaState(), next: T.supernovaEvent(+1, 2000), prev: T.supernovaEvent(-1, 2000), beyond: T.supernovaEvent(+1, 2000 + 70e6) }; });
const nCand = CAT.stars.filter((r) => r[cci.vmag] - 5 * Math.log10(r[cci.distPc] / 10) <= -2.5).length;
check(`the supernova illustration: ${nCand} candidates (M_V ≤ −2.5) from the catalogue, events sorted; the first after J2000 is the shortest-lived candidate's own end (HIP 89341, +1.16 Myr, generation 0), the last before it that star's earlier generation at −1.16 Myr; none beyond the regime`, sn0.st.candidates === nCand && sn0.st.events > 10000 && sn0.next && sn0.next.hip === 89341 && sn0.next.gen === 0 && Math.abs(sn0.next.peakYear - 2000 - 1.16e6) < 2e4 && sn0.prev && sn0.prev.hip === 89341 && sn0.prev.gen === 1 && Math.abs(sn0.prev.peakYear - 2000 + 1.16e6) < 2e4 && sn0.beyond === null, `candidates ${sn0.st.candidates}, events ${sn0.st.events}, next ${sn0.next && sn0.next.hip} gen ${sn0.next && sn0.next.gen} at ${sn0.next && ((sn0.next.peakYear - 2000) / 1e6).toFixed(3)} Myr, prev ${sn0.prev && sn0.prev.hip} gen ${sn0.prev && sn0.prev.gen}`);
await land('2000 d172'); await settle();
const snJ = await sim.page.evaluate(() => window.__test__.jumpToSupernova(+1));
await settle();
const snA = await sim.page.evaluate(() => { const T = window.__test__; T.skyUpdate(true); return { year: T.engineYearOfPos(), active: T.supernovaState().active, cam: T.cameraForwardWorld(), q: T.skyDomeProbe().starsQuaternion }; });
const flash = snA.active.find((a) => a.hip === snJ.hip && a.gen === snJ.gen);
const flashWorld = rot(snA.q, snJ.localUnit), gaze = flashWorld[0] * snA.cam[0] + flashWorld[1] * snA.cam[1] + flashWorld[2] * snA.cam[2];
check('jump to the next supernova: the landing\'s engine year ≡ the peak to a day, the flash alive at its peak magnitude (the II-P peak at the star\'s distance), the camera facing it (gaze ≥ 0.99)', !!snJ && Math.abs(snA.year - snJ.peakYear) < 1 / 365 && !!flash && Math.abs(flash.daysFromPeak) < 1 && Math.abs(flash.vmag - snJ.peakVmag) < 0.01 && gaze >= 0.99, `${snJ && snJ.name} HIP ${snJ && snJ.hip} gen ${snJ && snJ.gen}: landed ${snA.year.toFixed(4)} for ${snJ && snJ.peakYear.toFixed(4)}, flash ${flash ? `V ${flash.vmag.toFixed(2)} at ${flash.distPc.toFixed(0)} pc, ${flash.daysFromPeak.toFixed(2)} d` : 'none'} (${snA.active.length} alive), gaze ${gaze.toFixed(4)}`);
const snP = await sim.page.evaluate(() => { const T = window.__test__; T.jumpToSupernova(-1); return T.jumpToSupernova(-1); });
await settle();
check('jump to the previous supernova twice: an earlier generation at a seeded place (gen ≥ 1), its peak before J2000, a finite direction', !!snP && snP.gen >= 1 && snP.peakYear < 2000 && snP.localUnit.every(Number.isFinite) && Math.abs(Math.hypot(...snP.localUnit) - 1) < 1e-6, `${snP && snP.name} HIP ${snP && snP.hip} gen ${snP && snP.gen} at ${snP && ((snP.peakYear - 2000) / 1e6).toFixed(3)} Myr`);
await land('2000 d172'); await settle();
// The stars that ARRIVE (plan 28 §D): the Gaia tier loaded (its counts the manifest's), its stars drawn as they
// brighten past V 8 — at +20 Myr thousands of them are within the cut while today most sit far and faint.
await sim.page.waitForFunction(() => window.__test__.skyGaiaLoaded() || window.__test__.skyGaiaFailed(), null, { timeout: 120000 });
const GM = JSON.parse(readFileSync(new URL('../../public/input/stars-gaia.json', import.meta.url), 'utf8'))._meta;
await land('20000000 d172');
await sim.page.waitForFunction(() => window.__test__.skySettled(), null, { timeout: 60000 });
const ga = await sim.page.evaluate(() => { const S = window.__test__.skyState(); const a = window.__test__.gaiaStarAt(0); return { gaia: S.gaia, settled: S.settled, a }; });
await land('2000 d172');
await sim.page.waitForFunction(() => window.__test__.skySettled(), null, { timeout: 60000 });
const g0 = await sim.page.evaluate(() => window.__test__.skyState().gaia);
check(`the arriving stars: ${GM.n} Gaia stars loaded (the manifest's count), ${GM.counts.visibleToday} within V 8 today, more than 5,000 at +20 Myr; the tier's year follows the landing`, ga.gaia.loaded === true && ga.gaia.n === GM.n && ga.gaia.counts.kept === GM.n && Math.abs(g0.year - 2000.47) < 1 && g0.visible === GM.counts.visibleToday && ga.gaia.visible > 5000 && ga.a && Number.isFinite(ga.a.vmag), `loaded ${ga.gaia.loaded} (${ga.gaia.failed || 'ok'}), n ${ga.gaia.n}, visible today ${g0.visible}, at +20 Myr ${ga.gaia.visible} (tier year ${ga.gaia.year})`);
await land('-70000000 d172');   // back to −70 Myr for the statistical reads below
// PLAN 28 §E — the statistical sky and the dome's turn: beyond the handover the catalogue tiers are
// off and the statistical tier is on (every star's magnitude and Galactic latitude kept, the
// longitude a seeded draw per 100-Myr cell); the same cell reproduces the same positions, another
// cell draws other ones; the dome turns with the Sun's orbit (the package's function); the backdrop
// sits on the camera; the dome writes no depth and draws first.
const { galacticTurnRadAtYear, SUN_GALACTIC_ORBIT } = await import('../../packages/physics/src/sky/galactic-frame.cjs');
const statOf = () => sim.page.evaluate(() => { const S = window.__test__.skyState(); const P = window.__test__.skyDomeProbe(); const T = window.__test__; return { regime: S.regime, statOp: S.statisticalOpacity, cell: S.seedCell, built: S.statisticalBuilt, turn: S.galacticTurnRad, year: S.year, p: [0, 1, 2, 4000].map((i) => T.statisticalPositionAt ? T.statisticalPositionAt(i) : null), offset: P.backdropOffsetFromCamera, depthWrite: P.domeDepthWrite, order: P.domeRenderOrder, labelOpacity: S.labelOpacity }; });
const a10m = await statOf();
await land('-90000000 d172'); const a30m = await statOf();
await land('-130000000 d172'); const a130m = await statOf();
await land('-4420000000 d172'); const aGen = await statOf();
check('statistical sky at −70 Myr: the tier on (opacity 1), the names off, the seed cell −1 and built', a10m.regime === 'statistical' && a10m.statOp === 1 && a10m.cell === -1 && a10m.built === -1 && a10m.labelOpacity === 0 && a10m.p[0] && a10m.p[0].every(Number.isFinite), JSON.stringify({ cell: a10m.cell, built: a10m.built, op: a10m.statOp, label: a10m.labelOpacity }));
check('statistical sky: the same 100-Myr cell draws the same places (−70 vs −90 Myr), another cell other ones (−130 Myr); the genesis in cell −45', JSON.stringify(a10m.p) === JSON.stringify(a30m.p) && a30m.cell === -1 && a130m.cell === -2 && JSON.stringify(a130m.p) !== JSON.stringify(a10m.p) && aGen.cell === -45 && aGen.statOp === 1 && aGen.regime === 'statistical', `cells ${a10m.cell}/${a30m.cell}/${a130m.cell}/${aGen.cell}`);
const expTurn = galacticTurnRadAtYear(a130m.year);
check(`the dome turns with the Sun's Galactic orbit (period ${SUN_GALACTIC_ORBIT.periodMyr.toFixed(1)} Myr): the scene's turn at −130 Myr ≡ the package's`, Math.abs(a130m.turn - expTurn) < 1e-12 && Math.abs(expTurn) > 3 && Math.abs(aGen.turn) > 100, `${a130m.turn.toFixed(6)} vs ${expTurn.toFixed(6)} rad; the genesis ${(aGen.turn / (2 * Math.PI)).toFixed(2)} turns`);
check('the sky is a backdrop at infinity: the group sits on the camera (offset 0), the dome writes no depth and draws first', aGen.offset === 0 && aGen.depthWrite === false && aGen.order < 0, `offset ${aGen.offset}, depthWrite ${aGen.depthWrite}, order ${aGen.order}`);
// The stars at their MEASURED distances (plan 28, the owner's "zoom out infinitely and never reach a
// star"): Sirius drawn 2.637 pc from the Sun on the scene's 1 AU = 100 (1 pc = 2.06 × 10⁷ units), its
// absolute magnitude +1.45 from V −1.44; the catalogue centred on the Sun; the sky pass's own camera
// reaches 10¹³ units (the main camera's 10⁷ would clip Proxima).
await land('2000 d172');
const geo = await sim.page.evaluate(() => { const T = window.__test__; const s = T.starPositionUnits(32349); const P = T.skyDomeProbe(); return { s, far: P.skyCameraFar, near: P.skyCameraNear, inSky: P.skySceneHasStars, sunOffset: P.starsOriginOffsetFromSun }; });
const unitsPerPc = 206264.806 * 100;
const sirRadius = geo.s ? Math.hypot(...geo.s.units) : NaN;
check('the stars at their measured distances: Sirius 2.637 pc from the Sun in scene units (1 pc = 2.06e7), absolute magnitude +1.45', !!geo.s && Math.abs(sirRadius / unitsPerPc - 2.637) < 0.002 && Math.abs(geo.s.absMag - 1.45) < 0.02 && geo.s.unitsPerPc === unitsPerPc, geo.s ? `${(sirRadius / unitsPerPc).toFixed(4)} pc, M ${geo.s.absMag.toFixed(3)}` : 'null');
check('the sky pass: the catalogue in the sky scene centred on the Sun (offset < 1e-6 units), the sky camera near 10 / far 1e13', geo.inSky === true && geo.sunOffset < 1e-6 && geo.far === 1e13 && geo.near === 10, `in sky scene ${geo.inSky}, Sun offset ${geo.sunOffset}, near/far ${geo.near}/${geo.far}`);
// The label layer holds BOTH scenes' labels after one frame: the star names (the sky scene under the sky camera) and the
// solar system's (the main scene under the main camera — the wobble centre and the perihelion of Earth among them). Two
// render calls per frame had the first consume the one-shot flag and wipe the layer: every main-scene label vanished
// from the realism pass on (the owner: "the labels when we zoom into earth are no longer available").
await sim.page.evaluate(() => { window.__test__.setStarNamesVisible(true); window.__test__.skyUpdate(true); });   // the names are off by default
await sim.page.waitForTimeout(600);
const lab = await sim.page.evaluate(() => window.__test__.skyDomeProbe().labelLayer);
await sim.page.evaluate(() => { window.__test__.setStarNamesVisible(false); });
check('the label layer carries both scenes after one frame: star names and the main scene\'s labels, the wobble centre and the perihelion of Earth among them', lab.starNames > 0 && lab.mainScene > 0 && lab.wobbleCentre === true && lab.perihelion === true, JSON.stringify(lab));
const far = await sim.page.evaluate(() => { const T = window.__test__; const P = T.skyDomeProbe(); const S = T.skyState(); const a = T.starPositionUnits(71681); return { capPc: P.cameraMaxDistancePc, sunM: S.sunPointAbsMag, nearestPc: a ? a.distPc : NaN }; });
check('the Sun as a star (M_V 4.81) at the catalogue\'s origin; the zoom-out capped at the catalogue\'s reach (2,000 pc); α Cen B the nearest star (1.255 pc — the distance prior, no photometric clump)', Math.abs(far.sunM - 4.81) < 1e-5 && Math.abs(far.capPc - 2000) < 1e-9 && Math.abs(far.nearestPc - 1.255) < 0.01, `M ${far.sunM}, cap ${far.capPc} pc, α Cen B ${far.nearestPc} pc`);
// a landing re-read at the same year reproduces the state bit-for-bit
const again = await land('-48000 d172');
check('purity: a landing re-read at the same year reproduces every fade bit-for-bit', JSON.stringify(again.g) === JSON.stringify(s48.g) && again.year === s48.year, `${again.year} vs ${s48.year}`);
await land('2000 d172');

// The artistic (curved) layout is a SKY curve (the owner: "no longer showing the proper constellation" once the
// stars sat at their measured distances — a spline through the 3-D positions overshot in depth and whipped across
// the sky): every sample of Orion's and the Big Dipper's curves stays within 6° of its stroke's great-circle
// polyline, and the curve passes through the stars; the asterism layout's segments are the stars' chords.
const ang = (a, b) => { const na = Math.hypot(...a), nb = Math.hypot(...b); return Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb)))) * 180 / Math.PI; };
const toArc = (p, a, b) => { // the angular distance from direction p to the great-circle arc a→b
  const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nn = Math.hypot(...n) || 1;
  const s = Math.asin(Math.max(-1, Math.min(1, (p[0] * n[0] + p[1] * n[1] + p[2] * n[2]) / (nn * Math.hypot(...p))))) * 180 / Math.PI;
  const inside = ang(p, a) <= ang(a, b) + 1e-9 && ang(p, b) <= ang(a, b) + 1e-9;
  return inside ? Math.abs(s) : Math.min(ang(p, a), ang(p, b));
};
await sim.page.evaluate(() => window.__test__.setConstellationLayout('stellarium', true));
await sim.page.waitForTimeout(2500);
const curved = await sim.page.evaluate(() => ({ ori: window.__test__.constellationLineProbe('Ori'), uma: window.__test__.constellationLineProbe('UMa') }));
let worstArc = 0, worstEnd = 0, nLines = 0;
for (const probe of [curved.ori, curved.uma]) for (const L of probe.lines) {
  if (!L.stars || L.stars.length < 2) continue; nLines++;
  for (const p of L.samples) { let best = Infinity; for (let j = 0; j + 1 < L.stars.length; j++) best = Math.min(best, toArc(p, L.stars[j], L.stars[j + 1])); worstArc = Math.max(worstArc, best); }
  worstEnd = Math.max(worstEnd, ang(L.samples[0], L.stars[0]), ang(L.samples[L.samples.length - 1], L.stars[L.stars.length - 1]));
}
check(`the artistic layout is a sky curve: ${nLines} Orion and Big Dipper curves within 6° of their strokes' great-circle polylines, ending on their stars`, curved.ori.layout === 'stellarium' && nLines >= 2 && worstArc < 6 && worstEnd < 0.01, `worst ${worstArc.toFixed(2)}°, ends ${worstEnd.toFixed(4)}°`);
await sim.page.evaluate(() => window.__test__.setConstellationLayout('asterism', false));
await sim.page.waitForTimeout(500);

// PLAN 28 §F2 — the zodiac band of date: the IAU boundaries (B1875 coordinate lines, Roman 1987's table) where the
// ecliptic OF DATE crosses them, re-solved per engine year on the scene's placed Earth frame; the live scene ≡ the
// referee record at J2000 and −10 kyr (the frame to 1e-9, the crossings bit for bit), thirteen crossings today with
// Ophiuchus spanning 18.6°, fifteen at −10 kyr (the tilted ecliptic grazes Cetus), the band drawn inside the
// catalogue regime and nothing at −60 Myr. And §E's band bob: the Sun 20.8 pc north today → the dome's midplane
// 0.79° south (the texture offset carries it), 91 pc north at −60 Myr → 3.5° south.
const ZREC = JSON.parse(readFileSync(new URL('../../data/zodiac-boundary-reference.json', import.meta.url), 'utf8'));
const zodiacAt = async (y) => { await land(y); await sim.page.evaluate(() => window.__test__.setZodiacVisible && window.__test__.setZodiacVisible(true)); await sim.page.waitForTimeout(400); return sim.page.evaluate(() => { const P = window.__test__.zodiacBandProbe(); const S = window.__test__.skyState(); return { year: P.year, inRegime: P.inRegime, frame: P.frame, crossings: P.crossings, drawn: P.drawn, bandShift: S.bandShiftDeg, zSun: S.sunHeightPc, offsetY: S.domeTextureOffsetY }; }); };
const zj = await zodiacAt('2000 d172'), zm10 = await zodiacAt('-10000 d172'), z60 = await zodiacAt('-60000000 d172');
const recOf = (label) => ZREC.epochs.find((e) => e.label === label);
const frameOff = (a, b) => Math.max(...[0, 1, 2].map((i) => Math.abs(a.pole[i] - b.pole[i])), ...[0, 1, 2].map((i) => Math.abs(a.equinox[i] - b.equinox[i])));
// the live frame against the record: the placed Earth frame differs by ~6e-7 (0.1″) between separate runs, so the
// crossings agree to 1e-4° with the names identical — the record's own bit-for-bit reproduction is the Node gate's row
const sameCross = (a, b) => a.length === b.length && a.every((c, i) => c.abbr === b[i].abbr && Math.abs(c.lonDeg - b[i].lonDeg) < 1e-4);
const oph = zj.crossings && zj.crossings.find((c) => c.abbr === 'Oph'), sgr = zj.crossings && zj.crossings.find((c) => c.abbr === 'Sgr');
check('the zodiac band of date at J2000: thirteen crossings ≡ the referee record (frame to 1e-6, longitudes to 1e-4°), Ophiuchus 247.645° → Sagittarius 266.244° (18.6°), the band drawn (lines, names, glow)', zj.inRegime && zj.crossings && zj.crossings.length === 13 && frameOff(zj.frame, recOf('2000 d172').frame) < 1e-6 && sameCross(zj.crossings, recOf('2000 d172').crossings) && oph && sgr && Math.abs(oph.lonDeg - 247.645) < 0.002 && Math.abs(sgr.lonDeg - oph.lonDeg - 18.60) < 0.01 && zj.drawn === 3, `${zj.crossings ? zj.crossings.length : 'null'} crossings, frame off ${zj.frame ? frameOff(zj.frame, recOf('2000 d172').frame).toExponential(1) : '?'}, Oph ${oph && oph.lonDeg.toFixed(3)}, drawn ${zj.drawn}`);
check('at −10 kyr the tilted ecliptic of date grazes Cetus: fifteen crossings ≡ the record; at −60 Myr nothing is drawn (beyond the catalogue regime)', zm10.crossings && zm10.crossings.length === 15 && zm10.crossings.some((c) => c.abbr === 'Cet') && frameOff(zm10.frame, recOf('-10000 d172').frame) < 1e-6 && sameCross(zm10.crossings, recOf('-10000 d172').crossings) && z60.inRegime === false && z60.crossings === null && z60.drawn === 0, `−10 kyr ${zm10.crossings ? zm10.crossings.length : 'null'} crossings (Cet ${zm10.crossings && zm10.crossings.some((c) => c.abbr === 'Cet')}), −60 Myr drawn ${z60.drawn}`);
check('the band bobs with the Sun\'s height: 20.8 pc north today → the midplane 0.79° south in the dome\'s texture offset; 91 pc north at −60 Myr → 3.5° south', Math.abs(zj.zSun - 20.8) < 0.1 && Math.abs(zj.bandShift + 0.794) < 0.005 && Math.abs(zj.offsetY + zj.bandShift / 180) < 1e-12 && Math.abs(z60.zSun - 91) < 1 && Math.abs(z60.bandShift + 3.47) < 0.02, `today z ${zj.zSun.toFixed(1)} pc shift ${zj.bandShift.toFixed(3)}° offset ${zj.offsetY}; −60 Myr z ${z60.zSun.toFixed(1)} shift ${z60.bandShift.toFixed(2)}°`);
await sim.page.evaluate(() => window.__test__.setZodiacVisible && window.__test__.setZodiacVisible(false));
await land('2000 d172');   // back at J2000 for the counts below

// 4. the counts and the layers
const st = await sim.page.evaluate(() => window.__test__.skyState());
const C = CAT._meta.counts;
check(`counts: the scene loaded the catalogue — ${C.stars} stars, ${C.nakedEye} naked-eye, ${C.named} names, 204 strokes`, st.stars === C.stars && st.nakedEye === C.nakedEye && st.labels === C.named && st.strokes === 204 && st.constellations > 80, `${st.stars} / ${st.nakedEye} / ${st.labels} / ${st.strokes} / ${st.constellations} constellations`);
check('the sky is at J2000 again in the orbits regime (every shape at opacity 1)', st.regime === 'orbits' && Object.values(st.groups).every((g) => g.opacity === 1), '');

console.log(fail ? `FAIL — ${fail} sky-of-date row(s)` : 'PASS — the sky of date: the referee, purity, the fades and the regime, the counts.');
console.log(`page errors: ${sim.errors.length}`);
await sim.dispose();
process.exit(fail || sim.errors.length ? 1 : 0);
