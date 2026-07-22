#!/usr/bin/env node
/**
 * Export the "lattice time" table τ(t) for the L1 phase-drift experiment.
 *
 *   τ(t) = ∫₀ᵗ H₀ / H(t′) dt′        (t = lookback in kyr BP, τ in kyr)
 *
 * Under ESSRT, H was smaller in the past, so H₀/H(t′) > 1 and τ(t) > t:
 * more lattice cycles elapsed per calendar kyr than the fixed-J2000 lattice
 * assumes. Evaluating the L1 lattice at τ(t) instead of t gives every line
 * n the proper phase φₙ(t) = 2πn·τ(t)/8H₀ — a single shared time-warp,
 * because all L1 lines live on the same lattice.
 *
 * H(t) comes from the production chain (tools/lib/deep-time.js meanHAtAge),
 * so this file is the ONLY bridge between the ESSRT chain and the Python
 * fit harness — no re-implementation of H(t) physics in Python.
 *
 * Output: data/lattice-time-tau.json
 *   { H0_yr, grid_step_kyr, max_kyr, t_kyr: [...], tau_kyr: [...] }
 *
 * Run: node tools/explore/export-lattice-time-tau.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const DT = require('../lib/deep-time.js');

const MAX_KYR = 70000;      // covers CENOGRID (67 Ma) with margin
const STORE_STEP_KYR = 10;  // stored grid (τ is smooth on Myr scales)
const INT_STEP_KYR = 1;     // integration step

const H0 = DT.meanHAtAge(0);

const t_kyr = [];
const tau_kyr = [];
let tau = 0;
let tPrevRatio = 1; // H0/H at t=0
for (let t = 0; t <= MAX_KYR; t += INT_STEP_KYR) {
  if (t % STORE_STEP_KYR === 0) {
    t_kyr.push(t);
    tau_kyr.push(tau);
  }
  // trapezoid step from t to t+1 kyr
  const ratioNext = H0 / DT.meanHAtAge((t + INT_STEP_KYR) / 1000);
  tau += 0.5 * (tPrevRatio + ratioNext) * INT_STEP_KYR;
  tPrevRatio = ratioNext;
}

const out = {
  generated_by: 'tools/explore/export-lattice-time-tau.js (H(t) from tools/lib/deep-time.js meanHAtAge)',
  definition: 'tau(t) = integral_0^t H0/H(tp) dtp; lookback t in kyr BP',
  H0_yr: H0,
  grid_step_kyr: STORE_STEP_KYR,
  max_kyr: MAX_KYR,
  n: t_kyr.length,
  t_kyr,
  tau_kyr,
};

const outPath = path.join(__dirname, '..', '..', 'data', 'lattice-time-tau.json');
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${outPath} (${t_kyr.length} grid points, step ${STORE_STEP_KYR} kyr, to ${MAX_KYR / 1000} Ma)`);
console.log('Spot checks (excess lattice time τ−t):');
for (const t of [250, 800, 5320, 66000, 70000]) {
  const i = t_kyr.indexOf(t);
  if (i >= 0) console.log(`  t = ${String(t).padStart(5)} kyr: τ−t = ${(tau_kyr[i] - t).toFixed(2)} kyr  (${((tau_kyr[i] / t - 1) * 100).toFixed(4)} % avg drift)`);
}
