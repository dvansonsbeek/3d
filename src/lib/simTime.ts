// simTime.ts
import { dateToJD, jdToDate } from './lib/time';

export interface StartOptions {
  iso?: string;      // e.g., "2000-06-21T02:00:00Z"
  jd?: number;       // e.g., 2451716.5833333335
  date?: Date;       // e.g., new Date(Date.parse("2000-06-21T02:00:00Z"))
}

export class SimTime {
  /** JD of the chosen start datetime (UTC). Single source of truth. */
  public epochJD: number;

  constructor(opts: StartOptions = {}) {
    this.epochJD = SimTime.resolveEpochJD(opts);
  }

  static resolveEpochJD(opts: StartOptions): number {
    if (opts.jd != null && Number.isFinite(opts.jd)) return opts.jd;
    if (opts.date instanceof Date) return dateToJD(opts.date);
    if (opts.iso) return dateToJD(new Date(opts.iso)); // ISO parses as UTC
    // Fallback default: keep your historic default but without +12h assumptions.
    // Example: "2000-06-21T12:00:00Z" => JD 2451717.0
    return dateToJD(new Date("2000-06-21T12:00:00Z"));
  }

  /** Δdays since epoch, from a Date. */
  public dateToDays(date: Date): number {
    return dateToJD(date) - this.epochJD;
  }

  /** Date from Δdays since epoch. */
  public daysToDate(daysSinceEpoch: number): Date {
    return jdToDate(this.epochJD + daysSinceEpoch);
  }

  /** JD from Δdays since epoch. */
  public daysToJD(daysSinceEpoch: number): number {
    return this.epochJD + daysSinceEpoch;
  }

  /** Δdays since epoch from JD. */
  public jdToDays(jd: number): number {
    return jd - this.epochJD;
  }
}
