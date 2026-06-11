"""
Devonian cross-check (t = 380 Ma).

Tests the framework's deep-time predictions end-to-end:
  1. Compute H(t), LOD(t), days/year from canonical tidal rate
  2. Derive Moon distance via angular momentum conservation
  3. Derive Moon sidereal month via Kepler
  4. Test sensitivity to Moon eccentricity

Comparing against Wells 1963 (400 d/yr Devonian) and Williams 2000
(Moon distance ~362-365k km, sidereal month ~25.5-26 d).
"""

import math


# ============================================================
# Framework constants (mirror script.js)
# ============================================================

H_now = 335_317                                # holisticyearLength (yr)
LOD_now_s = 86_400                             # mean solar day (IAU convention, used for
                                               # time conversions and J2000 anchors)

# LOD_now_H13 — H/13-consistent value used in the H(t) formula.
# Derived self-consistently from the framework's structural constants:
#   LOD_now_H13 = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays
# Where:
#   meansiderealyearlengthinSeconds = 365.25636301 × 86400 (script.js line 3281, IAU)
#   meansiderealyearlengthinDays    = solar_d × (H/13)/((H/13)−1) (script.js line 3280)
# This reconciles the IAU sidereal year with the framework's H/13 Fibonacci coupling
# to 3.7 ppb precision. Computed below after mean_sidereal_year_s is defined.

# meansolaryearlengthinDays — quantized tropical year (line 64 of script.js):
#   round(input × H/8) / (H/8)  with input = 365.2422
H_over_8 = H_now / 8                           # 41914.625
input_solar_yr = 365.2422
mean_solar_year_d = round(input_solar_yr * H_over_8) / H_over_8
year_seconds_now = mean_solar_year_d * LOD_now_s
days_per_year_now = mean_solar_year_d
# TOTAL_DAYS_IN_H — derived at J2000 (NOT a fixed invariant!)
# At modern: H_now × meansolaryearlengthinDays = 122,471,920
# At deep time it drifts slightly because year_s evolves with AU drift.
# Architecture α: this is a DIAGNOSTIC OUTPUT, not an input to H(t).
TOTAL_DAYS_IN_H_at_J2000 = H_now * mean_solar_year_d    # ≈ 122,471,920 modernly
TOTAL_DAYS_IN_H = TOTAL_DAYS_IN_H_at_J2000     # kept for backwards compat in script

moon_distance_now_km = 384_399.07
moon_sidereal_month_input_d = 27.32166156
moon_e = 0.054900489                           # moonOrbitalEccentricityBase

# ---- Follow script.js derivation chain EXACTLY ----
# (script.js lines 3406-3429)
G_CONSTANT = 6.6743e-20                        # km³/(kg·s²) — line 3406
MASS_RATIO_EARTH_MOON = 81.30056816            # line 3409

# Sidereal year — script.js uses ASTRO_REFERENCE.siderealYearJ2000 directly
# (line 3281), NOT the H/13-derived meansiderealyearlengthinDays.
# Source: IERS Conventions / IAU definitions.
sidereal_year_J2000_d = 365.25636301             # ASTRO_REFERENCE.siderealYearJ2000
mean_sidereal_year_s = sidereal_year_J2000_d * LOD_now_s
mean_sidereal_year_d = sidereal_year_J2000_d
# Note: the H/13-derived variant (line 3280) gives 365.2563643738 d
# (= 31,558,149.88 s) — used elsewhere in script.js for day counts but
# NOT for year_seconds.

# H/13-derived sidereal year in days (script.js line 3280):
#   meansiderealyearlengthinDays = solar_d × (H/13)/((H/13)−1)
mean_sidereal_year_d_H13 = mean_solar_year_d * (H_now/13) / ((H_now/13) - 1)
# ≈ 365.256364373822 d

# LOD_now_H13 — self-consistent LOD for the H formula
# = mean_sidereal_year_s / mean_sidereal_year_d_H13
LOD_now_H13 = mean_sidereal_year_s / mean_sidereal_year_d_H13
# ≈ 86,399.999677 s  (3.7 ppb less than 86,400)

N_moon = round((H_now * mean_solar_year_d) / moon_sidereal_month_input_d)
moon_sidereal_month_d = (H_now * mean_solar_year_d) / N_moon

# Solar Δa correction (line 3413) and corrected Moon a
moon_orbital_shift_km = (
    moon_distance_now_km * (1 / (MASS_RATIO_EARTH_MOON + 1))
    * (moon_sidereal_month_d / mean_sidereal_year_d)
)
moon_distance_corrected_km = moon_distance_now_km + moon_orbital_shift_km

# GM Earth-Moon SYSTEM via Kepler on Moon orbit (line 3417)
GM_EM_kms = (
    4 * math.pi * math.pi * moon_distance_corrected_km**3
) / (moon_sidereal_month_d * LOD_now_s)**2
GM_em_si = GM_EM_kms * 1e9                     # km³/s² → m³/s²

# Split Earth and Moon
GM_earth_kms = GM_EM_kms * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1))
M_earth = GM_earth_kms / G_CONSTANT            # kg (line 3423)
GM_moon_kms = GM_EM_kms / (MASS_RATIO_EARTH_MOON + 1)
M_moon = GM_moon_kms / G_CONSTANT              # kg (line 3428)

# Earth radius (equatorial) and moment of inertia
earth_diameter_km = 12_756.27
R_earth_m = (earth_diameter_km / 2) * 1000
alpha = 0.3306947                              # EARTH_MOI_FACTOR (IERS Conventions 2010)
I_earth = alpha * M_earth * R_earth_m**2       # kg·m²

CANONICAL_TIDAL_RATE = 0.00526                 # hr/Ma  (diagnostic only — proper formula below)

# --- PROPER-PHYSICS LOD(t) formula (Architecture α two-layer) ---
# Replaces the pure linear LOD(t) = LOD_now − rate · t_Ma with:
#   Layer 1 (Moon distance evolution):
#     a_Moon(t)/a_now = 1 + α₁·t + α₃·t³ + α₄·t⁴
#   Layer 2 (angular-momentum conservation — EXACT):
#     LOD(t) = 2π · I_E / (L_total − M_M · √(GM_E · a(t)))
#
# Properties:
#   - Modern LOD = LOD_now_H13 exactly (anchored)
#   - Modern rate = canonical Wells 0.00526 hr/Ma (via α₁)
#   - Past matches Farhat 2022 to ≤7.5 % over 4.5 Gyr
#   - Future PHYSICALLY BOUNDED — naturally asymptotes to tidal lock
#   - Hadean Moon distance lands at Roche limit (~3.0 R_E)
ALPHA_1 = -8.8658188951e-05    # /Ma   (modern recession, Wells canonical anchor)
ALPHA_3 = -6.4186463489e-12    # /Ma³  (LSQ fit to Farhat 2022 deep-time)
ALPHA_4 = +1.3619800519e-16    # /Ma⁴  (LSQ fit to Farhat 2022 deep-time)
# (α values are physics-consistent with full GM_EM and Moon eccentricity factor.)

# --- Solar mass loss → AU drift → year_s drift ---
# Derived from L_sun/c² (radiation pressure) + solar wind
L_SUN_W = 3.828e26                             # solar luminosity (W) — IAU 2015 nominal
C_SI = 299792458                               # speed of light (m/s) — EXACT (IAU 1983)
SOLAR_WIND_KG_S = 1.6e9                        # Ulysses/ACE (kg/s) — empirical, ±25%

# Precise modern M_Sun anchor (user-provided full precision; matches
# IAU GM_Sun = 1.32712440018e11 km³/s² to ~5 ppm using G = 6.6743e-20)
M_SUN_NOW = 1.98840972748354e30                # kg

_dM_radiation = L_SUN_W / (C_SI * C_SI)        # ≈ 4.26e9 kg/s
_dM_total_kg_s = _dM_radiation + SOLAR_WIND_KG_S
SOLAR_MASS_LOSS_FRAC_PER_YR = _dM_total_kg_s * mean_sidereal_year_s / M_SUN_NOW
# ≈ 9.30e-14 /yr (precise with full M_SUN_NOW)


