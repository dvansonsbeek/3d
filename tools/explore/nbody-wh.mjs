// Wisdom–Holman N-body integrator in democratic-heliocentric coordinates
// (Duncan, Levison & Lee 1998) — the model's engine for Myr–Gyr planetary runs.
//
// Why: RK4 in Cartesian coordinates needs dt ≈ 0.05 d to keep Mercury's spurious
// apsidal drift at 0.01 ″/cy (measured), i.e. ~19 h per 10 Myr; a plain 4th-order
// Yoshida composition is WORSE at equal cost (−74 ″/cy at 0.25 d, measured — the
// error constant is large for e = 0.2). Wisdom–Holman splits H = H_Kepler +
// H_Sun + H_interaction: every planet's two-body motion about the Sun is solved
// EXACTLY (universal-variable Kepler step), only the planet–planet perturbation
// (∝ m_planet/M_sun ≈ 10⁻³) and the Sun's recoil are integrated by leapfrog,
// so the error is O(ε dt²) and 2–4-day steps are standard (Laskar, Mercury6).
// The Kepler part is exact by construction: a two-body run shows ZERO drift at
// any dt (test in the header of the self-test).
//
// Coordinates: Q_i = heliocentric position, V_i = barycentric velocity of
// planet i (i = 1..N; the Sun is implicit — its barycentric velocity is
// −Σ m_j V_j / M_sun). One second-order step of length h:
//   Sun-drift(h/2): Q_i += (h/2)·(Σ_j m_j V_j)/M_sun
//   Kick(h/2):      V_i += (h/2)·Σ_{j≠i} G m_j (Q_j − Q_i)/|Q_j − Q_i|³   (+ optional 1PN)
//   Kepler(h):      (Q_i, V_i) advanced around μ = G·M_sun
//   Kick(h/2), Sun-drift(h/2)
// `order: 4` composes three such steps with the Yoshida weights.
//
// MEASURED (self-test, scratchpad wh_test.mjs; 9-body Horizons seed, ϖ rates
// 1800–2100 against the RK4 dt 0.05 d reference Mercury 529.0 · Mars 1596.5 ·
// Saturn −1576.7 · Earth 1150.6):
//   two-body Mercury via keplerStep: ϖ drift ≤ 1e-6 ″/cy at dt 1, 4, 16, 88 d (exact)
//   WH order 2, dt 1 d: 529.0 / 1596.5 / −1576.7 / 1150.6, |ΔE/E| 1e-9, 0.8 s (RK4: 7 s)
//   WH order 2, dt 2 d: identical to 0.1 ″/cy, 5e-9, 0.4 s
//   WH order 2, dt 4 d: Mercury 529.2, Saturn −1577.2, 2e-8, 0.3 s
//   WH order 4, dt 4 d: 529.1, 4e-11, 0.6 s;  order 4, dt 8 d: Mercury 527.6 (too coarse)
//   WH order 4, dt 4 d, gr: Mercury 572.1 (RK4 gr: 572.0)
// Recommended: order 2, dt 2 d for ≤ 10 Myr (1 Myr ≈ 13 min); order 4, dt 4 d
// for deep-time runs. Never dt ≥ 8 d with Mercury in the system.
//
// PHYSICS CONTENT (B3 — say what the engine is, so a run's scope is not overstated):
//   included: the Sun and the eight planets as point masses (the Earth–Moon system as
//     ONE body at its barycentre), DE440 mass ratios, Newtonian gravity between all
//     pairs, optional first-post-Newtonian Sun–planet term (Schwarzschild; adds the
//     43 ″/cy at Mercury, ≈ 0.47 ″/yr to g1);
//   not included: the Moon as a separate body, the Sun's oblateness J2 (≈ 0.03 ″/cy
//     on Mercury's perihelion), asteroids (Ceres/Vesta/Pallas: sub-″/cy on Mars),
//     planet–planet 1PN cross terms (EIH; ≲ 0.01 ″/cy), tides, Earth's spin (this is
//     an ORBITAL integrator — obliquity/precession of Earth's axis are not computed).
//   consequence: the secular g/s frequencies are the standard ones to ≲ 0.01 ″/yr
//     (Laskar's long runs add the Moon and J2 mainly for Earth's spin); a single
//     trajectory beyond ~5 Myr is one realisation of a chaotic system — frequencies
//     and amplitudes are robust, phases are not; deep-time claims need an ensemble.
//
// Units: km, km/s, seconds (as tools/lib/constants.js GM values). Frame: whatever
// the input state is in (ECLIPJ2000 for the Horizons seed) — readout is the caller's.
//
// API:
//   const sim = makeWH({ gms, Y0, dt, gr = false, order = 2 })
//     gms: [GM_sun, GM_1, …, GM_N]; Y0: barycentric Float64Array [r(3N+3), v(3N+3)]
//     (the same layout the RK4 scripts use; Sun at index 0)
//   sim.step(k)           advance k steps (dt may be negative for backward runs)
//   sim.helio(i)          { r, v } heliocentric position/velocity of planet i (1-based)
//   sim.t                 elapsed time, seconds
//   sim.energy()          total energy (barycentric), for drift diagnostics
//   sim.angularMomentum() total orbital angular momentum vector
//   keplerStep(mu, r, v, dt)  the universal-variable two-body propagator (exported for tests)

