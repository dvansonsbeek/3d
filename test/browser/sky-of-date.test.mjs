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
 *      'linear' at −998 kyr, 'fading' at −1.15 Myr, 'none' at −10 Myr; the Milky Way dome
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

// 1. the referee — per star: the plan's 1″ / 10″ where the measurement allows (Sirius, Arcturus,
// α Cen), the rigorous model's measured light-time gap rounded up for the two fastest stars
// (the record carries each star's tolerance; a wrong unit or sign fails by degrees)
let n = 0; const worst = [];
for (const [hipStr, rec] of Object.entries(REF.stars)) {
  const hip = Number(hipStr);
  let w10 = 0, w100 = 0;
  for (const p of rec.positions) {
    if (p.year === 2000) continue;
    const d = await sim.page.evaluate(({ hip, y }) => window.__test__.starDirectionAt(hip, y), { hip, y: p.year });
    if (!d) { check(`referee: HIP ${hip} at ${p.year} is in the scene`, false, 'null'); continue; }
    const plant = PLANT ? 2 / 3600 : 0;
    const dra = ((d.raDeg + plant) - p.raDeg) * Math.cos(p.decDeg * D2R) * 3600, ddec = (d.decDeg - p.decDeg) * 3600;
    const sep = Math.hypot(dra, ddec);
    n++;
    if (Math.abs(p.year - 2000) <= 10000) w10 = Math.max(w10, sep); else w100 = Math.max(w100, sep);
  }
  const tol = rec.toleranceArcsec;
  worst.push({ hip, name: rec.name || hip, w10, w100, ok: w10 <= tol['10kyr'] && w100 <= tol['100kyr'], tol });
}
check(`referee: ${n} star-epochs of five stars within each star's tolerance of astropy's space motion (±10 kyr / ±100 kyr)`, worst.every((w) => w.ok), worst.map((w) => `${w.name} ${w.w10.toFixed(2)}″/${w.w100.toFixed(1)}″ (≤ ${w.tol['10kyr']}/${w.tol['100kyr']})`).join(', '));

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
  return sim.page.evaluate(() => { const S = window.__test__.skyState(); const g = {}; for (const k of ['UMa', 'Ori', 'Leo', 'Cas', 'Sco']) g[k] = S.groups[k] ? { rms: S.groups[k].rmsDeg, op: S.groups[k].opacity } : null; return { year: S.year, regime: S.regime, fade: S.regimeFade, g, dome: window.__test__.skyDomeProbe().brightness }; });
};
const s48 = await land('-48000 d172');
check('fades at −48 kyr: the Big Dipper nearly gone (RMS 4–5.5°, opacity < 0.25), Orion still readable (RMS 1.5–3.5°, opacity 0.4–0.9)', s48.regime === 'linear' && s48.g.UMa && s48.g.UMa.rms > 4 && s48.g.UMa.rms < 5.5 && s48.g.UMa.op < 0.25 && s48.g.Ori && s48.g.Ori.rms > 1.5 && s48.g.Ori.rms < 3.5 && s48.g.Ori.op > 0.4 && s48.g.Ori.op < 0.9, JSON.stringify(s48.g));
const s198 = await land('-198000 d172');
check('fades at −198 kyr: every shape gone (opacity 0 for UMa, Ori, Leo, Cas, Sco)', s198.regime === 'linear' && ['UMa', 'Ori', 'Leo', 'Cas', 'Sco'].every((k) => s198.g[k] && s198.g[k].op === 0), JSON.stringify(s198.g));
const s998 = await land('-998000 d172');
const s1150 = await land('-1150000 d172');
const s10m = await land('-10000000 d172');
check('regime: linear at −998 kyr, handover at −1.15 Myr (0 < fade < 1), statistical at −10 Myr; the dome\'s brightness untouched', s998.regime === 'linear' && s998.fade === 1 && s1150.regime === 'handover' && s1150.fade > 0 && s1150.fade < 1 && s10m.regime === 'statistical' && s10m.fade === 0 && s48.dome === s10m.dome, `fade ${s998.fade} / ${s1150.fade.toFixed(3)} / ${s10m.fade}, dome ${s48.dome}`);
// The handover is PER STAR (the owner: "at 1.1 Myr the sky is more or less empty" — a tier-wide cross-fade
// halved every star at the midpoint): at −1.1 Myr (fade 0.5) half the stars are still in the catalogue at
// full light and half have become their statistical twins; a star's two alphas sum to 1; the Sun never hands over.
await land('-1098000 d172');
const ho = await sim.page.evaluate(() => { const T = window.__test__; const S = T.skyState(); return { fade: S.regimeFade, share: S.catalogueShare, sirius: T.starHandoverAlpha(32349), groombridge: T.starHandoverAlpha(57939) }; });
check('the handover is per star: at −1.1 Myr (fade 0.50) the catalogue share is 0.48–0.52, each star\'s catalogue + statistical alphas sum to 1', Math.abs(ho.fade - 0.5) < 0.01 && ho.share > 0.48 && ho.share < 0.52 && Math.abs(ho.sirius.catalogue + ho.sirius.statistical - 1) < 1e-9 && Math.abs(ho.groombridge.catalogue + ho.groombridge.statistical - 1) < 1e-9, `fade ${ho.fade.toFixed(3)}, share ${ho.share.toFixed(3)}, Sirius ${ho.sirius.catalogue.toFixed(2)}/${ho.sirius.statistical.toFixed(2)} (phase ${ho.sirius.phase.toFixed(3)})`);
await land('-10000000 d172');   // back to −10 Myr for the statistical reads below
// PLAN 28 §E — the statistical sky and the dome's turn: beyond the handover the catalogue tiers are
// off and the statistical tier is on (every star's magnitude and Galactic latitude kept, the
// longitude a seeded draw per 100-Myr cell); the same cell reproduces the same positions, another
// cell draws other ones; the dome turns with the Sun's orbit (the package's function); the backdrop
// sits on the camera; the dome writes no depth and draws first.
const { galacticTurnRadAtYear, SUN_GALACTIC_ORBIT } = await import('../../packages/physics/src/sky/galactic-frame.cjs');
const statOf = () => sim.page.evaluate(() => { const S = window.__test__.skyState(); const P = window.__test__.skyDomeProbe(); const T = window.__test__; return { regime: S.regime, statOp: S.statisticalOpacity, cell: S.seedCell, built: S.statisticalBuilt, turn: S.galacticTurnRad, year: S.year, p: [0, 1, 2, 4000].map((i) => T.statisticalPositionAt ? T.statisticalPositionAt(i) : null), offset: P.backdropOffsetFromCamera, depthWrite: P.domeDepthWrite, order: P.domeRenderOrder, labelOpacity: S.labelOpacity }; });
const a10m = await statOf();
await land('-30000000 d172'); const a30m = await statOf();
await land('-130000000 d172'); const a130m = await statOf();
await land('-4420000000 d172'); const aGen = await statOf();
check('statistical sky at −10 Myr: the tier on (opacity 1), the names off, the seed cell −1 and built', a10m.regime === 'statistical' && a10m.statOp === 1 && a10m.cell === -1 && a10m.built === -1 && a10m.labelOpacity === 0 && a10m.p[0] && a10m.p[0].every(Number.isFinite), JSON.stringify({ cell: a10m.cell, built: a10m.built, op: a10m.statOp, label: a10m.labelOpacity }));
check('statistical sky: the same 100-Myr cell draws the same places (−10 vs −30 Myr), another cell other ones (−130 Myr); the genesis in cell −45', JSON.stringify(a10m.p) === JSON.stringify(a30m.p) && a30m.cell === -1 && a130m.cell === -2 && JSON.stringify(a130m.p) !== JSON.stringify(a10m.p) && aGen.cell === -45 && aGen.statOp === 1 && aGen.regime === 'statistical', `cells ${a10m.cell}/${a30m.cell}/${a130m.cell}/${aGen.cell}`);
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
const far = await sim.page.evaluate(() => { const T = window.__test__; const P = T.skyDomeProbe(); const S = T.skyState(); const a = T.starPositionUnits(71681); return { capPc: P.cameraMaxDistancePc, sunM: S.sunPointAbsMag, nearestPc: a ? a.distPc : NaN }; });
check('the Sun as a star (M_V 4.81) at the catalogue\'s origin; the zoom-out capped at the catalogue\'s reach (2,000 pc); α Cen B the nearest star (1.255 pc — the distance prior, no photometric clump)', Math.abs(far.sunM - 4.81) < 1e-5 && Math.abs(far.capPc - 2000) < 1e-9 && Math.abs(far.nearestPc - 1.255) < 0.01, `M ${far.sunM}, cap ${far.capPc} pc, α Cen B ${far.nearestPc} pc`);
// a landing re-read at the same year reproduces the state bit-for-bit
const again = await land('-48000 d172');
check('purity: a landing re-read at the same year reproduces every fade bit-for-bit', JSON.stringify(again.g) === JSON.stringify(s48.g) && again.year === s48.year, `${again.year} vs ${s48.year}`);
await land('2000 d172');

// 4. the counts and the layers
const st = await sim.page.evaluate(() => window.__test__.skyState());
const C = CAT._meta.counts;
check(`counts: the scene loaded the catalogue — ${C.stars} stars, ${C.nakedEye} naked-eye, ${C.named} names, 204 strokes`, st.stars === C.stars && st.nakedEye === C.nakedEye && st.labels === C.named && st.strokes === 204 && st.constellations > 80, `${st.stars} / ${st.nakedEye} / ${st.labels} / ${st.strokes} / ${st.constellations} constellations`);
check('the sky is at J2000 again in the linear regime (every shape at opacity 1)', st.regime === 'linear' && Object.values(st.groups).every((g) => g.opacity === 1), '');

console.log(fail ? `FAIL — ${fail} sky-of-date row(s)` : 'PASS — the sky of date: the referee, purity, the fades and the regime, the counts.');
console.log(`page errors: ${sim.errors.length}`);
await sim.dispose();
process.exit(fail || sim.errors.length ? 1 : 0);
