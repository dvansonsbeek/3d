#!/usr/bin/env node
/**
 * 9-3d: the sun-longitude-harmonics fitter lives in @hum/fitting
 * (packages/fitting/src/sun-longitude-harmonics.cjs). Shim keeps the
 * documented CLI path — including the SUN_HARMONICS_DISABLED=1 --write
 * refit flow; env and argv pass through unchanged.
 */

require('../../packages/fitting/src/sun-longitude-harmonics.cjs');
