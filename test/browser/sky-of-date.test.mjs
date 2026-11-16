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
check('regime: linear at −998 kyr, fading at −1.15 Myr (0 < fade < 1), none at −10 Myr; the dome\'s brightness untouched', s998.regime === 'linear' && s998.fade === 1 && s1150.regime === 'fading' && s1150.fade > 0 && s1150.fade < 1 && s10m.regime === 'none' && s10m.fade === 0 && s48.dome === s10m.dome, `fade ${s998.fade} / ${s1150.fade.toFixed(3)} / ${s10m.fade}, dome ${s48.dome}`);
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
