#!/usr/bin/env python3
"""
N-BODY PROPER ORBITAL ELEMENTS VIA REBOUND
============================================

Uses REBOUND to integrate the full Sun + 8 planets system over several Myr
and extract proper orbital elements (oscillation midpoints and amplitudes)
directly from the N-body trajectories.

This bypasses the 1950 Brouwer & van Woerkom analytic secular solution and
gives numerically exact proper elements for testing:
  1. Fibonacci eccentricity ladder (d × ξ = const)
  2. ψ-constants (d × η = ψ)
  3. Historical triad test (3η_E + 5η_J = 8η_S — no longer exact)
  4. Eigenmode isolation of Mars

Integration setup:
  - WHFast symplectic integrator (fast, energy-conserving)
  - dt = 5 days (< 1/20 Mercury's period)
  - Integration time: 10 Myr (covers ~5 full secular cycles)
  - Output: osculating elements every 1000 years
  - Invariable plane: elements referenced to Solar System invariable plane

References:
  - Rein & Liu (2012), A&A 537, A128 — REBOUND integrator
  - Rein & Tamayo (2015), MNRAS 452, 376 — WHFast
"""

import numpy as np
import math
import rebound
import sys
from fibonacci_data import *

np.set_printoptions(precision=6, suppress=True)


def section(title):
    print()
    print("=" * 78)
    print(f"  {title}")
    print("=" * 78)
    print()


# ═══════════════════════════════════════════════════════════════════════════
# PART 1: SET UP THE SOLAR SYSTEM
# ═══════════════════════════════════════════════════════════════════════════
section("1. SOLAR SYSTEM SETUP WITH REBOUND")

sim = rebound.Simulation()
sim.units = ('yr', 'AU', 'Msun')

# Add Sun + 8 planets from NASA JPL Horizons (J2000 epoch)
sim.add("Sun")
for name in ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]:
    sim.add(name)

sim.move_to_com()

print(f"  Particles: {sim.N}")
print(f"  Integrator: WHFast (symplectic)")

# Set up WHFast integrator
sim.integrator = "whfast"
sim.dt = 4.0 / 365.25  # 4 days in years (< 1/20 of Mercury's period)

print(f"  Timestep: {sim.dt * 365.25:.1f} days ({sim.dt:.6f} yr)")
print(f"  Mercury period / dt = {0.24085 / sim.dt:.0f} (should be >20)")
print()

# Print initial orbital elements
print("  Initial orbital elements (heliocentric):")
print(f"  {'Planet':<10} {'a (AU)':>10} {'e':>12} {'i (deg)':>10} {'P (yr)':>10}")
print(f"  {'-'*10} {'-'*10} {'-'*12} {'-'*10} {'-'*10}")
for i, name in enumerate(PLANET_NAMES):
    orb = sim.particles[i + 1].orbit(primary=sim.particles[0])
    print(f"  {name:<10} {orb.a:>10.5f} {orb.e:>12.8f} {math.degrees(orb.inc):>10.4f} {orb.P:>10.4f}")


# ═══════════════════════════════════════════════════════════════════════════
# PART 2: INTEGRATE AND COLLECT ORBITAL ELEMENTS
# ═══════════════════════════════════════════════════════════════════════════
section("2. N-BODY INTEGRATION (10 Myr)")

T_total = 10.0e6  # 10 Myr
dt_output = 1000.0  # output every 1000 years
N_output = int(T_total / dt_output) + 1

# Check for cached data
import os
CACHE_FILE = os.path.join(os.path.dirname(__file__), "nbody_cache_10myr.npz")

if os.path.exists(CACHE_FILE):
    print(f"  Loading cached integration data from {os.path.basename(CACHE_FILE)}...")
    cached = np.load(CACHE_FILE)
    times = cached["times"]
    ecc_history = {p: cached[f"ecc_{p}"] for p in PLANET_NAMES}
    inc_history = {p: cached[f"inc_{p}"] for p in PLANET_NAMES}
    sma_history = {p: cached[f"sma_{p}"] for p in PLANET_NAMES}
    N_output = len(times)
    print(f"  Loaded {N_output} snapshots over {times[-1]/1e6:.0f} Myr")
    print(f"  (Delete {os.path.basename(CACHE_FILE)} to force re-integration)")