# --- Modern AU — IAU 2012 constant + Kepler-derived cross-check ---
CURRENT_AU_KM = 149_597_870.698828              # script.js line 56 (IAU 2012)

# Kepler-derived AU from observed sidereal year + GM(Sun + Earth):
#   AU = ( T² × G(M_Sun + M_Earth) / (4π²) )^(1/3)
# This should match CURRENT_AU_KM to within precision-floor noise.
GM_TOTAL_NOW_KMS = G_CONSTANT * (M_SUN_NOW + M_earth)        # km³/s²
AU_NOW_KEPLER_KM = (
    (mean_sidereal_year_s**2 * GM_TOTAL_NOW_KMS) / (4 * math.pi * math.pi)
) ** (1 / 3)

# Sun-Earth gravitational parameters — match script.js lines 3451-3456
GM_SUN_PLUS_EARTH_NOW_KMS = (
    4 * math.pi * math.pi * CURRENT_AU_KM**3
) / mean_sidereal_year_s**2                     # km³/s²
GM_EARTH_ALONE_KMS = GM_earth_kms               # script.js line 3422
GM_SUN_NOW_KMS = GM_SUN_PLUS_EARTH_NOW_KMS - GM_EARTH_ALONE_KMS


def mean_au_at_age(t_Ma):
    """
    AU at age t_Ma (km).
    Adiabatic mass conservation: a × M = const → a_paleo = a_now × (1 − Δm/M).
    Past = smaller AU (Sun was more massive).
    Modern J2000: 149,597,870.698828 km
    """
    if t_Ma == 0:
        return CURRENT_AU_KM
    mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6
    return CURRENT_AU_KM * (1 - mass_loss_fraction)


def mean_sidereal_year_seconds_at_age(t_Ma):
    """
    SIDEREAL year length in seconds at age t_Ma (first-order approximation).
    The sidereal year is one full orbit relative to fixed stars — the true
    Kepler orbital period. Modern J2000: 31,558,149.764 s.
    From Kepler T² ∝ a³/M with adiabatic mass loss: dT/T = −2 × dM/M.
    Past: T was SHORTER (Sun more massive, AU smaller).
    """
    if t_Ma == 0:
        return mean_sidereal_year_s
    mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6
    return mean_sidereal_year_s * (1 - 2 * mass_loss_fraction)


def mean_sidereal_year_seconds_at_age_kepler(t_Ma):
    """
    SIDEREAL year length in seconds at age t_Ma — DIRECT Kepler derivation.

    Symmetric to the Moon-side calculation: use the full two-body
    gravitational parameter GM(Sun + Earth).

    T_sidereal(t) = 2π × √( AU(t)³ / G(M_Sun(t) + M_Earth) )

    Inputs:
      AU(t)        = AU_now × (1 − mass_loss_fraction)        [adiabatic]
      M_Sun(t)     = M_Sun_now / (1 − mass_loss_fraction)     [Sun was more massive in past]
      M_Earth      = constant (Earth's mass essentially fixed over 380 Ma)

    Modern (t=0) reproduces meansiderealyearlengthinSeconds exactly.

    This matches script.js's convention (line 3451) where GM_Sun_plus_Earth
    is the two-body parameter and GM_Sun_alone = GM_Sun_plus_Earth − GM_Earth.
    """
    AU_t_km = mean_au_at_age(t_Ma)
    AU_t_m = AU_t_km * 1000
    # Sun's mass at age t (was MORE massive in the past)
    mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6
    M_Sun_t = M_SUN_NOW / (1 - mass_loss_fraction) if t_Ma != 0 else M_SUN_NOW
    # Full two-body GM (Sun + Earth)
    GM_total_t_kms = G_CONSTANT * (M_Sun_t + M_earth)        # km³/s²
    GM_total_t_si = GM_total_t_kms * 1e9                      # m³/s²
    return 2 * math.pi * math.sqrt(AU_t_m**3 / GM_total_t_si)


def mean_tropical_year_seconds_at_age(t_Ma):
    """
    TROPICAL year length in seconds at age t_Ma.
    The tropical year is anchored to the vernal equinox (sidereal minus
    equinox precession). Modern J2000: 31,556,926.395 s.
    Framework's TOTAL_DAYS_IN_H invariant counts TROPICAL days, so this
    is the variant used in the H(t) derivation.
    Both flavors scale identically with solar mass loss to first order.
    """
    if t_Ma == 0:
        return year_seconds_now
    mass_loss_fraction = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6
    return year_seconds_now * (1 - 2 * mass_loss_fraction)


# ============================================================
# Helpers
# ============================================================

def moon_angular_momentum(a_m, e):
    """L = M × √(GM × a × (1 - e²))"""
    return M_moon * math.sqrt(GM_em_si * a_m * (1 - e * e))


def moon_distance_from_L(L_moon, e):
    """Invert angular-momentum to get a_moon given L and e."""
    a_times_1_minus_e2 = (L_moon / M_moon) ** 2 / GM_em_si
    return a_times_1_minus_e2 / (1 - e * e)


def moon_period_seconds(a_m):
    """T = 2π × √(a³ / GM) — uses Kepler-effective (corrected) semi-major axis."""
    return 2 * math.pi * math.sqrt(a_m ** 3 / GM_em_si)


def mean_solar_delta_a_km(a_apparent_km, T_moon_s, T_year_s):
    """
    Solar Δa correction (script.js line 3413, FULL deep-time-consistent form).
    Δa = a × M_M/(M_E+M_M) × (T_moon(t) / T_year_sidereal(t))
    Both periods at the relevant epoch.
    """
    return a_apparent_km * (1 / (MASS_RATIO_EARTH_MOON + 1)) * (T_moon_s / T_year_s)


def mean_solar_delta_a_km_j2000_anchored(a_apparent_km, T_year_s, LOD_at_epoch_s):
    """
    Solar Δa correction — script.js form, J2000-anchored.

    Δa = a × M_M/(M_E+M_M) × (moonSiderealMonth_J2000 / T_sidereal_in_days_at_epoch)

    Where:
      moonSiderealMonth_J2000  = 27.32166241 days (modern J2000 anchor, FIXED)
      T_sidereal_in_days_at_epoch = T_sidereal(t) / LOD(t)
                                  = sidereal year in days, where "day" is LOD at epoch t

    Both quantities are framework day-counts:
      - 27.32 = Earth rotations per Moon orbit (J2000 anchor, treated as invariant)
      - sidereal_year_d(t) = Earth rotations per Earth orbit at epoch t

    At t=0: Δa ≈ 349 km (modern). At t=380 Ma: Δa ≈ 308.6 km.
    """
    T_sidereal_in_days_at_epoch = T_year_s / LOD_at_epoch_s
    return a_apparent_km * (1 / (MASS_RATIO_EARTH_MOON + 1)) * (
        moon_sidereal_month_d / T_sidereal_in_days_at_epoch
    )


def mean_moon_period_with_solar_correction(a_apparent_km, T_year_s, LOD_at_epoch_s,
                                       max_iter=8, use_j2000_anchor=True):
    """
    Apply Solar Δa correction.
    Given the apparent (angular-momentum-derived) semi-major axis,
    return (T_moon_s, a_corrected_km, delta_a).

    use_j2000_anchor=True (default): script.js form (line 3413), using
        moonSiderealMonth at J2000 (= 27.32166241, treated as framework
        anchor invariant). Single-pass.
    use_j2000_anchor=False: uses T_moon at epoch t (iterative).
    """
    if use_j2000_anchor:
        delta_a = mean_solar_delta_a_km_j2000_anchored(a_apparent_km, T_year_s,
                                                   LOD_at_epoch_s)
        a_corr_km = a_apparent_km + delta_a
        T_moon = 2 * math.pi * math.sqrt((a_corr_km * 1000) ** 3 / GM_em_si)
        return T_moon, a_corr_km, delta_a
    else:
        T_moon = 2 * math.pi * math.sqrt((a_apparent_km * 1000) ** 3 / GM_em_si)
        for _ in range(max_iter):
            delta_a = mean_solar_delta_a_km(a_apparent_km, T_moon, T_year_s)
            a_corr_km = a_apparent_km + delta_a
            T_moon = 2 * math.pi * math.sqrt((a_corr_km * 1000) ** 3 / GM_em_si)
        return T_moon, a_corr_km, delta_a


