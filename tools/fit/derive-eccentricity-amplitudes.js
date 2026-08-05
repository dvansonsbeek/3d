#!/usr/bin/env node
/**
 * 9-3h: the eccentricity-amplitude derivation lives in @hum/fitting
 * (packages/fitting/src/derive-eccentricity-amplitudes.cjs). Shim keeps
 * the documented CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/derive-eccentricity-amplitudes.cjs');