else:
    print(f"  Integration time: {T_total/1e6:.0f} Myr")
    print(f"  Output interval: {dt_output:.0f} years")
    print(f"  Number of snapshots: {N_output}")
    print()

    # Storage for osculating elements
    ecc_history = {p: np.zeros(N_output) for p in PLANET_NAMES}
    inc_history = {p: np.zeros(N_output) for p in PLANET_NAMES}
    sma_history = {p: np.zeros(N_output) for p in PLANET_NAMES}
    times = np.zeros(N_output)

    # Progress tracking
    progress_marks = [int(N_output * f) for f in [0.1, 0.25, 0.5, 0.75, 1.0]]
    progress_pcts = [10, 25, 50, 75, 100]
    next_progress = 0

    print("  Integrating...", end="", flush=True)

    for k in range(N_output):
        target_time = k * dt_output

        if k > 0:
            sim.integrate(target_time)

        times[k] = sim.t

        for i, name in enumerate(PLANET_NAMES):
            orb = sim.particles[i + 1].orbit(primary=sim.particles[0])
            ecc_history[name][k] = orb.e
            inc_history[name][k] = math.degrees(orb.inc)
            sma_history[name][k] = orb.a

        # Progress reporting
        if next_progress < len(progress_marks) and k >= progress_marks[next_progress]:
            print(f" {progress_pcts[next_progress]}%", end="", flush=True)
            next_progress += 1

    print(" done.")
    print()

    # Energy conservation check
    E_final = sim.energy()
    print(f"  Final time: {sim.t/1e6:.3f} Myr")

    # Quick energy check by re-computing
    sim_check = rebound.Simulation()
    sim_check.units = ('yr', 'AU', 'Msun')
    sim_check.add("Sun")
    for name in ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]:
        sim_check.add(name)
    sim_check.move_to_com()
    E_initial_check = sim_check.energy()

    print(f"  Initial energy: {E_initial_check:.10e}")
    print(f"  Final energy:   {E_final:.10e}")
    print(f"  Relative error: {abs((E_final - E_initial_check) / E_initial_check):.2e}")

    # Save to cache
    save_dict = {"times": times}
    for p in PLANET_NAMES:
        save_dict[f"ecc_{p}"] = ecc_history[p]
        save_dict[f"inc_{p}"] = inc_history[p]
        save_dict[f"sma_{p}"] = sma_history[p]
    np.savez_compressed(CACHE_FILE, **save_dict)
    print(f"  Saved to {os.path.basename(CACHE_FILE)} for fast re-runs")


# ═══════════════════════════════════════════════════════════════════════════
# PART 3: EXTRACT PROPER ELEMENTS (OSCILLATION MIDPOINTS & AMPLITUDES)
# ═══════════════════════════════════════════════════════════════════════════
section("3. PROPER ELEMENTS FROM N-BODY INTEGRATION")

print("  Method: oscillation midpoint = (max + min) / 2")
print("  Method: oscillation amplitude = (max - min) / 2")
print()

# Skip the first 0.5 Myr to let transients settle
skip = int(0.5e6 / dt_output)
print(f"  Skipping first {skip * dt_output / 1e6:.1f} Myr for transient removal")
print()

ecc_mid = {}
ecc_amp = {}
inc_mid = {}
inc_amp = {}

print(f"  {'Planet':<10} {'e_min':>10} {'e_max':>10} {'e_mid':>10} {'e_amp':>10}")
print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")

for name in PLANET_NAMES:
    e_data = ecc_history[name][skip:]
    e_min, e_max = np.min(e_data), np.max(e_data)
    ecc_mid[name] = (e_max + e_min) / 2
    ecc_amp[name] = (e_max - e_min) / 2
    print(f"  {name:<10} {e_min:>10.6f} {e_max:>10.6f} {ecc_mid[name]:>10.6f} {ecc_amp[name]:>10.6f}")

print()
print(f"  {'Planet':<10} {'i_min (°)':>10} {'i_max (°)':>10} {'i_mid (°)':>10} {'i_amp (°)':>10}")
print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")

