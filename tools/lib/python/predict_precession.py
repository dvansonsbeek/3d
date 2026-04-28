#!/usr/bin/env python3
"""
HOLISTIC UNIVERSE MODEL — PREDICTION API
==========================================

A single, clean interface for all Holistic Model predictions.

This script provides functions for:
- Planetary precession fluctuations (7 planets)
- Earth orbital parameters (obliquity, eccentricity, inclination, perihelion, ERD)
- Day & year lengths (solar year, sidereal year, day length)

Usage:
    from predict_precession import predict, predict_total, get_all_predictions
    from predict_precession import get_earth_parameters, get_day_year_lengths

    # Precession predictions
    fluct = predict(2024, 'mars')
    total = predict_total(2024, 'mars')
    results = get_all_predictions(2024)

    # Earth parameters
    earth = get_earth_parameters(2024)

    # Day & year lengths
    lengths = get_day_year_lengths(2024)

Author: Holistic Universe Model
"""

from typing import Dict, List, Optional
from predictive_formula_physical import build_features_physical
from predictive_formula import (
    PLANETS, H, J2000,
    calc_earth_perihelion, calc_erd, calc_obliquity, calc_eccentricity,
    calc_inclination, calc_planet_perihelion,
    calc_solar_year, calc_sidereal_year, calc_day_length,
    calc_solar_year_seconds, calc_sidereal_year_seconds,
    calc_anomalistic_year_seconds, calc_anomalistic_year,
    calc_sidereal_day, calc_stellar_day,
    calc_axial_precession, calc_perihelion_precession,
    calc_inclination_precession,
)

# Import physical-beat trained coefficients (2421 terms/planet)
from coefficients.mercury_coeffs_physical import MERCURY_COEFFS_PHYSICAL
from coefficients.venus_coeffs_physical   import VENUS_COEFFS_PHYSICAL
from coefficients.mars_coeffs_physical    import MARS_COEFFS_PHYSICAL
from coefficients.jupiter_coeffs_physical import JUPITER_COEFFS_PHYSICAL
from coefficients.saturn_coeffs_physical  import SATURN_COEFFS_PHYSICAL
from coefficients.uranus_coeffs_physical  import URANUS_COEFFS_PHYSICAL
from coefficients.neptune_coeffs_physical import NEPTUNE_COEFFS_PHYSICAL


# Coefficient registry
COEFFICIENTS = {
    'mercury': MERCURY_COEFFS_PHYSICAL,
    'venus':   VENUS_COEFFS_PHYSICAL,
    'mars':    MARS_COEFFS_PHYSICAL,
    'jupiter': JUPITER_COEFFS_PHYSICAL,
    'saturn':  SATURN_COEFFS_PHYSICAL,
    'uranus':  URANUS_COEFFS_PHYSICAL,
    'neptune': NEPTUNE_COEFFS_PHYSICAL,
}


def predict(year: int, planet: str) -> float:
    """
    Predict precession fluctuation for a planet at given year.

    Args:
        year: Calendar year
        planet: Planet name ('mercury', 'venus', 'mars', 'jupiter',
                            'saturn', 'uranus', 'neptune')

    Returns:
        Precession fluctuation in arcsec/century
    """
    planet = planet.lower()

    if planet not in PLANETS:
        raise ValueError(f"Unknown planet: {planet}. Valid: {list(PLANETS.keys())}")

    if planet not in COEFFICIENTS:
        raise ValueError(f"No coefficients for planet: {planet}")

    coeffs = COEFFICIENTS[planet]
    # Physical-beat formula derives period/theta0 internally from planet name
    features = build_features_physical(year, planet.capitalize())
    return sum(c * f for c, f in zip(coeffs, features))


def predict_total(year: int, planet: str) -> float:
    """
    Predict total precession rate (baseline + fluctuation).

    Args:
        year: Calendar year
        planet: Planet name

    Returns:
        Total precession rate in arcsec/century
    """
    planet = planet.lower()

    if planet not in PLANETS:
        raise ValueError(f"Unknown planet: {planet}")

    fluctuation = predict(year, planet)
    baseline = PLANETS[planet]['baseline']

    return baseline + fluctuation