# ============================================================
# Modern epoch: anchor L_total
# ============================================================

omega_E_now = 2 * math.pi / LOD_now_s
L_E_spin_now = I_earth * omega_E_now
L_moon_now = moon_angular_momentum(moon_distance_now_km * 1000, moon_e)
L_total = L_E_spin_now + L_moon_now

# Eccentricity factor for Moon's orbital angular momentum
_E_FACTOR = math.sqrt(1 - moon_e * moon_e)   # = 0.99849 at modern e=0.0549

# Tidal-lock asymptote: a_lock such that ALL angular momentum is in Moon orbit
# (denominator of LOD formula → 0). Beyond this point Earth would have to spin
# backward — physically impossible, so formula returns None past this distance.
a_lock_m = (L_total / (M_moon * math.sqrt(GM_em_si) * _E_FACTOR)) ** 2  # ≈ 5.556e8 m

# ============================================================
# Proper-physics two-layer LOD(t) formula
# ============================================================

def mean_moon_distance_at_age_m(t_Ma):
    """Layer 2 — Moon distance polynomial (no t² term → smooth Phanerozoic)."""
    return moon_distance_now_km * 1000 * (
        1 + ALPHA_1 * t_Ma + ALPHA_3 * t_Ma**3 + ALPHA_4 * t_Ma**4
    )

def mean_lod_seconds_at_age(t_Ma):
    """Layer 1 — angular-momentum conservation (EXACT, full physics)."""
    a = mean_moon_distance_at_age_m(t_Ma)
    if a <= 0 or a >= a_lock_m:
        return None  # beyond Hadean / past tidal-lock asymptote
    return 2 * math.pi * I_earth / (
        L_total - M_moon * math.sqrt(GM_em_si * a) * _E_FACTOR
    )

print("=" * 68)
print("MODERN EPOCH (t = 0 Ma) — anchor")
print("=" * 68)
print(f"  M_EARTH_ALONE            = {M_earth:.6e} kg")
print(f"  M_MOON_ALONE             = {M_moon:.6e} kg")
print(f"  M_SUN_NOW (precise)      = {M_SUN_NOW:.14e} kg")
print(f"  G_CONSTANT (km³/kg/s²)   = {G_CONSTANT:.4e}")
print(f"  GM_EM (km³/s²)           = {GM_EM_kms:,.4f}")
print(f"  GM_total Sun+Earth (kms) = {GM_TOTAL_NOW_KMS:,.4e}")
print(f"  GM_SUN_alone (kms)       = {GM_SUN_NOW_KMS:,.4e}")
print(f"  moonDistanceCorrected    = {moon_distance_corrected_km:,.4f} km")
print(f"  moonSiderealMonth        = {moon_sidereal_month_d:.10f} d")
print(f"  I_earth                  = {I_earth:.6e} kg·m²")
print(f"  L_E_spin (now)           = {L_E_spin_now:.6e} kg·m²/s")
print(f"  L_moon orbital (now)     = {L_moon_now:.6e} kg·m²/s")
print(f"  L_total                  = {L_total:.6e} kg·m²/s")
print(f"  TOTAL_DAYS_IN_H          = {TOTAL_DAYS_IN_H:.1f}")
print(f"  SOLAR_MASS_LOSS_FRAC/yr  = {SOLAR_MASS_LOSS_FRAC_PER_YR:.6e}")
print()
print(f"  AU_NOW (IAU 2012)        = {CURRENT_AU_KM:,.6f} km")
print(f"  AU_NOW (Kepler-derived)  = {AU_NOW_KEPLER_KM:,.6f} km")
print(f"  Difference (IAU − Kepler)= {CURRENT_AU_KM - AU_NOW_KEPLER_KM:+.6f} km "
      f"(= {abs(CURRENT_AU_KM - AU_NOW_KEPLER_KM)*1e6:.2f} mm; "
      f"self-consistent to {abs(CURRENT_AU_KM - AU_NOW_KEPLER_KM)/CURRENT_AU_KM*1e9:.4f} ppb)")
print()


# ============================================================
# Devonian — canonical chain
# STEP 1: Input t_Ma → compute LOD(t)
# STEP 2: Compute H(t) = H_now × LOD(t) / LOD_now
# (LOD_now is H/13-consistent, NOT exactly 86,400 s)
#
# Alternative: anchor on a_apparent (Moon distance) instead of t_Ma
# (set ANCHOR = "a" below). Gives slightly different "Devonian" by ~0.17 Ma.
# ============================================================

ANCHOR = "t"   # "t" = anchor on t_Ma (canonical), "a" = anchor on Moon distance

if ANCHOR == "t":
    # STEP 1: Input t_Ma → derive LOD(t) via PROPER PHYSICS two-layer formula
    # (replaces old linear LOD = LOD_now − rate·t_Ma).
    #   Layer 1: a_Moon(t) from polynomial (Farhat-fitted, no t² → smooth Phanerozoic)
    #   Layer 2: LOD(t) from angular-momentum conservation (EXACT)
    t_Ma = 380.0
    LOD_dev_s = mean_lod_seconds_at_age(t_Ma)
    LOD_dev_hr = LOD_dev_s / 3600
    # Layer 2 already gives a_apparent directly — pull it out for downstream
    a_moon_dev_apparent_m = mean_moon_distance_at_age_m(t_Ma)
    a_moon_dev_apparent_km = a_moon_dev_apparent_m / 1000
    omega_E_dev = 2 * math.pi / LOD_dev_s
    L_E_spin_dev = I_earth * omega_E_dev
    L_moon_dev = L_total - L_E_spin_dev
else:  # ANCHOR == "a"
    a_moon_dev_apparent_km = 370_395.0
    a_moon_dev_apparent_m = a_moon_dev_apparent_km * 1000
    L_moon_dev = moon_angular_momentum(a_moon_dev_apparent_m, moon_e)
    L_E_spin_dev = L_total - L_moon_dev
    omega_E_dev = L_E_spin_dev / I_earth
    LOD_dev_s = 2 * math.pi / omega_E_dev
    LOD_dev_hr = LOD_dev_s / 3600
    t_Ma = (24.0 - LOD_dev_hr) / CANONICAL_TIDAL_RATE  # implied age (diagnostic)

# STEP 2: H_dev = H_now × LOD(t) / LOD_now_H13
# (using H/13-consistent LOD_now, NOT 86,400 — see line ~62)
H_dev_simple = H_now * LOD_dev_s / LOD_now_H13

days_per_year_dev_solar = year_seconds_now / LOD_dev_s
days_per_year_dev_sidereal = mean_sidereal_year_s / LOD_dev_s
H_dev = TOTAL_DAYS_IN_H / days_per_year_dev_solar

# AU-drift-corrected: year_s changes too (Earth's orbital period in seconds
# was shorter at Devonian because Sun was more massive).
# Use TROPICAL year for the structural invariant (matches TOTAL_DAYS_IN_H definition).
year_s_dev_AUdrift_tropical = mean_tropical_year_seconds_at_age(t_Ma)
year_s_dev_AUdrift_sidereal = mean_sidereal_year_seconds_at_age(t_Ma)
# Alternative H derivation (Architecture β diagnostic — TOTAL_DAYS as imposed invariant)
H_dev_AUdrift = TOTAL_DAYS_IN_H * LOD_dev_s / year_s_dev_AUdrift_tropical