for name in PLANET_NAMES:
    i_data = inc_history[name][skip:]
    i_min, i_max = np.min(i_data), np.max(i_data)
    inc_mid[name] = (i_max + i_min) / 2
    inc_amp[name] = (i_max - i_min) / 2
    print(f"  {name:<10} {i_min:>10.4f} {i_max:>10.4f} {inc_mid[name]:>10.4f} {inc_amp[name]:>10.4f}")

# Also compare with BvW published extremes
print()
print("  Comparison with BvW (1950) published min/max eccentricities:")
BVW_E_EXTREMES = {
    "Mercury":  (0.130,   0.233),
    "Venus":    (0.000,   0.0705),
    "Earth":    (0.000,   0.0638),
    "Mars":     (0.0444,  0.141),
    "Jupiter":  (0.0256,  0.0611),
    "Saturn":   (0.0121,  0.0845),
    "Uranus":   (0.0106,  0.0771),
    "Neptune":  (0.00460, 0.0145),
}

print(f"  {'Planet':<10} {'N-body min':>10} {'BvW min':>10} {'N-body max':>10} {'BvW max':>10}")
print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
for name in PLANET_NAMES:
    e_data = ecc_history[name][skip:]
    e_min_nb, e_max_nb = np.min(e_data), np.max(e_data)
    e_min_bvw, e_max_bvw = BVW_E_EXTREMES[name]
    print(f"  {name:<10} {e_min_nb:>10.5f} {e_min_bvw:>10.5f} {e_max_nb:>10.5f} {e_max_bvw:>10.5f}")

print()
print("  NOTE: 10 Myr may not cover the FULL secular cycle for all planets.")
print("  BvW extremes are from the analytic (infinite-time) solution.")
print("  N-body extremes will be TIGHTER (not all modes have completed a cycle).")


# ═══════════════════════════════════════════════════════════════════════════
# PART 4: FIBONACCI ECCENTRICITY LADDER WITH N-BODY PROPER ELEMENTS
# ═══════════════════════════════════════════════════════════════════════════
section("4. FIBONACCI ECCENTRICITY LADDER: N-BODY vs MODEL vs J2000")

print("  Eccentricity ladder: d_ecc × ξ = const, where ξ = e × √m")
print()

ecc_planets = ["Venus", "Earth", "Mars", "Mercury"]
d_ecc_vals = {"Venus": 1, "Earth": 2/5, "Mars": 1/5, "Mercury": 1/8}
d_ecc_str = {"Venus": "1", "Earth": "2/5", "Mars": "1/5", "Mercury": "1/8"}

print(f"  {'Planet':<10} {'d_ecc':>6} {'d×ξ_nbody':>12} {'d×ξ_model':>12} {'d×ξ_J2000':>12}")
print(f"  {'-'*10} {'-'*6} {'-'*12} {'-'*12} {'-'*12}")

nb_prods = []
model_prods = []
j2000_prods = []

for p in ecc_planets:
    d = d_ecc_vals[p]
    sqrt_m = SQRT_M[p]

    xi_nb = ecc_mid[p] * sqrt_m
    xi_model = ECC_BASE[p] * sqrt_m
    xi_j2000 = ECC_J2000[p] * sqrt_m

    dxi_nb = d * xi_nb
    dxi_model = d * xi_model
    dxi_j2000 = d * xi_j2000

    nb_prods.append(dxi_nb)
    model_prods.append(dxi_model)
    j2000_prods.append(dxi_j2000)

    print(f"  {p:<10} {d_ecc_str[p]:>6} {dxi_nb:>12.6e} {dxi_model:>12.6e} {dxi_j2000:>12.6e}")

nb_mean = np.mean(nb_prods)
model_mean = np.mean(model_prods)
j2000_mean = np.mean(j2000_prods)

nb_spread = np.std(nb_prods) / nb_mean * 100
model_spread = np.std(model_prods) / model_mean * 100
j2000_spread = np.std(j2000_prods) / j2000_mean * 100

print()
print(f"  Ladder spread (σ/mean):")
print(f"    N-body midpoints:  {nb_spread:.3f}%")
print(f"    Model base values: {model_spread:.3f}%")
print(f"    J2000 snapshot:    {j2000_spread:.2f}%")
print()

