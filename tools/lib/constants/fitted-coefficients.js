// ═══════════════════════════════════════════════════════════════════════════
// FITTED COEFFICIENTS — Output of fitting scripts in tools/fit/.
// DO NOT EDIT MANUALLY — regenerate by running the indicated script.
//
// When to refit: see tools/fit/README.md for the dependency chain.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');


// @AUTO:YEAR_LENGTH:START — produced by tools/fit/year-length-harmonics.js
const TROPICAL_YEAR_HARMONICS = [                          // RMS = 0.001 s
  [ 3,  +6.332548792685e-07, +8.075245235817e-06],        // H/3:  0.700s amp
  [ 8,  -1.356696988329e-06, -2.088113114600e-05],        // H/8:  1.808s amp
  [14,  -1.545140139305e-07, +3.637423948615e-07],        // H/14: 0.034s amp
  [15,  +8.449709609471e-08, -4.860696254744e-07],        // H/15: 0.043s amp
  [31,  +2.067861760831e-08, -1.502149356245e-08],        // H/31: 0.002s amp
  [41,  -6.303689078519e-09, +1.914969191424e-08],        // H/41: 0.002s amp
];
const SIDEREAL_YEAR_HARMONICS = [                          // RMS = 0.000 s
  [ 2,  -6.446591502042e-07, -1.036571636840e-07],        // H/2:  0.056s amp
  [ 3,  +1.162133281368e-06, +4.849859858606e-07],        // H/3:  0.109s amp
  [ 8,  -1.134779565378e-06, -2.847253755636e-09],        // H/8:  0.098s amp
];
const ANOMALISTIC_YEAR_HARMONICS = [                       // RMS = 0.000 s
  [ 2,  -3.331807798338e-06, -1.199082237907e-05],        // H/2:  1.075s amp
  [ 3,  -3.739072613520e-06, +9.617812262260e-06],        // H/3:  0.892s amp
  [ 8,  -3.175712482370e-07, +2.623030026153e-06],        // H/8:  0.228s amp
  [ 9,  +8.022402310244e-07, -1.542541871698e-06],        // H/9:  0.150s amp
  [22,  +1.062301999920e-07, -6.676606979168e-08],        // H/22: 0.011s amp
  [23,  -4.273912533399e-07, +2.329348175831e-07],        // H/23: 0.042s amp
];
// @AUTO:YEAR_LENGTH:END

// @AUTO:PERI_HARMONICS:START — produced by tools/fit/python/fit_perihelion_harmonics.py
// 21-term fit, RMSE = 0.0035°, from data/01-holistic-year-objects-data.xlsx
// Periods computed from H in buildFittedCoefficients().
const PERI_HARMONICS_RAW = [
  [   3,   -0.131685,    0.007248],  // H/3  amp=0.1319°
  [   5,   -0.003209,    0.000011],  // H/5  amp=0.0032°
  [   8,    0.119941,   -0.007786],  // H/8  amp=0.1202°
  [  13,    0.011745,    0.000541],  // H/13  amp=0.0118°
  [  16,    4.892262,   -0.021722],  // H/16  amp=4.8923°
  [  21,   -0.003460,    0.000048],  // H/21  amp=0.0035°
  [  24,    0.130228,    0.006007],  // H/24  amp=0.1304°
  [  29,   -0.130743,   -0.006034],  // H/29  amp=0.1309°
  [  32,    2.663775,    0.247194],  // H/32  amp=2.6752°
  [  35,   -0.005614,   -0.000259],  // H/35  amp=0.0056°
  [  40,    0.016279,    0.000650],  // H/40  amp=0.0163°
  [  45,   -0.010673,   -0.000392],  // H/45  amp=0.0107°
  [  48,    0.221736,    0.020213],  // H/48  amp=0.2227°
  [  56,    0.006945,    0.000873],  // H/56  amp=0.0070°
  [  61,   -0.006489,   -0.000856],  // H/61  amp=0.0065°
  [  64,    0.070762,    0.012275],  // H/64  amp=0.0718°
  [  80,    0.010504,    0.001921],  // H/80  amp=0.0107°
  [  96,    0.002790,    0.000667],  // H/96  amp=0.0029°
  [ 272,    0.006051,   -0.005402],  // H/272  amp=0.0081°
  [ 544,   -0.005401,   -0.000629],  // H/544  amp=0.0054°
  [ 816,    0.001235,    0.001767],  // H/816  amp=0.0022°
];
const PERI_OFFSET = -0.255210;
// @AUTO:PERI_HARMONICS:END

