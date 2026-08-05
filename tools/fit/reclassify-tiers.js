#!/usr/bin/env node
/**
 * 9-3g: the reference-data tier reclassifier lives in @hum/fitting
 * (packages/fitting/src/reclassify-tiers.cjs). Shim keeps the documented
 * CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/reclassify-tiers.cjs');
