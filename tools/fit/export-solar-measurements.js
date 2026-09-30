#!/usr/bin/env node
/**
 * 9-3g: the solar-measurements CSV generator lives in @essrt/fitting
 * (packages/fitting/src/export-solar-measurements.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 *
 * The kept artifact is the WINDOW CSV (`npm run fit:6a2`, −4000…+4000,
 * ~25 min). Without --start/--end/--output this writes the full-period
 * data/02-solar-measurements.csv (160 MB, ~2 h 24 m) — retired as a kept
 * file, on demand only. Never run it as a test.
 */

require('../../packages/fitting/src/export-solar-measurements.cjs');
