#!/usr/bin/env python3
"""
Extend the in-repo 10-Myr forward N-body integration backward to -50 Myr.

Goal
----
Doc 97 §4.9 Test C established that 31/32 L1 lattice integers correspond to
Laskar 2004 eigenmode beats with ~0% drift across the +10-Myr forward
integration. The follow-up (doc 97 §8 item 15) asks: does this match persist
backward to -50 Myr?

If yes → strong evidence the lattice is dynamically frozen (view A:
KAM-stable formation-epoch synchronization). If the match degrades over
50 Myr → view D dominates (modern parameterization of slowly-evolving
Laskar dynamics).

Method
------
Identical setup to scripts/archive/fibonacci_nbody_proper.py:
  - REBOUND simulation with Sun + 8 planets from JPL Horizons J2000
  - WHFast symplectic integrator, 4-day timestep
  - Output osculating elements every 1 kyr
But integrating BACKWARD (negative time direction) from t=0 to t=-50 Myr.

Expected runtime: ~1-2 hours on a single CPU (4.6e9 timesteps).

Output
------
data/nbody_cache_50myr_backward.npz with the same key schema as the
existing 10-Myr forward cache.
"""

import math
import os
import sys
import time
from pathlib import Path
import numpy as np

try:
    import rebound
except ImportError:
    print("rebound not installed. pip install rebound")
    sys.exit(1)

PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars",
                "Jupiter", "Saturn", "Uranus", "Neptune"]

T_TOTAL = -50.0e6     # 50 Myr backward
DT_OUTPUT = -1000.0    # output every 1 kyr (negative because backward)
N_OUTPUT = int(abs(T_TOTAL / DT_OUTPUT)) + 1   # 50,001 snapshots

CACHE_FILE = Path("/home/dennis/code/3d/data/nbody_cache_50myr_backward.npz")


def main():
    print("=" * 80)
    print("  50-Myr BACKWARD N-body integration — REBOUND WHFast")
    print(f"  Sun + 8 planets, J2000 init, dt=4 days, output every 1 kyr")
    print(f"  Total time: {T_TOTAL/1e6:.0f} Myr   N snapshots: {N_OUTPUT}")
    print("=" * 80)

    if CACHE_FILE.exists():
        print(f"\n  Cache already exists: {CACHE_FILE}")
        print(f"  Size: {CACHE_FILE.stat().st_size / 1024 / 1024:.2f} MB")
        print(f"  Delete to force re-integration.")
        return

    sim = rebound.Simulation()
    sim.units = ('yr', 'AU', 'Msun')
    sim.add("Sun")
    for name in PLANET_NAMES:
        sim.add(name)
    sim.move_to_com()
    sim.integrator = "whfast"
    sim.dt = -4.0 / 365.25   # 4-day step, NEGATIVE direction

    print(f"\n  Particles: {sim.N}")
    print(f"  Integrator: WHFast (symplectic), dt = {sim.dt * 365.25:.2f} days")

    print("\n  Initial orbital elements (heliocentric, J2000):")
    print(f"  {'Planet':<10} {'a (AU)':>10} {'e':>11} {'i (deg)':>9} {'P (yr)':>10}")
    for i, name in enumerate(PLANET_NAMES):
        orb = sim.particles[i + 1].orbit(primary=sim.particles[0])
        print(f"  {name:<10} {orb.a:>10.5f} {orb.e:>11.7f}"
              f" {math.degrees(orb.inc):>9.4f} {orb.P:>10.4f}")

    times = np.zeros(N_OUTPUT)
    ecc = {p: np.zeros(N_OUTPUT) for p in PLANET_NAMES}
    inc = {p: np.zeros(N_OUTPUT) for p in PLANET_NAMES}
    sma = {p: np.zeros(N_OUTPUT) for p in PLANET_NAMES}

    E_initial = sim.energy()
    t_start = time.time()
    print(f"\n  Starting integration at {time.strftime('%H:%M:%S')}", flush=True)
    last_report_pct = -1
    for k in range(N_OUTPUT):
        target_time = k * DT_OUTPUT   # negative, going backward

        if k > 0:
            sim.integrate(target_time)

        times[k] = sim.t

        for i, name in enumerate(PLANET_NAMES):
            orb = sim.particles[i + 1].orbit(primary=sim.particles[0])
            ecc[name][k] = orb.e
            inc[name][k] = math.degrees(orb.inc)
            sma[name][k] = orb.a

        pct = int(100 * (k + 1) / N_OUTPUT)
        if pct >= last_report_pct + 5:
            elapsed = time.time() - t_start
            eta = elapsed * (N_OUTPUT - k - 1) / max(k + 1, 1)
            print(f"  [{pct:>3}%] t = {sim.t/1e6:>7.2f} Myr, "
                  f"elapsed {elapsed/60:.1f} min, ETA {eta/60:.1f} min",
                  flush=True)
            last_report_pct = pct

    E_final = sim.energy()
    print(f"\n  Initial energy: {E_initial:.10e}")
    print(f"  Final energy:   {E_final:.10e}")
    print(f"  Relative error: {abs((E_final - E_initial) / E_initial):.2e}")

    out_dict = {"times": times}
    for name in PLANET_NAMES:
        out_dict[f"ecc_{name}"] = ecc[name]
        out_dict[f"inc_{name}"] = inc[name]
        out_dict[f"sma_{name}"] = sma[name]

    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(CACHE_FILE, **out_dict)
    print(f"\n  Wrote: {CACHE_FILE}")
    print(f"  Size: {CACHE_FILE.stat().st_size / 1024 / 1024:.2f} MB")
    print(f"  Total runtime: {(time.time() - t_start)/60:.1f} min")


if __name__ == "__main__":
    main()
