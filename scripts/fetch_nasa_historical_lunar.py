"""
Fetch NASA's curated "Lunar Eclipses of Historical Interest" page (Fred Espenak)
and parse the 28 documented historical events into JSON for Phase L-5.

Source : https://eclipse.gsfc.nasa.gov/LEhistory/LEhistory.html
Output : public/input/lunar-eclipses-documented.json

Each entry inherits a placeholder block for L-5b ("observed_time_ut" /
"observation_location" / "observation_source") which Phase L-5b will populate
by transcription from primary sources (Stephenson 1997, Said & Stephenson 1996,
Sachs & Hunger Astronomical Diaries, etc.). The L-5a comparison button uses
only the documented date + NASA-predicted UT; L-5b's observed times turn the
button into a true ground-truth check.

Usage:
    python3 scripts/fetch_nasa_historical_lunar.py
"""

import re, json, html, sys
from pathlib import Path
from urllib.request import urlopen, Request

URL = "https://eclipse.gsfc.nasa.gov/LEhistory/LEhistory.html"
OUT = Path(__file__).parent.parent / "public" / "input" / "lunar-eclipses-documented.json"

MONTHS = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,
          'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}

def strip_html(s):
    """Strip HTML tags, collapse whitespace, unescape entities."""
    s = re.sub(r'<br\s*/?>', ' / ', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()

# Each event row pattern. Six <td> cells per row.
# Cell 1: <a href="LEplot/LE...pdf">DATE_LABEL<br />(CE/BCE label)</a>
# Cell 2: Type
# Cell 3: <a href="...Saros...">NN</a>
# Cell 4: Umbral magnitude
# Cell 5: Duration (partial; sometimes <br /><strong>total</strong>)
# Cell 6: Description (rich HTML; may contain footnote-anchor link)
ROW_RE = re.compile(
    r'<tr(?:\s+class="[^"]*")?>\s*'
    r'<td>\s*<a href="(LEplot/LE[^"]+\.pdf)">\s*(-?\s*\d+)\s+(\w{3})\s+(\d{1,2})\s*'
    r'(?:<br\s*/?>\s*\([^)]+\))?\s*</a>\s*</td>\s*'
    r'<td>\s*(\w+)\s*</td>\s*'
    r'<td>\s*<a[^>]*>\s*(\d+)\s*</a>\s*</td>\s*'
    r'<td>\s*(-?\d+\.\d+)\s*</td>\s*'
    r'<td>\s*([^<]+?)(?:\s*<br\s*/?>\s*<strong>([^<]+?)</strong>)?\s*</td>\s*'
    r'<td>(.*?)</td>',
    re.DOTALL
)

def main():
    print(f'Fetching {URL}', file=sys.stderr)
    req = Request(URL, headers={'User-Agent': 'HolisticUniverseModel/1.0'})
    with urlopen(req, timeout=30) as f:
        page = f.read().decode('latin-1')

    rows = ROW_RE.findall(page)
    if not rows:
        print('ERROR: no rows matched. Page format may have changed.', file=sys.stderr)
        sys.exit(1)

    entries = []
    for pdf, year_raw, mon, day, etype, saros, umag, dur_par, dur_tot, desc_html in rows:
        Y = int(re.sub(r'\s+', '', year_raw))
        M = MONTHS[mon]
        D = int(day)
        date_iso = f"{Y:+05d}-{M:02d}-{D:02d}" if Y < 0 else f"{Y:04d}-{M:02d}-{D:02d}"
        # Extract footnote-anchor id from description if present (e.g. href="#-0746")
        footnote = None
        m = re.search(r'href="(#-?\d+)"', desc_html)
        if m: footnote = m.group(1)
        # Extract Wikipedia link if present (useful for users)
        wiki = None
        m = re.search(r'href="(https?://[^"]*wikipedia\.org[^"]*)"', desc_html)
        if m: wiki = m.group(1)
        entries.append({
            'date_label':            f"{year_raw.strip()} {mon} {int(day):02d}",
            'date_iso':              date_iso,
            'type':                  etype,
            'saros':                 int(saros),
            'magnitude_umbral':      float(umag),
            'duration_partial_str':  dur_par.strip(),
            'duration_total_str':    dur_tot.strip() if dur_tot else None,
            'description':           strip_html(desc_html),
            'footnote_anchor':       footnote,
            'wikipedia_url':         wiki,
            'nasa_plot_url':         f"https://eclipse.gsfc.nasa.gov/LEhistory/{pdf}",
            # ── Phase L-5b placeholders (true-observation ground-truth, transcribed manually) ──
            'observed_time_ut':      None,   # "HH:MM:SS" or "HH:MM" UT of a specific contact
            'observed_contact':      None,   # "greatest" / "U1" / "U2" / "U3" / "U4" / etc.
            'observation_location':  None,   # "Babylon" / "Cairo" / "Alexandria" / ...
            'observation_lat':       None,   # decimal degrees, positive N
            'observation_lng':       None,   # decimal degrees, positive E
            'observation_source':    None,   # primary source citation (Stephenson 1997 / Said & Stephenson 1996 / etc.)
            'observation_notes':     None,   # free text
        })

    out = {
        '_meta': {
            'description':
              "NASA's curated 'Lunar Eclipses of Historical Interest' list (Fred Espenak), "
              "28 famous historical lunar eclipses with rich citations. Used for Phase L-5 "
              "model vs NASA vs documented-observation comparison. The 'observed_*' fields are "
              "Phase L-5b placeholders: when populated (manually from Stephenson 1997 / Said & "
              "Stephenson 1996 / Sachs & Hunger Astronomical Diaries / etc.), the L-5 comparison "
              "becomes a true ground-truth check independent of NASA's ΔT polynomial.",
            'source_url':      URL,
            'count':           len(entries),
            'generator':       'scripts/fetch_nasa_historical_lunar.py',
            'l5b_status':      f"{sum(1 for e in entries if e['observed_time_ut']) } / {len(entries)} entries have transcribed observed times",
            'field_definitions': {
                'date_label':           "NASA's calendar date label as displayed.",
                'date_iso':             "ISO date, proleptic Julian before 1582-10-15 (matches our dateTimeToJulianDay).",
                'type':                 "Total / Partial / Penumbral (NASA classification).",
                'saros':                "Saros series number.",
                'magnitude_umbral':     "Fraction of Moon diameter in Earth's umbra at greatest.",
                'duration_partial_str': "NASA-stated partial-phase duration (e.g. '03h25m').",
                'duration_total_str':   "NASA-stated totality duration if total (null otherwise).",
                'description':          "Historical event / context (HTML stripped, paraphrased citation).",
                'footnote_anchor':      "Anchor id (e.g. '#-0746') on NASA page for extended note text.",
                'wikipedia_url':        "Wikipedia link from NASA page if present.",
                'nasa_plot_url':        "URL of NASA's path/shadow diagram PDF.",
                'observed_time_ut':     "[L-5b] Primary-source observed UT of a specific contact (HH:MM[:SS]).",
                'observed_contact':     "[L-5b] Which contact (greatest / U1 entry-into-umbra / U2 start-totality / U3 end-totality / U4 exit-from-umbra).",
                'observation_location': "[L-5b] City/place name.",
                'observation_lat':      "[L-5b] Decimal degrees, positive North.",
                'observation_lng':      "[L-5b] Decimal degrees, positive East.",
                'observation_source':   "[L-5b] Primary-source citation.",
                'observation_notes':    "[L-5b] Free text.",
            },
            'l5b_sources_to_transcribe_from': [
                "Stephenson, F.R. (1997). Historical Eclipses and Earth's Rotation, Cambridge UP. Appendix tables.",
                "Stephenson, Morrison & Hohenkerk (2016). Proc. Roy. Soc. A 472:20160404 + supplementary material.",
                "Said, S.S. & Stephenson, F.R. (1996). J. Hist. Astronomy 27, 259-273. Ibn Yunus tables.",
                "Sachs, A. & Hunger, H. (1988-2014). Astronomical Diaries and Related Texts from Babylonia. Multi-volume.",
                "Ptolemy, Almagest IV.6 (4 specific Babylonian lunar eclipses).",
            ],
        },
        'entries': entries,
    }

    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f'Wrote {OUT} ({OUT.stat().st_size // 1024} KB, {len(entries)} entries)', file=sys.stderr)

if __name__ == '__main__':
    main()