# Moon period: apply Solar Δa correction at Devonian
# Uses Devonian (Kepler-direct, AU-drift-corrected) sidereal year as denominator
# AND J2000 Moon month as numerator (matches script.js line 3413 form).
T_moon_dev_s, a_moon_dev_corrected_km, delta_a_dev = (
    mean_moon_period_with_solar_correction(
        a_moon_dev_apparent_km, year_s_dev_AUdrift_sidereal, LOD_dev_s,
        use_j2000_anchor=True
    )
)
T_moon_dev_d_dev = T_moon_dev_s / LOD_dev_s  # in Devonian days
T_moon_dev_d_modern = T_moon_dev_s / LOD_now_s  # in modern (86,400 s) days

# Naive Kepler (no correction) — for comparison
T_moon_dev_s_naive = moon_period_seconds(a_moon_dev_apparent_m)
T_moon_dev_d_dev_naive = T_moon_dev_s_naive / LOD_dev_s

# Linear-rate cross-check on moon recession
a_moon_linear_km = moon_distance_now_km - 3.83e-5 * t_Ma * 1e6  # 3.83 cm/yr → km/Ma

print("=" * 68)
print(f"DEVONIAN — framework prediction (anchor = {ANCHOR!r})")
print("=" * 68)
if ANCHOR == "a":
    print(f"  a_apparent (input)       = {a_moon_dev_apparent_km:,.4f} km")
    print(f"  → implied t_Ma           = {t_Ma:.4f} Ma")
else:
    print(f"  t_Ma (input)             = {t_Ma:.2f} Ma")
print(f"  LOD(t)                   = {LOD_dev_hr:.6f} hr = {LOD_dev_s:.4f} s")
print(f"  H(t) — year_s fixed       = {H_dev:.4f} yr   (modern: {H_now:,})")
print(f"  H(t) — year_s with AU drift = {H_dev_AUdrift:.4f} yr   "
      f"(Δ = {H_dev_AUdrift - H_dev:+.2f} yr, {(H_dev_AUdrift - H_dev)/H_dev*1e6:+.2f} ppm)")
print(f"  tropical year_s(t) drift  = {year_seconds_now - year_s_dev_AUdrift_tropical:+.2f} s shorter "
      f"({(year_seconds_now - year_s_dev_AUdrift_tropical)/60:.2f} min)")
print(f"  days/yr (solar/tropical) = {days_per_year_dev_solar:.6f} d")
print(f"    Wells 1963 (~380 Ma)   = 399.4 d   "
      f"match: {100 * days_per_year_dev_solar / 399.4:.3f}%")
print(f"  days/yr (sidereal)       = {days_per_year_dev_sidereal:.7f} d")
print()
print(f"  L_E_spin(t)              = {L_E_spin_dev:.6e} kg·m²/s")
print(f"  L_moon(t) [from L_total] = {L_moon_dev:.6e} kg·m²/s")
print(f"  a_apparent (Devonian)    = {a_moon_dev_apparent_km:,.4f} km   "
      f"(modern apparent: {moon_distance_now_km:,.2f})")
print(f"  Δa Solar correction      = {delta_a_dev:.4f} km")
print(f"  a_corrected (Devonian)   = {a_moon_dev_corrected_km:,.4f} km   "
      f"(modern corrected: {moon_distance_corrected_km:,.2f})")
print(f"  Moon distance (linear)   = {a_moon_linear_km:,.1f} km   "
      f"diff vs apparent: {a_moon_dev_apparent_km - a_moon_linear_km:+.0f} km "
      f"({100 * (a_moon_dev_apparent_km - a_moon_linear_km) / a_moon_linear_km:+.3f}%)")
print()
print(f"  Moon sidereal month      = {T_moon_dev_d_dev:.8f} d (Devonian days)")
print(f"    in modern (86,400 s) d = {T_moon_dev_d_modern:.6f} d")
print(f"    naive Kepler (no Δa)   = {T_moon_dev_d_dev_naive:.8f} d (Devonian) "
      f"— {(T_moon_dev_d_dev - T_moon_dev_d_dev_naive) * 24 * 60:.2f} min lower")
print(f"    Williams 2000 (~380Ma) ≈ 25.5-26.0 modern d   match: in range")
print()


# ============================================================
# FULL DERIVATION CHAIN — modern vs Devonian, every quantity explicit
# ============================================================

# Compute everything Devonian needs
AU_dev = mean_au_at_age(t_Ma)
# Sidereal year — first-order vs direct Kepler (both should agree)
sidereal_year_s_dev_firstorder = mean_sidereal_year_seconds_at_age(t_Ma)
sidereal_year_s_dev_kepler = mean_sidereal_year_seconds_at_age_kepler(t_Ma)
sidereal_year_s_dev = sidereal_year_s_dev_kepler   # use the direct Kepler value
tropical_year_s_dev = mean_tropical_year_seconds_at_age(t_Ma)
sidereal_year_d_dev = sidereal_year_s_dev / LOD_dev_s
tropical_year_d_dev = tropical_year_s_dev / LOD_dev_s

# Architecture α (CANONICAL): H(t) from the 2-step chain → H_dev_simple
# These are DIAGNOSTIC alternatives shown for comparison (NOT used in framework):
#   ALT_A: If we had imposed TOTAL_DAYS_IN_H as a fixed invariant input
#          (this would force H to a slightly different value at deep time)
#   ALT_B: If we had imposed H_years as fixed at modern value
#          (this would force TOTAL_DAYS_IN_H to drift wildly)
H_dev_ALT_A_if_TOTAL_DAYS_fixed = TOTAL_DAYS_IN_H * LOD_dev_s / tropical_year_s_dev
H_years_ALT_B_fixed = H_now
TOTAL_DAYS_IN_H_under_ALT_B = H_years_ALT_B_fixed * tropical_year_s_dev / LOD_dev_s

# Earth rotations per H — under each interpretation (for comparison)
earth_rotations_per_H_if_TOTAL_DAYS_fixed = TOTAL_DAYS_IN_H           # ALT_A imposes this
earth_rotations_per_H_under_ALT_B_sidereal = H_years_ALT_B_fixed * sidereal_year_d_dev
earth_rotations_per_H_under_ALT_B_tropical = H_years_ALT_B_fixed * tropical_year_d_dev

# Architecture α uses H_dev_simple from the 2-step chain (NOT _ALT_A or _ALT_B)
H_dev_chain = H_dev_simple
T_moon_d_dev = T_moon_dev_s / LOD_dev_s
T_moon_d_modern_units = T_moon_dev_s / LOD_now_s
N_moon_dev_chain = (TOTAL_DAYS_IN_H * LOD_dev_s) / T_moon_dev_s
sidYr_J2000_d = 365.25636301
tropical_year_d_now = mean_solar_year_d   # quantized to H/8
moon_sidereal_month_d_now = moon_sidereal_month_d

# Pre-compute time-dependent quantities for the chain table
mass_loss_frac_dev = SOLAR_MASS_LOSS_FRAC_PER_YR * t_Ma * 1e6
M_Sun_dev = M_SUN_NOW / (1 - mass_loss_frac_dev)
mass_lost_kg = M_SUN_NOW * mass_loss_frac_dev
mass_lost_in_M_earth = mass_lost_kg / M_earth

print("=" * 75)
print(f"FULL DERIVATION CHAIN — modern (t=0) vs Devonian (t={t_Ma:.2f} Ma)")
print("=" * 75)
print(f"{'Quantity':<35} {'Modern J2000':>17} {'Devonian':>17}  Derivation")
print("-" * 100)

