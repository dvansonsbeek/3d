#!/usr/bin/env node
/**
 * 20.3h: the Sun planetary-completion fitter (the Step-0 companion) lives
 * in @essrt/fitting (packages/fitting/src/sun-planetary-completion-fit.cjs).
 * Shim keeps the documented CLI path — read-only (writes nothing; fetches
 * JPL Horizons live), so there is no --write flow to pass through.
 */

require('../../packages/fitting/src/sun-planetary-completion-fit.cjs');
