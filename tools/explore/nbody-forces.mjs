// EXTRA-FORCE PLUGINS for the model's N-body engines (plan IP-two-engine-model,
// "extend the list of forces"). Each factory returns a function
//   accel(rHelio_km[3], vHelio_kmps[3], tSec, GM_S) → [ax, ay, az]  (km/s²)
// giving the ADDITIONAL heliocentric acceleration on a planet beyond point-mass
// gravity. The audit (RK4, present-epoch rates) and the Wisdom–Holman engine (long
// runs) both apply the list; the reaction on the Sun is applied by the caller.
//
// ACCEPTANCE RULES for any candidate meant to explain something (the 43, the
// 8H frequencies): after adding it, (1) every 1800–2100 perihelion and node rate
// must stay inside the audit's scatter — nodes within 0.1 ″/cy, inner-planet
// perihelia within a few ″/cy — because those are ephemeris-constrained by
// ranging; (2) it must then move the quantity it is meant to move (Mercury's 43
// with nothing else; or the secular frequencies toward 8H/N). Rule (1) is a
// 7-second run per candidate (`perihelion-observation-audit.mjs extra=…`).
//
// Reference candidates (calibrate the instrument; sizes are known):
//   j2:<J2>              solar oblateness, pole at the Sun's rotation axis
//                        (ecliptic pole tilted 7.25° toward node 75.76°); J2 ≈ 2.2e-7
//                        (helioseismology) → ≈ 0.03 ″/cy on Mercury's perihelion.
//   ring:<M/Msun>@<AU>   a uniform asteroid ring of total mass M at radius a (12
//                        equal masses on a circle, rotating at the Kepler rate);
//                        the whole belt ≈ 2e-9 Msun at ≈ 2.8 AU → sub-″/cy.
//   yukawa:<alpha>@<AU>  a fifth-force modification a = −(GM/r²)·α(1 + r/λ)e^{−r/λ} r̂
//                        (Fischbach form) — radial, node-neutral, distance-selective:
//                        the textbook shape a "Mercury-preferential" term would need.
//                        Ranging bounds |α| ≲ 1e-10 at λ ~ 1 AU; here it is a probe.
// A user candidate is one more factory in FORCES.
//
// MEASURED (perihelion-observation-audit.mjs extra=…, 1800–2100, N-body − DE, ″/cy):
//   j2:2.2e-7            no visible change (Mercury −43.0, nodes 0.0) — as expected
//   ring:2e-9@2.8        no visible change — as expected
//   yukawa:1e-8@0.4      Mercury +0.9, Venus +0.6, Earth +0.3, Mars +0.1 (linear in α)
//   yukawa:4.8e-7@0.4    Mercury +2.2 ✓ but Venus +18.8, Earth +9.6, Mars +4.0 — fails
//   yukawa:2.9e-7@0.2    Mercury −0.9, Venus +2.5, Earth −3.2, Mars −1.1 — ALL FOUR inner
//                        planets inside the scatter, nodes untouched (radial): at the
//                        present epoch a short-range radial force is DEGENERATE with the
//                        1PN term on the planets' perihelia. Discriminators lie elsewhere:
//                        Icarus (perihelion 0.19 AU, tp=icarus), Kepler-III consistency
//                        of the mean motions (a Yukawa changes the effective GM with
//                        distance by α(1 + r/λ)e^{−r/λ}), the Shapiro delay, LLR.
//   ICARUS (tp=icarus, massless test particle, 1800–2100): Newton 131.3; +1PN 141.4
//                        (+10.1 — GR's value to the digit); +yukawa:2.9e-7@0.2 139.7
//                        (+8.4). Leans against the Yukawa, marginal at the ±2 currently
//                        carried for the 1968/1971 radar result.
//   KEPLER-III (audit diagnostic n²ā³/GM − 1, differences between runs): the tuned
//                        Yukawa shifts Mercury's implied GM by +5.0e-7, Venus +1.4e-7,
//                        Earth +5e-8, Mars ~0 relative to the outer planets; the 1PN
//                        term shifts Mercury by −3.1e-7 (its known mean-motion effect,
//                        modelled in the ephemerides). Ranging fits all planets with ONE
//                        GM to ~1e-10 → a 5e-7 planet-dependent GM is excluded by ~10³.
//   BOUND (the general result of this sandbox): the 1800–2100 perihelion and node rates
//                        limit any added force's effect on each planet's ϖ̇ to a few
//                        ″/cy (nodes: 0.1). The secular frequencies are the long-term
//                        averages of those very rates, so no added force can move them
//                        by more than ~1 % — the outer-planet 8H/N values are 40–70 %
//                        away. A force that reaches 8H/N at deep time while leaving the
//                        present rates alone would have to be zero now and large later.