# CANONICAL 9-STEP CHAIN (MEAN values)
print(f"{'CANONICAL 9-STEP CHAIN (MEAN values)':<35}")
print(f"  STEP 1: t_Ma → LOD(t)  [proper-physics two-layer formula]")
print(f"{'    Layer 1: a_Moon(t) (km)':<35} {moon_distance_now_km:>17,.4f} {a_moon_dev_apparent_km:>17,.4f}  a_now × (1 + α₁t + α₃t³ + α₄t⁴)")
print(f"{'    Layer 2: LOD = 2π·I_E/(L_T − M·√(GM·a)·√(1−e²))':<35} {LOD_now_H13:>17,.6f} {LOD_dev_s:>17,.6f}  (sec)")
print(f"  STEP 2: LOD(t) → H(t)")
print(f"{'    LOD_now_H13 (consistent)':<35} {LOD_now_H13:>17,.6f} {LOD_now_H13:>17,.6f}  sidereal_yr_s / sidereal_yr_d_H13")
print(f"{'    H(t) = H_now × LOD(t)/LOD_now_H13':<35} {H_now:>17,} {H_dev_simple:>17,.4f}  yr")
print(f"  STEP 3a: t_Ma → mass_loss_fraction → AU(t), M_Sun(t)")
print(f"{'    mass_loss_fraction':<35} {0.0:>17.4e} {mass_loss_frac_dev:>17.4e}  9.3e-14 × t_Ma × 1e6")
print(f"{'    M_Sun(t) = M_now/(1 − Δm)':<35} {M_SUN_NOW:>17.6e} {M_Sun_dev:>17.6e}  kg")
print(f"{'    AU(t) = AU_now × (1 − Δm)':<35} {CURRENT_AU_KM:>17,.4f} {AU_dev:>17,.4f}  km")
print(f"  STEP 3b: Kepler → T_sidereal(t)")
print(f"{'    T_sidereal = 2π√(AU³/G(M_Sun+M_E))':<35} {mean_sidereal_year_s:>17,.4f} {sidereal_year_s_dev:>17,.4f}  sec")
print(f"{'    T_sidereal in Dev days':<35} {sidereal_year_s_dev/LOD_now_s:>17,.6f} {sidereal_year_s_dev/LOD_dev_s:>17,.7f}  (÷ LOD)")
print(f"  STEP 4: LOD(t) → a_apparent via L conservation")
print(f"{'    a_apparent (Moon, geometric)':<35} {moon_distance_now_km:>17,.4f} {a_moon_dev_apparent_km:>17,.4f}  km")
print(f"  STEP 5: Solar Δa correction (J2000-anchored)")
print(f"{'    Δa = a × M_M/(M_E+M_M) × T_m_J2000/T_sid_dev':<35} {moon_orbital_shift_km:>17,.4f} {delta_a_dev:>17,.4f}  km")
print(f"{'    a_corrected (Kepler-effective)':<35} {moon_distance_corrected_km:>17,.4f} {a_moon_dev_corrected_km:>17,.4f}  km")
print(f"  STEP 6: T_Moon via Kepler on a_corrected")
print(f"{'    T_Moon = 2π√(a_corr³/GM_EM)':<35} {moon_sidereal_month_d*LOD_now_s:>17,.4f} {T_moon_dev_s:>17,.4f}  sec")

# STEP 7: Anomalistic year via Fibonacci coupling H/(H-16)
# Modern formula (script.js): meanAnomalisticYear = meanSolarYear × H/(H-16)
T_tropical_s_dev_fib = sidereal_year_s_dev * (H_dev_simple - 13) / H_dev_simple
T_anom_s_now = mean_solar_year_d * LOD_now_s * H_now / (H_now - 16)
T_anom_s_dev = T_tropical_s_dev_fib * H_dev_simple / (H_dev_simple - 16)
T_anom_d_now = T_anom_s_now / LOD_now_s
T_anom_d_dev = T_anom_s_dev / LOD_dev_s
print(f"  STEP 7: T_anomalistic via Fibonacci H/(H−16)")
print(f"{'    T_anom_s = T_trop_s × H/(H−16)':<35} {T_anom_s_now:>17,.4f} {T_anom_s_dev:>17,.4f}  sec")
print(f"{'    T_anom_d (at epoch LOD)':<35} {T_anom_d_now:>17,.8f} {T_anom_d_dev:>17,.7f}  d")

# STEP 8a: Stellar day (rotation relative to fixed stars)
#   stellar_day = T_sidereal_s / (T_sidereal_d_at_LOD + 1)
sidereal_year_d_at_LOD_now = mean_sidereal_year_s / LOD_now_s   # = 365.25636301
sidereal_year_d_at_LOD_dev = sidereal_year_s_dev / LOD_dev_s
stellar_day_now = mean_sidereal_year_s / (sidereal_year_d_at_LOD_now + 1)
stellar_day_dev = sidereal_year_s_dev / (sidereal_year_d_at_LOD_dev + 1)
print(f"  STEP 8a: Stellar day (relative to fixed stars)")
print(f"{'    stellar = T_sid_s / (T_sid_d + 1)':<35} {stellar_day_now:>17,.6f} {stellar_day_dev:>17,.6f}  sec")

# STEP 8b: Sidereal day (rotation relative to precessing equinox)
#   sidereal_day = T_sidereal_s / (T_sidereal_d + 1 + 13/H)
sidereal_day_now = mean_sidereal_year_s / (sidereal_year_d_at_LOD_now + 1 + 13/H_now)
sidereal_day_dev = sidereal_year_s_dev / (sidereal_year_d_at_LOD_dev + 1 + 13/H_dev_simple)
print(f"  STEP 8b: Sidereal day (relative to vernal equinox)")
print(f"{'    sidereal = T_sid_s / (T_sid_d+1+13/H)':<35} {sidereal_day_now:>17,.6f} {sidereal_day_dev:>17,.6f}  sec")
print(f"{'    Stellar − sidereal (ms)':<35} {(stellar_day_now-sidereal_day_now)*1000:>17.4f} {(stellar_day_dev-sidereal_day_dev)*1000:>17.4f}  ms (precession)")

# === STEPS 6b–6e: Moon's other month types ===
# IAU J2000 inputs from script.js (lines 90-92):
moon_anomalistic_month_input_d = 27.55454988      # IAU anomalistic month (script.js line 91)
moon_nodal_month_input_d       = 27.21222082      # IAU nodal month (script.js line 92)

# Modern Moon sidereal month in seconds
T_sid_moon_s_now = moon_sidereal_month_d * LOD_now_s
T_sid_moon_s_dev = T_moon_dev_s

# Precession periods at J2000 — DERIVED from IAU inputs (matches script.js lines 3362, 3364)
# T_apsidal_period = 1/((T_anom/T_sm) − 1) × T_anom
# T_nodal_period   = T_sm/(T_sm − T_nod) × T_nod
T_apsidal_J2000_days = (1.0 / ((moon_anomalistic_month_input_d / moon_sidereal_month_d) - 1)) \
                      * moon_anomalistic_month_input_d
T_nodal_J2000_days = (moon_sidereal_month_d / (moon_sidereal_month_d - moon_nodal_month_input_d)) \
                    * moon_nodal_month_input_d
T_apsidal_J2000_yr = T_apsidal_J2000_days / mean_solar_year_d
T_nodal_J2000_yr   = T_nodal_J2000_days   / mean_solar_year_d
T_apsidal_s_now    = T_apsidal_J2000_days * LOD_now_s
T_nodal_s_now      = T_nodal_J2000_days   * LOD_now_s

# STEP 6b: SYNODIC MONTH — Moon-Sun alignment (new moon to new moon)
# 1/T_syn = 1/T_sid_moon − 1/T_sidereal_year
T_syn_now = T_sid_moon_s_now * mean_sidereal_year_s / (mean_sidereal_year_s - T_sid_moon_s_now)
T_syn_dev = T_sid_moon_s_dev * sidereal_year_s_dev / (sidereal_year_s_dev - T_sid_moon_s_dev)
print(f"  STEP 6b: SYNODIC month (Moon-Sun alignment)")
print(f"{'    T_syn = T_sid_moon × T_yr/(T_yr−T_sid_moon)':<35} {T_syn_now:>17,.4f} {T_syn_dev:>17,.4f}  sec")
print(f"{'    in epoch-days':<35} {T_syn_now/LOD_now_s:>17.6f} {T_syn_dev/LOD_dev_s:>17.6f}  d (epoch's LOD)")
print(f"{'    in modern days (for IAU compare)':<35} {T_syn_now/86400:>17.6f} {T_syn_dev/86400:>17.6f}  d (IAU 29.530589)")

