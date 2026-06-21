"""
Fetch NASA's 5-Millennium Canon of Lunar Eclipses (Espenak & Meeus 2009)
and parse it into JSON for our Phase L-4 model⇄NASA bidirectional comparison.

Source : https://eclipse.gsfc.nasa.gov/LEcat5/LEcatalog.html
Output : public/input/lunar-eclipses-nasa.json
Coverage: -1999 BCE to +3000 CE  (50 century pages, ~12,064 events)

JD computation matches src/script.js dateTimeToJulianDay() — proleptic Julian
calendar before 1582-10-15, Gregorian after. Times converted from TD to UT
using NASA's published ΔT for each event.

Usage:
    python3 scripts/fetch_nasa_lunar_canon.py          # full catalog
    python3 scripts/fetch_nasa_lunar_canon.py --limit 3   # smoke test (first 3 pages)
"""

import re, json, math, time, sys, argparse
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError

BASE = "https://eclipse.gsfc.nasa.gov/LEcat5/"
OUT  = Path(__file__).parent.parent / "public" / "input" / "lunar-eclipses-nasa.json"

MONTHS = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
          'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}

def fmt_year(y):
    """NASA's URL year format: -NNNN with leading zeros (5 chars) or NNNN (4 chars)."""
    return f"{y:05d}" if y < 0 else f"{y:04d}"

def century_urls():
    """50 century-page filenames spanning -1999 to +3000."""
    urls = []
    for start in range(-1999, 0, 100):
        end = min(start + 99, 0)
        urls.append(f"LE{fmt_year(start)}-{fmt_year(end)}.html")
    for start in range(1, 3001, 100):
        urls.append(f"LE{fmt_year(start)}-{fmt_year(start + 99)}.html")
    return urls

# Row schema (whitespace separated, after the leading <a><catalog#></a> link):
#   Y Mon D  HH:MM:SS  ΔT  Luna#  <a>Saros#</a>  Type  QSE  γ  PenMag  UmMag  PenDur  ParDur  TotDur  Lat  Lng
ROW_RE = re.compile(
    r'>(\d{5})</a>\s+'
    r'(-?\d{1,4})\s+(\w{3})\s+(\d{1,2})\s+'
    r'(\d{1,2}):(\d{2}):(\d{2})\s+'
    r'(-?\d+)\s+'
    r'(-?\d+)\s+'
    r'(?:<a[^>]*>)?\s*(-?\d+)\s*(?:</a>)?\s+'
    r'(\S+)\s+(\S+)\s+'
    r'(-?\d+\.\d+)\s+'
    r'(-?\d+\.\d+)\s+'
    r'(-?\d+\.\d+)\s+'
    r'(?:(\d+\.\d+)|-)\s+'
    r'(?:(\d+\.\d+)|-)\s+'
    r'(?:(\d+\.\d+)|-)\s+'
    r'(\d+[NS])\s+'
    r'(\d+[EW])'
)

def date_to_jd(Y, M, D, h, mi, s):
    """Meeus JD — mirrors src/script.js dateTimeToJulianDay() exactly."""
    is_julian = (Y < 1582) or (Y == 1582 and (M < 10 or (M == 10 and D < 15)))
    y, m_ = Y, M
    if m_ <= 2:
        y -= 1
        m_ += 12
    A = math.floor(y / 100)
    B = 0 if is_julian else (2 - A + math.floor(A / 4))
    return (math.floor(365.25 * (y + 4716))
            + math.floor(30.6001 * (m_ + 1))
            + D + B - 1524.5
            + (h + mi/60 + s/3600) / 24)

def map_type(nasa_code):
    return {'T':'Total','P':'Partial','N':'Penumbral'}.get(nasa_code[0], 'Unknown')

def fetch(url, retries=2, delay=1.0):
    for attempt in range(retries + 1):
        try:
            req = Request(BASE + url, headers={'User-Agent': 'HolisticUniverseModel/1.0 (NASA Canon importer)'})
            with urlopen(req, timeout=30) as f:
                return f.read().decode('latin-1')
        except URLError as e:
            if attempt == retries:
                raise
            print(f'    retry {attempt+1}/{retries} after {delay}s ({e})', file=sys.stderr)
            time.sleep(delay)