const AU_KM = 149597870.7;
const R_SUN_KM = 696000;
const D2R = Math.PI / 180;

export const FORCES = {
  j2(J2) {
    // Sun's rotation axis in ECLIPJ2000: node Ω = 75.76°, inclination 7.25°
    const Om = 75.76 * D2R, inc = 7.25 * D2R;
    const n = [Math.sin(inc) * Math.sin(Om), -Math.sin(inc) * Math.cos(Om), Math.cos(inc)];
    return (r, v, t, GM_S) => {
      const r2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2], rn = Math.sqrt(r2), ir = 1 / rn;
      const rx = r[0] * ir, ry = r[1] * ir, rz = r[2] * ir;
      const c = rx * n[0] + ry * n[1] + rz * n[2];
      const k = 1.5 * J2 * GM_S * R_SUN_KM * R_SUN_KM / (r2 * r2);
      const f5 = 5 * c * c - 1;
      return [k * (f5 * rx - 2 * c * n[0]), k * (f5 * ry - 2 * c * n[1]), k * (f5 * rz - 2 * c * n[2])];
    };
  },
  ring(massRatio, aAU) {
    const N = 12, aKm = aAU * AU_KM;
    return (r, v, t, GM_S) => {
      const gm = GM_S * massRatio / N, w = Math.sqrt(GM_S / (aKm * aKm * aKm));   // ring particles rotate at the Kepler rate
      let ax = 0, ay = 0, az = 0;
      for (let k = 0; k < N; k++) {
        const th = w * t + 2 * Math.PI * k / N, px = aKm * Math.cos(th), py = aKm * Math.sin(th);
        const dx = px - r[0], dy = py - r[1], dz = -r[2], d2 = dx * dx + dy * dy + dz * dz, id3 = 1 / (d2 * Math.sqrt(d2));
        ax += gm * dx * id3; ay += gm * dy * id3; az += gm * dz * id3;
      }
      return [ax, ay, az];
    };
  },
  ebound(tauKyr) {
    const tauSec = tauKyr * 1000 * 365.25 * 86400;
    return (r, v, t, GM_S) => {
      const rAU = Math.hypot(...r) / AU_KM;
      if (rAU < 0.9 || rAU > 1.1 || !EBOUND_TARGET) return [0, 0, 0];   // Earth only
      const year = 2000 + t / (365.25 * 86400);
      const de = EBOUND_TARGET(year) - osculE(r, v, GM_S);
      // ∇_v e, numerically; project out v̂ so the force does no work
      const dv = 1e-6 * Math.hypot(...v), g = [0, 0, 0];
      for (let c = 0; c < 3; c++) { const vp = [...v]; vp[c] += dv; const vm = [...v]; vm[c] -= dv; g[c] = (osculE(r, vp, GM_S) - osculE(r, vm, GM_S)) / (2 * dv); }
      const vn = Math.hypot(...v), vh = [v[0] / vn, v[1] / vn, v[2] / vn];
      const dot = g[0] * vh[0] + g[1] * vh[1] + g[2] * vh[2];
      const p = [g[0] - dot * vh[0], g[1] - dot * vh[1], g[2] - dot * vh[2]];
      const pn = Math.hypot(...p); if (pn < 1e-12) return [0, 0, 0];
      const mag = 2 * vn / tauSec * de;   // km/s²; sign via de
      eboundDiag.samples++; eboundDiag.sumAccel += Math.abs(mag); if (Math.abs(mag) > eboundDiag.maxAccel) eboundDiag.maxAccel = Math.abs(mag);
      return [mag * p[0] / pn, mag * p[1] / pn, mag * p[2] / pn];
    };
  },
  // pibound:<tauKyr> — the APSIDAL-RATE BOUND (owner's J/S question, 2026-08-31):
  // hold a planet's perihelion longitude on the model's lattice line
  // θ(t) = θ0 + ϖ̇_target·t instead of letting the secular epicycle set it.
  // Work-free ⊥v force along ∇_v θ (θ = e-vector angle in the integration
  // plane), magnitude ∝ wrapped angle error / τ. Per-planet targets via
  // setPiboundTargets (matched by osculating a). NOTE: a pure apse rotation at
  // fixed a, e, i changes neither energy nor angular momentum — unlike ebound
  // this bound needs NO reservoir in the secular limit; the experiment verifies
  // the instantaneous leak. Angle error capped at ±0.5 rad (start-up safety).
  // DIRECTION: d ∝ ĥ × v̂ — the IN-PLANE normal to the velocity. Work-free
  // (d·v = 0), zero out-of-plane component (no inclination/node pumping), and
  // its z-torque ∝ (r·v) — sign-alternating outbound/inbound, so it orbit-
  // averages to ~0 when the gain varies on τ ≫ the orbital period. Two wrong
  // directions measured first: the raw ⊥v-projected ∇_v θ has a vertical
  // component (ΔL/L 1.4e-4 in 2 kyr — L_x/L_y pumping); the pointwise
  // z-torque-free line v×(ẑ×r) is mostly VERTICAL and pumped ΔL/L to 1.2e-2.
  // Sign from the ∇_v θ slope along d (feedback absorbs the phase-varying efficiency).
  // ERROR LOW-PASS (T_f = 50 yr, state on the target object): the raw error is
  // dominated by the 19.9-yr J/S synodic wiggle — orbit-period-scale gain
  // variation defeats the (r·v) torque cancellation (leak 9.7e-5 in 2 kyr,
  // measured). Filtering makes the steering secular-only: the free wiggles ride
  // through untouched (they are the model plots' blue oscillation) and the
  // in-window force falls to the secular-authority level.
  // MEASURED (60 kyr, tau=2, dt=2, gr on; targets +1746.5 / −3421.9 ″/cy):
  // tracking Jupiter 1745.9, Saturn −3416.1 — the hold works. Price: force mean
  // 6.7e-9 / max 3.2e-8 m/s², IN-WINDOW (first 300 yr) mean 5.9e-9 — NOT zero
  // today (the lattice lines leave the free secular path within decades); the
  // physics floor ~e·v·Δϖ̇/2 ≈ 1e-10 m/s² is excluded by Cassini-era ranging
  // unless the target is gated to follow the free path through the observed era.
  // ΔL/L 1.5e-5 (vs control 1.9e-11) — the low-pass reduced, not removed, the leak.
  // Saturn's e parks high (0.09–0.10 vs free 0.017–0.087 exchange). THE BIG ONE:
  // the imposed Jupiter rate 17.465 ″/yr lands between g3 = 17.37 and g4 = 17.92
  // — nearly ON the Earth/Mars eigenfrequency pair — and resonantly pumps the
  // terrestrial region: Mars Δe grows monotonically to 6.9e-2 in 60 kyr
  // (Venus 1.3e-2, Earth 4.6e-3, also growing). Holding Jupiter's apse on the
  // lattice line destabilises Mars unless Mars is bounded too.
  pibound(tauKyr) {
    const tauSec = tauKyr * 1000 * 365.25 * 86400;
    return (r, v, t, GM_S) => {
      if (!PIB.targets) return [0, 0, 0];
      const rn = Math.hypot(...r), vn2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
      const aAU = 1 / (2 / rn - vn2 / GM_S) / AU_KM;
      let tgt = null;
      for (const q of PIB.targets) if (Math.abs(aAU - q.aRefAU) < 0.12 * q.aRefAU) { tgt = q; break; }
      if (!tgt) return [0, 0, 0];
      const yr = t / (365.25 * 86400);
      // GATE: before gateYr the force is exactly zero (the target rides the free
      // path through the observed era); at the first call past the gate the line
      // is latched to the CURRENT osculating angle, so the bound continues from
      // wherever the free dynamics is — no step, no in-window footprint at all.
      if (tgt.gateYr) {
        if (yr < tgt.gateYr) return [0, 0, 0];
        if (tgt.t0 === undefined) { tgt.t0 = yr; tgt.theta0 = osculTheta(r, v, GM_S); }
      }
      let d = tgt.theta0 + tgt.rateRadPerYr * (yr - (tgt.t0 || 0)) - osculTheta(r, v, GM_S);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (d > 0.5) d = 0.5; else if (d < -0.5) d = -0.5;
      const Tf = 50;   // yr
      if (tgt.lastYr === undefined) { tgt.errF = 0; tgt.lastYr = yr; }
      const dtYr = yr - tgt.lastYr; tgt.lastYr = yr;
      if (dtYr > 0) tgt.errF += (d - tgt.errF) * Math.min(1, dtYr / Tf);
      d = tgt.errF;
      if (d === 0) return [0, 0, 0];
      // direction ĥ × v̂: in-plane, ⊥ v
      const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
      const d0 = [h[1] * v[2] - h[2] * v[1], h[2] * v[0] - h[0] * v[2], h[0] * v[1] - h[1] * v[0]];
      const d0n = Math.hypot(...d0); if (d0n < 1e-12) return [0, 0, 0];
      const dh = [d0[0] / d0n, d0[1] / d0n, d0[2] / d0n];
      // sign: does +dh advance θ? numeric directional derivative
      const vn = Math.sqrt(vn2), dv = 1e-6 * vn;
      const vp = [v[0] + dv * dh[0], v[1] + dv * dh[1], v[2] + dv * dh[2]];
      const vm = [v[0] - dv * dh[0], v[1] - dv * dh[1], v[2] - dv * dh[2]];
      let slope = osculTheta(r, vp, GM_S) - osculTheta(r, vm, GM_S);
      slope = Math.atan2(Math.sin(slope), Math.cos(slope));
      if (Math.abs(slope) < 1e-15) return [0, 0, 0];
      const mag = 2 * vn / tauSec * d * Math.sign(slope);
      eboundDiag.samples++; eboundDiag.sumAccel += Math.abs(mag); if (Math.abs(mag) > eboundDiag.maxAccel) eboundDiag.maxAccel = Math.abs(mag);
      return [mag * dh[0], mag * dh[1], mag * dh[2]];
    };
  },
  // zbound:<tauKyr> — THE SHAPE BOUND (the "stable universe" build, 2026-08-31):
  // hold each planet's full eccentricity VECTOR z = e·e^{iϖ} on a target that is
  // a sum of epicycles at LATTICE-COMB frequencies, z_t(t) = Σ A_k e^{i ω_k t},
  // with A_k (complex) from the NAFF fit of the model's own free run and each
  // ω_k snapped to the nearest comb line 2πN/(8H). This is the generalisation of
  // the model's own Earth e-law (base·(1+cosθ/2) on H/3 ≡ a two-mode epicycle
  // with A1/A0 = 1/2) to every planet — and unlike the rate bound (pibound) it
  // keeps each planet's phase moving with its own multi-mode sum, so no planet
  // is dragged across another's eigenfrequency (the Mars killer). Force = the
  // ebound e-direction × de + the pibound in-plane direction × dθ, both errors
  // low-passed (50 yr, secular-only), both work-free. Targets via
  // setZboundTargets; gate = zero force before gateYr.
  zbound(tauKyr) {
    const tauSec = tauKyr * 1000 * 365.25 * 86400;
    return (r, v, t, GM_S) => {
      if (!ZB.targets) return [0, 0, 0];
      const rn = Math.hypot(...r), vn2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
      const aAU = 1 / (2 / rn - vn2 / GM_S) / AU_KM;
      let tgt = null, ti = -1;
      for (const [i, q] of ZB.targets.entries()) if (Math.abs(aAU - q.aRefAU) < 0.12 * q.aRefAU) { tgt = q; ti = i; break; }
      if (!tgt) return [0, 0, 0];
      // kick-phase counter BEFORE any early return, so the one-kick-lag rotation
      // stays aligned through the gate period. The counter-torque is LOW-PASSED
      // (50 yr): a kick-rate compensator chases the steering loops (measured
      // 8.1e-6 → 1.3e-3, 160× WORSE) because every planet here is itself
      // z-steered — the slow version cancels only the secular (DC) torque leak.
      const yrNow = t / (365.25 * 86400);
      if (ZB.shares && ++ZB.call % ZB.targets.length === 1) {
        const dtK = ZB.lastYr === undefined ? 0 : yrNow - ZB.lastYr; ZB.lastYr = yrNow;
        if (ZB.tzSlow === undefined) ZB.tzSlow = 0;
        if (dtK > 0) ZB.tzSlow += (ZB.tzCur - ZB.tzSlow) * Math.min(1, dtK / 50);
        ZB.tzPrev = ZB.tzSlow; ZB.tzCur = 0;
      }
      const yr = yrNow;
      if (tgt.gateYr && yr < tgt.gateYr) return [0, 0, 0];
      let kT = 0, hT = 0;
      for (const md of tgt.modes) { const c = Math.cos(md.w * yr), s = Math.sin(md.w * yr); kT += md.re * c - md.im * s; hT += md.im * c + md.re * s; }
      const eT = Math.hypot(kT, hT);
      let de = eT - osculE(r, v, GM_S);
      let dth = Math.atan2(hT, kT) - osculTheta(r, v, GM_S);
      dth = Math.atan2(Math.sin(dth), Math.cos(dth));
      if (dth > 0.5) dth = 0.5; else if (dth < -0.5) dth = -0.5;
      const Tf = tgt.filterYr || 50;
      if (tgt.lastYr === undefined) { tgt.deF = 0; tgt.dthF = 0; tgt.lastYr = yr; }
      const dtYr = yr - tgt.lastYr; tgt.lastYr = yr;
      if (dtYr > 0) { const g = Math.min(1, dtYr / Tf); tgt.deF += (de - tgt.deF) * g; tgt.dthF += (dth - tgt.dthF) * g; }
      de = tgt.deF; dth = tgt.dthF;
      if (de === 0 && dth === 0) return [0, 0, 0];
      const vn = Math.sqrt(vn2), vh = [v[0] / vn, v[1] / vn, v[2] / vn];
      const out = [0, 0, 0];
      if (de !== 0) {   // e-direction: ∇_v e projected ⊥ v (ebound construction)
        const dv = 1e-6 * vn, g = [0, 0, 0];
        for (let c = 0; c < 3; c++) { const vp = [...v]; vp[c] += dv; const vm = [...v]; vm[c] -= dv; g[c] = (osculE(r, vp, GM_S) - osculE(r, vm, GM_S)) / (2 * dv); }
        const dot = g[0] * vh[0] + g[1] * vh[1] + g[2] * vh[2];
        const p = [g[0] - dot * vh[0], g[1] - dot * vh[1], g[2] - dot * vh[2]];
        const pn = Math.hypot(...p);
        if (pn > 1e-12) { const mag = 2 * vn / tauSec * de; for (let c = 0; c < 3; c++) out[c] += mag * p[c] / pn; }
      }
      if (dth !== 0) {   // θ-direction: in-plane ĥ × v̂ (pibound construction)
        const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
        const d0 = [h[1] * v[2] - h[2] * v[1], h[2] * v[0] - h[0] * v[2], h[0] * v[1] - h[1] * v[0]];
        const d0n = Math.hypot(...d0);
        if (d0n > 1e-12) {
          const dh = [d0[0] / d0n, d0[1] / d0n, d0[2] / d0n];
          const dv = 1e-6 * vn;
          const vp = [v[0] + dv * dh[0], v[1] + dv * dh[1], v[2] + dv * dh[2]];
          const vm = [v[0] - dv * dh[0], v[1] - dv * dh[1], v[2] - dv * dh[2]];
          let slope = osculTheta(r, vp, GM_S) - osculTheta(r, vm, GM_S);
          slope = Math.atan2(Math.sin(slope), Math.cos(slope));
          if (Math.abs(slope) > 1e-15) { const mag = 2 * vn / tauSec * dth * Math.sign(slope); for (let c = 0; c < 3; c++) out[c] += mag * dh[c]; }
        }
      }
      const m = Math.hypot(...out);
      eboundDiag.samples++; eboundDiag.sumAccel += m; if (m > eboundDiag.maxAccel) eboundDiag.maxAccel = m;
      if (ZB.shares) {
        // book the steering force's z-torque (GM-weighted), then add this
        // planet's share of the PREVIOUS kick's counter-torque along its
        // work-free e-gradient direction (compensator torque is not re-booked)
        ZB.tzCur += tgt.gm * (r[0] * out[1] - r[1] * out[0]);
        const share = ZB.shares[ti];
        if (share && ZB.tzPrev !== 0) {
          const dv = 1e-6 * vn, g = [0, 0, 0];
          for (let c = 0; c < 3; c++) { const vp = [...v]; vp[c] += dv; const vm = [...v]; vm[c] -= dv; g[c] = (osculE(r, vp, GM_S) - osculE(r, vm, GM_S)) / (2 * dv); }
          const dot = g[0] * vh[0] + g[1] * vh[1] + g[2] * vh[2];
          const p = [g[0] - dot * vh[0], g[1] - dot * vh[1], g[2] - dot * vh[2]];
          const pn = Math.hypot(...p);
          if (pn > 1e-12) {
            const d = [p[0] / pn, p[1] / pn, p[2] / pn];
            const tzPerUnit = tgt.gm * (r[0] * d[1] - r[1] * d[0]);
            if (Math.abs(tzPerUnit) > 1e-30) {
              const k = -share * ZB.tzPrev / tzPerUnit;
              out[0] += k * d[0]; out[1] += k * d[1]; out[2] += k * d[2];
            }
          }
        }
      }
      return out;
    };
  },
  // eboundpair:<tauKyr> — the LAW-5 VARIANT: the same bound on Earth, with the
  // angular momentum delivered to SATURN through a matching work-free force, so
  // the system's total L_z is conserved (the model's eccentricity-balance written
  // as a mechanism). Relies on the engines calling the plugin per planet in
  // ascending order (Earth at ~1 AU before Saturn at ~9.5 AU within each kick);
  // the Earth call stores its torque, the Saturn call cancels it. Masses via
  // setEboundPairMasses. Off-plane (x,y) torque components are not cancelled —
  // the residual is reported by the experiment.
  // MEASURED (60 kyr, tau=2, dt=2, gr on): total-L leak 8.4e-8 (single) →
  // 7.1e-10 (pair; control 1.9e-11) — 99 % closed. Earth tracking unchanged
  // (0.0075 at the +25-kyr pass). Saturn's cost: |Δe_S| ≤ 1.1e-5, oscillating,
  // matching the ledger prediction Δe_S ≈ ΔL/(L_S·e_S) with L_S ≈ 294·L_E —
  // Saturn is a nearly free reservoir for Earth's entire bounded-e budget.
  eboundpair(tauKyr) {
    const single = FORCES.ebound(tauKyr);
    return (r, v, t, GM_S) => {
      const rAU = Math.hypot(...r) / AU_KM;
      if (rAU >= 0.9 && rAU <= 1.1) {
        const a = single(r, v, t, GM_S);
        PAIR.tz = PAIR.gmE * (r[0] * a[1] - r[1] * a[0]);   // GM-weighted z-torque of Earth's kick
        return a;
      }
      if (rAU >= 8.5 && rAU <= 10.5 && PAIR.tz !== 0) {
        // Saturn: work-free e-gradient direction, scaled to cancel the stored z-torque
        const dv = 1e-6 * Math.hypot(...v), g = [0, 0, 0];
        for (let c = 0; c < 3; c++) { const vp = [...v]; vp[c] += dv; const vm = [...v]; vm[c] -= dv; g[c] = (osculE(r, vp, GM_S) - osculE(r, vm, GM_S)) / (2 * dv); }
        const vn = Math.hypot(...v), vh = [v[0] / vn, v[1] / vn, v[2] / vn];
        const dot = g[0] * vh[0] + g[1] * vh[1] + g[2] * vh[2];
        const p = [g[0] - dot * vh[0], g[1] - dot * vh[1], g[2] - dot * vh[2]];
        const pn = Math.hypot(...p); if (pn < 1e-12) return [0, 0, 0];
        const d = [p[0] / pn, p[1] / pn, p[2] / pn];
        const tzPerUnit = PAIR.gmS * (r[0] * d[1] - r[1] * d[0]);
        if (Math.abs(tzPerUnit) < 1e-30) return [0, 0, 0];
        const k = -PAIR.tz / tzPerUnit;
        PAIR.tz = 0;
        return [k * d[0], k * d[1], k * d[2]];
      }
      return [0, 0, 0];
    };
  },
  // eboundlaw5:<tauKyr> — the DISTRIBUTED Law-5 variant: Earth's counter-torque
  // is spread over the seven other planets in proportion to the balance-law
  // weight w_j = √m_j · a_j^(3/2) / √d_j (shipped d values; shares: Saturn 37.1 %,
  // Neptune 26.0 %, Jupiter 21.2 %, Uranus 15.6 %, inner three < 0.1 % — the
  // model's own weights shield the well-measured inner system). Each compensator
  // is the same work-free ⊥v e-gradient force, scaled to its share of the torque
  // Earth stored one kick earlier (uniform one-kick lag via a call counter — the
  // telescoping sum leaves only the final kick uncompensated). Planets are
  // identified by osculating semi-major axis; weights via setEboundLaw5.
  // MEASURED (60 kyr, tau=2, dt=2, gr on): total-L leak 1.5e-10 — BETTER than
  // the Saturn-only pair (7.1e-10; control 1.9e-11), distributing averages the
  // x,y residual down. Per-planet price: Jupiter ≤ 1.4e-6, Saturn ≤ 2.4e-6,
  // Uranus ≤ 4.9e-6, Neptune ≤ 2.9e-5 (largest share on the smallest L_z, e).
  // Earth tracking and the Venus/Mars side effects identical to `ebound`.
  eboundlaw5(tauKyr) {
    const single = FORCES.ebound(tauKyr);
    return (r, v, t, GM_S) => {
      if (++LAW5.call % LAW5.nPlanets === 1) { LAW5.tzPrev = LAW5.tzCur; LAW5.tzCur = 0; }
      const rn = Math.hypot(...r), vn2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
      const aAU = 1 / (2 / rn - vn2 / GM_S) / AU_KM;
      let bi = 0; for (let i = 1; i < LAW5.refA.length; i++) if (Math.abs(aAU - LAW5.refA[i]) < Math.abs(aAU - LAW5.refA[bi])) bi = i;
      if (bi === 2) {                                       // Earth: the bound itself
        const a = single(r, v, t, GM_S);
        LAW5.tzCur = LAW5.gms[2] * (r[0] * a[1] - r[1] * a[0]);
        return a;
      }
      const share = LAW5.shares[bi];
      if (!share || LAW5.tzPrev === 0) return [0, 0, 0];
      const dv = 1e-6 * Math.sqrt(vn2), g = [0, 0, 0];
      for (let c = 0; c < 3; c++) { const vp = [...v]; vp[c] += dv; const vm = [...v]; vm[c] -= dv; g[c] = (osculE(r, vp, GM_S) - osculE(r, vm, GM_S)) / (2 * dv); }
      const vn = Math.sqrt(vn2), vh = [v[0] / vn, v[1] / vn, v[2] / vn];
      const dot = g[0] * vh[0] + g[1] * vh[1] + g[2] * vh[2];
      const p = [g[0] - dot * vh[0], g[1] - dot * vh[1], g[2] - dot * vh[2]];
      const pn = Math.hypot(...p); if (pn < 1e-12) return [0, 0, 0];
      const d = [p[0] / pn, p[1] / pn, p[2] / pn];
      const tzPerUnit = LAW5.gms[bi] * (r[0] * d[1] - r[1] * d[0]);
      if (Math.abs(tzPerUnit) < 1e-30) return [0, 0, 0];
      const k = -share * LAW5.tzPrev / tzPerUnit;
      return [k * d[0], k * d[1], k * d[2]];
    };
  },
  yukawa(alpha, lambdaAU) {
    const lam = lambdaAU * AU_KM;
    return (r, v, t, GM_S) => {
      const r2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2], rn = Math.sqrt(r2);
      const f = -GM_S / r2 * alpha * (1 + rn / lam) * Math.exp(-rn / lam) / rn;   // along r̂, attractive for alpha > 0
      return [f * r[0], f * r[1], f * r[2]];
    };
  },
};