def get_all_predictions(year: int) -> Dict[str, Dict[str, float]]:
    """
    Get predictions for all planets at a given year.

    Returns dict with structure:
    {
        'mercury': {
            'fluctuation': ...,
            'baseline': ...,
            'total': ...,
            'period': ...,
            'theta0': ...,
        },
        ...
    }
    """
    results = {}

    for planet_key, planet_info in PLANETS.items():
        fluct = predict(year, planet_key)
        results[planet_key] = {
            'name': planet_info['name'],
            'fluctuation': fluct,
            'baseline': planet_info['baseline'],
            'total': planet_info['baseline'] + fluct,
            'period': planet_info['period'],
            'theta0': planet_info['theta0'],
        }

    return results


def get_earth_parameters(year: int) -> Dict[str, float]:
    """Get calculated Earth orbital parameters for a given year."""
    return {
        'perihelion': calc_earth_perihelion(year),
        'erd': calc_erd(year),
        'obliquity': calc_obliquity(year),
        'eccentricity': calc_eccentricity(year),
        'inclination': calc_inclination(year),
    }


def get_day_year_lengths(year: int) -> Dict[str, float]:
    """
    Get day and year lengths for a given year.

    Returns dict with:
        solar_year_days: Solar (tropical) year in days
        solar_year_seconds: Solar year in SI seconds
        sidereal_year_days: Sidereal year in days
        sidereal_year_seconds: Sidereal year in SI seconds (fixed)
        anomalistic_year_days: Anomalistic year in days
        anomalistic_year_seconds: Anomalistic year in SI seconds
        day_length_seconds: Day length in SI seconds
        sidereal_day_seconds: Sidereal day in SI seconds
        stellar_day_seconds: Stellar day in SI seconds
    """
    return {
        'solar_year_days': calc_solar_year(year),
        'solar_year_seconds': calc_solar_year_seconds(year),
        'sidereal_year_days': calc_sidereal_year(year),
        'sidereal_year_seconds': calc_sidereal_year_seconds(year),
        'anomalistic_year_days': calc_anomalistic_year(year),
        'anomalistic_year_seconds': calc_anomalistic_year_seconds(year),
        'day_length_seconds': calc_day_length(year),
        'sidereal_day_seconds': calc_sidereal_day(year),
        'stellar_day_seconds': calc_stellar_day(year),
    }


def get_precession_durations(year: int) -> Dict[str, float]:
    """
    Get precession durations for a given year.

    Returns dict with:
        axial_years: Axial precession period in years
        perihelion_years: Perihelion precession period in years
        inclination_years: Inclination precession period in years
    """
    return {
        'axial_years': calc_axial_precession(year),
        'perihelion_years': calc_perihelion_precession(year),
        'inclination_years': calc_inclination_precession(year),
    }


def get_planet_perihelion(year: int, planet: str) -> float:
    """Get calculated planet perihelion longitude for a given year."""
    planet = planet.lower()

    if planet not in PLANETS:
        raise ValueError(f"Unknown planet: {planet}")

    planet_info = PLANETS[planet]
    return calc_planet_perihelion(planet_info['theta0'], planet_info['period'], year)


# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

