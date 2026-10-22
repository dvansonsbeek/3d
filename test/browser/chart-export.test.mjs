/**
 * Chart-export gate (headless, hermetic).
 *
 * BORN WITH the export modal: the Tools panels' "Export" buttons used to open
 * the paper-style SVG as a blob: URL in a new tab — a vector document nobody
 * could save as a picture (and unusable on an iPad). They now rasterize the
 * SVG in the browser (Image → canvas → PNG) and offer PNG / SVG downloads.
 *
 * The gate renders a REAL paper SVG (the Formula Verification planet-
 * inclination chart, through the existing `vfpPIPaperSvg` hook), rasterizes it
 * through the same function the modal uses, and asserts:
 *  1. the result is an image/png Blob;
 *  2. its pixel size is exactly the SVG root's width × height × the export
 *     scale (the root's own width/height attributes are the contract every
 *     paper renderer honours);
 *  3. the PNG bytes decode (createImageBitmap) to those same dimensions and
 *     the file is not a blank canvas (byte floor).
 *
 * THE EXPORT STANDARD (owner: "only the picture"): every one of the fifteen
 * paper forms (fourteen renderers, the Planet Orbit Analysis' orbit picture among
 * them; the perihelion panel prints one or three charts) is
 * rendered through the `chartExportForms` hook, data loaded, and checked for
 *  4. a root width/height, a 16-px title at y = 18 and the credit
 *     "ESSRT · holisticuniverse.com" exactly once, in the bottom-right strip;
 *  5. no text below the credit strip and no paragraph text — no <text> other
 *     than the credit may sit in the bottom 16 px, and no text element may
 *     run past 110 characters (the retired captions were wrapped
 *     130–150-character lines; axis labels, legend names and titles are short).
 *
 * THE FRAMEWORK IMAGES (plan 17): the twelve figures of Tools → Analysis →
 * Framework images, data loaded, pass the same standard (4–5), and
 *  6. every model number a figure prints is the model's: the gate reads each
 *     surface through the figures' reader object (`frameworkImagesContext`),
 *     formats it as the figure does, and requires that string in the figure's
 *     text (e.g. figure 1's e_min ≡ the scene's eccentricity scan, figure 11's
 *     ϖ ≡ the chain at the solstice instant, figure 8's days ≡ the length family).
 *
 * FAIL-PROVEN: ESSRT_CHART_EXPORT_PLANT=1 shifts the expected width by one
 * pixel — the suite must go red on the same build it passes clean.
 * ESSRT_CHART_EXPORT_PLANT=2 injects a caption line into one form instead.
 * ESSRT_CHART_EXPORT_PLANT=3 alters one printed number (figure 8's sidereal
 * day, one unit in its last decimal) — the numbers row must go red.
 */
import { openSimulator } from './harness.mjs';

const PLANT = process.env.ESSRT_CHART_EXPORT_PLANT === '1';
const PLANT_CAPTION = process.env.ESSRT_CHART_EXPORT_PLANT === '2';
const PLANT_NUMBER = process.env.ESSRT_CHART_EXPORT_PLANT === '3';
const FRAMEWORK_IMAGE_COUNT = 12;
const CREDIT = 'ESSRT · holisticuniverse.com';
const CREDIT_H = 16;
const MAX_TEXT_CHARS = 110;

