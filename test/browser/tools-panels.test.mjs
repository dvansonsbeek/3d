/**
 * Tools-panels gate (headless, hermetic).
 *
 * BORN FROM two owner reports on the regrouped Tools menu: "Earth Climate
 * Analysis doesn't open at all" (a listener still named a function the
 * one-Export change had deleted — a ReferenceError on open) and "when I am
 * quick the panels no longer open" (a second click while an async open was
 * in flight built a second panel; the first stayed in the DOM, orphaned and
 * unclosable, on top of the second).
 *
 * For each of the six Tools buttons the gate:
 *  1. clicks it once and asserts its panel is in the DOM and visible with no
 *     page error;
 *  2. closes it, clicks it three times within a frame, and asserts exactly
 *     ONE panel element with that id exists afterwards and is visible;
 *  3. closes it again and asserts it is hidden — the panel stays usable.
 *
 * FAIL-PROVEN: ESSRT_TOOLS_PLANT=1 renames one expected panel id so the
 * visibility assertion cannot hold on the same build.
 */
import { openSimulator } from './harness.mjs';

const PLANT = process.env.ESSRT_TOOLS_PLANT === '1';
const PANELS = [
  ['Framework Verification', 'verificationPanel', '.vfp-close'],
  ['Perihelion of Planets Verification', 'wgcPanel', '.wgc-close'],
  ['Planet Orbit Analysis', 'hierarchyInspector', '.hi-close'],
  ['Earth–Moon Genesis Analysis', 'essrtPanel', '#essrtPanel .cfm-close'],
  ['Earth Climate Analysis', PLANT ? 'climateFormulaPanelX' : 'climateFormulaPanel', '#climateFormulaPanel .cfm-close'],
  ['Earth dLOD/dt Analysis', 'lodClimateRhythmPanel', '#lodClimateRhythmPanel .cfm-close'],
];
const sim = await openSimulator();
let fail = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); if (!ok) fail++; };

