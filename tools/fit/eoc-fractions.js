#!/usr/bin/env node
/**
 * 9-3g: the equation-of-centre fractions fitter lives in @essrt/fitting
 * (packages/fitting/src/eoc-fractions.cjs). Shim keeps the documented CLI
 * path; argv passes through unchanged.
 */

require('../../packages/fitting/src/eoc-fractions.cjs');
