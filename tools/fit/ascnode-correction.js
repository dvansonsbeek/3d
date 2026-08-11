#!/usr/bin/env node
/**
 * 9-3h: the ascending-node correction fitter lives in @essrt/fitting
 * (packages/fitting/src/ascnode-correction.cjs). Shim keeps the documented
 * CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/ascnode-correction.cjs');
