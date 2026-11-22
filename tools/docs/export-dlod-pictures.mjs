// Export the Earth dLOD/dt Analysis panel's pictures without the UI — the genesis exporter's twin
// (tools/docs/export-genesis-pictures.mjs) for the rate-decomposition figures the paper and the site carry.
//
//   npm run build
//   node tools/docs/export-dlod-pictures.mjs [out=<dir>] [ranges=deep,glacial] [layers=proxyLR04,...] [tag=<prefix>]
//
// `layers=` switches the named layer toggles ON before the export (the panel's data-lcr-layer keys: bands, bondCurve,
// resonator, proxy = GISP2, proxyLR04 = the LR04 stack); the paper's 200,000-BC figure carries LR04.
//
// Opens the BUILT bundle in headless Chromium (test/browser/harness.mjs), opens Tools → Earth dLOD/dt Analysis,
// selects each range tab by its label and clicks Export, saving the modal's PNG — the export renderer's own
// output, identical to what the button downloads. With ESSRT_SITE_DIR set and no out=, the files land in the
// site's public/img/ under the website's names; the paper's figure is the 'glacial' range under its own name.
//
// Why this exists (doc 111 §1.51's follow-up, the paper review of 2026-11-22): the two figures were hand-exported
// on 2026-09-30, before plan 26 rebuilt the GIA channel, and showed a deglacial rate minimum the shipped channel
// does not have (its 6-kyr relaxation puts the minimum after the melt) — a figure that is not script-generated
// goes stale unseen. The site's text reads the registry's dLodDt*Min* keys; the pictures come from here.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openSimulator } from '../../test/browser/harness.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
/** the site's file names per range key (the labels are the panel's LCR_RANGE_TABS) */
const SITE_NAMES = { deep: '04_dLOD_sinceLGM.png', glacial: '04_dLOD_200000BC.png', holocene: '04_dLOD_4000BC.png' };
const LABELS = { glacial: '200,000 BC–2050', deep: '27,500 BC–2050', lgm: '13,000 BC–2050', holocene: '4,000 BC–2050', historical: '750–2050 AD', nearFuture: '1,200–2,500 AD', full: '13,000 BC–15,000' };
const SITE = process.env.ESSRT_SITE_DIR;
const OUT = arg('out', SITE ? join(SITE, 'public', 'img') : 'exports');
const TAG = arg('tag', '');
const RANGES = arg('ranges', 'deep,glacial').split(',');
const LAYERS = arg('layers', '').split(',').filter(Boolean);
mkdirSync(OUT, { recursive: true });

const sim = await openSimulator();
try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.chartExportForms, null, { timeout: 90000 });
  await sim.page.evaluate(() => { const t = [...document.querySelectorAll('#gui .tp-fldv_t')].find((x) => /^Tools$/.test(x.textContent.trim())); if (t) t.click(); });
  await sim.page.evaluate(async () => {
    const btn = [...document.querySelectorAll('#gui .tp-btnv_b')].find((x) => x.textContent.trim() === 'Earth dLOD/dt Analysis');
    if (!btn) throw new Error('Earth dLOD/dt Analysis button not found');
    btn.click(); await new Promise((r) => setTimeout(r, 3000));
  });
  if (LAYERS.length) {
    await sim.page.evaluate(async (layers) => {
      for (const key of layers) {
        const box = document.querySelector(`input[data-lcr-layer="${key}"]`) || document.querySelector(`[data-lcr-layer="${key}"] input`);
        if (!box) throw new Error(`no layer toggle '${key}'`);
        if (!box.checked) { box.click(); await new Promise((r) => setTimeout(r, 800)); }
      }
    }, LAYERS);
  }
  for (const range of RANGES) {
    const label = LABELS[range];
    if (!label) throw new Error(`unknown range '${range}' — one of ${Object.keys(LABELS).join(', ')}`);
    const b64 = await sim.page.evaluate(async ({ label, range }) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const exportBtn = document.querySelector('[data-lcr-export]');
      if (!exportBtn) throw new Error('the dLOD/dt panel is not open (no [data-lcr-export])');
      const panel = exportBtn.closest('.cfm-container') || document;
      const tab = [...panel.querySelectorAll('.cfm-tab')].find((x) => x.textContent.trim() === label);
      if (!tab) throw new Error(`no range tab labelled '${label}' (${range})`);
      tab.click(); await wait(1500);   // the 3,000-sample glacial range renders in a few hundred ms
      exportBtn.click();
      let img = null;
      for (let i = 0; i < 150; i++) { await wait(200); img = document.querySelector('.chart-export-modal img'); if (img && img.src) break; }
      if (!img) throw new Error('export modal produced no picture for ' + range);
      const blob = await (await fetch(img.src)).blob();
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      const out = btoa(s);
      document.querySelector('.chart-export-close').click(); await wait(300);
      return out;
    }, { label, range });
    const name = TAG ? `${TAG}-${range}.png` : SITE_NAMES[range] ?? `dlod-${range}.png`;
    const file = join(OUT, name);
    writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log('saved', file);
  }
  if (sim.errors.length) { console.error('page errors:', sim.errors.slice(0, 3).join(' | ')); process.exit(1); }
} finally { await sim.dispose(); }
