import { dateToJD, jdToDate } from './time.js';

export class SimTime {
  constructor(opts = {}) {
    this.epochJD = SimTime.resolveEpochJD(opts);
  }
  static resolveEpochJD(opts) {
    if (Number.isFinite(opts?.jd)) return opts.jd;
    if (opts?.date instanceof Date) return dateToJD(opts.date);
    if (opts?.iso) return dateToJD(new Date(opts.iso)); // ISO is UTC
    return dateToJD(new Date('2000-06-21T12:00:00Z'));
  }
  dateToDays(date) { return dateToJD(date) - this.epochJD; }
  daysToDate(days) { return jdToDate(this.epochJD + days); }
  daysToJD(days)   { return this.epochJD + days; }
  jdToDays(jd)     { return jd - this.epochJD; }
}
