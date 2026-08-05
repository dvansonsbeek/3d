#!/usr/bin/env node
/**
 * 9-3d: the obliquity-harmonics fitter lives in @hum/fitting
 * (packages/fitting/src/obliquity-harmonics.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/obliquity-harmonics.cjs');