def parse(html):
    out = []
    for m in ROW_RE.finditer(html):
        cat, Y, mon, D, h, mi, sec, dT, luna, saros, t, qse, gamma, pmag, umag, pdur, pardur, totdur, lat, lng = m.groups()
        Y, D, h, mi, sec, dT_s = int(Y), int(D), int(h), int(mi), int(sec), int(dT)
        M = MONTHS[mon]
        jd_TD = date_to_jd(Y, M, D, h, mi, sec)
        jd_UT = jd_TD - dT_s / 86400
        out.append({
            'catalog_num':         int(cat),
            'jd':                  round(jd_UT, 4),
            'jd_TD':               round(jd_TD, 4),
            'delta_T_sec':         dT_s,
            'date':                f"{Y:+05d}-{M:02d}-{D:02d}" if Y < 0 else f"{Y:04d}-{M:02d}-{D:02d}",
            'time_TD':             f"{h:02d}:{mi:02d}:{sec:02d}",
            'type':                map_type(t),
            'type_nasa':           t,
            'luna_number':         int(luna),
            'saros':               int(saros),
            'gamma':               float(gamma),
            'magnitude_penumbral': float(pmag),
            'magnitude_umbral':    float(umag),
            'duration_pen_min':    float(pdur)   if pdur   else None,
            'duration_par_min':    float(pardur) if pardur else None,
            'duration_tot_min':    float(totdur) if totdur else None,
            'greatest_lat':        lat,
            'greatest_lng':        lng,
        })
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=0, help='Smoke test: only fetch first N pages')
    args = ap.parse_args()

    urls = century_urls()
    if args.limit:
        urls = urls[:args.limit]
        print(f'SMOKE TEST: fetching only first {args.limit} pages', file=sys.stderr)

    events = []
    print(f'Fetching {len(urls)} century pages from {BASE}', file=sys.stderr)
    for i, url in enumerate(urls, 1):
        print(f'  [{i:2d}/{len(urls)}] {url}', end=' ', file=sys.stderr, flush=True)
        try:
            html = fetch(url)
        except URLError as e:
            print(f'FAIL ({e})', file=sys.stderr)
            continue
        rows = parse(html)
        print(f'{len(rows):4d} events', file=sys.stderr)
        events.extend(rows)
        time.sleep(0.3)

    events.sort(key=lambda x: x['jd'])
    print(f'\nTotal: {len(events)} events parsed', file=sys.stderr)

    if args.limit:
        print(f'(smoke test — NOT writing output file)', file=sys.stderr)
        print(json.dumps(events[:3], indent=2))
        return

    out = {
        '_meta': {
            'description': "NASA 5-Millennium Canon of Lunar Eclipses (Espenak & Meeus 2009), "
                           "scraped from eclipse.gsfc.nasa.gov/LEcat5/. Used for Phase L-4 "
                           "model⇄NASA bidirectional comparison.",
            'source_url':  BASE + 'LEcatalog.html',
            'time_range':  '-1999 BCE to +3000 CE',
            'count':       len(events),
            'generator':   'scripts/fetch_nasa_lunar_canon.py',
            'field_definitions': {
                'catalog_num':         "NASA Catalog Number (1 to ~12064).",
                'jd':                  "Julian Date (UT) of greatest eclipse = jd_TD - delta_T_sec/86400.",
                'jd_TD':               "Julian Date (TD) of greatest eclipse, from NASA's TD timestamp.",
                'delta_T_sec':         "ΔT = TD - UT, in seconds (NASA published).",
                'date':                "Calendar date of greatest eclipse (Gregorian ≥1582-10-15, proleptic Julian before).",
                'time_TD':             "Time of greatest eclipse in TD.",
                'type':                "Our 3-class scheme: 'Total' / 'Partial' / 'Penumbral'.",
                'type_nasa':           "NASA letter code: T, T+, T-, Tx, P, P+, P-, N, N+, Nx, Nb.",
                'luna_number':         "Lunation number from J2000 (negative pre-J2000).",
                'saros':               "Saros series number.",
                'gamma':               "Minimum geocentric Moon-shadow-axis distance (Earth radii).",
                'magnitude_penumbral': "Penumbral magnitude (Moon fraction in penumbra at greatest).",
                'magnitude_umbral':    "Umbral magnitude (Moon fraction in umbra at greatest; negative for penumbral-only).",
                'duration_pen_min':    "Penumbral phase duration, minutes.",
                'duration_par_min':    "Partial phase duration, minutes (null if penumbral-only).",
                'duration_tot_min':    "Total phase duration, minutes (null if not total).",
                'greatest_lat':        "Geographic latitude of greatest-eclipse zenith point.",
                'greatest_lng':        "Geographic longitude of greatest-eclipse zenith point.",
            },
        },
        'entries': events,
    }

    OUT.write_text(json.dumps(out, indent=2))
    print(f'Wrote {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT} '
          f'({OUT.stat().st_size // 1024} KB)', file=sys.stderr)

if __name__ == '__main__':
    main()