// @AUTO:OBLIQUITY:START — produced by tools/fit/obliquity-harmonics.js
// Data-derived solstice mean (more accurate than Pythagorean time-average)
const SOLSTICE_OBLIQUITY_MEAN_FITTED = 23.45343689;
const SOLSTICE_OBLIQUITY_HARMONICS = [
  [ 2,  -0.00000263,  -0.00006165],  // H/2  amp=0.2"
  [ 3,   0.03207255,  -0.63427917],  // H/3  amp=2286.3" [Fib]
  [ 5,  -0.00007659,  -0.00812995],  // H/5  amp=29.3" [Fib]
  [ 6,   0.00044775,  -0.00403652],  // H/6  amp=14.6" 2×(H/3)
  [ 8,  -0.03210284,   0.63429685],  // H/8  amp=2286.4" [Fib]
  [ 9,   0.00000880,  -0.00005443],  // H/9  amp=0.2"
  [11,  -0.00089606,   0.00807468],  // H/11  amp=29.2" H/3+H/8
  [13,  -0.00000165,   0.00004233],  // H/13  amp=0.2" [Fib]
  [14,  -0.00002645,   0.00016338],  // H/14  amp=0.6"
  [16,   0.00044819,  -0.00403683],  // H/16  amp=14.6" [Fib]
  [17,  -0.00000078,   0.00000361],  // H/17  amp=0.0"
  [19,   0.00002646,  -0.00016347],  // H/19  amp=0.6" H/3+H/16
  [22,   0.00000117,  -0.00000542],  // H/22  amp=0.0"
  [24,  -0.00000884,   0.00005469],  // H/24  amp=0.2" H/8+H/16
  [27,  -0.00000078,   0.00000362],  // H/27  amp=0.0"
  [32,   0.00000019,  -0.00000091],  // H/32  amp=0.0" 2×(H/16)
];
// @AUTO:OBLIQUITY:END