// ebound:<tauKyr> — THE OWNER'S BOUNDED-ECCENTRICITY COMPONENT (2026-08-31), built to
// test the claim of model/eccentricity.mdx: Earth's e should ride the H/3 line
// e = base′(1 + cosθ₃/2), bounded in [base′/2, 3base′/2], instead of the g-mode beats.
// Implementation: a WORK-FREE feedback force on Earth only (gated 0.9–1.1 AU):
//   direction  d̂ = the in-plane direction ⊥ v that changes the osculating e fastest
//              (numerical ∇_v e with the v̂ component projected out → no work → no
//              energy/semi-major-axis change, evading the cm/yr ranging bound on ȧ);
//   magnitude  |a| = (2 v / τ)·(e_tgt − e_osc)  →  e converges to the target on the
//              timescale τ (kyr), critically-damped feedback.
// The experiment MEASURES what the claim requires: the acceleration profile |a|(t),
// the residual semi-major-axis leak, the change of the system's TOTAL angular
// momentum (the force torques Earth's orbit; the reservoir has to be named — the
// model's own candidate is the Law-5 balance, i.e. the other planets), and the
// side effects on the other orbits. The target e_H3(t) is supplied by the caller
// via setEboundTarget(fn) (year → e), so this module stays dependency-free.
let EBOUND_TARGET = null;
export function setEboundTarget(fn) { EBOUND_TARGET = fn; }
const PAIR = { tz: 0, gmE: 1, gmS: 1 };
export function setEboundPairMasses(gmE, gmS) { PAIR.gmE = gmE; PAIR.gmS = gmS; }
// Law-5 distribution state: refA/gms/shares indexed mercury..neptune (0..7);
// shares[2] (Earth) unused; call counter drives the one-kick lag rotation.
const LAW5 = { call: 0, nPlanets: 8, tzPrev: 0, tzCur: 0, refA: [0.387, 0.723, 1.0, 1.524, 5.203, 9.537, 19.19, 30.07], gms: null, shares: null };
export function setEboundLaw5(gms, shares) { LAW5.gms = gms; LAW5.shares = shares; LAW5.call = 0; LAW5.tzPrev = 0; LAW5.tzCur = 0; }
const PIB = { targets: null };   // [{aRefAU, theta0 (rad, at t=0), rateRadPerYr, gateYr?}] + filter/latch state (errF, lastYr, t0) added at run time
export function setPiboundTargets(list) { PIB.targets = list.map((q) => ({ ...q })); }
const ZB = { targets: null, call: 0, tzPrev: 0, tzCur: 0, shares: null };   // targets: [{aRefAU, gm, modes: [{w (rad/yr), re, im}], gateYr?}] + filter state added at run time
export function setZboundTargets(list) { ZB.targets = list.map((q) => ({ ...q, modes: q.modes.map((m) => ({ ...m })) })); ZB.call = 0; ZB.tzPrev = 0; ZB.tzCur = 0; }
// Law-5-distributed torque compensation for zbound (same pattern as eboundlaw5,
// which closed the ebound leak 8.4e-8 → 1.5e-10): shares aligned with the
// targets array; null disables (for A/B). Each kick, the net GM-weighted
// z-torque of all steering forces is accumulated and handed back one kick later
// as counter-torque through each planet's work-free e-gradient direction.
export function setZboundCompensation(shares) { ZB.shares = shares; }
export function osculTheta(r, v, mu) {
  const rn = Math.hypot(...r);
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  return Math.atan2((v[2] * h[0] - v[0] * h[2]) / mu - r[1] / rn, (v[1] * h[2] - v[2] * h[1]) / mu - r[0] / rn);
}
export const eboundDiag = { maxAccel: 0, samples: 0, sumAccel: 0 };
function osculE(r, v, GM) {
  const hx = r[1] * v[2] - r[2] * v[1], hy = r[2] * v[0] - r[0] * v[2], hz = r[0] * v[1] - r[1] * v[0];
  const rn = Math.hypot(...r);
  return Math.hypot(
    (v[1] * hz - v[2] * hy) / GM - r[0] / rn,
    (v[2] * hx - v[0] * hz) / GM - r[1] / rn,
    (v[0] * hy - v[1] * hx) / GM - r[2] / rn,
  );
}
export function parseExtraForces(spec) {
  if (!spec) return [];
  return spec.split(',').filter(Boolean).map((item) => {
    const [name, rest] = item.split(':'); const [p1, p2] = (rest || '').split('@').map(Number);
    if (name === 'j2') return FORCES.j2(p1);
    if (name === 'ring') return FORCES.ring(p1, p2);
    if (name === 'yukawa') return FORCES.yukawa(p1, p2);
    if (name === 'ebound') return FORCES.ebound(p1 || 2);
    if (name === 'eboundpair') return FORCES.eboundpair(p1 || 2);
    if (name === 'eboundlaw5') return FORCES.eboundlaw5(p1 || 2);
    if (name === 'pibound') return FORCES.pibound(p1 || 2);
    throw new Error(`unknown extra force "${name}" (known: j2:<J2>, ring:<M/Msun>@<AU>, yukawa:<alpha>@<AU>)`);
  });
}