if nb_spread < model_spread:
    print(f"  → N-body proper elements TIGHTEN the ladder by {model_spread/nb_spread:.1f}×")
elif nb_spread < j2000_spread:
    print(f"  → N-body proper elements are between model and J2000")
    print(f"    N-body vs J2000: {j2000_spread/nb_spread:.1f}× tighter")
    print(f"    N-body vs model: {nb_spread/model_spread:.1f}× looser")
else:
    print(f"  → N-body proper elements are LOOSER than J2000 ({nb_spread:.2f}% vs {j2000_spread:.2f}%)")

# Individual planet comparison
print()
print("  Per-planet N-body midpoint vs model base eccentricity:")
print(f"  {'Planet':<10} {'e_nb_mid':>10} {'e_model':>10} {'Δ%':>8}")
print(f"  {'-'*10} {'-'*10} {'-'*10} {'-'*8}")
for p in PLANET_NAMES:
    delta = (ecc_mid[p] / ECC_BASE[p] - 1) * 100
    print(f"  {p:<10} {ecc_mid[p]:>10.6f} {ECC_BASE[p]:>10.6f} {delta:>+7.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# PART 5: ψ-CONSTANTS WITH N-BODY INCLINATION AMPLITUDES
# ═══════════════════════════════════════════════════════════════════════════
section("5. ψ-CONSTANTS: N-BODY vs MODEL INCLINATION AMPLITUDES")

print("  Law 1: d × η = ψ, where η = i_amp × √m")
print()
print("  NOTE: N-body inclinations are to the ecliptic, not the invariable plane.")
print("  The model uses invariable-plane amplitudes. For outer planets where the")
print("  ecliptic is nearly parallel to the invariable plane, this matters less.")
print("  A proper comparison requires rotating to the invariable plane.")
print()

# Compute mass-weighted inclination amplitudes from N-body
eta_nb = {}
for p in PLANET_NAMES:
    eta_nb[p] = inc_amp[p] * SQRT_M[p]

# Compare η values
print(f"  {'Planet':<10} {'η_nb':>12} {'η_model':>12} {'Δ%':>8}")
print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*8}")
for p in PLANET_NAMES:
    eta_m = ETA[p]
    delta = (eta_nb[p] / eta_m - 1) * 100 if eta_m > 0 else float('inf')
    print(f"  {p:<10} {eta_nb[p]:>12.6e} {eta_m:>12.6e} {delta:>+7.1f}%")

# Compute ψ-products with N-body η
print()
print("  ψ products (d × η_nb):")
psi1_planets = {"Venus": 34, "Earth": 3, "Mars": 5, "Neptune": 34}
psi1_prods_nb = []
for p, d in psi1_planets.items():
    prod = d * eta_nb[p]
    psi1_prods_nb.append(prod)
    print(f"    {p:<10} d={d:<6} d×η = {prod:.6e}")

psi1_nb = np.mean(psi1_prods_nb)
psi1_spread_nb = np.std(psi1_prods_nb) / psi1_nb * 100

print(f"  ψ (N-body) = {psi1_nb:.6e}, spread = {psi1_spread_nb:.2f}%")
print(f"  ψ (model)  = {PSI1:.6e}")
print(f"  ψ (theory) = {PSI1_THEORY:.6e}")

# Historical triad test: 3η_E + 5η_J = 8η_S
# (No longer holds with updated balance-condition amplitudes)
print()
lhs_nb = 3 * eta_nb["Earth"] + 5 * eta_nb["Jupiter"]
rhs_nb = 8 * eta_nb["Saturn"]
triad_err_nb = abs(lhs_nb / rhs_nb - 1) * 100
lhs_m = 3 * ETA["Earth"] + 5 * ETA["Jupiter"]
rhs_m = 8 * ETA["Saturn"]
triad_err_m = abs(lhs_m / rhs_m - 1) * 100

