#!/usr/bin/env python3
"""The external referee of the sky of date's linear space motion (plan 28 §G (3); doc 111 §1.48).

astropy's SkyCoord.apply_space_motion (ERFA pmsafe — the rigorous space motion on the same
catalogue values: position, parallax, proper motion, radial velocity at the catalogue epoch)
for a few high-motion stars of the catalogue at ±10 kyr and ±100 kyr from J2000, written as a
RECORD the browser gate reads (test/browser/sky-of-date.test.mjs).

The referee's model, DECOMPOSED with pyerfa (doc 111 §1.48): ERFA's starpm is (1) starpv — the
catalogue's OBSERVED rates (the proper motion and the Doppler radial velocity) converted to the
inertial space velocity by Stumpff's (1985) relativistic factors, ~v_r/c — then (2) the straight
line on that velocity, placed at the EMISSION instant (dt + tl1 − tl2, the light times before and
after): the APPARENT place. The two terms are each ~1e-4 of the motion with opposite first-order
signs (Groombridge 1830 at 100 kyr: 96″ and 43″, the net 52″), which is why either one alone had
enlarged the gap. The scene draws the GEOMETRIC place on the inertial velocity (ONE home
packages/physics/src/sky/galactic-orbits.cjs inertialVelocityFactors — the same factors; a 3-D
scene a camera can fly through draws where a star IS at the instant), so the record carries both:
`apparent` (astropy, as before) and `geometric` (erfa.starpv + erfa.pvu, no light-time), the
light-time term between them, and each star's inertial velocity vector for the Node gate. The
scene is held to the plan's 1″ / 10″ against the geometric place for every star (the residual is
the tidal curvature of its Galactic orbit), and to the recorded light-time term against the
apparent one.

The stars: Sirius (HIP 32349), Arcturus (69673), α Centauri A (71683), 61 Cygni A (104214) and
Groombridge 1830 (57939) — the plan named Barnard's star, which at V 9.5 is outside the V ≤ 8
catalogue; the two high-proper-motion naked-eye stars stand in its place.

Usage: python3 scripts/star_motion_reference.py [--write]
  Reads public/input/stars.json (v2) and prints the reference; --write records it to
  data/star-motion-reference.json with the catalogue's canonical sha256 as its input.
"""
import hashlib
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STARS = os.path.join(ROOT, 'public', 'input', 'stars.json')
OUT = os.path.join(ROOT, 'data', 'star-motion-reference.json')
HIPS = [32349, 69673, 71683, 104214, 57939]
YEARS = [2000.0, 12000.0, -8000.0, 102000.0, -98000.0]
# arcseconds at ±10 kyr and ±100 kyr against the GEOMETRIC place: the plan's 1 / 10 for every star
TOLERANCES = (1.0, 10.0)
DJY = 365.25               # days per Julian year (ERFA's DJY)
PC_AU = 648000.0 / math.pi  # au per parsec (the IAU parsec)


def ra_dec_dist(p):
    """ICRS α, δ (degrees) and the distance (pc) of an equatorial vector in au."""
    x, y, z = p
    r = math.sqrt(x * x + y * y + z * z)
    return (math.degrees(math.atan2(y, x)) % 360.0, math.degrees(math.asin(z / r)), r / PC_AU)


def angle_arcsec(a, b):
    """The angle between two directions given as (raDeg, decDeg), in arcseconds."""
    def unit(ra, dec):
        ra, dec = math.radians(ra), math.radians(dec)
        return (math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec))
    u, v = unit(*a), unit(*b)
    dot = max(-1.0, min(1.0, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))
    return math.degrees(math.acos(dot)) * 3600.0


