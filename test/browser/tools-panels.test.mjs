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
