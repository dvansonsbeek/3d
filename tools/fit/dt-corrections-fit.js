#!/usr/bin/env node
/**
 * 9-3f: the deltaT-corrections fitter (the 4-flag + resonator joint fit)
 * lives in @essrt/fitting (packages/fitting/src/dt-corrections-fit.cjs).
 * Shim keeps the documented CLI path — including the --joint / --write /
 * DT_CORRECTIONS_DISABLED flows; env and argv pass through unchanged.
 */

require('../../packages/fitting/src/dt-corrections-fit.cjs');
