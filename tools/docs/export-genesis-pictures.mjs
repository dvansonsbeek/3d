// Export the Earth–Moon Genesis Analysis panel's pictures without the UI.
//
//   npm run build
//   node tools/docs/export-genesis-pictures.mjs [out=<dir>] [tag=<prefix>] [range=full|phanero] [qty=lod,moon,year,axial,obliqCycle,au]
//
// Opens the BUILT bundle in headless Chromium (test/browser/harness.mjs — the same
// bundle the gates run on; ESSRT_DIST_DIR serves another build, e.g. an archived
// tree for a before/after), opens the Tools → Earth–Moon Genesis Analysis panel,
// selects the range and each quantity, clicks Export and saves the modal's PNG —
// the export renderer's own output (2400 × 1440), identical to what the button
// downloads. With ESSRT_SITE_DIR set and no out=, the files land in the site's
// public/img/ under the website's names (08_Moon_genesis.png, …).
//
// Owner (2026-09-30): "I like you to be able to generate images without my export
// action." The Framework Verification panel has tools/docs/export-panel-picture.mjs;
// this is the genesis panel's twin (plan 12 option A, 2026-10-20 — the five site
// figures were re-exported with it after the cited distance history landed).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openSimulator } from '../../test/browser/harness.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const SITE_NAMES = { lod: '08_LengthOfDay_genesis.png', moon: '08_Moon_genesis.png', year: '08_LengthOfYear_genesis.png', axial: '08_AxialPrecession_genesis.png', obliqCycle: '08_ObliquityPeriod_genesis.png', au: '08_AU_genesis.png' };
const SITE = process.env.ESSRT_SITE_DIR;
const OUT = arg('out', SITE ? join(SITE, 'public', 'img') : 'exports');
const TAG = arg('tag', '');
const RANGE = arg('range', 'full');
const QTYS = arg('qty', 'lod,moon,year,axial,obliqCycle').split(',');
mkdirSync(OUT, { recursive: true });

const sim = await openSimulator();
try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.chartExportForms, null, { timeout: 90000 });
  await sim.page.evaluate(() => { const t = [...document.querySelectorAll('#gui .tp-fldv_t')].find((x) => /^Tools$/.test(x.textContent.trim())); if (t) t.click(); });
  await sim.page.evaluate(async () => {
    const btn = [...document.querySelectorAll('#gui .tp-btnv_b')].find((x) => x.textContent.trim() === 'Earth–Moon Genesis Analysis');
    if (!btn) throw new Error('Earth–Moon Genesis Analysis button not found');
    btn.click(); await new Promise((r) => setTimeout(r, 3000));
  });
  for (const qty of QTYS) {
    const b64 = await sim.page.evaluate(async ({ qty, range }) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const panel = document.getElementById('essrtPanel');
      panel.querySelector(`[data-essrt-range-tabs] .cfm-tab[data-range="${range}"]`).click(); await wait(400);
      panel.querySelector(`[data-essrt-qty-tabs] .cfm-tab[data-qty="${qty}"]`).click(); await wait(800);
      panel.querySelector('[data-essrt-export]').click();
      let img = null;
      for (let i = 0; i < 150; i++) { await wait(200); img = document.querySelector('.chart-export-modal img'); if (img && img.src) break; }
      if (!img) throw new Error('export modal produced no picture for ' + qty);
      const blob = await (await fetch(img.src)).blob();
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      const out = btoa(s);
      document.querySelector('.chart-export-close').click(); await wait(300);
      return out;
    }, { qty, range: RANGE });
    const name = TAG ? `${TAG}-${qty}.png` : (RANGE === 'full' && SITE_NAMES[qty]) ? SITE_NAMES[qty] : `genesis-${qty}-${RANGE}.png`;
    const file = join(OUT, name);
    writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log('saved', file);
  }
  if (sim.errors.length) { console.error('page errors:', sim.errors.slice(0, 3).join(' | ')); process.exit(1); }
} finally { await sim.dispose(); }