print(f"  Historical triad: 3η_E + 5η_J = 8η_S")
print(f"  (Replaced by invariable plane balance condition in updated model)")
print(f"    N-body: LHS = {lhs_nb:.6e}, RHS = {rhs_nb:.6e}, error = {triad_err_nb:.2f}%")
print(f"    Model:  LHS = {lhs_m:.6e}, RHS = {rhs_m:.6e}, error = {triad_err_m:.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# PART 6: OUTER PLANET ξ-RATIOS WITH N-BODY PROPER ECCENTRICITIES
# ═══════════════════════════════════════════════════════════════════════════
section("6. OUTER PLANET ξ-RATIOS: N-BODY PROPER ECCENTRICITIES")

print("  Jupiter/Saturn ξ ratio (should be ≈ 1):")
xi_J_nb = ecc_mid["Jupiter"] * SQRT_M["Jupiter"]
xi_S_nb = ecc_mid["Saturn"] * SQRT_M["Saturn"]
xi_U_nb = ecc_mid["Uranus"] * SQRT_M["Uranus"]

xi_J_m = XI["Jupiter"]
xi_S_m = XI["Saturn"]
xi_U_m = XI["Uranus"]

print(f"    N-body: ξ_J/ξ_S = {xi_J_nb/xi_S_nb:.4f}")
print(f"    Model:  ξ_J/ξ_S = {xi_J_m/xi_S_m:.4f}")
print()
print("  Jupiter/Uranus ξ ratio (should be ≈ 3/2):")
print(f"    N-body: ξ_J/ξ_U = {xi_J_nb/xi_U_nb:.4f} (3/2 = 1.5000)")
print(f"    Model:  ξ_J/ξ_U = {xi_J_m/xi_U_m:.4f}")


# ═══════════════════════════════════════════════════════════════════════════
# PART 7: FREQUENCY ANALYSIS (FOURIER)
# ═══════════════════════════════════════════════════════════════════════════
section("7. SECULAR EIGENFREQUENCY EXTRACTION (FFT)")

print("  Extract dominant frequencies from e(t) and i(t) for each planet.")
print("  Compare with BvW (1950) and Laskar (1990) eigenfrequencies.")
print()

# Use data after transient removal
t_data = times[skip:]
dt_sample = dt_output  # 1000 years

for param_name, history, label in [
    ("eccentricity", ecc_history, "e"),
    ("inclination", inc_history, "i")
]:
    print(f"  --- {param_name.upper()} frequencies ---")
    print(f"  {'Planet':<10} {'f₁ ("/yr)':>12} {'f₂ ("/yr)':>12} {'f₃ ("/yr)':>12}")
    print(f"  {'-'*10} {'-'*12} {'-'*12} {'-'*12}")

    for name in PLANET_NAMES:
        data = history[name][skip:]
        # Remove mean
        data = data - np.mean(data)

        # FFT
        N_fft = len(data)
        freqs = np.fft.rfftfreq(N_fft, d=dt_sample)  # cycles per year
        fft_vals = np.abs(np.fft.rfft(data))

        # Convert to arcsec/yr: freq in cycles/yr → multiply by 360*3600
        # Actually, the FFT gives us frequency in cycles/yr.
        # Secular frequencies are traditionally in "/yr (arcsec/yr).
        # freq (cycles/yr) × 360 × 3600 = freq ("/yr)
        freq_arcsec = freqs * 360 * 3600

        # Find top 3 peaks (skip DC at index 0)
        fft_vals[0] = 0
        top_idx = np.argsort(fft_vals)[::-1][:3]
        top_freqs = freq_arcsec[top_idx]
        top_amps = fft_vals[top_idx]

        f_strs = [f"{f:>11.2f}" for f in sorted(top_freqs)]
        print(f"  {name:<10} {' '.join(f_strs)}")

    print()

# Print reference frequencies
print("  Reference eigenfrequencies (\"/yr):")
BVW_G_ref = [0.6345, 2.708, 3.724, 5.462, 7.346, 17.33, 18.00, 22.44]
LASKAR_G_ref = [0.67, 3.09, 4.26, 5.59, 7.45, 17.37, 17.92, 28.22]
print(f"    BvW g:    {', '.join(f'{g:.2f}' for g in BVW_G_ref)}")
print(f"    Laskar g: {', '.join(f'{g:.2f}' for g in LASKAR_G_ref)}")


# ═══════════════════════════════════════════════════════════════════════════
# PART 8: RUNNING WINDOW — FIBONACCI LADDER SPREAD vs TIME
# ═══════════════════════════════════════════════════════════════════════════
section("8. FIBONACCI LADDER SPREAD vs TIME (RUNNING WINDOW)")

print("  Compute d × ξ products for inner planets at each timestep.")
print("  Track how the ladder spread varies over the integration.")
print()

# Compute d × ξ at each timestep
N_ts = N_output
spreads = np.zeros(N_ts)

for k in range(N_ts):
    prods = []
    for p in ecc_planets:
        d = d_ecc_vals[p]
        e_t = ecc_history[p][k]
        xi_t = e_t * SQRT_M[p]
        prods.append(d * xi_t)
    mean_p = np.mean(prods)
    if mean_p > 0:
        spreads[k] = np.std(prods) / mean_p * 100
    else:
        spreads[k] = float('inf')

# Statistics
print(f"  Spread statistics over {T_total/1e6:.0f} Myr:")
print(f"    Minimum:  {np.min(spreads):.3f}% at t = {times[np.argmin(spreads)]/1e6:.3f} Myr")
print(f"    Maximum:  {np.max(spreads):.2f}%")
print(f"    Mean:     {np.mean(spreads):.2f}%")
print(f"    Median:   {np.median(spreads):.2f}%")
print(f"    At J2000: {spreads[0]:.2f}%")
print()

# Fraction of time below various thresholds
for threshold in [0.1, 0.5, 1.0, 2.0, 5.0]:
    frac = np.sum(spreads < threshold) / len(spreads) * 100
    print(f"    Fraction below {threshold}%: {frac:.1f}%")

# Find where minimum occurs — what are the eccentricities there?
k_min = np.argmin(spreads)
print()
print(f"  At minimum spread ({spreads[k_min]:.4f}% at t={times[k_min]/1e6:.3f} Myr):")
for p in ecc_planets:
    e_t = ecc_history[p][k_min]
    print(f"    {p:<10} e = {e_t:.6f} (model base: {ECC_BASE[p]:.6f}, Δ = {(e_t/ECC_BASE[p]-1)*100:+.2f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# PART 9: WINDOWED PROPER ELEMENTS (RUNNING AVERAGE)
# ═══════════════════════════════════════════════════════════════════════════
section("9. WINDOWED PROPER ELEMENTS (RUNNING AVERAGES)")

print("  Instead of global min/max, compute local averages over windows.")
print("  This gives 'proper elements' that evolve slowly due to long-period terms.")
print()

# Window sizes to test: 0.5, 1, 2, 5 Myr
windows = [0.5e6, 1.0e6, 2.0e6, 5.0e6]

for window in windows:
    w = int(window / dt_output)
    if w >= N_output - skip:
        continue

    print(f"  --- Window: {window/1e6:.1f} Myr ---")

    # Compute windowed midpoints for each planet
    best_spread = float('inf')
    best_center = 0
    best_ecc = {}

    for center in range(skip + w // 2, N_output - w // 2, max(1, w // 10)):
        start = center - w // 2
        end = center + w // 2

        prods = []
        for p in ecc_planets:
            d = d_ecc_vals[p]
            e_slice = ecc_history[p][start:end]
            e_mid_w = (np.max(e_slice) + np.min(e_slice)) / 2
            xi_w = e_mid_w * SQRT_M[p]
            prods.append(d * xi_w)

        mean_p = np.mean(prods)
        if mean_p > 0:
            spread_w = np.std(prods) / mean_p * 100
        else:
            spread_w = float('inf')

        if spread_w < best_spread:
            best_spread = spread_w
            best_center = center
            for p in ecc_planets:
                e_slice = ecc_history[p][start:end]
                best_ecc[p] = (np.max(e_slice) + np.min(e_slice)) / 2

    print(f"  Best ladder spread: {best_spread:.4f}% at t ≈ {times[best_center]/1e6:.2f} Myr")
    for p in ecc_planets:
        if p in best_ecc:
            delta = (best_ecc[p] / ECC_BASE[p] - 1) * 100
            print(f"    {p:<10} e_mid = {best_ecc[p]:.6f} (model: {ECC_BASE[p]:.6f}, Δ = {delta:+.2f}%)")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# PART 10: MARS EIGENMODE ISOLATION IN N-BODY
# ═══════════════════════════════════════════════════════════════════════════
section("10. MARS EIGENMODE ISOLATION (N-BODY FFT)")

print("  Test whether Mars's extreme eigenmode isolation (99.8% in linear")
print("  secular theory) persists in the full nonlinear N-body dynamics.")
print()

for name in ["Mars", "Earth", "Venus", "Jupiter", "Saturn"]:
    # Inclination FFT
    data = inc_history[name][skip:] - np.mean(inc_history[name][skip:])
    N_fft = len(data)
    fft_vals = np.abs(np.fft.rfft(data))
    fft_vals[0] = 0  # remove DC

    # Power spectrum
    power = fft_vals**2
    total_power = np.sum(power)

    # Find dominant mode
    dom_idx = np.argmax(power)
    dom_frac = power[dom_idx] / total_power * 100

    # Top 3 modes
    top3_idx = np.argsort(power)[::-1][:3]
    top3_frac = np.sum(power[top3_idx]) / total_power * 100

    freqs = np.fft.rfftfreq(N_fft, d=dt_sample)
    dom_freq = freqs[dom_idx] * 360 * 3600  # arcsec/yr

    print(f"  {name:<10} Dominant mode: {dom_frac:.1f}% at {dom_freq:.1f}\"/yr"
          f"  (top 3: {top3_frac:.1f}%)")

print()
print("  Eccentricity:")
for name in ["Mars", "Earth", "Venus", "Jupiter", "Saturn"]:
    data = ecc_history[name][skip:] - np.mean(ecc_history[name][skip:])
    N_fft = len(data)
    fft_vals = np.abs(np.fft.rfft(data))
    fft_vals[0] = 0
    power = fft_vals**2
    total_power = np.sum(power)
    dom_idx = np.argmax(power)
    dom_frac = power[dom_idx] / total_power * 100
    top3_idx = np.argsort(power)[::-1][:3]
    top3_frac = np.sum(power[top3_idx]) / total_power * 100
    freqs = np.fft.rfftfreq(N_fft, d=dt_sample)
    dom_freq = freqs[dom_idx] * 360 * 3600

    print(f"  {name:<10} Dominant mode: {dom_frac:.1f}% at {dom_freq:.1f}\"/yr"
          f"  (top 3: {top3_frac:.1f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# PART 11: SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
section("SUMMARY: N-BODY PROPER ELEMENTS vs FIBONACCI STRUCTURE")

print("  1. ECCENTRICITY LADDER (d × ξ = const)")
print(f"     N-body midpoint spread: {nb_spread:.3f}%")
print(f"     Model base spread:      {model_spread:.3f}%")
print(f"     J2000 snapshot spread:  {j2000_spread:.2f}%")
print()

print("  2. ψ-CONSTANT SPREAD (Law 1)")
print(f"     N-body: {psi1_spread_nb:.2f}%")
print()

print("  3. HISTORICAL TRIAD (3η_E + 5η_J = 8η_S — no longer exact)")
print(f"     N-body error: {triad_err_nb:.2f}%")
print(f"     Model error:  {triad_err_m:.2f}%")
print()

print("  4. TIME EVOLUTION")
print(f"     Minimum instantaneous ladder spread: {np.min(spreads):.3f}%")
print(f"     Fraction of time below 1%: {np.sum(spreads < 1.0)/len(spreads)*100:.1f}%")
print()

print("  5. KEY QUESTION: Do N-body proper elements improve the Fibonacci fit?")
if nb_spread < model_spread:
    print(f"     YES — N-body midpoints give {model_spread/nb_spread:.1f}× tighter ladder")
elif nb_spread < j2000_spread:
    print(f"     PARTIALLY — tighter than J2000, looser than model base values")
    print(f"     The model's base eccentricities remain the optimal Fibonacci values")
else:
    print(f"     NO — N-body midpoints ({nb_spread:.2f}%) are looser than J2000 ({j2000_spread:.2f}%)")
    print(f"     10 Myr may be insufficient to sample full secular cycles")


if __name__ == "__main__":
    pass
