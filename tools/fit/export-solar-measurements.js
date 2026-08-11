#!/usr/bin/env node
/**
 * 9-3g: the solar-measurements CSV generator lives in @essrt/fitting
 * (packages/fitting/src/export-solar-measurements.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 *
 * CAUTION (CLAUDE.md): this generates the gitignored 159 MB
 * data/02-solar-measurements.csv in ~2h24m. Never run it as a test; back
 * the CSV up before any deliberate regeneration.
 */

require('../../packages/fitting/src/export-solar-measurements.cjs');
