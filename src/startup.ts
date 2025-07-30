// startup.ts
import { SimTime } from 'https://github.com/dvansonsbeek/3d/tree/main/src/simTime';

export function initSimTimeFromQuery(url: URL): SimTime {
  const iso = url.searchParams.get('start') || undefined;  // e.g. ?start=2000-06-21T02:00:00Z
  const jdParam = url.searchParams.get('startJD') || undefined; // e.g. ?startJD=2451716.5833333

  const jd = jdParam != null ? Number(jdParam) : undefined;
  const opts = (jd != null && Number.isFinite(jd)) ? { jd } :
               (iso ? { iso } : {});

  return new SimTime(opts);
}