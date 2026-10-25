/**
 * The Reports exporters run headlessly (plan 20): "Days, Years & Precession",
 * the RA test and "Solstices & Equinoxes" each build a workbook through the
 * SheetJS API, which this test STUBS (the CDN script is never loaded; the stub
 * captures the sheets' rows instead of writing a file). Born from two crashes
 * no gate could see: the year-analysis export read a name deleted at plan 09
 * (a ReferenceError after the whole cardinal scan had run), and the RA test's
 * perihelion-rate stencil ran on FLOORED years, so sub-year steps divided by
 * zero and every rate cell read Infinity. Rows: each exporter completes without
 * a page error and yields at least one sheet; the RA test's rate cells are
 * finite at a sub-year step.
 *
 * FAIL-PROVEN: ESSRT_REPORTS_PLANT=1 makes the stub record one Infinity cell in
 * every sheet, so the finite-cells row cannot hold on the same build.
 *
 *   node test/browser/reports-export.test.mjs
 */
import { openSimulator } from './harness.mjs';

const PLANT = process.env.ESSRT_REPORTS_PLANT === '1';
const sim = await openSimulator();
let fail = 0;
const check = (n, ok, d) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  — ' + d : '')); if (!ok) fail++; };

try {
  await sim.page.waitForFunction(() => window.__test__ && window.__test__.runYearAnalysisExport, null, { timeout: 60000 });
  sim.page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await sim.page.evaluate((plant) => {
    window.__capturedWorkbooks = [];
    window.XLSX = {
      utils: {
        book_new: () => ({ SheetNames: [], Sheets: {} }),
        aoa_to_sheet: (aoa) => ({ __aoa: plant ? aoa.concat([[Infinity]]) : aoa }),
        book_append_sheet: (wb, ws, name) => { wb.SheetNames.push(name); wb.Sheets[name] = ws; },
      },
      write: (wb) => { window.__capturedWorkbooks.push(wb); return new ArrayBuffer(8); },
      writeFile: (wb) => { window.__capturedWorkbooks.push(wb); },
    };
  }, PLANT);

  const run = async (fn) => {
    const errorsBefore = sim.errors.length;
    const r = await sim.page.evaluate(async (src) => {
      const before = window.__capturedWorkbooks.length;
      try { await (0, eval)(src)(); }
      catch (e) { return { threw: String((e && e.stack) || e).slice(0, 300) }; }
      const wbs = window.__capturedWorkbooks.slice(before);
      const sheets = wbs.flatMap((wb) => wb.SheetNames.map((n) => ({ name: n, rows: wb.Sheets[n].__aoa.length,
        nonFinite: wb.Sheets[n].__aoa.flat().filter((c) => c === Infinity || c === -Infinity || (typeof c === 'number' && Number.isNaN(c)) || c === 'Infinity' || c === '-Infinity' || c === 'NaN').length })));
      return { workbooks: wbs.length, sheets };
    }, fn);
    const errs = sim.errors.slice(errorsBefore);
    return { r, errs };
  };

  // 1. Days, Years & Precession — one year (the cardinal scan runs the scene)
  {
    const { r, errs } = await run(`() => window.__test__.runYearAnalysisExport([2000])`);
    check('Days, Years & Precession export completes (one year) without a page error and yields sheets',
      !r.threw && errs.length === 0 && r.workbooks === 1 && r.sheets.length >= 1,
      r.threw || errs.slice(0, 2).join(' | ') || `${r.sheets.length} sheet(s): ${r.sheets.map((s) => `${s.name} ${s.rows} rows`).join(', ')}`);
  }
  // 2. The RA test at a SUB-YEAR step: the perihelion-rate stencil must stay finite
  {
    // 13 points over 3 years: a 91.3-day step — the stencil's neighbours share a calendar year
    await sim.page.evaluate(() => window.__test__.setReportInputs({ testMode: 'Range', rangeStart: 2451545, rangeEnd: 2451545 + 365.25 * 3, rangePieces: 13 }));
    const { r, errs } = await run(`() => window.__test__.runRATest()`);
    const peri = r.sheets && r.sheets.filter((s) => /peri|rate/i.test(s.name));
    const nonFinite = r.sheets ? r.sheets.reduce((n, s) => n + s.nonFinite, 0) : -1;
    check('RA test export completes at a sub-year step without a page error',
      !r.threw && errs.length === 0 && r.workbooks === 1 && r.sheets.length >= 1,
      r.threw || errs.slice(0, 2).join(' | ') || `${r.sheets.length} sheet(s)`);
    check('RA test: every cell finite (the perihelion-rate stencil on decimal years)',
      !r.threw && nonFinite === 0, `${nonFinite} non-finite cell(s)` + (peri && peri.length ? ` in ${peri.map((s) => s.name).join(', ')}` : ''));
  }
  // 3. Solstices & Equinoxes — one year
  {
    const { r, errs } = await run(`() => window.__test__.runSolsticeExport([2000])`);
    check('Solstices & Equinoxes export completes (one year) without a page error and yields sheets',
      !r.threw && errs.length === 0 && r.workbooks === 1 && r.sheets.length >= 1,
      r.threw || errs.slice(0, 2).join(' | ') || `${r.sheets.length} sheet(s)`);
  }
  check('page came up without errors', sim.errors.length === 0, sim.errors.slice(0, 3).join(' | '));
} catch (e) {
  check('suite ran to completion', false, String((e && e.stack) || e));
} finally {
  await sim.dispose();
}
console.log(fail ? `REPORTS-EXPORT: ${fail} FAIL` : 'REPORTS-EXPORT: ALL PASS');
process.exit(fail ? 1 : 0);
