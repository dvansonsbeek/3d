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
 * FAIL-PROVEN: ESSRT_CHART_EXPORT_PLANT=1 shifts the expected width by one
 * pixel — the suite must go red on the same build it passes clean.
 */
import { openSimulator } from './harness.mjs';

const PLANT = process.env.ESSRT_CHART_EXPORT_PLANT === '1';
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
  check('page came up without errors', sim.errors.length === 0, sim.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('suite ran to completion', false, String((e && e.stack) || e));
} finally {
  await sim.dispose();
}
console.log(fail === 0 ? '\nchart-export: PASS' : `\nchart-export: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
