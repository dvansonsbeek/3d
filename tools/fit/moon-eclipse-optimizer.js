#!/usr/bin/env node
/**
 * 9-3g: the moon eclipse optimizer lives in @hum/fitting
 * (packages/fitting/src/moon-eclipse-optimizer.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged.
 */

require('../../packages/fitting/src/moon-eclipse-optimizer.cjs');
