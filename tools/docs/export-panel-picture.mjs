#!/usr/bin/env node
// THE SIMULATOR'S OWN EXPORT, HEADLESS — drive the Framework Verification panel's
// "Export" button in headless Chromium and save the PNG the export modal shows.
// The picture is byte-for-byte what the button produces on that build: the same
// paper renderer, the same rasterizer (svgStringToPngBlob), nothing re-drawn here.
//
//   node tools/docs/export-panel-picture.mjs panel=<category id> [tab=<window>] [refs=<name>,<name>] [out=<file.png>]
//
//   panel  a VFP category id — eccentricity, obliquity, … (an unknown id lists them)
//   tab    recent | era | quaternary | myr      (default: era, the panel's own default)
//          recent = 1000–2500 AD · era = ±23 kyr · quaternary = 250,000 BC – 100,000 AD · myr = ±1 Myr
//   refs   reference curves to switch ON beside the panel's default reference,
//          by legend name, comma-separated — e.g. refs="Berger (1978)"
//   out    default <os tmp>/export-<panel>-<tab>.png; with
//          ESSRT_SITE_DIR=<holisticuniverse checkout> a bare file name lands
//          in its public/img/
//
// NEEDS a current build: `npm run build` (the harness serves dist/; the series
// artifact and the reference tables are served as in production). The tool waits
// for the banked series before it opens the panel — a picture taken before the
// series arrives would show the fallback law.
//
// The site pictures made this way:
//   ESSRT_SITE_DIR=… node tools/docs/export-panel-picture.mjs panel=eccentricity tab=quaternary refs="Berger (1978)" out=06_Eccentricity.png

import { writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { openSimulator } from '../../test/browser/harness.mjs';

const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const PANEL = KV.panel, TAB = KV.tab || 'era';
const REFS = (KV.refs || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!PANEL) { console.error('usage: node tools/docs/export-panel-picture.mjs panel=<category id> [tab=recent|era|quaternary|myr] [refs=<name>,…] [out=<file.png>]'); process.exit(2); }
const SITE = process.env.ESSRT_SITE_DIR;
if (SITE && !existsSync(SITE)) { console.error(`ESSRT_SITE_DIR not found: ${SITE}`); process.exit(1); }
const OUT = !KV.out ? join(tmpdir(), `export-${PANEL}-${TAB}.png`)
  : isAbsolute(KV.out) ? KV.out
    : SITE ? join(SITE, 'public', 'img', KV.out) : join(process.cwd(), KV.out);

const sim = await openSimulator();
let code = 0;
try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.openVerificationPanel && window.__test__.hybridSpinProbe, null, { timeout: 60000 });
  // the banked series must have arrived (the one-source movement active)
  await sim.page.waitForFunction(() => { try { return window.__test__.hybridSpinProbe(2451545).active === true; } catch (e) { return false; } }, null, { timeout: 120000 });
  const r = await sim.page.evaluate(async ({ PANEL, TAB, REFS }) => {
    const T = window.__test__;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const q = (sel) => document.querySelector('.vfp-dialog ' + sel);
    T.openVerificationPanel();
    T.updateVerificationPanel(PANEL);
    await sleep(100);
    const panelEl = document.querySelector('.vfp-dialog');
    const shown = panelEl && panelEl.parentElement && panelEl.parentElement._currentCategory;
    if (shown !== PANEL) return { error: `no panel "${PANEL}" (the panel shows "${shown}")` };
    const tabs = () => [...document.querySelectorAll('.vfp-dialog button[data-vfp-tab]')];
    const tabBtn = tabs().find((b) => b.dataset.vfpTab === TAB);
    if (!tabBtn) return { error: `panel "${PANEL}" has no window "${TAB}" — it has: ${tabs().map((b) => b.dataset.vfpTab).join(', ')}` };
    tabBtn.click();
    await sleep(200);
    // the reference pills re-render the panel on every click: look each one up afresh
    for (const name of REFS) {
      const pills = [...document.querySelectorAll('.vfp-dialog button[data-vfp-ref]')];
      const pill = pills.find((b) => b.dataset.vfpRef === name);
      if (!pill) return { error: `panel "${PANEL}" has no switchable reference "${name}" — it has: ${pills.map((b) => b.dataset.vfpRef).join(' | ') || '(none)'}` };
      if (pill.getAttribute('aria-pressed') !== 'true') { pill.click(); await sleep(200); }
    }
    const on = [...document.querySelectorAll('.vfp-dialog button[data-vfp-ref][aria-pressed="true"]')].map((b) => b.dataset.vfpRef);
    const exp = q('.vfp-export-btn');
    if (!exp || exp.style.display === 'none') return { error: `panel "${PANEL}" has no Export button` };
    exp.click();
    let img = null;
    for (let i = 0; i < 400 && !img; i++) { await sleep(50); img = document.querySelector('.chart-export-modal .chart-export-body img'); }
    if (!img) return { error: 'the export modal produced no picture: ' + ((document.querySelector('.chart-export-modal .chart-export-status') || {}).textContent || '(no modal)') };
    if (!img.complete) await new Promise((res) => { img.onload = res; img.onerror = res; });
    const buf = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { pngB64: btoa(bin), bytes: buf.length, w: img.naturalWidth, h: img.naturalHeight, title: (document.querySelector('.chart-export-modal .chart-export-title') || {}).textContent, on };
  }, { PANEL, TAB, REFS });
  if (r.error) { console.error('FAILED — ' + r.error); code = 1; }
  else if (sim.errors.length) { console.error('FAILED — page errors: ' + sim.errors.slice(0, 3).join(' | ')); code = 1; }
  else {
    writeFileSync(OUT, Buffer.from(r.pngB64, 'base64'));
    console.log(`"${r.title}" · references switched on: ${r.on.join(', ') || '(default only)'}`);
    console.log(`wrote ${OUT} — ${r.w}×${r.h} px, ${(r.bytes / 1024).toFixed(0)} kB`);
  }
} finally { await sim.dispose(); }
process.exit(code);
