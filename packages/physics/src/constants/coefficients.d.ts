// GENERATED — do not edit. Regenerate: node tools/constants/generate.mjs --write
// The fitted coefficients' shapes for TypeScript consumers (§2g); values live
// in coefficients.js, emitted VERBATIM from fitted-coefficients.json.

export declare const COEFFICIENTS_HASH: "9e0460662933228f";

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
      "H_kyr": number;
      "eight_H_kyr": number;
      "L1_integers": number[];
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
          "9": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "12": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "14": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "16": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "18": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "20": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "21": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "22": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "24": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "25": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "28": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "30": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "31": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "35": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "38": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "39": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "48": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "50": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "53": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "65": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "66": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "68": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "73": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "76": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "96": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "107": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "110": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "113": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "120": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "134": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "141": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "152": {
            "n": number;
            "period_kyr": number;
            "lr04_post_mpt_amp": number;
            "epica_amp": number;
            "ratio": number;
            "label": string;
          };
          "185": {
            "n": number;
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
          "n": number;
          "a": number;
          "b": number;
        }>;
        "L2": Array<{
          "p_kyr": number;
          "label": string;
          "a": number;
          "b": number;
        }>;
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
