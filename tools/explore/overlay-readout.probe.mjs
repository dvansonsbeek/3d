// Scratch-class probe: read the Standard-Model overlay's live Δ rows from the built simulator via the Tweakpane DOM.
import { openSimulator } from '../../test/browser/harness.mjs';
const s = await openSimulator();
const page = s.page;
page.on('console', (m) => { if (m.type() === 'error' || /overlay|Stephenson|secular series/i.test(m.text())) console.log(`[page:${m.type()}] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => console.log(`[pageerror] ${String(e).slice(0, 300)}`));
await page.setViewportSize({ width: 1600, height: 4000 });
async function clickFolder(title) {
  const btn = page.locator('.tp-fldv_b', { hasText: title }).first();
  if (await btn.count()) { const expanded = await btn.evaluate((b) => b.parentElement?.classList.contains('tp-fldv-expanded')); if (!expanded) await btn.click(); return true; }
  return false;
}
await page.waitForTimeout(1500);
console.log('Tools folder:', await clickFolder('Tools'));
await page.waitForTimeout(300);
console.log('Standard folder:', await clickFolder('Standard Model'));
await page.waitForTimeout(300);
// the checkbox binding labelled "Show ghost bodies"
const row = page.locator('.tp-lblv', { hasText: 'Show ghost bodies' }).first();
if (await row.count()) { const cb = row.locator('input[type=checkbox]'); if (await cb.count()) { await cb.evaluate((el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }); console.log('ghosts on'); } }
await page.waitForTimeout(2500);   // a few render frames
const rows = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.tp-lblv')) {
    const label = el.querySelector('.tp-lblv_l')?.textContent?.trim() ?? '';
    if (!/^Δ |Julian|Date|JD/i.test(label)) continue;
    const input = el.querySelector('input');
    out.push([label, input ? input.value : el.querySelector('.tp-lblv_v')?.textContent?.trim()]);
  }
  return out;
});
for (const [l, v] of rows) console.log(`${l.padEnd(28)} ${v}`);
await s.dispose();