// @AUTO:CARDINAL_POINTS:START — produced by tools/fit/cardinal-point-harmonics.js
const CARDINAL_POINT_HARMONICS = {
  SS: [  // RMSE = 2.7 min over full H
    [ 3,  -1.488691,  -0.089818],  // H/3  amp=1.491d [Fib]
    [ 5,   0.003921,  -0.000272],  // H/5  amp=0.004d [Fib]
    [ 6,  -0.020735,  -0.002628],  // H/6  amp=0.021d 2×(H/3)
    [ 8,   1.511643,   0.088815],  // H/8  amp=1.514d [Fib]
    [11,   0.041820,   0.003970],  // H/11  amp=0.042d H/3+H/8
    [13,  -0.022977,  -0.000232],  // H/13  amp=0.023d [Fib]
    [16,   1.769787,   0.088040],  // H/16  amp=1.772d [Fib]
    [19,   0.021668,   0.001923],  // H/19  amp=0.022d H/3+H/16
    [24,  -0.023666,  -0.002911],  // H/24  amp=0.024d H/8+H/16
    [29,   0.001260,  -0.000434],  // H/29  amp=0.001d
    [32,  -0.088559,  -0.005372],  // H/32  amp=0.089d 2×(H/16)
    [35,  -0.001224,  -0.000580],  // H/35  amp=0.001d
  ],
  WS: [  // RMSE = 2.7 min over full H
    [ 3,  -1.480570,  -0.089521],  // H/3  amp=1.483d [Fib]
    [ 5,   0.003209,  -0.000385],  // H/5  amp=0.003d [Fib]
    [ 6,  -0.020622,  -0.002762],  // H/6  amp=0.021d 2×(H/3)
    [ 8,   1.457738,   0.088714],  // H/8  amp=1.460d [Fib]
    [ 9,  -0.000364,  -0.000639],  // H/9  amp=0.001d
    [11,   0.040898,   0.003769],  // H/11  amp=0.041d H/3+H/8
    [13,   0.022801,  -0.000799],  // H/13  amp=0.023d [Fib]
    [14,   0.001085,  -0.000408],  // H/14  amp=0.001d
    [16,  -1.809007,  -0.093365],  // H/16  amp=1.811d [Fib]
    [19,  -0.023773,  -0.003279],  // H/19  amp=0.024d H/3+H/16
    [21,  -0.000221,  -0.000591],  // H/21  amp=0.001d
    [22,  -0.000502,  -0.000665],  // H/22  amp=0.001d
    [24,   0.023820,   0.001983],  // H/24  amp=0.024d H/8+H/16
    [27,   0.000956,  -0.000426],  // H/27  amp=0.001d
    [29,  -0.000770,  -0.000562],  // H/29  amp=0.001d
    [32,   0.069608,   0.002440],  // H/32  amp=0.070d 2×(H/16)
    [33,   0.000001,  -0.000581],  // H/33  amp=0.001d
    [35,   0.000740,  -0.000515],  // H/35  amp=0.001d
    [40,  -0.000712,  -0.000652],  // H/40  amp=0.001d
    [48,   0.002812,  -0.000385],  // H/48  amp=0.003d
  ],
  VE: [  // RMSE = 2.6 min over full H
    [ 3,  -1.484435,  -0.089312],  // H/3  amp=1.487d [Fib]
    [ 5,   0.003579,   0.000278],  // H/5  amp=0.004d [Fib]
    [ 6,  -0.020673,  -0.002409],  // H/6  amp=0.021d 2×(H/3)
    [ 8,   1.484654,   0.111885],  // H/8  amp=1.489d [Fib]
    [11,   0.041331,   0.004575],  // H/11  amp=0.042d H/3+H/8
    [13,  -0.000220,  -0.023136],  // H/13  amp=0.023d [Fib]
    [16,  -0.113515,   1.783344],  // H/16  amp=1.787d [Fib]
    [19,  -0.003662,   0.022389],  // H/19  amp=0.023d H/3+H/16
    [21,  -0.000009,   0.000026],  // H/21  amp=0.000d
    [22,  -0.000119,   0.000254],  // H/22  amp=0.000d
    [24,   0.003168,  -0.023911],  // H/24  amp=0.024d H/8+H/16
    [27,   0.000188,  -0.001126],  // H/27  amp=0.001d
    [29,  -0.000235,   0.000807],  // H/29  amp=0.001d
    [32,   0.013524,  -0.078297],  // H/32  amp=0.079d 2×(H/16)
    [35,   0.000346,  -0.001139],  // H/35  amp=0.001d
    [40,  -0.000379,   0.000740],  // H/40  amp=0.001d
  ],
  AE: [  // RMSE = 3.7 min over full H
    [ 3,  -1.484845,  -0.089991],  // H/3  amp=1.488d [Fib]
    [ 5,   0.003551,  -0.000940],  // H/5  amp=0.004d [Fib]
    [ 6,  -0.020685,  -0.002985],  // H/6  amp=0.021d 2×(H/3)
    [ 8,   1.484623,   0.065526],  // H/8  amp=1.486d [Fib]
    [11,   0.041384,   0.003156],  // H/11  amp=0.042d H/3+H/8
    [13,   0.000213,   0.022105],  // H/13  amp=0.022d [Fib]
    [14,   0.001096,  -0.000657],  // H/14  amp=0.001d
    [16,   0.067831,  -1.789069],  // H/16  amp=1.790d [Fib]
    [19,   0.001390,  -0.023772],  // H/19  amp=0.024d H/3+H/16
    [21,   0.000011,  -0.001045],  // H/21  amp=0.001d
    [22,   0.000030,  -0.001293],  // H/22  amp=0.001d
    [24,  -0.001868,   0.023041],  // H/24  amp=0.023d H/8+H/16
    [27,  -0.000112,   0.000121],  // H/27  amp=0.000d
    [32,   0.005592,   0.079207],  // H/32  amp=0.079d 2×(H/16)
    [35,   0.000135,   0.000197],  // H/35  amp=0.000d
    [48,  -0.001157,   0.000899],  // H/48  amp=0.001d
  ],
};