const C_KM_S = 299792.458;

// Universal-variable Kepler propagator (Danby 1988 §6.9 / Stumpff functions).
// Advances (r, v) around a point mass mu by dt seconds. Exact for the two-body problem.
export function keplerStep(mu, r, v, dt) {
  const r0 = Math.hypot(r[0], r[1], r[2]);
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const rv = r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  const alpha = 2 * mu / r0 - v2;            // = mu/a  (> 0 bound)
  const sqmu = Math.sqrt(mu);
  // initial guess for the universal anomaly χ (Chobotov/Vallado)
  let chi;
  if (alpha > 1e-12 * mu / r0) chi = sqmu * dt * alpha / mu;          // elliptic: χ ≈ √μ Δt / a
  else chi = Math.sign(dt) * Math.sqrt(-mu / alpha) * Math.log((-2 * mu * alpha * dt) / (rv + Math.sign(dt) * Math.sqrt(-mu / alpha) * (1 - r0 * alpha / mu)));
  // Newton–Raphson on the universal Kepler equation with Stumpff C(z), S(z)
  let c2, c3, z, psi, r_ = r0;
  for (let it = 0; it < 60; it++) {
    psi = chi * chi * alpha / mu;   // z
    if (psi > 1e-8) { const s = Math.sqrt(psi); c2 = (1 - Math.cos(s)) / psi; c3 = (s - Math.sin(s)) / (s * psi); }
    else if (psi < -1e-8) { const s = Math.sqrt(-psi); c2 = (1 - Math.cosh(s)) / psi; c3 = (Math.sinh(s) - s) / (s * (-psi)); }
    else { c2 = 0.5 - psi / 24 + psi * psi / 720; c3 = 1 / 6 - psi / 120 + psi * psi / 5040; }
    const chi2 = chi * chi, chi3 = chi2 * chi;
    const F = rv / sqmu * chi2 * c2 + (1 - alpha * r0 / mu) * chi3 * c3 + r0 * chi - sqmu * dt;
    r_ = rv / sqmu * chi * (1 - psi * c3) + (1 - alpha * r0 / mu) * chi2 * c2 + r0;
    const d = F / r_;
    chi -= d;
    if (Math.abs(d) < 1e-13 * Math.abs(chi) + 1e-16) break;
  }
  z = chi * chi * alpha / mu;
  const chi2 = chi * chi, chi3 = chi2 * chi;
  const f = 1 - chi2 / r0 * c2, g = dt - chi3 / sqmu * c3;
  const rn = [f * r[0] + g * v[0], f * r[1] + g * v[1], f * r[2] + g * v[2]];
  const rnn = Math.hypot(rn[0], rn[1], rn[2]);
  const fdot = sqmu / (rnn * r0) * chi * (z * c3 - 1), gdot = 1 - chi2 / rnn * c2;
  const vn = [fdot * r[0] + gdot * v[0], fdot * r[1] + gdot * v[1], fdot * r[2] + gdot * v[2]];
  return { r: rn, v: vn };
}

