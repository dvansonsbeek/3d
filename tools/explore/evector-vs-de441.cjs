#!/usr/bin/env node
// THE SERIES' EARTH e-VECTOR AGAINST DE441 — the banked secular series (the one-source movement's
// e·e^{iϖ}, the 20-Myr dump through its 1-kyr anti-alias boxcar) beside DE441's osculating EMB
// e-vector in yearly means passed through the SAME 1-kyr boxcar (secular vs secular, like with
// like), and the long-period part of DE441's e-vector (yearly − boxcar) that a secular bank does
// not carry — the equation-of-centre term the Sun would lack. Needs
// tools/explore/emb-vectors-de441.local.json (fetch-emb-vectors-de441.mjs).
//
//   node tools/explore/evector-vs-de441.cjs
//
// MEASURED 2026-10 (the item-1 analysis after the long-inequality campaign): the series' secular e
// sits 0.1–1.2·10⁻⁵ BELOW DE441's with a smooth bump centred near −3500 (Δϖ −120…−180″ over
// −3500…−1500) — the 5″ annual line of the Sun residual there (2Δe); the long-period (100–5000 yr)
// content of DE441's e-vector is ≤ 0.07·10⁻⁵ (0.3″ of Sun) — no z-completion is needed and the
// series' banking cadence is not the cause. A fresh run of the model's engine WITHOUT the dump's
// lunar-quadrupole proxy and asteroids matches DE441's secular e to 0.1·10⁻⁵ (evector-fresh-run.mjs):
// the dump's extra ingredients move Earth's secular e-vector. Theory against theory throughout.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DOH = require(path.join(ROOT, 'tools/lib/deep-orbital-history.js'));
const REF_FILE = path.join(__dirname, 'emb-vectors-de441.local.json');
if (!fs.existsSync(REF_FILE)) { console.error('missing emb-vectors-de441.local.json — run tools/explore/fetch-emb-vectors-de441.mjs first'); process.exit(2); }
const M = DOH.createOneSourceMovement();
const REF = JSON.parse(fs.readFileSync(REF_FILE, 'utf8'));
const J2000 = 2451545.0, R2D = 180 / Math.PI, D2R = Math.PI / 180;
const GM = 2.9591220828411951e-4 * (1 + 1 / 328900.5596);   // GM_sun + GM_EMB, AU³/d² (DE440): the EMB's heliocentric μ — GM_sun alone biases e by 3·10⁻⁶
const w180 = (d) => ((((d + 540) % 360) + 360) % 360) - 180;
const evec = ([x, y, z, vx, vy, vz]) => { const r = Math.hypot(x, y, z), hx = y * vz - z * vy, hy = z * vx - x * vz, hz = x * vy - y * vx; return [(vy * hz - vz * hy) / GM - x / r, (vz * hx - vx * hz) / GM - y / r]; };
const acc = new Map();
for (const row of REF.rows) { const year = 2000 + (row[0] - J2000) / 365.25; const [q, p] = evec(row.slice(1)); const yb = Math.floor(year); const o = acc.get(yb) || { q: 0, p: 0, n: 0 }; o.q += q; o.p += p; o.n++; acc.set(yb, o); }
const Y = [...acc.entries()].filter(([, o]) => o.n >= 10).sort((a, b) => a[0] - b[0]).map(([yb, o]) => ({ y: yb + 0.5, q: o.q / o.n, p: o.p / o.n }));
const box = Y.map((_, i) => { let q = 0, p = 0, n = 0; for (let j = Math.max(0, i - 500); j <= Math.min(Y.length - 1, i + 500); j++) { q += Y[j].q; p += Y[j].p; n++; } return [q / n, p / n]; });
const rows = Y.map((r, i) => {
  const s = M.sampleAt(r.y);
  const ang = s.generalPrecessionLonDeg * D2R, qs = s.eCosPeri * Math.cos(ang) - s.eSinPeri * Math.sin(ang), ps = s.eCosPeri * Math.sin(ang) + s.eSinPeri * Math.cos(ang);
  const [qb, pb] = box[i];
  return { y: r.y, eD: Math.hypot(qb, pb), wD: Math.atan2(pb, qb) * R2D, eS: Math.hypot(qs, ps), wS: Math.atan2(ps, qs) * R2D, dq: r.q - qb, dp: r.p - pb };
});
console.log('SECULAR vs SECULAR (DE441 yearly means through the series\' 1-kyr boxcar), 1000-yr bins:');
console.log('centre    DE441 e      series e    Δe (1e-5)    Δϖ (″)   | long-period part of DE441\'s e-vector (yearly − boxcar): rms |Δz| (1e-5)  2|Δz| (″)   max (″)');
for (let c = -8500; c < 9000; c += 1000) {
  const sel = rows.filter((r) => r.y >= c - 500 && r.y < c + 500 && Math.abs(r.y) < 8400); if (sel.length < 100) continue;
  const m = (f) => sel.reduce((s, r) => s + f(r), 0) / sel.length;
  const eD = m((r) => r.eD), eS = m((r) => r.eS), dw = m((r) => w180(r.wS - r.wD)) * 3600;
  const rmsDz = Math.sqrt(m((r) => r.dq * r.dq + r.dp * r.dp)), maxDz = Math.max(...sel.map((r) => Math.hypot(r.dq, r.dp)));
  console.log(`${String(c).padStart(6)}   ${eD.toFixed(6)}    ${eS.toFixed(6)}   ${((eS - eD) * 1e5).toFixed(2).padStart(7)}   ${dw.toFixed(1).padStart(8)}   |   ${(rmsDz * 1e5).toFixed(2).padStart(10)}      ${(2 * rmsDz * 206265).toFixed(2).padStart(8)}   ${(2 * maxDz * 206265).toFixed(2).padStart(7)}`);
}
const n = rows.length, T = rows.map((r) => r.y);
const amp = (P) => { const w = 2 * Math.PI / P; let cc = 0, ss = 0, cs = 0, cq = 0, sq = 0, cp = 0, sp = 0; for (let i = 0; i < n; i++) { if (Math.abs(T[i]) > 8400) continue; const c = Math.cos(w * T[i]), s = Math.sin(w * T[i]); cc += c * c; ss += s * s; cs += c * s; cq += c * rows[i].dq; sq += s * rows[i].dq; cp += c * rows[i].dp; sp += s * rows[i].dp; } const det = cc * ss - cs * cs; return Math.hypot(Math.hypot((cq * ss - sq * cs) / det, (sq * cc - cq * cs) / det), Math.hypot((cp * ss - sp * cs) / det, (sp * cc - cp * cs) / det)); };
const pk = []; for (let P = 100; P <= 5000; P *= 1.01) pk.push([P, amp(P)]);
const peaks = pk.filter((r, i) => i > 0 && i < pk.length - 1 && r[1] > pk[i - 1][1] && r[1] >= pk[i + 1][1]).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log('\nlong-period lines (100–5000 yr) in DE441\'s e-vector (period → |Δz| 1e-5 → 2|Δz| ″): ' + peaks.map(([P, a]) => `${P.toFixed(0)}→${(a * 1e5).toFixed(2)}→${(2 * a * 206265).toFixed(1)}″`).join('  '));
const j = rows.find((r) => Math.abs(r.y - 2000.5) < 1);
console.log(`J2000: DE441 secular e ${j.eD.toFixed(7)} · series ${j.eS.toFixed(7)} · Simon 1994 mean e₀ 0.0167086`);
