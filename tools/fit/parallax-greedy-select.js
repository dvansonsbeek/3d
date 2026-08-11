#!/usr/bin/env node
/**
 * 9-3h: the parallax greedy-selection DIAGNOSTIC lives in @essrt/fitting
 * (packages/fitting/src/parallax-greedy-select.cjs). Shim keeps the
 * documented CLI path; argv passes through unchanged. Reminder
 * (fitting-pipeline skill): the greedy pass is a diagnostic — fitters
 * write the SHIPPED divisor set, never the greedy search result.
 */

require('../../packages/fitting/src/parallax-greedy-select.cjs');