export function makeWH({ gms, Y0, dt, gr = false, order = 2, extraForces = [] }) {
  // extraForces: [accel(rHelio, vHelio, tSec, GM_S) → km/s²] from nbody-forces.mjs,
  // applied in the kick to every planet (reaction on the Sun by momentum conservation)
  const N = gms.length - 1, GM_S = gms[0];
  const m = gms.slice(1);
  // democratic heliocentric state from the barycentric Y0
  const Q = new Float64Array(3 * N), V = new Float64Array(3 * N);
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) { Q[3 * i + c] = Y0[3 * (i + 1) + c] - Y0[c]; V[3 * i + c] = Y0[3 * (N + 1) + 3 * (i + 1) + c]; }
  const A = new Float64Array(3 * N);
  let t = 0;

  function sunDrift(h) {
    let px = 0, py = 0, pz = 0;
    for (let j = 0; j < N; j++) { px += m[j] * V[3 * j]; py += m[j] * V[3 * j + 1]; pz += m[j] * V[3 * j + 2]; }
    const fx = h * px / GM_S, fy = h * py / GM_S, fz = h * pz / GM_S;
    for (let i = 0; i < N; i++) { Q[3 * i] += fx; Q[3 * i + 1] += fy; Q[3 * i + 2] += fz; }
  }
  function kick(h) {
    A.fill(0);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = Q[3 * j] - Q[3 * i], dy = Q[3 * j + 1] - Q[3 * i + 1], dz = Q[3 * j + 2] - Q[3 * i + 2];
      const d2 = dx * dx + dy * dy + dz * dz, id3 = 1 / (d2 * Math.sqrt(d2));
      A[3 * i] += m[j] * dx * id3; A[3 * i + 1] += m[j] * dy * id3; A[3 * i + 2] += m[j] * dz * id3;
      A[3 * j] -= m[i] * dx * id3; A[3 * j + 1] -= m[i] * dy * id3; A[3 * j + 2] -= m[i] * dz * id3;
    }
    if (gr) {
      // 1PN (Schwarzschild) term of the Sun's field on each planet, heliocentric r, v
      let sx = 0, sy = 0, sz = 0; for (let j = 0; j < N; j++) { sx += m[j] * V[3 * j]; sy += m[j] * V[3 * j + 1]; sz += m[j] * V[3 * j + 2]; }
      const vsx = -sx / GM_S, vsy = -sy / GM_S, vsz = -sz / GM_S;
      const C2 = C_KM_S * C_KM_S;
      for (let i = 0; i < N; i++) {
        const rx = Q[3 * i], ry = Q[3 * i + 1], rz = Q[3 * i + 2];
        const vx = V[3 * i] - vsx, vy = V[3 * i + 1] - vsy, vz = V[3 * i + 2] - vsz;
        const r2 = rx * rx + ry * ry + rz * rz, r = Math.sqrt(r2), v2 = vx * vx + vy * vy + vz * vz, rvv = rx * vx + ry * vy + rz * vz;
        const k = GM_S / (C2 * r2 * r), fr = 4 * GM_S / r - v2, fv = 4 * rvv;
        A[3 * i] += k * (fr * rx + fv * vx); A[3 * i + 1] += k * (fr * ry + fv * vy); A[3 * i + 2] += k * (fr * rz + fv * vz);
      }
    }
    if (extraForces.length) {
      let sx = 0, sy = 0, sz = 0; for (let j = 0; j < N; j++) { sx += m[j] * V[3 * j]; sy += m[j] * V[3 * j + 1]; sz += m[j] * V[3 * j + 2]; }
      const vs = [-sx / GM_S, -sy / GM_S, -sz / GM_S];
      for (let i = 0; i < N; i++) {
        const r = [Q[3 * i], Q[3 * i + 1], Q[3 * i + 2]], v = [V[3 * i] - vs[0], V[3 * i + 1] - vs[1], V[3 * i + 2] - vs[2]];
        for (const f of extraForces) { const a = f(r, v, t, GM_S); A[3 * i] += a[0]; A[3 * i + 1] += a[1]; A[3 * i + 2] += a[2]; }
      }
    }
    for (let i = 0; i < 3 * N; i++) V[i] += h * A[i];
  }
  function kepler(h) {
    for (let i = 0; i < N; i++) {
      const o = keplerStep(GM_S, [Q[3 * i], Q[3 * i + 1], Q[3 * i + 2]], [V[3 * i], V[3 * i + 1], V[3 * i + 2]], h);
      Q[3 * i] = o.r[0]; Q[3 * i + 1] = o.r[1]; Q[3 * i + 2] = o.r[2]; V[3 * i] = o.v[0]; V[3 * i + 1] = o.v[1]; V[3 * i + 2] = o.v[2];
    }
  }
  function step2(h) { sunDrift(h / 2); kick(h / 2); kepler(h); kick(h / 2); sunDrift(h / 2); }
  const W1 = 1 / (2 - Math.cbrt(2)), W0 = -Math.cbrt(2) / (2 - Math.cbrt(2));
  function step4(h) { step2(W1 * h); step2(W0 * h); step2(W1 * h); }
  const stepOne = order === 4 ? step4 : step2;

  function sunVel() { let sx = 0, sy = 0, sz = 0; for (let j = 0; j < N; j++) { sx += m[j] * V[3 * j]; sy += m[j] * V[3 * j + 1]; sz += m[j] * V[3 * j + 2]; } return [-sx / GM_S, -sy / GM_S, -sz / GM_S]; }

  return {
    get t() { return t; },
    step(k = 1) { for (let s = 0; s < k; s++) { stepOne(dt); t += dt; } },
    helio(i) { const vs = sunVel(); const j = i - 1; return { r: [Q[3 * j], Q[3 * j + 1], Q[3 * j + 2]], v: [V[3 * j] - vs[0], V[3 * j + 1] - vs[1], V[3 * j + 2] - vs[2]] }; },
    energy() {
      const vs = sunVel(); let E = 0.5 * GM_S * (vs[0] * vs[0] + vs[1] * vs[1] + vs[2] * vs[2]);
      for (let i = 0; i < N; i++) { E += 0.5 * m[i] * (V[3 * i] ** 2 + V[3 * i + 1] ** 2 + V[3 * i + 2] ** 2) - GM_S * m[i] / Math.hypot(Q[3 * i], Q[3 * i + 1], Q[3 * i + 2]); for (let j = i + 1; j < N; j++) E -= m[i] * m[j] / Math.hypot(Q[3 * i] - Q[3 * j], Q[3 * i + 1] - Q[3 * j + 1], Q[3 * i + 2] - Q[3 * j + 2]); }
      return E;
    },
    angularMomentum() {
      // barycentric positions: r_sun = −Σ m Q / M_tot, r_i = Q_i + r_sun
      let cx = 0, cy = 0, cz = 0; for (let j = 0; j < N; j++) { cx += m[j] * Q[3 * j]; cy += m[j] * Q[3 * j + 1]; cz += m[j] * Q[3 * j + 2]; }
      const Mt = GM_S + m.reduce((s, x) => s + x, 0), rs = [-cx / Mt, -cy / Mt, -cz / Mt], vs = sunVel();
      const L = [GM_S * (rs[1] * vs[2] - rs[2] * vs[1]), GM_S * (rs[2] * vs[0] - rs[0] * vs[2]), GM_S * (rs[0] * vs[1] - rs[1] * vs[0])];
      for (let i = 0; i < N; i++) { const r = [Q[3 * i] + rs[0], Q[3 * i + 1] + rs[1], Q[3 * i + 2] + rs[2]], v = [V[3 * i], V[3 * i + 1], V[3 * i + 2]]; L[0] += m[i] * (r[1] * v[2] - r[2] * v[1]); L[1] += m[i] * (r[2] * v[0] - r[0] * v[2]); L[2] += m[i] * (r[0] * v[1] - r[1] * v[0]); }
      return L;
    },
  };
}
