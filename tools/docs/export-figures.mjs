#!/usr/bin/env node
// EVERY SCRIPT-DRAWN FIGURE OF THE WEBSITE AND THE PAPER, FROM ONE MANIFEST — the simulator's own
// export buttons driven headlessly in ONE browser session (test/browser/harness.mjs on the BUILT bundle),
// so a picture is byte-for-byte what the button downloads on that build: the same paper renderer,
// the same rasterizer, nothing re-drawn here.
//
//   npm run build
//   node tools/docs/export-figures.mjs manifest=<figures.json> [only=<substring,…>] [out=<dir>] [paper=<dir>] [list]
//
//   manifest  the figure table (the website repo's docs/figures.json — ONE home for which picture is which
//             panel, window and reference curves; this script knows the panels, the manifest knows the files)
//   only      export the entries whose file name contains one of the substrings (default: all)
//   out       where the files land (default: $ESSRT_SITE_DIR/public/img, else ./exports)
//   paper     where entries marked "paper": true are copied as well (default: $ESSRT_SITE_DIR/docs/paper/figures)
//   list      print the manifest's entries and exit
//
// Manifest entry: { "file": "05_Obliquity_longterm.png", "kind": "vfp", "panel": "obliquity", "tab": "quaternary",
//                   "refs": ["Berger (1978)"], "checks": ["input[data-vfppi='inv']"], "paper": true }
//   kind vfp      a Framework Verification category: panel = its id, tab = recent|era|quaternary|myr (a category
//                 without window tabs, e.g. the analemma, takes no tab), refs = reference pills to switch ON beside
//                 the defaults (an unknown name lists the category's), checks = checkbox selectors to switch ON,
//                 clicks = selectors of the panel's own sub-controls to click in order (e.g. a frame tab),
//                 inputs = { selector: value } for the panel's own inputs (e.g. the analemma's four epochs)
//   kind genesis  the Earth–Moon Genesis Analysis panel: qty = lod|moon|year|axial|obliqCycle|au, range = full|phanero
//   kind dlod     the Earth dLOD/dt Analysis panel: range = glacial|deep|lgm|holocene|historical|nearFuture|full,
//                 layers = data-lcr-layer keys to switch ON (bands, bondCurve, resonator, proxy, proxyLR04)
//   kind climate  the Earth Climate Analysis panel: tab = cenco2pip|cenogrid|full|postMPText|epica|postMPT|past200|future
//   kind planets  the Perihelion of Planets Verification panel: planet = MERCURY|VENUS|MARS|JUPITER|SATURN|URANUS|NEPTUNE
//   kind image    the Framework images panel: id = the FRAMEWORK_IMAGES id (src/framework-images.js)
//
// Why one script (doc 111 §1.51's follow-up, the paper review's close-out of 2026-11-22): the paper's and the
// site's panel pictures were hand-exported in September; the ΔT anchor had moved 54 → 56 s, the solar day's
// J2000 value 1.78 → 1.20 ms, the Wu dots in the genesis chart — none of it seen until the figures were
// re-exported from the shipped build and compared. A figure that is not script-generated goes stale unseen.
// This script replaced export-genesis-pictures.mjs, export-dlod-pictures.mjs and export-panel-picture.mjs.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openSimulator } from '../../test/browser/harness.mjs';

const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const FLAGS = new Set(process.argv.slice(2).filter((a) => !a.includes('=')));
const SITE = process.env.ESSRT_SITE_DIR;
if (!KV.manifest) { console.error('usage: node tools/docs/export-figures.mjs manifest=<figures.json> [only=<substring,…>] [out=<dir>] [paper=<dir>] [list]'); process.exit(2); }
const manifest = JSON.parse(readFileSync(resolve(KV.manifest), 'utf8'));
const ONLY = (KV.only || '').split(',').map((s) => s.trim()).filter(Boolean);
const entries = manifest.figures.filter((f) => !ONLY.length || ONLY.some((s) => f.file.includes(s)));
if (FLAGS.has('list')) { for (const f of entries) console.log(f.file.padEnd(52), f.kind.padEnd(8), JSON.stringify({ ...f, file: undefined, kind: undefined })); process.exit(0); }
const OUT = KV.out ? resolve(KV.out) : SITE ? join(SITE, 'public', 'img') : resolve('exports');
const PAPER = KV.paper ? resolve(KV.paper) : SITE ? join(SITE, 'docs', 'paper', 'figures') : null;
mkdirSync(OUT, { recursive: true });

/** the dLOD panel's range tabs by key — the labels are the panel's LCR_RANGE_TABS */
const DLOD_LABELS = { glacial: '200,000 BC–2050', deep: '27,500 BC–2050', lgm: '13,000 BC–2050', holocene: '4,000 BC–2050', historical: '750–2050 AD', nearFuture: '1,200–2,500 AD', full: '13,000 BC–15,000' };
/** the Tools-folder buttons that open each panel kind */
const TOOL_BUTTONS = { genesis: 'Earth–Moon Genesis Analysis', dlod: 'Earth dLOD/dt Analysis', climate: 'Earth Climate Analysis', planets: 'Perihelion of Planets Verification' };