def main(write):
    import erfa
    import numpy as np
    import astropy.units as u
    from astropy.coordinates import SkyCoord
    from astropy.time import Time

    with open(STARS, 'rb') as f:
        raw = f.read()
    doc = json.loads(raw)
    ci = {c: i for i, c in enumerate(doc['columns'])}
    rows = {r[ci['hip']]: r for r in doc['stars']}
    epoch = doc['_meta']['epochYear']
    out = {}
    for hip in HIPS:
        r = rows[hip]
        rv = r[ci['rvKmS']]
        rv0 = rv if rv is not None else 0.0
        d_pc = r[ci['distPc']]
        ra, dec = r[ci['raDeg']], r[ci['decDeg']]
        c = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, distance=d_pc * u.pc,
                     pm_ra_cosdec=r[ci['pmRaMasYr']] * u.mas / u.yr, pm_dec=r[ci['pmDecMasYr']] * u.mas / u.yr,
                     radial_velocity=rv0 * u.km / u.s,
                     frame='icrs', obstime=Time(epoch, format='jyear', scale='tdb'))
        # the inertial pv-vector (au, au/day) from the same catalogue values: starpv's observed → inertial velocity
        # (ERFA takes dα/dt without the cos δ, parallax in arcseconds)
        pmr = math.radians(r[ci['pmRaMasYr']] / 3.6e6) / math.cos(math.radians(dec))
        pmd = math.radians(r[ci['pmDecMasYr']] / 3.6e6)
        pv0 = erfa.starpv(math.radians(ra), math.radians(dec), pmr, pmd, 1.0 / d_pc, rv0)
        v_in = np.array(pv0[1]) * (1.495978707e8 / 86400.0)   # au/day → km/s (the IAU 2012 au)
        per = []
        for y in YEARS:
            # the TDB scale: a UTC year far from today has no leap-second table (ERFA taiutc refuses it);
            # the span between two Julian epochs is what the motion needs, and TDB carries it at every year
            c2 = c.apply_space_motion(new_obstime=Time(y, format='jyear', scale='tdb'))
            apparent = (float(c2.ra.deg), float(c2.dec.deg), float(c2.distance.pc))
            # the GEOMETRIC place: the inertial straight line at the instant, no light-time move
            geom = ra_dec_dist(erfa.pvu((y - epoch) * DJY, pv0)[0])
            per.append({'year': y, 'raDeg': apparent[0], 'decDeg': apparent[1], 'distPc': apparent[2],
                        'geometric': {'raDeg': geom[0], 'decDeg': geom[1], 'distPc': geom[2]},
                        'lightTimeArcsec': angle_arcsec(apparent[:2], geom[:2])})
        out[str(hip)] = {'name': (doc.get('names', {}).get(str(hip), {}) or {}).get('name'), 'rvKmS': rv, 'distFlag': r[ci['distFlag']],
                         'inertialVelocityKmS': [float(v) for v in v_in],
                         'toleranceArcsec': {'10kyr': TOLERANCES[0], '100kyr': TOLERANCES[1]}, 'positions': per}
    sha = hashlib.sha256(raw).hexdigest()
    rec = {
        '_description': 'The external referee of the sky of date (plan 28 §G (3)) — GENERATED by scripts/star_motion_reference.py --write: astropy SkyCoord.apply_space_motion (ERFA pmsafe) on the catalogue values of five high-motion stars at ±10 kyr and ±100 kyr from J2000 — the APPARENT place (raDeg, decDeg, distPc: the inertial straight line placed at the emission instant) — and, decomposed with pyerfa, the GEOMETRIC place (geometric: erfa.starpv + erfa.pvu, the same inertial velocity, no light-time move), the light-time term between them (lightTimeArcsec) and each star\'s inertial velocity (inertialVelocityKmS, ICRS axes — the catalogue\'s observed rates through Stumpff\'s factors). Gates: the browser gate test/browser/sky-of-date.test.mjs holds the scene to the plan\'s 1 / 10 arcsec of the geometric place at 10 / 100 kyr for every star and to the recorded light-time term of the apparent place; tools/verify/star-catalogue.js holds the one home\'s inertial velocity to pyerfa\'s (doc 111 section 1.48).',
        'generated_by': 'python3 scripts/star_motion_reference.py --write',
        'inputs': {'public/input/stars.json': {'sha256': sha, 'epochYear': epoch, 'counts': doc['_meta']['counts']}},
        'tolerancesArcsec': {'10kyr': TOLERANCES[0], '100kyr': TOLERANCES[1], 'lightTimeArcsec': 0.05},
        'stars': out,
    }
    text = json.dumps(rec, indent=1) + '\n'
    if write:
        with open(OUT, 'w') as f:
            f.write(text)
        print('wrote', os.path.relpath(OUT, ROOT))
    else:
        print(text)


if __name__ == '__main__':
    main('--write' in sys.argv[1:])
