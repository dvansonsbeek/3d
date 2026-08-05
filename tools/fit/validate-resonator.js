#!/usr/bin/env node
/**
 * 9-3f: the resonator validation lives in @hum/fitting
 * (packages/fitting/src/validate-resonator.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/validate-resonator.cjs');