// Legacy alias
const SOLSTICE_JD_HARMONICS = CARDINAL_POINT_HARMONICS.SS;
// @AUTO:CARDINAL_POINTS:END

// @AUTO:PARALLAX:START — produced by tools/fit/parallax-correction.js
// Post-hoc RA/Dec correction for geocentric parallax effect.
// Formula: dX = A + B/d + C*T + (D*sin(u) + E*cos(u) + ...)/d + ...
//   where u = RA - ascendingNode (radians), d = geocentric distance (AU),
//         s = heliocentric distance (AU), T = centuries from J2000
// Attached to ASTRO_REFERENCE at wiring time by constants.js.

const PARALLAX_DEC_CORRECTION = {
  mercury: { A:-42.1580, B:-136.9111, C: 0.0199, D:-41.4221, E: 114.6048, F: 63.4304, G: 63.2708, H:-37.8461, I: 37.9134, J: 0.3885, K: 0.0423, L: 99.2020, M: 112.6922, N:-43.1383, O:-99.2049, P: 0.0273, Q: 0.2542, R:-0.0850, S:-0.2322, U:-54.2725, V:-19.4364, W:-8.3356, X:-11.5504, Y: 34.6031, Z: 35.7135, AA: 19.4564, AB:-28.8159, AC: 0.0457, AD:-4.2448, AE: 7.1082, AF:-4.1742, AG:-1.8895, AH: 22.7071, AI:-30.2805, AJ: 9.3046, AK:-5.5443, AL:-1.6036, AM:-15.6155, AN: 0.0374, AO:-0.1266, AP:-15.1228, AQ: 15.2468 },
  venus:   { A: 60.7626, B:-0.8932, C:-0.0003, D: 8.4858, E: 0.0594, F: 0.0662, G: 2.9776, H:-0.0259, I: 0.0423, J:-0.0061, K: 0.0459, L:-86.6521, M:-5.2145, N: 2.9006, O: 2.1976, P:-0.0007, Q:-0.0102, R:-0.0109, S:-0.0006, U:-0.0394, V: 30.8925, W:-0.0917, X: 1.9233, Y:-1.8681, Z: 0.5894, AA:-6.1880, AB:-2.0806, AC: 0.0027, AD:-0.0097, AE:-2.0921, AF: 1.3795, AG:-1.4091, AH:-1.5356, AI: 3.8044, AJ: 0.0291, AK:-0.0026, AL:-0.0049, AM:-0.0138, AN: 0.0104, AO:-0.0242, AP:-0.0035, AQ: 0.0010 },
  mars:    { A:-6.4164, B: 12.1687, C: 0.1155, D: 13.1045, E:-0.1618, F: 0.3845, G:-4.1726, H: 0.1709, I: 0.1733, J: 0.4705, K:-0.1689, L: 18.6399, M:-0.2807, N:-7.9881, O: 0.5755, P:-0.2011, Q:-0.0960, R:-0.7092, S: 0.0746, U: 0.0690, V:-12.4622, W:-1.2951, X:-0.5755, Y:-0.1105, Z:-20.4109, AA:-20.7051, AB: 7.0557, AC: 0.2496, AD:-0.0565, AE: 11.2992 },
  jupiter: { A:-73.5513, B:-3.2419, C: 0.0059, D: 43.4228, E:-8.7702, F: 3.0187, G: 0.9644, H: 0.0303, I:-0.4094, J: 1.4245, K: 0.0492, L: 766.7635, M:-279.9261, N:-7.2380, O:-2.6774, P: 0.0018, Q:-0.0890, R:-0.9561, S: 0.0531, U: 46.1692, V:-2000.5352, W:-127.8654, X: 0.0325, Y: 8.7751, Z: 14.6272, AA: 151.9204, AB:-3.5471, AC: 0.0125, AD: 1.3448, AE: 30.9759, AF:-45.9327, AG: 0.1853, AH: 29.3256, AI:-466.0052, AJ: 0.2050, AK:-39.2636, AL: 0.0580, AM: 0.0061, AN:-4.7468, AO: 0.0540, AP: 632.7760, AQ:-79.5971 },
  saturn:  { A: 19.3183, B:-71.7532, C:-0.0114, D: 20.9244, E:-2.3648, F: 23.5618, G: 8.8020, H: 0.9145, I: 1.0635, J: 1.9590, K: 0.8763, L:-303.3555, M:-224.4044, N:-28.5406, O: 1.5343, P:-0.2085, Q:-0.3180, R:-0.1599, S: 0.2049, U:-3.6272, V: 1133.8305, W:-16.6243, X:-1.8483, Y:-1.0448, Z: 679.5758, AA:-206.8420, AB:-83.8303, AC:-0.0111, AD:-1.9587, AE: 164.8617, AF: 1.6022, AG: 11.8957, AH: 7.1487, AI: 2306.8003, AJ:-0.0220, AK:-1085.5028 },
  uranus:  { A:-12672.2828, B: 6934.6982, C:-0.5393, D:-50603.0840, E:-13789.0068, F: 2963.0081, G: 760.2826, H: 191.4876, I: 390.3497, J:-13.6654, K:-6.5028, L: 503850.8286, M: 517661.5124, N:-2889.1895, O: 9834.4182, P: 3.2428, Q: 0.3031, R: 13.4448, S: 11.3285, U: 81194.8440, V:-5153290.4849, W: 475879.5710, X:-389.4581, Y:-148.8904 },
  neptune: { A: 10.1378, B: 0.4644, C:-0.0687, D: 10.3930, E:-78.8758, F: 5.1040, G: 0.1936, H: 0.8112, I: 0.6993, J: 0.5025, K: 5.3711, L:-409.5977, M:-97.4693, N:-5.2228, O: 37.6943, P: 0.0813, Q:-0.0702, R: 5.2277, S: 2.2289, U: 1196.8445, V: 3123.7435, W:-320.1077, X:-0.5926, Y:-0.7388 },
};

