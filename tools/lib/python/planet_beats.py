"""
Physical Beat Frequencies per Planet — Derived from model-parameters.json
=============================================================================

Provides the six fundamental periods per planet plus all pairwise beat
frequencies (sum and difference). All derived from JSON — no hardcoded values.

The six fundamental periods per planet:
  1. T_ecl   — Ecliptic perihelion period (from perihelionEclipticFraction)
  2. T_ICRF  — ICRF perihelion period (= ecliptic − Earth's axial precession H/13)
  3. T_obliq — Obliquity cycle period (from obliquityCycleFraction)
  4. T_asc   — Ascending node period (from ascendingNodeCyclesIn8H → 8H/N)
  5. T_axial — Axial precession period (from axialPrecessionFraction)
  6. T_wob   — Eccentricity (wobble) cycle = beat of axial × ICRF

Beat frequencies:
  - Internal: all 15 pairwise combinations within a planet
  - Cross-Earth: 6 × 6 = 36 combinations with Earth's periods

For each pair, we provide BOTH the sum-beat (1/(1/T1 + 1/T2)) and the
diff-beat (1/(1/T1 − 1/T2)). Signs encode direction (prograde/retrograde).

Usage:
    from planet_beats import fundamental_periods, internal_beats, earth_cross_beats

    periods = fundamental_periods('Mercury')
    print(periods['T_ecl'], periods['T_axial'])

    beats = internal_beats('Mercury')
    print(beats)  # { ('ecl','axial'): {'sum': X, 'diff': Y}, ... }

    cross = earth_cross_beats('Mercury')
    print(cross)  # { ('ecl','E_axial'): {'sum': X, 'diff': Y}, ... }
"""

import sys
from pathlib import Path
# Add tools/fit/python to path for load_constants (which has the Node bridge)
_FIT_PYTHON = Path(__file__).resolve().parent.parent.parent / 'fit' / 'python'
if str(_FIT_PYTHON) not in sys.path:
    sys.path.insert(0, str(_FIT_PYTHON))
from load_constants import C

H = int(C['H'])
_H13 = H / 13  # Earth's axial precession period (general precession reference)

# Six fundamental period names (order used consistently throughout)
PERIOD_KEYS = ('ecl', 'icrf', 'obliq', 'asc', 'axial', 'wobble')


def fundamental_periods(planet_name):
    """
    Return the 6 fundamental periods (years) for a planet.

    Keys: T_ecl, T_icrf, T_obliq, T_asc, T_axial, T_wobble
    Signs: + prograde, − retrograde, None = frozen/missing

    Args:
        planet_name: 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter',
                     'Saturn', 'Uranus', 'Neptune'

    Returns:
        dict with keys T_ecl, T_icrf, T_obliq, T_asc, T_axial, T_wobble
    """
    if planet_name == 'Earth':
        # Earth is the reference frame; use its own orbital constants
        return {
            'T_ecl':    H / 16,      # H/16 perihelion ecliptic
            'T_icrf':   H / 3,       # H/3 inclination cycle (only prograde planet)
            'T_obliq':  H / 8,       # H/8 obliquity cycle
            'T_asc':    -8 * H / 40, # 8H/40 ascending node (retrograde)
            'T_axial':  -H / 13,     # H/13 axial precession (retrograde)
            'T_wobble': H / 16,      # Wobble = perihelion ecliptic for Earth
        }

    key = planet_name.lower()
    p = C['planets'][key]

    t_ecl = p['perihelionEclipticYears']
    t_axial = p['axialPrecessionYears']
    t_obliq = p.get('obliquityCycle')
    t_wobble = p.get('wobblePeriod')

    # ICRF period from frame conversion: ICRF_rate = ecl_rate − gen_prec_rate
    t_icrf = (t_ecl * _H13) / (_H13 - t_ecl)

    # Ascending node: -8H/N where N = ascendingNodeCyclesIn8H (retrograde)
    asc_n = p.get('ascendingNodeCyclesIn8H')
    t_asc = -8 * H / asc_n if asc_n else None

    return {
        'T_ecl':    t_ecl,
        'T_icrf':   t_icrf,
        'T_obliq':  t_obliq,
        'T_asc':    t_asc,
        'T_axial':  t_axial,
        'T_wobble': t_wobble,
    }


def _beat(t1, t2):
    """
    Compute beat periods between two oscillation periods.

    Returns (sum_period, diff_period) where:
      sum_period  = 1 / (1/t1 + 1/t2)   # higher-frequency beat
      diff_period = 1 / (1/t1 − 1/t2)   # lower-frequency beat

    Signs are preserved. Returns (None, None) if either period is None or
    the resulting beat is effectively infinite (> 1e12 yr).
    """
    if t1 is None or t2 is None:
        return (None, None)
    r1 = 1.0 / t1
    r2 = 1.0 / t2
    sum_rate = r1 + r2
    diff_rate = r1 - r2
    sum_p = 1 / sum_rate if abs(sum_rate) > 1e-20 else None
    diff_p = 1 / diff_rate if abs(diff_rate) > 1e-20 else None
    # Filter out unphysically long "beats" (effectively no beat)
    if sum_p and abs(sum_p) > 1e12:
        sum_p = None
    if diff_p and abs(diff_p) > 1e12:
        diff_p = None
    return (sum_p, diff_p)


