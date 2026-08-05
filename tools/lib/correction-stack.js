/**
 * 9-3a: the correction-layer registry lives in @hum/fitting/correction-stack.
 * This shim keeps the pre-migration fitter CLIs' require path working; it
 * disappears when the fitters themselves finish moving into the package.
 */

module.exports = require('@hum/fitting/correction-stack');
