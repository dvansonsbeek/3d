// GENERATED — do not edit. Regenerate: node tools/constants/generate.mjs --write
// The fitted coefficients' shapes for TypeScript consumers (§2g); values live
// in coefficients.js, emitted VERBATIM from fitted-coefficients.json.

export declare const COEFFICIENTS_HASH: "78f99d98186e50d9";

export declare const FITTED_COEFFICIENTS: {
  readonly ANOMALISTIC_YEAR_HARMONICS: Array<[number, number, number]>;
  readonly BALANCE_PRESETS: Array<Array<number | string>>;
  readonly CARDINAL_POINT_ANCHORS: {
    "SS": number;
    "WS": number;
    "VE": number;
    "AE": number;
  };
  readonly CARDINAL_POINT_ANCHORS_ADJUSTED: {
    "SS": number;
    "WS": number;
    "VE": number;
    "AE": number;
  };
  readonly CARDINAL_POINT_DERIVED: {
    "lincoef": number;
    "h0": number;
    "h1": number;
    "eccOrderDivisors": [number, number];
    "note": string;
  };
  readonly CARDINAL_POINT_ECC_TERMS: {
    "SS": Array<{
      "order": number;
      "sin": number;
      "cos": number;
    }>;
    "WS": Array<{
      "order": number;
      "sin": number;
      "cos": number;
    }>;
    "VE": Array<{
      "order": number;
      "sin": number;
      "cos": number;
    }>;
    "AE": Array<{
      "order": number;
      "sin": number;
      "cos": number;
    }>;
  };
  readonly CARDINAL_POINT_HARMONICS: {
    "SS": Array<[number, number, number]>;
    "WS": Array<[number, number, number]>;
    "VE": Array<[number, number, number]>;
    "AE": Array<[number, number, number]>;
  };
  readonly CARDINAL_POINT_JOINT_TERMS: {
    "quadratureDeg": {
      "SS": number;
      "AE": number;
      "WS": number;
      "VE": number;
    };
    "terms": Array<{
      "order": number;
      "div": number;
      "sin": number;
      "cos": number;
    }>;
    "note": string;
  };
  readonly CLIMATE_FORMULA_COEFFS: {
    "config": {
      "L1_lines": Array<{
        "family": string;
        "label": string;
        "arcsecPerYr": number;
        "periodKyr": number;
        "relAmp": number;
      }>;
      "L1_source": string;
      "L2_periods_kyr": {
        "405-kyr (fundamental)": number;
        "202-kyr (2nd harmonic)": number;
        "135-kyr (3rd harmonic)": number;
      };
      "L3_transitions_ma": {
        "PETM": number;
        "EOT": number;
        "Mi-1": number;
        "MMCT": number;
        "iNHG": number;
        "MPT": number;
      };
      "description": string;
    };
    "regimes": {
      "lr04-post-mpt": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": unknown[];
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
      };
      "lr04-inhg-mpt": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": unknown[];
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
      };
      "lr04-pre-inhg": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": unknown[];
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
      };
      "lr04-full": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": Array<{
          "label": string;
          "t_kyr": number;
          "beta": number;
        }>;
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
      };
      "cenogrid-d18o": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": Array<{
          "label": string;
          "t_kyr": number;
          "beta": number;
        }>;
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
      };
      "cenogrid-d13c": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": Array<{
          "label": string;
          "t_kyr": number;
          "beta": number;
        }>;
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
      };
      "epica-co2": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": unknown[];
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
        "carbon_amplification_ratios": {
          "19.0014": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "19.1554": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "22.4452": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "23.1931": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "23.7599": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "27.4019": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "28.9913": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "29.1554": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "29.7742": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "29.9682": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "39.8366": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "40.5195": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "41.2244": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "41.9557": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "54.1343": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "94.8779": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "96.8490": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "98.8439": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "101.0051": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "103.1238": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "105.1372": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "110.0293": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "123.8462": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "130.6910": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "134.4960": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "405.6256": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "202.8128": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "135.2085": {
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
        };
      };
      "cenco2pip": {
        "label": string;
        "regime": string;
        "window_kyr": [number, number];
        "n_samples": number;
        "intercept": number;
        "L1": Array<{
          "period_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
        "L2": unknown[];
        "L3": Array<{
          "label": string;
          "t_kyr": number;
          "beta": number;
        }>;
        "denormalization": {
          "y_mean": number;
          "y_std": number;
          "trend_slope": number;
          "trend_intercept": number;
        };
        "r2": {
          "l1_only": number;
          "l1_l2": number;
          "l1_l2_l3": number;
          "delta_l2": number;
          "delta_l3": number;
        };
      };
    };
    "meta": {
      "script": string;
      "consumer": string;
      "stitched_lr04_r2": number;
      "stitched_lr04_note": string;
    };
  };
  readonly DT_RESONATOR: {
    "display_name": string;
    "driver": string;
    "functional_class": string;
    "kick_epochs_year": [number, number];
    "kick_coefficients_s": Array<{
      "cos": number;
      "sin": number;
    }>;
    "T0_lattice_n": number;
    "T0_yr": number;
    "Q": number;
    "drive_tones": Array<{
      "pair": string;
      "dn": number;
      "period_yr": number;
      "phi_locked_rad": number;
      "amp_s": number;
      "phase_convention": string;
      "retired": string;
    }>;
    "rms_s": number;
    "raw_at_j2000_s": number;
    "lod_raw_at_j2000_s_per_day": number;
    "deep_time_checks_s": {
      "900": number;
      "2000": number;
      "5000": number;
      "100000": number;
      "-100000": number;
      "-5000": number;
      "-801": number;
    };
    "regeneration_rule": string;
    "status": string;
    "impulse_consistent": boolean;
  };
  readonly DT_STACK: {
    "bond": {
      "lattice_n": number;
      "period_yr": number;
      "cos_coeff_s": number;
      "sin_coeff_s": number;
      "raw_at_j2000_s": number;
      "amplitude_s": number;
      "phase_deg": number;
      "source": string;
      "joint_mode": boolean;
    };
    "hallstatt": {
      "lattice_n": number;
      "period_yr": number;
      "cos_coeff_s": number;
      "sin_coeff_s": number;
      "raw_at_j2000_s": number;
      "amplitude_s": number;
      "phase_deg": number;
      "target_amp_source": string;
      "joint_mode": boolean;
    };
    "jose5": {
      "lattice_n": number;
      "period_yr": number;
      "cos_coeff_s": number;
      "sin_coeff_s": number;
      "raw_at_j2000_s": number;
      "amplitude_s": number;
      "phase_deg": number;
      "target_amp_source": string;
      "joint_mode": boolean;
    };
    "jose4": {
      "lattice_n": number;
      "period_yr": number;
      "cos_coeff_s": number;
      "sin_coeff_s": number;
      "raw_at_j2000_s": number;
      "amplitude_s": number;
      "phase_deg": number;
      "target_amp_source": string;
      "joint_mode": boolean;
    };
  };
  readonly EARTH_OSCULATING_MEAN_OFFSET: {
    "dPomArcsec": number;
    "dE": number;
  };
  readonly MEEUS_DISTANCE_TERMS: {
    "meanKm": number;
    "terms": Array<number[]>;
  };
  readonly MEEUS_LATITUDE_TERMS: Array<number[]>;
  readonly MEEUS_LONGITUDE_TERMS: Array<number[]>;
  readonly MOON_CORRECTION: {
    "raSinD": number;
    "raCosD": number;
    "raSinMp": number;
    "raCosMp": number;
    "raSinMs": number;
    "raCosMs": number;
    "decSinD": number;
    "decCosD": number;
    "decSinMp": number;
    "decCosMp": number;
    "decSinMs": number;
    "decCosMs": number;
  };
  readonly MOON_CORRECTION_RESIDUAL: {
    "raSinD": number;
    "raCosD": number;
    "raSinMp": number;
    "raCosMp": number;
    "raSinMs": number;
    "raCosMs": number;
    "decSinD": number;
    "decCosD": number;
    "decSinMp": number;
    "decCosMp": number;
    "decSinMs": number;
    "decCosMs": number;
  };
  readonly PERI_HARMONICS_RAW: Array<[number, number, number]>;
  readonly PERI_OFFSET: number;
  readonly PREDICT_COEFFS_PHYSICAL: {
    "mercury": number[];
    "venus": number[];
    "mars": number[];
    "jupiter": number[];
    "saturn": number[];
    "uranus": number[];
    "neptune": number[];
  };
  readonly SIDEREAL_YEAR_HARMONICS: Array<[number, number, number]>;
  readonly SOLSTICE_OBLIQUITY_HARMONICS: Array<[number, number, number]>;
  readonly SOLSTICE_OBLIQUITY_MEAN_FITTED: number;
  readonly SUN_LONGITUDE_HARMONICS: Array<[number, number, number]>;
  readonly SUN_LONGITUDE_MEAN: number;
  readonly TROPICAL_YEAR_HARMONICS: Array<[number, number, number]>;
};