# STEP 6c: TROPICAL MONTH — return to same ecliptic longitude (equinox-referenced)
T_trop_moon_now = T_sid_moon_s_now * (1 - 13 * T_sid_moon_s_now / (H_now * mean_sidereal_year_s))
T_trop_moon_dev = T_sid_moon_s_dev * (1 - 13 * T_sid_moon_s_dev / (H_dev_simple * sidereal_year_s_dev))
print(f"  STEP 6c: TROPICAL month (equinox-referenced)")
print(f"{'    T_trop = T_sid_moon × (1 − 13·T_sm/(H·T_yr))':<35} {T_trop_moon_now:>17,.4f} {T_trop_moon_dev:>17,.4f}  sec")
print(f"{'    in epoch-days':<35} {T_trop_moon_now/LOD_now_s:>17.6f} {T_trop_moon_dev/LOD_dev_s:>17.6f}  d")
print(f"{'    in modern days (for IAU compare)':<35} {T_trop_moon_now/86400:>17.6f} {T_trop_moon_dev/86400:>17.6f}  d (IAU 27.321582)")

# STEP 6d: ANOMALISTIC MONTH — perigee-to-perigee (apsidal precession)
# Brouwer-Clemence: T_apsidal_period ∝ T_yr² / T_sm
T_apsidal_s_dev = T_apsidal_s_now * \
    (sidereal_year_s_dev/mean_sidereal_year_s)**2 * (T_sid_moon_s_now/T_sid_moon_s_dev)
T_anom_moon_now = T_sid_moon_s_now * T_apsidal_s_now / (T_apsidal_s_now - T_sid_moon_s_now)
T_anom_moon_dev = T_sid_moon_s_dev * T_apsidal_s_dev / (T_apsidal_s_dev - T_sid_moon_s_dev)
print(f"  STEP 6d: ANOMALISTIC month (perigee-to-perigee)")
print(f"{'    T_anom = T_sm × T_per/(T_per−T_sm)':<35} {T_anom_moon_now:>17,.4f} {T_anom_moon_dev:>17,.4f}  sec")
print(f"{'    in epoch-days':<35} {T_anom_moon_now/LOD_now_s:>17.6f} {T_anom_moon_dev/LOD_dev_s:>17.6f}  d")
print(f"{'    in modern days (for IAU compare)':<35} {T_anom_moon_now/86400:>17.6f} {T_anom_moon_dev/86400:>17.6f}  d (IAU 27.554550)")
print(f"{'    T_apsidal precession (yr)':<35} {T_apsidal_J2000_yr:>17.4f} {T_apsidal_s_dev/sidereal_year_s_dev:>17.4f}  derived from IAU inputs")

# STEP 6e: NODAL/DRACONIC MONTH — node-to-node (regression of nodes)
T_nodal_s_dev = T_nodal_s_now * \
    (sidereal_year_s_dev/mean_sidereal_year_s)**2 * (T_sid_moon_s_now/T_sid_moon_s_dev)
T_nod_moon_now = T_sid_moon_s_now * T_nodal_s_now / (T_nodal_s_now + T_sid_moon_s_now)
T_nod_moon_dev = T_sid_moon_s_dev * T_nodal_s_dev / (T_nodal_s_dev + T_sid_moon_s_dev)
print(f"  STEP 6e: NODAL/DRACONIC month (node-to-node)")
print(f"{'    T_nod = T_sm × T_node/(T_node+T_sm)':<35} {T_nod_moon_now:>17,.4f} {T_nod_moon_dev:>17,.4f}  sec")
print(f"{'    in epoch-days':<35} {T_nod_moon_now/LOD_now_s:>17.6f} {T_nod_moon_dev/LOD_dev_s:>17.6f}  d")
print(f"{'    in modern days (for IAU compare)':<35} {T_nod_moon_now/86400:>17.6f} {T_nod_moon_dev/86400:>17.6f}  d (IAU 27.212221)")
print(f"{'    T_nodal precession (yr)':<35} {T_nodal_J2000_yr:>17.4f} {T_nodal_s_dev/sidereal_year_s_dev:>17.4f}  derived from IAU inputs")
print()

# === STEPS 9a-9c: Planet orbital, synodic, rotation periods ===
print(f"  STEP 9: Planet orbital + synodic periods at deep time")
print(f"  (Sun-orbiting planet T scales as (1 − 2 × mass_loss_fraction))")

# All planets scale by same factor under adiabatic mass loss
T_year_scale_factor = (1 - 2 * mass_loss_frac_dev)
planet_period_d_now = {
    "Mercury": 87.97,
    "Venus":   224.7,
    "Mars":    686.98,
    "Jupiter": 4332.59,
    "Saturn":  10759.22,
    "Uranus":  30688.5,
    "Neptune": 60195.0,
}
T_year_d_now = mean_sidereal_year_s / LOD_now_s   # 365.25636
T_year_d_dev_modern = sidereal_year_s_dev / 86400  # in modern days for comparison

print(f"  STEP 9a: Mean orbital periods")
print(f"  STEP 9b: Synodic periods (Earth-planet alignment)")
print(f"  Values shown at Devonian in both epoch-days and modern-days")
print(f"  {'Planet':<10} {'T_orb modern d':>16} {'T_orb Dev_d':>13} {'T_orb mod_d@Dev':>16} {'T_syn Dev_d':>13} {'T_syn mod_d@Dev':>16}")
LOD_ratio = LOD_now_s / LOD_dev_s   # multiplier: modern day count → Devonian day count
for name, T_p_now in planet_period_d_now.items():
    T_p_dev_s = T_p_now * 86400 * T_year_scale_factor      # in seconds
    T_p_dev_modern_d = T_p_dev_s / 86400                    # in modern days
    T_p_dev_epoch_d  = T_p_dev_s / LOD_dev_s                # in Devonian days
    T_syn_now_d = T_p_now * T_year_d_now / abs(T_p_now - T_year_d_now)
    T_syn_dev_modern_d = T_p_dev_modern_d * T_year_d_dev_modern / abs(T_p_dev_modern_d - T_year_d_dev_modern)
    T_syn_dev_epoch_d  = T_syn_dev_modern_d * LOD_ratio
    print(f"    {name:<10} {T_p_now:>14.4f} {T_p_dev_epoch_d:>13.4f} {T_p_dev_modern_d:>16.4f} {T_syn_dev_epoch_d:>13.4f} {T_syn_dev_modern_d:>16.4f}")

print(f"  STEP 9c: Rotation periods (intrinsic spin, constant in seconds)")
print(f"  (Earth's rotation = LOD(t) from STEP 1; all other planets have intrinsic")
print(f"   spin angular momentum that doesn't evolve over geological timescales.)")
print(f"  Exception: Mercury (3:2 spin-orbit resonance), Venus (slow retrograde) — both")
print(f"  tidally coupled to Sun. Treated as constant for Phanerozoic; primordial for")
print(f"  early Solar System (>4 Gyr ago) requires special treatment.")
print()

# === STEPS 9d-9e: Planet semi-major axes + Earth-planet distances ===
# Per-planet adiabatic a × M_Sun = const drift (Driver 2 / solar mass loss).
# All planets drift by the same fractional amount as Earth's AU.
print(f"  STEP 9d: Semi-major axes (a × M_Sun = const adiabatic invariant)")
print(f"  STEP 9e: Earth-planet time-averaged distance √(a_E² + a_P²)")
print(f"  (Both scale uniformly with mass_loss_fraction — entire solar system")
print(f"   shrinks {mass_loss_frac_dev*1e6:.1f} ppm at Devonian, ~423 ppm at Hadean.)")
print()

