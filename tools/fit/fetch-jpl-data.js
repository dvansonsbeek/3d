#!/usr/bin/env node
/**
 * 9-3h: the JPL Horizons reference fetcher lives in @hum/fitting
 * (packages/fitting/src/fetch-jpl-data.cjs). Shim keeps the documented
 * CLI path; argv passes through unchanged. NETWORK tool — it patches
 * data/reference-data.json from Horizons; run deliberately, never as a
 * test.
 */

require('../../packages/fitting/src/fetch-jpl-data.cjs');
