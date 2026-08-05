#!/usr/bin/env node
/**
 * 9-3c: the parallax fitter lives in @hum/fitting
 * (packages/fitting/src/parallax-correction.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/parallax-correction.cjs');
