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
 * FAIL-PROVEN: ESSRT_CHART_EXPORT_PLANT=1 shifts the expected width by one
 * pixel — the suite must go red on the same build it passes clean.
 * ESSRT_CHART_EXPORT_PLANT=2 injects a caption line into one form instead.
 */
import { openSimulator } from './harness.mjs';

const PLANT = process.env.ESSRT_CHART_EXPORT_PLANT === '1';
const PLANT_CAPTION = process.env.ESSRT_CHART_EXPORT_PLANT === '2';
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
  check('page came up without errors', sim.errors.length === 0, sim.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('suite ran to completion', false, String((e && e.stack) || e));
} finally {
  await sim.dispose();
}
console.log(fail === 0 ? '\nchart-export: PASS' : `\nchart-export: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