const sim = await openSimulator();
let failed = 0;
try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.chartExportForms && window.__test__.openVerificationPanel && window.__test__.hybridSpinProbe, null, { timeout: 90000 });
  // the banked series must have arrived (the one-source movement active) — a picture taken before would show the fallback law
  await sim.page.waitForFunction(() => { try { return window.__test__.hybridSpinProbe(2451545).active === true; } catch (e) { return false; } }, null, { timeout: 120000 });

  // The in-page driver: one function per kind, each ending at the export modal's picture. Installed once.
  await sim.page.evaluate((args) => {
    const { DLOD_LABELS, TOOL_BUTTONS } = args;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const opened = new Set();
    const openTool = async (kind) => {
      if (opened.has(kind)) return;
      const title = TOOL_BUTTONS[kind];
      const btn = [...document.querySelectorAll('#gui .tp-btnv_b')].find((x) => x.textContent.trim() === title);
      if (!btn) throw new Error(`Tools button "${title}" not found`);
      btn.click(); await wait(3000); opened.add(kind);
    };
    const readModal = async (what) => {
      let img = null;
      for (let i = 0; i < 400 && !img; i++) { await wait(50); const el = document.querySelector('.chart-export-modal img'); if (el && el.src) img = el; }
      if (!img) throw new Error('the export modal produced no picture for ' + what + ': ' + ((document.querySelector('.chart-export-modal .chart-export-status') || {}).textContent || '(no modal)'));
      if (!img.complete) await new Promise((res) => { img.onload = res; img.onerror = res; });
      const buf = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      const close = document.querySelector('.chart-export-close'); if (close) close.click(); await wait(300);
      return { pngB64: btoa(bin), w: img.naturalWidth, h: img.naturalHeight };
    };
    const switchOn = async (root, selectors) => {
      for (const sel of selectors || []) {
        const box = root.querySelector(sel);
        if (!box) throw new Error(`no checkbox "${sel}"`);
        if (!box.checked) { box.click(); await wait(600); }
      }
    };
    const kinds = {
      async vfp(f) {
        const T = window.__test__;
        T.openVerificationPanel(); T.updateVerificationPanel(f.panel); await wait(150);
        const dlg = document.querySelector('.vfp-dialog');
        const shown = dlg && dlg.parentElement && dlg.parentElement._currentCategory;
        if (shown !== f.panel) throw new Error(`no panel "${f.panel}" (the panel shows "${shown}")`);
        const tabs = [...document.querySelectorAll('.vfp-dialog button[data-vfp-tab]')];
        if (f.tab) {
          const t = tabs.find((b) => b.dataset.vfpTab === f.tab);
          if (!t) throw new Error(`panel "${f.panel}" has no window "${f.tab}" — it has: ${tabs.map((b) => b.dataset.vfpTab).join(', ') || '(none)'}`);
          t.click(); await wait(250);
        } else if (tabs.length) throw new Error(`panel "${f.panel}" has windows (${tabs.map((b) => b.dataset.vfpTab).join(', ')}) — name one`);
        // the switchable references: exactly the named ones ON, every other pill OFF (the pills' state persists across
        // the session, so a pill an earlier entry pressed would leak into this one); a default-on reference is not a pill
        const pillNames = () => [...document.querySelectorAll('.vfp-dialog button[data-vfp-ref]')].map((b) => b.dataset.vfpRef);
        for (const name of f.refs || []) if (!pillNames().includes(name)) throw new Error(`panel "${f.panel}" has no switchable reference "${name}" — it has: ${pillNames().join(' | ') || '(none)'}`);
        for (const name of pillNames()) {   // the pills re-render the panel on every click: look each up afresh
          const pill = [...document.querySelectorAll('.vfp-dialog button[data-vfp-ref]')].find((b) => b.dataset.vfpRef === name);
          const want = (f.refs || []).includes(name);
          if (pill && (pill.getAttribute('aria-pressed') === 'true') !== want) { pill.click(); await wait(250); }
        }
        for (const [sel, value] of Object.entries(f.inputs || {})) {   // a panel's own inputs, e.g. the analemma's epochs (each change re-renders)
          const el = document.querySelector('.vfp-dialog ' + sel);
          if (!el) throw new Error(`panel "${f.panel}" has no input "${sel}"`);
          el.value = String(value); el.dispatchEvent(new Event('change', { bubbles: true })); await wait(900);
        }
        await switchOn(document.querySelector('.vfp-dialog'), f.checks);
        for (const sel of f.clicks || []) {   // a panel's own sub-controls, e.g. the planet-inclination chart's frame tabs
          const el = document.querySelector('.vfp-dialog ' + sel);
          if (!el) throw new Error(`panel "${f.panel}" has no control "${sel}"`);
          el.click(); await wait(600);
        }
        const exp = document.querySelector('.vfp-dialog .vfp-export-btn');
        if (!exp || exp.style.display === 'none') throw new Error(`panel "${f.panel}" has no Export button`);
        exp.click();
        return readModal(f.file);
      },
      async genesis(f) {
        await openTool('genesis');
        const panel = document.getElementById('essrtPanel');
        panel.querySelector(`[data-essrt-range-tabs] .cfm-tab[data-range="${f.range || 'full'}"]`).click(); await wait(400);
        const q = panel.querySelector(`[data-essrt-qty-tabs] .cfm-tab[data-qty="${f.qty}"]`);
        if (!q) throw new Error(`no genesis quantity "${f.qty}"`);
        q.click(); await wait(800);
        panel.querySelector('[data-essrt-export]').click();
        return readModal(f.file);
      },
      async dlod(f) {
        await openTool('dlod');
        const exportBtn = document.querySelector('[data-lcr-export]');
        const panel = exportBtn.closest('.cfm-container') || document;
        const label = DLOD_LABELS[f.range];
        if (!label) throw new Error(`unknown dLOD range "${f.range}" — one of ${Object.keys(DLOD_LABELS).join(', ')}`);
        // the layers are global to the panel: switch the named ones ON beside the panel's defaults, and switch OFF
        // only what an earlier entry switched on, so entries do not leak into each other
        window.__dlodTouched = window.__dlodTouched || new Set();
        for (const box of document.querySelectorAll('input[data-lcr-layer]')) {
          const key = box.dataset.lcrLayer, named = (f.layers || []).includes(key);
          if (named && !box.checked) { box.click(); window.__dlodTouched.add(key); await wait(600); }
          else if (!named && box.checked && window.__dlodTouched.has(key)) { box.click(); window.__dlodTouched.delete(key); await wait(600); }
        }
        const tab = [...panel.querySelectorAll('.cfm-tab')].find((x) => x.textContent.trim() === label);
        if (!tab) throw new Error(`no dLOD range tab labelled "${label}"`);
        tab.click(); await wait(1500);
        exportBtn.click();
        return readModal(f.file);
      },
      async climate(f) {
        await openTool('climate');
        const exportBtn = document.querySelector('[data-cfm-export]');
        const panel = exportBtn.closest('.cfm-modal') || document;
        const tab = panel.querySelector(`.cfm-tab[data-tab="${f.tab}"]`);
        if (!tab) throw new Error(`no climate tab "${f.tab}" — it has: ${[...panel.querySelectorAll('.cfm-tab[data-tab]')].map((t) => t.dataset.tab).join(', ')}`);
        tab.click(); await wait(2500);   // the full-record tabs draw 5 Myr of stack
        exportBtn.click();
        return readModal(f.file);
      },
      async planets(f) {
        await openTool('planets');
        const tab = document.querySelector(`.wgc-tab[data-planet="${f.planet}"]`);
        if (!tab) throw new Error(`no planet tab "${f.planet}"`);
        tab.click(); await wait(1500);
        // the export carries "the perihelion chart plus any expanded chart" — the site's pictures show all three
        for (const d of document.querySelectorAll('details[data-wgc-chart]')) d.open = true;
        await wait(1500);
        document.querySelector('[data-wgc-export]').click();
        return readModal(f.file);
      },
      async image(f) {
        window.__test__.openFrameworkImagesPanel(f.id); await wait(800);
        const header = [...document.querySelectorAll('.vfp-header')].find((h) => /Framework images/.test(h.textContent));
        const exp = header && header.querySelector('.vfp-export-btn');
        if (!exp) throw new Error('the Framework images panel has no Export button');
        exp.click();
        return readModal(f.file);
      },
    };
    window.__exportFigure = async (f) => {
      const fn = kinds[f.kind];
      if (!fn) throw new Error(`unknown kind "${f.kind}" for ${f.file}`);
      return fn(f);
    };
  }, { DLOD_LABELS, TOOL_BUTTONS });

  for (const f of entries) {
    try {
      const r = await sim.page.evaluate((f) => window.__exportFigure(f), f);
      const buf = Buffer.from(r.pngB64, 'base64');
      const file = join(OUT, f.file);
      writeFileSync(file, buf);
      if (f.paper && PAPER) { mkdirSync(PAPER, { recursive: true }); copyFileSync(file, join(PAPER, f.file)); }
      console.log(`wrote ${f.file.padEnd(52)} ${r.w}×${r.h} ${(buf.length / 1024).toFixed(0)} kB${f.paper && PAPER ? ' (+paper)' : ''}`);
    } catch (e) {
      failed++;
      console.error(`FAILED ${f.file}: ${e.message}`);
    }
  }
  if (sim.errors.length) { console.error('page errors:', sim.errors.slice(0, 3).join(' | ')); failed++; }
} finally { await sim.dispose(); }
if (failed) process.exit(1);
console.log(`${entries.length} figure(s) → ${OUT}${PAPER ? ` (paper copies → ${PAPER})` : ''}`);