/** Every <text> element's y (own attribute, plus the enclosing <g translate>) and plain text. */
function textElements(svg) {
  const out = [];
  // one level of <g transform="translate(x,y)"> is what the forms use
  const groups = [];
  const re = /<g\b[^>]*transform="translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)"[^>]*>|<\/g>|<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(svg))) {
    if (m[0].startsWith('</g>')) { groups.pop(); continue; }
    if (m[0].startsWith('<g')) { groups.push(+m[2]); continue; }
    const attrs = m[3], inner = m[4];
    const y = +((attrs.match(/\sy="\s*([-\d.]+)/) || [0, NaN])[1]) + groups.reduce((a, b) => a + b, 0);
    out.push({ y, text: inner.replace(/<[^>]+>/g, '').trim() });
  }
  return out;
}
const SCALE = 2;
const sim = await openSimulator();
let fail = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); if (!ok) fail++; };
/** 4–5: the export standard on one paper SVG. */
function checkStandard(name, svg) {
  const root = (svg.match(/<svg\b[^>]*>/) || [''])[0];
  const w = +(root.match(/\swidth="([\d.]+)"/) || [0, 0])[1];
  const h = +(root.match(/\sheight="([\d.]+)"/) || [0, 0])[1];
  const texts = textElements(svg);
  const credits = texts.filter((t) => t.text === CREDIT);
  const titleAt18 = texts.some((t) => t.y === 18);
  const inCreditStrip = texts.filter((t) => t.y > h - CREDIT_H && t.text !== CREDIT);
  const longest = texts.reduce((a, t) => Math.max(a, t.text.length), 0);
  const ok = w > 0 && h > 0 && credits.length === 1 && credits[0].y > h - CREDIT_H && titleAt18 && inCreditStrip.length === 0 && longest <= MAX_TEXT_CHARS;
  check(`standard: ${name}`, ok, `${w}×${h} · credit ×${credits.length}${credits[0] ? ' @y=' + credits[0].y : ''} · title@18 ${titleAt18} · below-credit texts ${inCreditStrip.length}${inCreditStrip[0] ? ' ("' + inCreditStrip[0].text.slice(0, 40) + '")' : ''} · longest text ${longest} chars`);
}
/** An SVG's visible text, tags stripped and the XML entities decoded (one string to search a printed number in). */
const plainText = (svg) => textElements(svg).map((t) => t.text).join(' \n ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.chartExportPngProbe && window.__test__.vfpPIPaperSvg, null, { timeout: 60000 });

  const r = await sim.page.evaluate(async (scale) => {
    const T = window.__test__;
    const svg = T.vfpPIPaperSvg();
    const root = (svg.match(/<svg\b[^>]*>/) || [''])[0];
    const w = +(root.match(/\swidth="([\d.]+)"/) || [0, 0])[1];
    const h = +(root.match(/\sheight="([\d.]+)"/) || [0, 0])[1];
    const png = await T.chartExportPngProbe(svg, scale);
    return { svgW: w, svgH: h, svgChars: svg.length, ...png };
  }, SCALE);

  const expectedW = Math.round(r.svgW * SCALE) + (PLANT ? 1 : 0);
  const expectedH = Math.round(r.svgH * SCALE);
  check('paper SVG carries width/height on its root', r.svgW > 0 && r.svgH > 0, `${r.svgW} × ${r.svgH} (${r.svgChars} chars)`);
  check('rasterizer returns a PNG blob', r.type === 'image/png', r.type);
  check('PNG pixel size = SVG size × scale', r.width === expectedW && r.height === expectedH, `got ${r.width} × ${r.height}, expected ${expectedW} × ${expectedH}`);
  check('PNG bytes decode to the same dimensions', r.decoded.width === r.width && r.decoded.height === r.height, `${r.decoded.width} × ${r.decoded.height}`);
  check('PNG is not blank (byte floor)', r.bytes > 20000, `${r.bytes} bytes`);

  // 4–5. the export standard on every form
  const forms = await sim.page.evaluate(() => window.__test__.chartExportForms());
  const names = Object.keys(forms);
  check('every paper form renders', names.length === 15 && names.every((n) => typeof forms[n] === 'string' && forms[n].length > 500), names.map((n) => `${n}: ${(forms[n] || '').length}`).join(', '));
  for (const name of names) {
    let svg = forms[name];
    if (PLANT_CAPTION && name === 'analemma') svg = svg.replace('</svg>', `<text x="24" y="99999" fill="#444" font-size="11">Frame: ${'x '.repeat(80)}</text></svg>`);
    checkStandard(name, svg);
  }

  // 4–6. the framework images: open the panel so it loads its records (LR04, the ice cores, EPICA CO₂, the star catalogue)
  await sim.page.waitForFunction(() => { try { return window.__test__.hybridSpinProbe(2451545).active === true; } catch { return false; } }, null, { timeout: 120000 });
  await sim.page.evaluate(() => window.__test__.openFrameworkImagesPanel());
  await sim.page.waitForFunction(() => { const f = window.__test__.frameworkImages(); return !f['ice-core'].numbers.loading && f.polestars.numbers.catalogueSize > 0 && f['bigger-picture'].numbers.lr04Range; }, null, { timeout: 60000 });
  const fi = await sim.page.evaluate(() => {
    const T = window.__test__, ctx = T.frameworkImagesContext(), figs = T.frameworkImages();
    const n = (v, dp = 0) => Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    const wrap = (a) => ((a % 360) + 360) % 360;
    const jdSS = ctx.cardinalJD(2000, 'SS'), yTT = ctx.engineYearOfJD(jdSS), L = ctx.dayAndYearLengths(yTT);
    const tP = ctx.axialPrecessionYears(2000), tAps = ctx.apsidalPeriodYears(2000), tPeri = 1 / (1 / tP + 1 / tAps);
    const min = ctx.nextEccentricityMinimum(2000);
    const N = L.siderealYearSeconds / (L.siderealYearSeconds - L.tropicalYearSeconds);
    const edc = ctx.iceCores().epicaDomeCTemperature;
    const lgm = edc.ageKyrBP.map((a, k) => [a, edc.temperatureAnomalyC[k]]).filter((p) => p[0] >= 15 && p[0] <= 30).reduce((m, p) => (!m || p[1] < m[1] ? p : m), null);
    // [figure, what, the model's value printed as the figure prints it]
    const expected = [
      ['center-aa', 'e J2000', ctx.eccentricity(2000).toFixed(6)],
      ['center-aa', 'ϖ J2000', `${ctx.perihelionLongitudeJ2000Deg(2000).toFixed(2)}°`],
      ['center-aa', 'e min', min.e.toFixed(5)],
      ['center-aa', 'T apsidal', `${n(tAps)} yr`],
      ['center-aa', 'T axial', `${n(tP)} yr`],
      ['center-03', 'e J2000', ctx.eccentricity(2000).toFixed(6)],
      ['center-03', 'T apsidal', `${n(tAps)} yr`],
      ['earth-sun-orbit', 'the AU', `${n(ctx.auKm, 1)} km`],
      ['earth-sun-orbit', 'northern summer', `${n(ctx.cardinalJD(2000, 'AE') - jdSS, 2)} days`],
      ['earth-sun-orbit', 'perihelion past the December solstice', `${wrap(ctx.sunMeanElements(yTT).perigeeLongitudeDeg - 270).toFixed(2)}°`],
      ['bigger-picture', 'T axial', `T = ${n(tP)} yr`],
      ['bigger-picture', 'T obliquity', `T = ${n(ctx.obliquityBeatYears(2000))} yr`],
      ['bigger-picture', 'T perihelion', `T = ${n(tPeri)} yr`],
      ['bigger-picture', 'the s₃ mode', `${n(ctx.nodalPeriodYears())} yr`],
      ['polestars', 'the cone half-angle ε', `ε = ${ctx.obliquityDeg(2000).toFixed(2)}°`],
      ['polestars', 'T axial', `T = ${n(tP)} yr`],
      ['precession-seasons', 'T perihelion', `T = ${n(tPeri)} yr`],
      ['coin-paradox', 'N solar years', `${n(N, 2)} solar years`],
      ['coin-paradox', 'T (Julian years)', `T = ${n(ctx.axialPrecessionYears(yTT), 2)} years`],
      ['orbit-year', 'sidereal day', n(L.siderealDaySeconds, 6)],
      ['orbit-year', 'stellar day', n(L.stellarDaySeconds, 6)],
      ['orbit-year', 'solar day', n(L.solarDaySeconds, 6)],
      ['orbit-year', 'sidereal − solar year', n(L.siderealYearSeconds - L.tropicalYearSeconds, 2)],
      ['orbit-year', 'solar year in solar days', n(L.tropicalYearSeconds / L.solarDaySeconds, 5)],
      ['precession-cw', 'the relation', `1/${n(tPeri)} = 1/${n(tP)} + 1/${n(tAps)}`],
      ['lunar-standstill', 'Ω on 21 June 2000', `Ω = ${ctx.moonNodeLongitudeDeg(jdSS).toFixed(1)}°`],
      ['lunar-standstill', 'the Moon’s inclination', `i = ${ctx.moonInclinationDeg.toFixed(3)}°`],
      ...ctx.planetKeys.map((k) => ['perihelia-2000', `ϖ ${k}`, `${wrap(ctx.perihelionLongitudeJ2000AtJD(k, jdSS)).toFixed(3)}°`]),
      ['perihelia-2000', 'ϖ Sun', `${wrap(ctx.perihelionLongitudeJ2000AtJD('earth', jdSS) + 180).toFixed(3)}°`],
      ['ice-core', 'the Last Glacial Maximum', `${lgm[1].toFixed(1)} °C`],
    ];
    return { svgs: Object.fromEntries(Object.entries(figs).map(([k, v]) => [k, v.svg])), expected };
  });
  const fiNames = Object.keys(fi.svgs);
  check('every framework image renders', fiNames.length === FRAMEWORK_IMAGE_COUNT && fiNames.every((k) => fi.svgs[k].length > 2000), fiNames.map((k) => `${k}: ${fi.svgs[k].length}`).join(', '));
  if (PLANT_NUMBER) fi.svgs['orbit-year'] = fi.svgs['orbit-year'].replace(/86,164\.(\d{5})(\d)/, (m, a, b) => `86,164.${a}${(+b + 1) % 10}`);
  for (const k of fiNames) checkStandard(`framework image ${k}`, fi.svgs[k]);
  const byFig = {};
  for (const [fig, what, s] of fi.expected) (byFig[fig] || (byFig[fig] = [])).push([what, s]);
  for (const [fig, rows] of Object.entries(byFig)) {
    const text = plainText(fi.svgs[fig] || '');
    const missing = rows.filter(([, s]) => !text.includes(s));
    check(`numbers: ${fig} prints the model's values`, missing.length === 0, missing.length ? `missing ${missing.map(([w, s]) => `${w} "${s}"`).join(', ')}` : rows.map(([w, s]) => `${w} ${s}`).join(' · '));
  }
  check('page came up without errors', sim.errors.length === 0, sim.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('suite ran to completion', false, String((e && e.stack) || e));
} finally {
  await sim.dispose();
}
console.log(fail === 0 ? '\nchart-export: PASS' : `\nchart-export: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
