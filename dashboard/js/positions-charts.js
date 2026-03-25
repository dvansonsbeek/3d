// ═══════════════════════════════════════════════════════════════════════════
// POSITIONS CHARTS — Plotly rendering for planet position dashboard
// ═══════════════════════════════════════════════════════════════════════════

import { PLANET_COLORS, PLANET_NAMES, AXIS_COMMON, makePlotlyLayout, PLOTLY_CONFIG } from './theme.js';

export const POS_CHART_IDS = ['chart-ra', 'chart-dec', 'chart-sky', 'chart-distance', 'chart-separations', 'chart-err-ra', 'chart-err-dec'];

// Show "No data" annotation when chart has no meaningful traces
function renderNoData(divId) {
  const div = document.getElementById(divId);
  if (!div) return;
  const light = document.body.classList.contains('light-mode');
  const layout = makePlotlyLayout({
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: light ? 'rgba(248,249,252,0.5)' : 'rgba(10,14,20,0.6)',
    xaxis: { visible: false },
    yaxis: { visible: false },
    annotations: [{
      text: 'No data for current selection',
      xref: 'paper', yref: 'paper',
      x: 0.5, y: 0.5,
      showarrow: false,
      font: { size: 14, color: light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' },
    }],
  });
  Plotly.react(div, [], layout, PLOTLY_CONFIG);
}

// ── Render all charts ─────────────────────────────────────────────────────

export function renderAllPositionCharts(planetDataMap, sunData) {
  renderRAChart(planetDataMap);
  renderDecChart(planetDataMap);
  // Sky Path is rendered by applyRange() which is called after this
  renderDistanceChart(planetDataMap);
  renderSeparationsChart(planetDataMap, sunData);
  renderErrorRAChart(planetDataMap);
  renderErrorDecChart(planetDataMap);
  setupPositionsSyncZoom();
}

// ── RA vs Time ────────────────────────────────────────────────────────────

// Insert nulls at RA 360→0 wrap points to prevent vertical lines
function breakAtWraps(years, ra) {
  const outYears = [], outRA = [];
  for (let i = 0; i < ra.length; i++) {
    outYears.push(years[i]);
    outRA.push(ra[i]);
    if (i < ra.length - 1 && Math.abs(ra[i + 1] - ra[i]) > 180) {
      outYears.push(null);
      outRA.push(null);
    }
  }
  return { years: outYears, ra: outRA };
}

function renderRAChart(planetDataMap) {
  const div = document.getElementById('chart-ra');
  if (!div) return;

  const traces = [];
  for (const [name, data] of planetDataMap) {
    const wrapped = breakAtWraps(data.years, data.ra_deg);
    traces.push({
      x: wrapped.years,
      y: wrapped.ra,
      type: 'scattergl',
      mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: PLANET_NAMES[name] || name,
      connectgaps: false,
      hovertemplate: `${(PLANET_NAMES[name] || name)}: %{y:.2f}°<extra></extra>`,
    });
  }

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'RA (degrees)', range: [0, 360] },
    xaxis: { ...AXIS_COMMON, title: 'Year' },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Dec vs Time ───────────────────────────────────────────────────────────

function renderDecChart(planetDataMap) {
  const div = document.getElementById('chart-dec');
  if (!div) return;

  const traces = [];
  for (const [name, data] of planetDataMap) {
    traces.push({
      x: data.years,
      y: data.dec_deg,
      type: 'scattergl',
      mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: PLANET_NAMES[name] || name,
      connectgaps: false,
      hovertemplate: `${(PLANET_NAMES[name] || name)}: %{y:.2f}°<extra></extra>`,
    });
  }

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Dec (degrees)' },
    xaxis: { ...AXIS_COMMON, title: 'Year' },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Sky Path (RA vs Dec) ──────────────────────────────────────────────────

export function renderSkyPathChart(planetDataMap, timeRange) {
  const div = document.getElementById('chart-sky');
  if (!div) return;

  const traces = [];
  for (const [name, data] of planetDataMap) {
    // Filter to visible time range
    let minYr = 1990, maxYr = 2010;
    if (timeRange) {
      minYr = timeRange[0];
      maxYr = timeRange[1];
    }

    const filteredRA = [];
    const filteredDec = [];
    for (let i = 0; i < data.years.length; i++) {
      const yr = data.years[i];
      if (yr >= minYr && yr <= maxYr) {
        // Insert null break at RA wraps (>180° jump) to prevent horizontal lines
        if (filteredRA.length > 0) {
          const prevRA = filteredRA[filteredRA.length - 1];
          if (prevRA !== null && Math.abs(data.ra_deg[i] - prevRA) > 180) {
            filteredRA.push(null);
            filteredDec.push(null);
          }
        }
        filteredRA.push(data.ra_deg[i]);
        filteredDec.push(data.dec_deg[i]);
      }
    }

    if (filteredRA.length === 0) continue;

    // Path line
    traces.push({
      x: filteredRA,
      y: filteredDec,
      type: 'scattergl',
      mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: PLANET_NAMES[name] || name,
      connectgaps: false,
      hovertemplate: `${(PLANET_NAMES[name] || name)}: RA %{x:.2f}° Dec %{y:.2f}°<extra></extra>`,
    });

    // Start/end markers — only when the time window is shorter than ~2 synodic periods
    // (i.e. the planet hasn't completed a full apparent orbit in the visible window)
    const timeSpan = maxYr - minYr;
    const synodicYears = { sun: 1, moon: 0.08, mercury: 0.317, venus: 1.599, mars: 2.135, jupiter: 1.092, saturn: 1.035, uranus: 1.012, neptune: 1.006 };
    const showMarkers = timeSpan < (synodicYears[name] || 1) * 2;
    if (showMarkers && filteredRA.length > 1) {
      const firstValid = filteredRA.findIndex(v => v !== null);
      const lastValid = filteredRA.length - 1 - [...filteredRA].reverse().findIndex(v => v !== null);
      traces.push({
        x: [filteredRA[firstValid], filteredRA[lastValid]],
        y: [filteredDec[firstValid], filteredDec[lastValid]],
        type: 'scatter',
        mode: 'markers+text',
        marker: { color: PLANET_COLORS[name], size: [8, 10], symbol: ['circle', 'diamond'] },
        text: ['start', 'end'],
        textposition: 'top center',
        textfont: { size: 9, color: PLANET_COLORS[name] },
        showlegend: false,
        hoverinfo: 'skip',
      });
    }
  }

  const layout = makePlotlyLayout({
    xaxis: { ...AXIS_COMMON, title: 'RA (degrees)', autorange: true },
    yaxis: { ...AXIS_COMMON, title: 'Dec (degrees)', autorange: true },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Distance (to Earth + to Sun) ──────────────────────────────────────────

function renderDistanceChart(planetDataMap) {
  const div = document.getElementById('chart-distance');
  if (!div) return;

  const traces = [];
  for (const [name, data] of planetDataMap) {
    // Distance to Earth (geocentric) — for Sun this is the Earth-Sun distance
    const distLabel = name === 'sun' ? 'Sun ↔ Earth' : (PLANET_NAMES[name] || name) + ' ↔ Earth';
    traces.push({
      x: data.years,
      y: data.dist_au,
      type: 'scattergl',
      mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: distLabel,
      hovertemplate: `${distLabel}: %{y:.4f} AU<extra></extra>`,
    });

    // Distance to Sun (heliocentric) — skip for Sun itself
    if (data.sun_dist_au && name !== 'sun') {
      traces.push({
        x: data.years,
        y: data.sun_dist_au,
        type: 'scattergl',
        mode: 'lines',
        line: { color: PLANET_COLORS[name], width: 1, dash: 'dot' },
        name: (PLANET_NAMES[name] || name) + ' ↔ Sun',
        visible: 'legendonly',
        hovertemplate: `${(PLANET_NAMES[name] || name)} ↔ Sun: %{y:.4f} AU<extra></extra>`,
      });
    }
  }

  if (traces.length === 0) { renderNoData('chart-distance'); return; }

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Distance (AU)', autorange: true },
    xaxis: { ...AXIS_COMMON, title: 'Year' },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Elongation from Sun ───────────────────────────────────────────────────

function renderSeparationsChart(planetDataMap, sunData) {
  const div = document.getElementById('chart-separations');
  if (!div || !sunData) return;

  const traces = [];
  const d2r = Math.PI / 180;

  for (const [name, data] of planetDataMap) {
    if (name === 'sun') continue;

    // Compute angular separation from Sun
    const sep = [];
    for (let i = 0; i < data.years.length; i++) {
      if (data.ra_deg[i] === null || !sunData.ra_deg[i]) {
        sep.push(null);
        continue;
      }
      // Find closest Sun data point by index (same sampling)
      const pRA = data.ra_deg[i] * d2r;
      const pDec = data.dec_deg[i] * d2r;
      const sRA = sunData.ra_deg[i] * d2r;
      const sDec = sunData.dec_deg[i] * d2r;

      const cosAngle = Math.sin(pDec) * Math.sin(sDec) +
                        Math.cos(pDec) * Math.cos(sDec) * Math.cos(pRA - sRA);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) / d2r;
      sep.push(Math.round(angle * 100) / 100);
    }

    traces.push({
      x: data.years,
      y: sep,
      type: 'scattergl',
      mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: PLANET_NAMES[name] || name,
      connectgaps: false,
      hovertemplate: `${(PLANET_NAMES[name] || name)}: %{y:.1f}°<extra></extra>`,
    });
  }

  if (traces.length === 0) { renderNoData('chart-separations'); return; }

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Elongation (degrees)', range: [0, 180] },
    xaxis: { ...AXIS_COMMON, title: 'Year' },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── RA Error (Model − JPL) ────────────────────────────────────────────────

function computeResiduals(data) {
  if (!data.ref_years || data.ref_years.length === 0) return null;

  const refYears = data.ref_years;
  const dRA_arr = [];
  const dDec_arr = [];

  for (let r = 0; r < refYears.length; r++) {
    const yr = refYears[r];
    // Find closest model point (binary-ish search since sorted)
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < data.years.length; i++) {
      if (data.years[i] === null) continue;
      const d = Math.abs(data.years[i] - yr);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
      if (d > bestDist + 1) break;
    }

    if (bestDist < 0.05 && data.ra_deg[bestIdx] !== null) {
      let dRA = data.ra_deg[bestIdx] - data.ref_ra[r];
      // Handle RA wrap (if model=359° and ref=1°, diff should be -2° not 358°)
      if (dRA > 180) dRA -= 360;
      if (dRA < -180) dRA += 360;
      const dDec = data.dec_deg[bestIdx] - data.ref_dec[r];
      dRA_arr.push(Math.round(dRA * 10000) / 10000);
      dDec_arr.push(Math.round(dDec * 10000) / 10000);
    } else {
      dRA_arr.push(null);
      dDec_arr.push(null);
    }
  }

  return { refYears, dRA: dRA_arr, dDec: dDec_arr };
}

function renderErrorRAChart(planetDataMap) {
  const div = document.getElementById('chart-err-ra');
  if (!div) return;

  const traces = [];
  let hasData = false;

  for (const [name, data] of planetDataMap) {
    if (name === 'sun' || name === 'moon') continue;
    const res = computeResiduals(data);
    if (!res) continue;
    hasData = true;

    traces.push({
      x: res.refYears,
      y: res.dRA,
      type: 'scattergl',
      mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1 },
      name: PLANET_NAMES[name] || name,
      hovertemplate: `${(PLANET_NAMES[name] || name)}: %{y:.4f}°<extra>%{x:.1f}</extra>`,
    });
  }

  if (!hasData) { renderNoData('chart-err-ra'); return; }

  // Zero reference line
  traces.unshift({
    x: [1800, 2200], y: [0, 0],
    type: 'scatter', mode: 'lines',
    line: { color: 'rgba(255,255,255,0.3)', width: 1, dash: 'dot' },
    showlegend: false, hoverinfo: 'skip',
  });

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'ΔRA (degrees)', autorange: true },
    xaxis: { ...AXIS_COMMON, title: 'Year' },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

function renderErrorDecChart(planetDataMap) {
  const div = document.getElementById('chart-err-dec');
  if (!div) return;

  const traces = [];
  let hasData = false;

  for (const [name, data] of planetDataMap) {
    if (name === 'sun' || name === 'moon') continue;
    const res = computeResiduals(data);
    if (!res) continue;
    hasData = true;

    traces.push({
      x: res.refYears,
      y: res.dDec,
      type: 'scattergl',
      mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1 },
      name: PLANET_NAMES[name] || name,
      hovertemplate: `${(PLANET_NAMES[name] || name)}: %{y:.4f}°<extra>%{x:.1f}</extra>`,
    });
  }

  if (!hasData) { renderNoData('chart-err-dec'); return; }

  // Zero reference line
  traces.unshift({
    x: [1800, 2200], y: [0, 0],
    type: 'scatter', mode: 'lines',
    line: { color: 'rgba(255,255,255,0.3)', width: 1, dash: 'dot' },
    showlegend: false, hoverinfo: 'skip',
  });

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'ΔDec (degrees)', autorange: true },
    xaxis: { ...AXIS_COMMON, title: 'Year' },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Synchronized zoom (time-based charts only) ────────────────────────────

let _posSyncTimeout = null;

function setupPositionsSyncZoom() {
  const timeChartIds = ['chart-ra', 'chart-dec', 'chart-distance', 'chart-separations', 'chart-err-ra', 'chart-err-dec'];

  for (const id of timeChartIds) {
    const div = document.getElementById(id);
    if (!div) continue;

    // Remove old handler
    if (div._posSyncHandler) div.removeListener('plotly_relayout', div._posSyncHandler);

    div._posSyncHandler = function (eventData) {
      if (_posSyncTimeout) clearTimeout(_posSyncTimeout);
      _posSyncTimeout = setTimeout(() => {
        const xRange = eventData['xaxis.range[0]'] != null
          ? [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]
          : eventData['xaxis.range'] || null;

        if (!xRange) return;

        for (const otherId of timeChartIds) {
          if (otherId === id) continue;
          const otherDiv = document.getElementById(otherId);
          if (otherDiv) Plotly.relayout(otherDiv, { 'xaxis.range': xRange });
        }

        // Update sky path to match time range
        // (re-render with filtered data would go here)
      }, 100);
    };

    div.on('plotly_relayout', div._posSyncHandler);
  }
}