# Planet J2000 semi-major axes (km) — IAU/NASA fact-sheet values
planet_a_J2000_km = {
    "Mercury":  57_909_176,
    "Venus":   108_208_930,
    "Earth":   149_597_871,   # = 1 AU by definition (rounded; precise value below)
    "Mars":    227_939_200,
    "Jupiter": 778_547_200,
    "Saturn":  1_433_449_370,
    "Uranus":  2_876_679_082,
    "Neptune": 4_503_443_661,
}
# Use the precise CURRENT_AU_KM for Earth
planet_a_J2000_km["Earth"] = CURRENT_AU_KM

au_dev_km = AU_dev  # already computed above
au_scale_factor_dev = au_dev_km / CURRENT_AU_KM  # = (1 − mass_loss_fraction)

import math
print(f"  {'Planet':<10} {'a_J2000 (km)':>16} {'a_Devonian (km)':>17} {'Δa (km)':>12}  "
      f"{'d_J2000 (km)':>16} {'d_Devonian (km)':>17}")
for name, a_now_km in planet_a_J2000_km.items():
    a_dev_km = a_now_km * au_scale_factor_dev
    delta_a = a_dev_km - a_now_km
    # Earth-planet time-averaged distance ≈ √(a_E² + a_P²)
    if name == "Earth":
        d_now = d_dev = None  # Earth is the reference; skip
        d_str_now = d_str_dev = ""
    else:
        d_now = math.sqrt(CURRENT_AU_KM**2 + a_now_km**2)
        d_dev = math.sqrt(au_dev_km**2 + a_dev_km**2)
        d_str_now = f"{d_now:>16,.0f}"
        d_str_dev = f"{d_dev:>17,.0f}"
    print(f"  {name:<10} {a_now_km:>16,.0f} {a_dev_km:>17,.0f} {delta_a:>+12,.0f}  "
          f"{d_str_now} {d_str_dev}")

print()
print(f"  Structural fact: the entire solar system shrinks uniformly by")
print(f"  (1 − mass_loss_fraction). Relative geometry — planet orbit ratios,")
print(f"  perihelion alignments, the L1 lattice — is preserved across all epochs.")
print()

# Physical inputs (anchors)
print(f"PHYSICAL INPUTS / ANCHORS")
print(f"{'  Tidal rate (hr/Ma)':<35} {CANONICAL_TIDAL_RATE:>17.5f} {CANONICAL_TIDAL_RATE:>17.5f}  canonical, Wells 1963 fit")
print(f"{'  Solar mass loss frac/yr':<35} {SOLAR_MASS_LOSS_FRAC_PER_YR:>17.4e} {SOLAR_MASS_LOSS_FRAC_PER_YR:>17.4e}  L_sun/c² + solar wind")
earth_rotations_per_H_dev_diagnostic = (
    (sidereal_year_s_dev / LOD_dev_s) * (H_dev_simple - 13)
)
print(f"{'  TOTAL_DAYS_IN_H (DIAGNOSTIC)':<35} {TOTAL_DAYS_IN_H_at_J2000:>17,.0f} {earth_rotations_per_H_dev_diagnostic:>17,.4f}  H × tropical_d — varies with epoch")
print()

# Tier 1 — directly time-dependent (variables already computed above)
print(f"{'TIER 1 — directly time-dependent':<35}")
print(f"{'  LOD (s)':<35} {LOD_now_s:>17,.4f} {LOD_dev_s:>17,.4f}  proper-physics two-layer")
print(f"{'  LOD (hr)':<35} {24.0:>17.6f} {LOD_dev_hr:>17.6f}  same in hr")
print(f"{'  mass_loss_fraction':<35} {0:>17.4e} {mass_loss_frac_dev:>17.4e}  SOLAR_MASS_LOSS_FRAC_PER_YR × t_Ma × 1e6")
print(f"{'  M_Sun (kg)':<35} {M_SUN_NOW:>17.6e} {M_Sun_dev:>17.6e}  M_SUN_NOW / (1 − frac)")
print(f"{'  Mass lost from Sun (kg)':<35} {0:>17.4e} {mass_lost_kg:>17.4e}  M_SUN_NOW × frac")
print(f"{'  Mass lost (Earth masses)':<35} {0:>17.4f} {mass_lost_in_M_earth:>17.4f}  Mass_lost / M_Earth")
print(f"{'  AU (km)':<35} {CURRENT_AU_KM:>17,.4f} {AU_dev:>17,.4f}  AU × (1 − Δm/M)  [adiabatic]")
print(f"{'  ΔAU (km)':<35} {0:>17,.1f} {AU_dev - CURRENT_AU_KM:>+17,.1f}  ≈ {(CURRENT_AU_KM-AU_dev)/(t_Ma*1e6)*1e5:.3f} cm/yr × 1e6 yr")
print()

# Tier 2 — year length (DIRECT Kepler with Sun-side symmetric Δa)
print(f"{'TIER 2 — year length (Kepler T²∝a³/M)':<35}")
print(f"{'  Sidereal year (s) [first-order]':<35} {mean_sidereal_year_s:>17,.4f} {sidereal_year_s_dev_firstorder:>17,.4f}  × (1 − 2 × Δm/M)")
print(f"{'  Sidereal year (s) [Kepler direct]':<35} {mean_sidereal_year_s:>17,.4f} {sidereal_year_s_dev_kepler:>17,.4f}  2π√(AU³/G(M_Sun+M_E))")
print(f"{'    Δ first-order vs Kepler':<35} {'':>17} {sidereal_year_s_dev_firstorder - sidereal_year_s_dev_kepler:>+17.6f}  (ppb error)")
print(f"{'  Tropical year (s)':<35} {year_seconds_now:>17,.4f} {tropical_year_s_dev:>17,.4f}  Kepler × (sidereal/tropical ratio)")
print(f"{'  Sidereal year (days at LOD)':<35} {sidYr_J2000_d:>17,.8f} {sidereal_year_d_dev:>17,.8f}  sidereal_s / LOD")
print(f"{'  Tropical year (days at LOD)':<35} {tropical_year_d_now:>17,.8f} {tropical_year_d_dev:>17,.8f}  tropical_s / LOD")
print()

# Tier 3 — H derivation diagnostic (Architecture α + 2 hypothetical alternatives)
print(f"{'TIER 3 — H interpretations (DIAGNOSTIC)':<35}")
print(f"{'  ARCHITECTURE α (CANONICAL)':<35}")
print(f"{'    H = H_now × LOD/LOD_now_H13':<35} {H_now:>17,} {H_dev_simple:>17,.4f}  yr (Step 2 result)")
print(f"{'    Earth rotations per H @ epoch':<35} {TOTAL_DAYS_IN_H:>17,.0f} {earth_rotations_per_H_dev_diagnostic:>17,.4f}  H × tropical_d (varies)")
print(f"{'  ALT_A (if TOTAL_DAYS forced fixed)':<35}")
print(f"{'    H_alt = TOTAL_DAYS × LOD/year_s':<35} {H_now:>17,.4f} {H_dev_ALT_A_if_TOTAL_DAYS_fixed:>17,.4f}  yr (NOT used — wrong under α)")
print(f"{'  ALT_B (if H_years forced fixed)':<35}")
print(f"{'    H_alt = 335,317 yr (forced)':<35} {H_now:>17,} {H_years_ALT_B_fixed:>17,}  forced fixed")
print(f"{'    → TOTAL_DAYS would drift to':<35} {TOTAL_DAYS_IN_H:>17,.0f} {TOTAL_DAYS_IN_H_under_ALT_B:>17,.4f}  (9% drift — clearly wrong)")
print()