try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.chartExportForms, null, { timeout: 60000 });
  await sim.page.evaluate(() => { const t = [...document.querySelectorAll('#gui .tp-fldv_t')].find((x) => /^Tools$/.test(x.textContent.trim())); if (t) t.click(); });

  for (const [name, id, closeSel] of PANELS) {
    const errorsBefore = sim.errors.length;
    const r = await sim.page.evaluate(async ({ name, id, closeSel }) => {
      const btn = [...document.querySelectorAll('#gui .tp-btnv_b')].find((x) => x.textContent.trim() === name);
      if (!btn) return { found: false };
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const state = () => {
        const els = [...document.querySelectorAll(`[id="${id}"]`)];
        const visible = els.filter((e) => { const cs = window.getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; }).length;
        return { count: els.length, visible };
      };
      const close = () => { const c = document.querySelector(closeSel); if (c) c.click(); };
      btn.click(); await wait(2500);
      const once = state();
      close(); await wait(300);
      btn.click(); btn.click(); btn.click(); await wait(3000);   // the race: three clicks within a frame
      const rapid = state();
      close(); await wait(300);
      const closed = state();
      return { found: true, once, rapid, closed };
    }, { name, id, closeSel });
    const errs = sim.errors.slice(errorsBefore);
    check(`${name}: opens once (visible, no page error)`, r.found && r.once && r.once.count === 1 && r.once.visible === 1 && errs.length === 0, r.found ? `${JSON.stringify(r.once)}${errs.length ? ' · ' + errs[0] : ''}` : 'button not found');
    check(`${name}: three quick clicks leave ONE panel, visible`, r.found && r.rapid && r.rapid.count === 1 && r.rapid.visible === 1, r.found ? JSON.stringify(r.rapid) : '');
    check(`${name}: closes again`, r.found && r.closed && r.closed.count === 1 && r.closed.visible === 0, r.found ? JSON.stringify(r.closed) : '');
  }
  // ── PLAN 31 B: the Obliquity Moon tab of the Genesis Analysis panel renders, and reads the Cassini state ──
  // Every quantity tab of the panel renders without a page error (the chart's SVG with a curve); the Moon tab's
  // chart carries its title and its band legend, and its data (the Cassini state of date, ONE home
  // moon/cassini-state) reads state 1 under 1.5° at the edge, a transition inside 4,100–4,200 Ma with the obliquity
  // above 40° just after it, 8.5–10.5° at 2.46 Ga and 6.70° today — the band's two states inside the 30-Myr window
  // between its readings' transitions.
  const essrtErrorsBefore = sim.errors.length;
  const tabs = await sim.page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const btn = [...document.querySelectorAll('#gui .tp-btnv_b')].find((x) => x.textContent.trim() === 'Earth–Moon Genesis Analysis');
    btn.click(); await wait(1500);
    const out = [];
    for (const b of [...document.querySelectorAll('#essrtPanel .cfm-tab[data-qty]')]) {
      b.click(); await wait(b.dataset.qty === 'moonObliquity' || b.dataset.qty === 'obliquity' ? 4000 : 1200);
      const svg = document.querySelector('#essrtPanel svg');
      const panelText = (document.querySelector('#essrtPanel') || {}).textContent || '';   // the title is the panel's heading, the legend the SVG's text
      out.push({ key: b.dataset.qty, hasSvg: !!svg, paths: svg ? svg.querySelectorAll('path').length : 0, titleOk: b.dataset.qty !== 'moonObliquity' || /Obliquity of the Moon/.test(panelText), bandLegend: /hydrostatic inside 15 or 21/.test(panelText), windowShaded: !!svg && !!svg.querySelector('rect[data-window]') && /non-equilibrium episode/.test(panelText) });
    }
    const T = window.__test__;
    const at = (t) => T.moonObliquityAtAge(t);
    const data = { edge: at(4428.98), t4180: at(4180), t4100: at(4100), t2460: at(2460), today: at(0) };
    const c = document.querySelector('#essrtPanel .cfm-close'); if (c) c.click();
    return { out, data };
  });
  const essrtErrs = sim.errors.slice(essrtErrorsBefore);
  const moonTab = tabs.out.find((t) => t.key === 'moonObliquity');
  check(`every Genesis Analysis tab renders a chart (${tabs.out.length} tabs, no page error)`, tabs.out.length >= 8 && tabs.out.every((t) => t.hasSvg && t.paths > 0) && essrtErrs.length === 0, tabs.out.map((t) => `${t.key}:${t.paths}`).join(' ') + (essrtErrs.length ? ' · ' + essrtErrs[0] : ''));
  const d = tabs.data, abs = (s) => (s && s.shipped ? Math.abs(s.shipped.obliquityToOrbitDeg) : NaN);
  check('the Obliquity Moon tab: its title and band legend drawn; state 1 under 1.5° at the edge, 15–25° at 4,180 Ma, above 40° at 4,100 Ma (state 2), 8.5–10.5° at 2.46 Ga, 6.70° today; the band spans both states at 4,140 Ma',
    !!moonTab && moonTab.titleOk && moonTab.bandLegend && moonTab.windowShaded && d.edge.shipped.state === 1 && abs(d.edge) < 1.5 && d.t4180.shipped.state === 1 && abs(d.t4180) > 15 && abs(d.t4180) < 25 && d.t4100.shipped.state === 2 && abs(d.t4100) > 40 && abs(d.t2460) > 8.5 && abs(d.t2460) < 10.5 && Math.abs(abs(d.today) - 6.6997) < 1e-3 && d.t4100.max - d.t4100.min > 0,
    `edge ${abs(d.edge).toFixed(2)}° (state ${d.edge.shipped && d.edge.shipped.state}), 4180 Ma ${abs(d.t4180).toFixed(1)}°, 4100 Ma ${abs(d.t4100).toFixed(1)}° (band ${d.t4100.min && d.t4100.min.toFixed(1)}–${d.t4100.max && d.t4100.max.toFixed(1)}), 2.46 Ga ${abs(d.t2460).toFixed(2)}°, today ${abs(d.today).toFixed(4)}°`);
  // ── Every Framework-Verification category renders without throwing ────────
  // Measured (plan 20): the Anomalistic Year category's only reference curve
  // called a function deleted at plan 18 — a ReferenceError on open that the
  // default-open category hid. Render each category once; a throw inside the
  // render is caught here, a deferred one lands in sim.errors.
  const vfpErrorsBefore = sim.errors.length;
  const vfp = await sim.page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    window.__test__.openVerificationPanel(); await wait(1500);
    const out = [];
    for (const id of window.__test__.vfpCategoryIds()) {
      try { window.__test__.updateVerificationPanel(id); await wait(60); out.push({ id, ok: true }); }
      catch (e) { out.push({ id, ok: false, err: String((e && e.message) || e) }); }
    }
    const c = document.querySelector('.vfp-close'); if (c) c.click();
    return out;
  });
  const vfpBad = vfp.filter((r) => !r.ok);
  const vfpErrs = sim.errors.slice(vfpErrorsBefore);
  check(`every Framework Verification category renders (${vfp.length} categories, none throws)`,
    vfp.length >= 20 && vfpBad.length === 0 && vfpErrs.length === 0,
    (vfpBad.map((r) => `${r.id}: ${r.err}`).concat(vfpErrs.slice(0, 2)).join(' | ')) || `${vfp.length} rendered`);
  // ── The Framework-Verification panel ORDER invariant ──────────────────────
  // VFP_CATEGORIES is SORTED by VFP_ORDER, so a category id missing from the
  // order array scores indexOf = −1 and silently sorts FIRST — and the first
  // category is also the default-open panel. Measured: the perihelion panel
  // shipped at the top of the list exactly that way, registered in the
  // definitions but not in the order. Two lists, both required; this fails on
  // either half drifting.
  const order = await sim.page.evaluate(() => window.__test__.vfpOrderAudit());
  check('every VFP category is placed in VFP_ORDER (none silently sorts first)',
    order.missingFromOrder.length === 0, 'missing: ' + (order.missingFromOrder.join(', ') || 'none'));
  check('VFP_ORDER carries no id without a category',
    order.staleInOrder.length === 0, 'stale: ' + (order.staleInOrder.join(', ') || 'none'));
  check('the All-planets panels close the list, perihelion last',
    order.last === 'planet-perihelion', 'last: ' + order.last + ' · first: ' + order.first);
  check('page came up without errors', sim.errors.length === 0, sim.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('suite ran to completion', false, String((e && e.stack) || e));
} finally {
  await sim.dispose();
}
console.log(fail === 0 ? '\ntools-panels: PASS' : `\ntools-panels: FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