const PARALLAX_RA_CORRECTION = {
  mercury: { A: 29.9373, B:-141.8915, C:-0.3745, D: 223.1667, E:-83.7866, F: 14.8033, G: 129.2616, H:-37.0042, I:-5.8496, J:-0.4423, K:-0.1005, L:-25.8042, M:-34.4669, N:-52.2653, O: 72.4357, P:-0.2917, Q: 0.0087, R: 0.0006, S: 0.3331, U: 41.5670, V:-2.6921, W: 9.2043, X:-21.3527, Y: 18.8295, Z: 64.5204, AA:-90.0162, AB:-47.1134, AC: 0.1430, AD: 4.1645, AE: 13.1357, AF:-0.3135, AG: 6.0261, AH:-17.2620, AI: 7.7483, AJ: 6.0388, AK: 0.2556, AL: 5.5120, AM:-9.0578, AN: 0.3661, AO: 0.1452, AP: 9.1992, AQ:-8.2700 },
  venus:   { A:-46.8812, B: 26.1368, C: 0.1013, D:-17.4193, E: 0.3241, F:-0.1500, G: 14.4038, H:-0.0360, I: 0.1438, J: 0.0130, K:-0.0241, L: 54.4618, M: 2.7074, N:-1.4745, O:-8.4060, P:-0.0522, Q:-0.0101, R:-0.0058, S:-0.0901, U:-0.3280, V:-14.6204, W: 0.0765, X: 5.7782, Y:-8.4576, Z:-18.9287, AA: 12.7320, AB:-10.4144, AC: 0.0353, AD:-0.0485, AE: 0.9945, AF: 6.1590, AG:-4.1848, AH: 5.9929, AI:-1.9130, AJ: 0.1064, AK: 0.0568, AL:-0.0055, AM:-0.0579, AN:-0.0061, AO: 0.0029, AP: 0.0073, AQ: 0.0561 },
  mars:    { A:-23.7562, B:-19.8881, C:-0.0277, D:-23.4088, E:-0.7352, F: 0.3822, G: 2.3764, H:-0.1699, I: 0.4596, J:-0.4940, K: 0.0549, L: 70.3115, M: 1.7161, N: 10.1081, O: 3.5030, P: 0.0385, Q: 0.0070, R: 0.2084, S:-0.0615, U:-0.6223, V:-57.7872, W: 10.2904, X:-0.0686, Y: 0.3592, Z: 34.2623, AA: 30.6410, AB:-5.2824, AC:-0.1144, AD:-0.1664, AE:-18.8861 },
  jupiter: { A: 125.9809, B: 428.3819, C:-0.0007, D:-76.7096, E:-116.3221, F: 4.8486, G:-15.9098, H: 0.8021, I:-0.2000, J: 0.6839, K:-0.1441, L:-1775.0446, M: 384.6944, N: 11.6447, O: 102.0576, P:-0.0186, Q: 0.1164, R:-0.6421, S: 1.2220, U: 608.8541, V: 5836.7557, W: 309.4468, X: 4.7879, Y:-8.2695, Z:-2241.9664, AA:-158.1944, AB: 81.3926, AC: 0.0249, AD: 0.7488, AE:-76.0449, AF: 41.0250, AG:-22.8011, AH:-345.2128, AI:-327.9101, AJ:-0.1747, AK:-63.4810, AL:-0.1419, AM: 0.0123, AN:-2.9146, AO: 0.9375, AP:-345.9905, AQ:-1015.5445 },
  saturn:  { A:-174.5075, B: 499.5903, C: 0.0144, D: 328.9628, E: 18.8700, F: 29.6207, G: 33.9681, H: 1.4136, I: 4.0316, J:-2.1042, K: 1.6970, L: 2849.4922, M:-1899.0597, N:-30.4447, O:-187.2824, P: 0.4147, Q:-0.1492, R: 0.9117, S:-4.9336, U: 19.5177, V:-11311.2243, W: 854.4562, X:-15.6528, Y:-7.5300, Z:-4749.8589, AA:-4762.7996, AB:-342.8945, AC:-0.0172, AD:-14.4017, AE: 181.9895, AF: 57.5967, AG: 133.4388, AH: 1587.2838, AI: 25506.7746, AJ:-0.3183, AK:-1585.2187 },
  uranus:  { A:-38229.6674, B: 4960.4577, C: 5.9453, D:-120998.1729, E: 6220.2812, F: 1423.4248, G: 2060.5044, H:-136.6603, I: 1184.6611, J: 54.2106, K:-1.6843, L: 1438951.7742, M: 937373.4638, N:-1817.8022, O: 148.2366, P: 8.9478, Q:-0.4125, R:-49.3113, S:-115.2873, U:-113580.5386, V:-13676015.7490, W: 1363125.1654, X:-1155.2345, Y: 193.6668 },
  neptune: { A: 2275.4256, B: 7.1156, C:-0.4272, D:-899.7306, E:-842.4176, F:-5.6762, G:-1.1987, H:-3.0633, I: 0.8780, J:-4.8029, K:-0.0684, L:-136744.9132, M: 13377.6808, N: 7.1165, O: 418.9388, P: 1.6366, Q:-0.2725, R: 4.2360, S:-5.6104, U: 12725.0083, V: 2054472.0704, W: 13708.8757, X:-1.0372, Y: 3.0446 },
};
// @AUTO:PARALLAX:END