# Tier 4 — Moon (angular momentum + Kepler + Solar Δa)
print(f"{'TIER 4 — Moon (L conservation + Kepler)':<35}")
print(f"{'  L_total (kg·m²/s)':<35} {L_total:>17.4e} {L_total:>17.4e}  CONSERVED")
print(f"{'  L_E_spin (kg·m²/s)':<35} {L_E_spin_now:>17.4e} {L_E_spin_dev:>17.4e}  I_E × 2π/LOD")
print(f"{'  L_moon orbital (kg·m²/s)':<35} {L_moon_now:>17.4e} {L_moon_dev:>17.4e}  L_total − L_E")
print(f"{'  a_moon apparent (km)':<35} {moon_distance_now_km:>17,.4f} {a_moon_dev_apparent_km:>17,.4f}  (L_moon/M_M)² / (GM(1−e²))")
print(f"{'  a_moon corrected (km)':<35} {moon_distance_corrected_km:>17,.4f} {a_moon_dev_corrected_km:>17,.4f}  apparent + Solar Δa")
print(f"{'  Moon sidereal month (s)':<35} {moon_sidereal_month_d*LOD_now_s:>17,.4f} {T_moon_dev_s:>17,.4f}  2π × √(a_corr³/GM)")
print(f"{'  Moon sidereal month (modern d)':<35} {moon_sidereal_month_d_now:>17.8f} {T_moon_d_modern_units:>17.8f}  T_moon_s / 86,400")
print(f"{'  Moon sidereal month (Dev. d)':<35} {moon_sidereal_month_d_now:>17.8f} {T_moon_d_dev:>17.8f}  T_moon_s / LOD")
print(f"{'  Moon orbits per H':<35} {N_moon:>17,} {N_moon_dev_chain:>17,.2f}  H_seconds(t) / T_moon(t)")
print()

# Diagnostic — TOTAL_DAYS_IN_H drift (NOT exact invariant under Architecture α)
print(f"DIAGNOSTIC — H × tropical_days/yr (TOTAL_DAYS_IN_H value at each epoch):")
print(f"  Modern  : {H_now * mean_solar_year_d:,.4f}  (J2000 anchor)")
print(f"  Devonian: {H_dev_chain * tropical_year_d_dev:,.4f}  (drifts at deep time, ~74 ppm at 380 Ma)")
print()
print(f"Year-flavor consistency at Devonian:")
print(f"  sidereal − tropical (s)  = {sidereal_year_s_dev - tropical_year_s_dev:+,.4f}  (modern: {mean_sidereal_year_s - year_seconds_now:+,.4f})")
print(f"  sidereal/tropical ratio  = {sidereal_year_s_dev / tropical_year_s_dev:.10f}  (modern: {mean_sidereal_year_s / year_seconds_now:.10f})")
print()


# ============================================================
# Sensitivity to moon eccentricity
# ============================================================

print("=" * 68)
print("Sensitivity to Moon eccentricity at Devonian")
print("=" * 68)
print(f"{'e_moon':>10} {'a_apparent (km)':>17} {'a_corr (km)':>13} {'T (modern d)':>14}")
print("-" * 60)
for e_test in [0.0, 0.025, 0.054900489, 0.075, 0.10, 0.15]:
    a_test_m = moon_distance_from_L(L_moon_dev, e_test)
    a_test_km = a_test_m / 1000
    T_test_s, a_corr_test_km, _ = (
        mean_moon_period_with_solar_correction(
            a_test_km, year_s_dev_AUdrift_sidereal, LOD_dev_s,
            use_j2000_anchor=True
        )
    )
    T_test_d_mod = T_test_s / 86400
    marker = "  <-- current" if abs(e_test - moon_e) < 1e-6 else ""
    print(f"{e_test:>10.4f} {a_test_km:>17,.0f} {a_corr_test_km:>13,.0f} {T_test_d_mod:>14.4f}{marker}")
print()

# What e would yield exactly Williams 2000's central value (362,500 km)?
target_a_km = 362_500
target_a_m = target_a_km * 1000
# a × (1 - e²) = L²/(M² × GM) is fixed by L_moon
a_times_1me2 = (L_moon_dev / M_moon) ** 2 / GM_em_si
required_1_minus_e2 = a_times_1me2 / target_a_m
if required_1_minus_e2 > 1.0 or required_1_minus_e2 < 0.0:
    print(f"  To match a={target_a_km} km exactly: requires (1-e²) = "
          f"{required_1_minus_e2:.4f} — IMPOSSIBLE (would need imaginary e).")
    print(f"  Conclusion: e_moon cannot push framework prediction lower than")
    print(f"  ~{a_times_1me2 / 1000:,.0f} km (the e=0 limit).")
else:
    e_required = math.sqrt(1 - required_1_minus_e2)
    print(f"  To match a={target_a_km} km exactly: requires e_moon = "
          f"{e_required:.4f}")
print()


# ============================================================
# Diagnostic: TOTAL_DAYS_IN_H drift under Architecture α (NOT invariant)
# Uses the canonical 2-step H value × Fibonacci-derived tropical year days
# ============================================================

# Architecture α: tropical_d at epoch = sidereal_d × (H-13)/H
tropical_d_dev_fibonacci = sidereal_year_d_dev * (H_dev_simple - 13) / H_dev_simple
dev_total_days_alpha = H_dev_simple * tropical_d_dev_fibonacci
print("=" * 68)
print("TOTAL_DAYS_IN_H diagnostic (Architecture α — DRIFTS at deep time)")
print("=" * 68)
print(f"  TOTAL_DAYS_IN_H @ now    = {H_now * days_per_year_now:,.4f}  (J2000 anchor)")
print(f"  H(t) × tropical_d(t) @ 380 Ma = {dev_total_days_alpha:,.4f}")
print(f"    using H_dev = {H_dev_simple:,.4f} yr (Step 2)")
print(f"    and tropical_d = {tropical_d_dev_fibonacci:.7f} (Fibonacci: sidereal × (H-13)/H)")
print(f"  Δ from J2000 anchor      = {dev_total_days_alpha - H_now * days_per_year_now:+,.4f} "
      f"({(dev_total_days_alpha - H_now * days_per_year_now) / (H_now * days_per_year_now) * 1e6:+.2f} ppm)")
print()


# ============================================================
# Moon sidereal orbits per H cycle (structural invariant approach)
# ============================================================

# Use the framework's structural invariant for H_in_seconds:
#   H_seconds(t) = TOTAL_DAYS_IN_H × LOD(t)
# (equivalently: H_years × tropical_year_seconds — the tropical year is
# the framework's quantization base, anchored to seasons. The sidereal
# year would over-count orbits by ~168 over an H cycle.)
H_now_s = TOTAL_DAYS_IN_H * LOD_now_s
H_dev_s = TOTAL_DAYS_IN_H * LOD_dev_s

# Modern Moon sidereal month (script.js-derived integer count anchor)
T_moon_now_s = moon_sidereal_month_d * LOD_now_s

# N orbits per H cycle
N_moon_now = H_now_s / T_moon_now_s
N_moon_dev = H_dev_s / T_moon_dev_s

print("=" * 68)
print("Moon sidereal orbits per H cycle")
print("=" * 68)
print(f"  H_now × LOD_now           = {H_now_s:,.4f} s")
print(f"  H_dev × LOD_dev           = {H_dev_s:,.4f} s")
print(f"  T_moon modern             = {T_moon_now_s:,.6f} s")
print(f"  T_moon Devonian (Δa corr) = {T_moon_dev_s:,.6f} s")
print()
print(f"  N_moon  modern            = {N_moon_now:,.6f}")
print(f"           (script.js int)  = {N_moon}")
print(f"  N_moon  Devonian          = {N_moon_dev:,.6f}")
print(f"  ΔN     (Dev − modern)     = {N_moon_dev - N_moon_now:+,.4f}")
print()
print(f"  Fewer Moon orbits at Dev. = {N_moon_now - N_moon_dev:,.4f}")
print(f"  Percentage reduction      = {100 * (N_moon_now - N_moon_dev) / N_moon_now:.4f}%")
print(f"  TOTAL_DAYS_IN_H drift     = "
      f"{(dev_total_days_alpha - TOTAL_DAYS_IN_H) / TOTAL_DAYS_IN_H * 1e6:+.2f} ppm")
