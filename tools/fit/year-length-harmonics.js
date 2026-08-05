#!/usr/bin/env node
/**
 * 9-3d: the year-length-harmonics fitter lives in @hum/fitting
 * (packages/fitting/src/year-length-harmonics.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/year-length-harmonics.cjs');