def internal_beats(planet_name):
    """
    Compute all pairwise beat frequencies between the 6 fundamental periods
    of a single planet.

    Returns:
        dict { (k1, k2): {'sum': T_sum, 'diff': T_diff}, ... }
        where k1, k2 ∈ PERIOD_KEYS and k1 < k2 (lex order, 15 pairs).
    """
    periods = fundamental_periods(planet_name)
    beats = {}
    keys = PERIOD_KEYS
    for i, k1 in enumerate(keys):
        for k2 in keys[i+1:]:
            t1 = periods['T_' + k1]
            t2 = periods['T_' + k2]
            t_sum, t_diff = _beat(t1, t2)
            beats[(k1, k2)] = {'sum': t_sum, 'diff': t_diff}
    return beats


def earth_cross_beats(planet_name):
    """
    Compute beat frequencies between each of a planet's 6 periods and
    each of Earth's 6 periods (6 × 6 = 36 combinations).

    This captures the geocentric observer effects — beats between planet
    motion and Earth-frame precession cycles.

    Returns:
        dict { (planet_key, 'E_' + earth_key): {'sum': T_sum, 'diff': T_diff}, ... }
    """
    if planet_name == 'Earth':
        return {}  # No cross-self beats

    pp = fundamental_periods(planet_name)
    ep = fundamental_periods('Earth')

    beats = {}
    for pk in PERIOD_KEYS:
        for ek in PERIOD_KEYS:
            t1 = pp['T_' + pk]
            t2 = ep['T_' + ek]
            t_sum, t_diff = _beat(t1, t2)
            beats[(pk, 'E_' + ek)] = {'sum': t_sum, 'diff': t_diff}
    return beats


def all_planet_features(planet_name):
    """
    Return a flat list of (tag, period) tuples for all physical features
    of a planet: 6 fundamentals + 15 internal beats (× 2) + 36 cross beats (× 2).

    Filters out None periods (frozen cases) and duplicates (within ~5 yr).

    Args:
        planet_name: 'Mercury', 'Venus', etc.

    Returns:
        list of (tag, period) where period is in years (signed).
    """
    periods = fundamental_periods(planet_name)
    features = []

    # 6 fundamentals
    for k in PERIOD_KEYS:
        t = periods['T_' + k]
        if t is None:
            continue
        features.append((k, t))

    # 15 internal beat pairs × 2 (sum + diff) = 30
    for (k1, k2), beats in internal_beats(planet_name).items():
        if beats['sum'] is not None:
            features.append((f'{k1}+{k2}', beats['sum']))
        if beats['diff'] is not None:
            features.append((f'{k1}-{k2}', beats['diff']))

    # 36 cross-Earth beat pairs × 2 (sum + diff) = 72
    for (pk, ek), beats in earth_cross_beats(planet_name).items():
        if beats['sum'] is not None:
            features.append((f'{pk}+{ek}', beats['sum']))
        if beats['diff'] is not None:
            features.append((f'{pk}-{ek}', beats['diff']))

    # Dedupe (periods within 5 yr collapse to same tag)
    seen = {}
    unique = []
    for tag, t in features:
        key = round(abs(t) / 5) * 5  # Bucket by 5 yr
        if key not in seen:
            seen[key] = tag
            unique.append((tag, t))

    return unique


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Show physical beat frequencies per planet.')
    parser.add_argument('planet', nargs='?', default=None,
                        choices=['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
                        help='Planet to analyze (default: all)')
    parser.add_argument('--features', action='store_true', help='Show flat feature list')
    args = parser.parse_args()

    planets = [args.planet] if args.planet else \
              ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

    for p in planets:
        print('═' * 70)
        print(f'{p}')
        print('═' * 70)

        periods = fundamental_periods(p)
        print('\nFundamental periods (years):')
        for k in PERIOD_KEYS:
            t = periods['T_' + k]
            s = 'None' if t is None else f'{t:+.0f}'
            print(f'  T_{k:<7} {s:>12}')

        if p != 'Earth':
            print('\nInternal beats:')
            for (k1, k2), b in internal_beats(p).items():
                s = 'None' if b['sum'] is None else f"{b['sum']:+.0f}"
                d = 'None' if b['diff'] is None else f"{b['diff']:+.0f}"
                print(f'  {k1}×{k2:<9} sum={s:>10}  diff={d:>10}')

            if args.features:
                print('\nAll features (tag, period):')
                for tag, t in all_planet_features(p):
                    print(f'  {tag:<20} {t:+.0f}')

        print()
