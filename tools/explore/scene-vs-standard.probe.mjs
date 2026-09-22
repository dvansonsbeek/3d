// Scratch-class probe: at a fixed instant, the page's rendered Sun/Moon vs the certified Sun and vs the standard
// theories (VSOP87 / MPP02 geometric at the scene's true TT), all in ecliptic longitude of date.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { openSimulator } from '../../test/browser/harness.mjs';
const require = createRequire(import.meta.url);
const { createModel, DEFAULT_CONSTANTS: C } = require('@essrt/physics');
const REF = require('@essrt/reference');
const series = JSON.parse(readFileSync(new URL('../../data/nbody-secular-series.json', import.meta.url), 'utf8'));
const m = createModel(undefined, { secularSeriesArtifact: series });
const J2000 = 2451545.0, AS = 3600, d2r = Math.PI / 180, r2d = 180 / Math.PI;
const BR = C.earthOrbital.deltaTStart;
const wrap = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const pA = (T) => (5028.796195 * T + 1.1054348 * T * T) / AS;
const lonJ2000ToDate = (v, jd) => ((Math.atan2(v[1], v[0]) * r2d + pA((jd - J2000) / 36525)) % 360 + 360) % 360;
const eclLonFromRaDec = (raRad, decRad, epsDeg) => { const e = epsDeg * d2r; const x = Math.cos(decRad) * Math.cos(raRad), y = Math.cos(decRad) * Math.sin(raRad), z = Math.sin(decRad); return ((Math.atan2(y * Math.cos(e) + z * Math.sin(e), x) * r2d) % 360 + 360) % 360; };
const JDS = [2451716.5, 2461307.0];
const s = await openSimulator();
await s.page.waitForTimeout(4000);   // let the series artifact arrive
const keys = await s.page.evaluate(() => Object.keys(window.__test__).sort());
console.log('moon/scene hooks:', keys.filter((k) => /oon|scene|Scene/.test(k)).join(' '));
const out = await s.page.evaluate((JDS) => {
  const T = window.__test__; const r = {};
  for (const jd of JDS) {
    const o = {};
    try { o.certSunLon = T.certSunLonAt(jd); } catch (e) { o.certErr = String(e); }
    try { o.sceneSun = T.sceneSunRaDecAt ? T.sceneSunRaDecAt(jd) : null; } catch (e) { o.sceneSunErr = String(e); }
    try { o.fwSunLon = T.fwSunLonAt ? T.fwSunLonAt(jd) : null; } catch (e) { o.fwErr = String(e); }
    try { o.planets = T.planetsSceneStateAt ? T.planetsSceneStateAt(jd) : null; } catch (e) { o.plErr = String(e); }
    r[jd] = o;
  }
  return r;
}, JDS);
await s.dispose();
for (const jd of JDS) {
  const o = out[jd];
  const ttModel = jd + (BR + m.eclipse.deltaTSecondsAtJD(jd + BR / 86400)) / 86400;
  const vsopTT = lonJ2000ToDate(REF.vsop87GeoEclipticAU('sun', ttModel), ttModel);
  const vsopUT = lonJ2000ToDate(REF.vsop87GeoEclipticAU('sun', jd), jd);
  const eps = m.earth.obliquityDeg(2000 + (jd - J2000) / 365.25);
  console.log(`\njd ${jd}: certSunLon ${o.certSunLon} (err ${o.certErr ?? '-'})`);
  console.log(`  certified − VSOP geometric @ scene TT: ${(wrap(o.certSunLon - vsopTT) * AS).toFixed(2)}″ | − VSOP @ UT: ${(wrap(o.certSunLon - vsopUT) * AS).toFixed(2)}″`);
  if (o.sceneSun && typeof o.sceneSun === 'object') {
    const ra = o.sceneSun.raDeg !== undefined ? o.sceneSun.raDeg * d2r : (o.sceneSun.raRad ?? o.sceneSun.ra);
    const dec = o.sceneSun.decDeg !== undefined ? o.sceneSun.decDeg * d2r : (o.sceneSun.decRad ?? o.sceneSun.dec);
    const epsUse = o.sceneSun.epsDeg ?? eps;
    if (typeof ra === 'number') { const lam = eclLonFromRaDec(ra, dec, epsUse); console.log(`  rendered Sun λ ${lam.toFixed(6)} (scene ε ${epsUse}) → rendered − certified ${(wrap(lam - o.certSunLon) * AS).toFixed(2)}″`); }
    else console.log('  sceneSun keys', Object.keys(o.sceneSun));
  } else console.log('  sceneSun', o.sceneSun, o.sceneSunErr ?? '');
  if (o.planets) console.log('  planets state keys:', Object.keys(o.planets).slice(0, 12).join(' '));
}
