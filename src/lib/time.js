const MS_PER_DAY = 86_400_000;
const JD_UNIX_EPOCH = 2440587.5; // JD at 1970-01-01T00:00:00Z

/** Convert a JS Date (UTC) to Julian Date (JD). */
export function dateToJD(date: Date): number {
  return date.getTime() / MS_PER_DAY + JD_UNIX_EPOCH;
}

/** Convert Julian Date (JD) to a JS Date (UTC). */
export function jdToDate(jd: number): Date {
  return new Date((jd - JD_UNIX_EPOCH) * MS_PER_DAY);
}