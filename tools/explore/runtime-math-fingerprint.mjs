// PLAN 06 R3 item 2 — the runtime Math fingerprint (record instrument).
//
// Question: do headless Chromium (Playwright's V8) and this Node's V8 evaluate
// the transcendental Math functions bit-identically? Decides whether a
// browser-vs-Node last-bit difference is a twin-SPELLING defect (fixable) or a
// runtime-arithmetic difference (a tolerance is the honest statement).
//
// MEASURED (2026-09, Node 22.19 / Playwright Chromium): 4,552 of 64,000
// randomized evaluations differ — pow 399/4000, exp 423, log 303, sin 153,
// cos 130, tan 152, atan2 628, cbrt 321, asin 251, acos 338, sinh 386,
// cosh 321, exp2 396, powi 351; hypot and sqrt bit-identical. A hand-picked
// 19-value probe had shown none — the differences are argument-dependent.
// Consequence: the one-source hybrid's 2-Myr, 400k-step RK4 chain cannot be
// bit-exact across the two runtimes; the cross-engine gate
// (test/cross-engine.test.mjs) carries a 1e-6-d tolerance on the deep
// (|year| > 50 kyr) cardinal probes and stays bit-exact in the certified window.
//
// Usage: node tools/explore/runtime-math-fingerprint.mjs   (needs a built dist/ — npm run build)
import { openSimulator } from '../../test/browser/harness.mjs';
const N = 4000;
// deterministic LCG so both runtimes see the same arguments
const gen = `(() => { let s = 123456789; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const out = { pow: 0, exp: 0, log: 0, sin: 0, cos: 0, tan: 0, atan2: 0, hypot: 0, cbrt: 0, asin: 0, acos: 0, sqrt: 0, sinh: 0, cosh: 0, exp2: 0, powi: 0 };
  const vals = {};
  for (const k of Object.keys(out)) vals[k] = [];
  for (let i = 0; i < ${N}; i++) {
    const a = (r() - 0.5) * 2e3, b = (r() - 0.5) * 8, c = r() * 2 + 0.001, d = (r() - 0.5) * 2;
    vals.pow.push(Math.pow(c, b)); vals.powi.push(Math.pow(1 + d * 1e-4, 12345 * r())); vals.exp.push(Math.exp(b)); vals.exp2.push(Math.exp(a / 1e3));
    vals.log.push(Math.log(c)); vals.sin.push(Math.sin(a)); vals.cos.push(Math.cos(a)); vals.tan.push(Math.tan(b));
    vals.atan2.push(Math.atan2(d, b)); vals.hypot.push(Math.hypot(a, b, c)); vals.cbrt.push(Math.cbrt(a)); vals.asin.push(Math.asin(d)); vals.acos.push(Math.acos(d));
    vals.sqrt.push(Math.sqrt(c)); vals.sinh.push(Math.sinh(b)); vals.cosh.push(Math.cosh(b));
  }
  return vals; })()`;
const s = await openSimulator();
const browser = await s.page.evaluate(gen);
await s.dispose();
const node = (0, eval)(gen);   // the same source in this runtime
let total = 0;
for (const k of Object.keys(node)) {
  let d = 0; for (let i = 0; i < N; i++) if (!Object.is(node[k][i], browser[k][i])) d++;
  total += d;
  console.log(`${k.padEnd(6)} ${d === 0 ? 'bit-identical' : d + ' of ' + N + ' DIFFER'}`);
}
console.log(total ? `TOTAL ${total} differing evaluations of ${N * 16}` : 'ALL bit-identical over ' + N * 16 + ' evaluations');