def main():
    """Command line interface for predictions."""
    import sys

    print("=" * 70)
    print("HOLISTIC UNIVERSE MODEL — PREDICTIONS")
    print("=" * 70)

    # Default to J2000 epoch or use argument
    year = 2000
    if len(sys.argv) > 1:
        try:
            year = float(sys.argv[1])
            if year == int(year):
                year = int(year)
        except ValueError:
            pass

    print(f"\nPredictions for year {year}:")
    print()

    # Earth parameters
    earth = get_earth_parameters(year)
    print("Earth — Orbital Elements:")
    print(f"  Perihelion:    {earth['perihelion']:>12.6f}°")
    print(f"  Obliquity:     {earth['obliquity']:>12.6f}°")
    print(f"  Eccentricity:  {earth['eccentricity']:>14.10f}")
    print(f"  Inclination:   {earth['inclination']:>12.6f}°")
    print()

    # Day & Year lengths
    lengths = get_day_year_lengths(year)
    print("Earth — Time Periods:")
    print(f"  Solar year:       {lengths['solar_year_days']:>16.9f} days")
    print(f"  Solar year:       {lengths['solar_year_seconds']:>16.3f} SI seconds")
    print(f"  Sidereal year:    {lengths['sidereal_year_days']:>16.9f} days")
    print(f"  Sidereal year:    {lengths['sidereal_year_seconds']:>16.3f} SI seconds (fixed)")
    print(f"  Anomalistic year: {lengths['anomalistic_year_days']:>16.9f} days")
    print(f"  Anomalistic year: {lengths['anomalistic_year_seconds']:>16.3f} SI seconds")
    print(f"  Day length:       {lengths['day_length_seconds']:>16.6f} SI seconds")
    print(f"  Sidereal day:     {lengths['sidereal_day_seconds']:>16.6f} SI seconds")
    print(f"  Stellar day:      {lengths['stellar_day_seconds']:>16.6f} SI seconds")
    print()

    # Precession durations
    prec = get_precession_durations(year)
    print("Earth — Precession Periods:")
    print(f"  Axial:        {prec['axial_years']:>12.2f} years")
    print(f"  Perihelion:   {prec['perihelion_years']:>12.2f} years")
    print(f"  Inclination:  {prec['inclination_years']:>12.2f} years")
    print()

    # Planet predictions (including Earth from anomalistic year)
    print("All Planets — Perihelion Precession:")
    print("-" * 70)
    print(f"{'Planet':<10} {'Perihelion':>12} {'Baseline':>12} {'Fluctuation':>12} {'Total':>12}")
    print(f"{'':>10} {'(°)':>12} {'(\"/cy)':>12} {'(\"/cy)':>12} {'(\"/cy)':>12}")
    print("-" * 70)

    results = get_all_predictions(year)

    # Earth baseline and total derived from anomalistic year (consistent with precession period)
    earth_peri_period = H / 16
    earth_baseline = 1296000 / earth_peri_period * 100
    earth_total = 1296000 / prec['perihelion_years'] * 100
    earth_fluct = earth_total - earth_baseline

    for planet_key in ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']:
        if planet_key == 'earth':
            print(f"{'Earth':<10} {earth['perihelion']:>12.4f} {earth_baseline:>+12.1f} {earth_fluct:>+12.4f} {earth_total:>+12.2f}")
        else:
            r = results[planet_key]
            peri = get_planet_perihelion(year, planet_key)
            print(f"{r['name']:<10} {peri:>12.4f} {r['baseline']:>+12.1f} {r['fluctuation']:>+12.4f} {r['total']:>+12.2f}")

    print("-" * 70)
    print()

    # Model info
    print("Model Information:")
    print(f"  Feature matrix: 429 terms (unified for all planets)")
    print(f"  Reference epoch: J{J2000}")
    print(f"  Earth Fundamental Cycle (H): {H:,} years")
    print()
    print("Training metrics:")
    metrics = {
        'mercury': ('0.7450', '0.999929'),
        'venus': ('3.4655', '0.999955'),
        'mars': ('2.0273', '0.999636'),
        'jupiter': ('2.3255', '0.999625'),
        'saturn': ('3.7218', '0.999617'),
        'uranus': ('1.3956', '0.999618'),
        'neptune': ('0.2484', '0.999902'),
    }
    print(f"  {'Planet':<10} {'RMSE (\"/cy)':>14} {'R²':>10}")
    for planet, (rmse, r2) in metrics.items():
        print(f"  {planet.capitalize():<10} {rmse:>14} {r2:>10}")


if __name__ == "__main__":
    main()
