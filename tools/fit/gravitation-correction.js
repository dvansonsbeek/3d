#!/usr/bin/env node
/**
 * 9-3c: the gravitation fitter lives in @essrt/fitting
 * (packages/fitting/src/gravitation-correction.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/gravitation-correction.cjs');