// ─── Dynamic fitted values ───────────────────────────────────────────────
// These depend on model parameters and are built at require-time.

/**
 * Build fitted coefficients that depend on model parameters.
 * @param {object} params - { earthtiltMean, earthInvPlaneInclinationAmplitude,
 *                            earthRAAngle, earthInvPlaneInclinationMean, planets, H }
 * @returns {{ SOLSTICE_OBLIQUITY_MEAN: number, PREDICT_PLANETS: object, PREDICT_COEFFS: object, PERI_HARMONICS: Array }}
 */
function buildFittedCoefficients(params) {
  // Pythagorean obliquity mean — derived from 3D geometry (zero fitting)
  const N = 100000;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const p3 = 2 * Math.PI * t * 3, p5 = 2 * Math.PI * t * 5;
    const p8 = 2 * Math.PI * t * 8, p16 = 2 * Math.PI * t * 16;
    const e = params.earthtiltMean
      - params.earthInvPlaneInclinationAmplitude * Math.cos(p3)
      + params.earthInvPlaneInclinationAmplitude * Math.cos(p8);
    const pa = params.earthRAAngle * Math.cos(p16);
    const pb = params.earthInvPlaneInclinationMean * Math.sin(p5);
    sum += Math.sqrt(e * e + pa * pa + pb * pb);
  }
  // Use data-derived solstice mean if available (more accurate than Pythagorean time-average),
  // fall back to Pythagorean mean if the fitted constant hasn't been generated yet.
  const SOLSTICE_OBLIQUITY_MEAN = typeof SOLSTICE_OBLIQUITY_MEAN_FITTED !== 'undefined'
    ? SOLSTICE_OBLIQUITY_MEAN_FITTED
    : sum / N;

  // Per-planet prediction configs (period, theta0, baseline rate)
  const PREDICT_PLANETS = {};
  for (const [key, p] of Object.entries(params.planets)) {
    if (!p.perihelionEclipticYears || !p.longitudePerihelion) continue;
    const absPeriod = Math.abs(p.perihelionEclipticYears);
    const sign = p.perihelionEclipticYears < 0 ? -1 : 1;
    PREDICT_PLANETS[key] = {
      period: absPeriod,
      theta0: p.longitudePerihelion,
      baseline: sign * 1296000 / absPeriod * 100,
    };
  }

  // 429 coefficients per planet (loaded from Python training output)
  const PREDICT_COEFFS = {};
  const dir = path.join(__dirname, '..', 'python', 'coefficients');
  for (const p of ['mercury','venus','mars','jupiter','saturn','uranus','neptune']) {
    const file = path.join(dir, `${p}_coeffs_unified.py`);
    try {
      const content = fs.readFileSync(file, 'utf8');
      const match = content.match(/\[([^\]]+)\]/s);
      if (match) {
        PREDICT_COEFFS[p] = match[1].split('\n')
          .map(l => l.replace(/#.*$/, '').trim())
          .filter(l => l)
          .map(l => parseFloat(l.replace(/,\s*$/, '')))
          .filter(v => !isNaN(v));
      }
    } catch (e) {
      // Coefficient files may not exist in all environments
    }
  }

  // Perihelion harmonics — expand divisors to actual periods using H
  const PERI_HARMONICS = PERI_HARMONICS_RAW.map(([div, s, c]) => [params.H / div, s, c]);

  return { SOLSTICE_OBLIQUITY_MEAN, PREDICT_PLANETS, PREDICT_COEFFS, PERI_HARMONICS };
}


module.exports = {
  // Parallax corrections (attached to ASTRO_REFERENCE by constants.js)
  PARALLAX_DEC_CORRECTION,
  PARALLAX_RA_CORRECTION,

  // Static fitted arrays
  TROPICAL_YEAR_HARMONICS,
  SIDEREAL_YEAR_HARMONICS,
  ANOMALISTIC_YEAR_HARMONICS,
  PERI_HARMONICS_RAW,
  PERI_OFFSET,
  SOLSTICE_OBLIQUITY_HARMONICS,
  CARDINAL_POINT_HARMONICS,
  SOLSTICE_JD_HARMONICS,

  // Factory for dynamic values
  buildFittedCoefficients,
};
