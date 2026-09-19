/**
 * @param {number} tMa @param {number} valueJ2000
 * @param {number} massLossFracPerYear @returns {number} */
export function massLossScaledLinearAtAge(tMa: number, valueJ2000: number, massLossFracPerYear: number): number;
/**
 * @param {number} tMa @param {number} periodJ2000Seconds
 * @param {number} massLossFracPerYear @returns {number} */
export function driver2PeriodSecondsAtAge(tMa: number, periodJ2000Seconds: number, massLossFracPerYear: number): number;
/**
 * @param {number} planetPeriodSeconds @param {number} yearSeconds
 * @returns {number} */
export function synodicPeriodSeconds(planetPeriodSeconds: number, yearSeconds: number): number;
