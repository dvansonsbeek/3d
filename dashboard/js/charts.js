// ═══════════════════════════════════════════════════════════════════════════
// CHARTS — Plotly chart rendering with multi-planet overlay support
// ═══════════════════════════════════════════════════════════════════════════

import { makePlotlyLayout, PLOTLY_CONFIG, PLANET_COLORS, PLANET_NAMES, yearAnnotation, yearLine } from './theme.js';

// Theme-aware color helper
export function isLight() {
  return document.body.classList.contains('light-mode');
}

function hLine(y, color = 'rgba(255,255,255,0.2)', dash = 'dash') {
  return { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: y, y1: y, line: { color, width: 1, dash } };
}

const BALANCED_YEAR = -302355;
const H = 335008;

export function stdShapes() {
  const l = isLight();
  return [
    // J2000 — prominent marker
    { type: 'line', x0: 2000, x1: 2000, y0: 0, y1: 1, yref: 'paper',
      line: { color: l ? 'rgba(20,60,160,0.4)' : 'rgba(100,200,255,0.35)', width: 2, dash: 'solid' } },
    // Now
    yearLine(new Date().getFullYear(), l ? 'rgba(200,120,0,0.4)' : 'rgba(255,200,100,0.25)'),
    // Balanced year — green band
    { type: 'rect', x0: BALANCED_YEAR - 500, x1: BALANCED_YEAR + 500,
      y0: 0, y1: 1, yref: 'paper',
      fillcolor: l ? 'rgba(30,130,30,0.08)' : 'rgba(143,188,143,0.08)', line: { width: 0 } },
    yearLine(BALANCED_YEAR, l ? 'rgba(30,130,30,0.4)' : 'rgba(143,188,143,0.25)'),
    // Balanced year 2
    { type: 'rect', x0: BALANCED_YEAR + H - 500, x1: BALANCED_YEAR + H + 500,
      y0: 0, y1: 1, yref: 'paper',
      fillcolor: l ? 'rgba(30,130,30,0.08)' : 'rgba(143,188,143,0.08)', line: { width: 0 } },
    yearLine(BALANCED_YEAR + H, l ? 'rgba(30,130,30,0.4)' : 'rgba(143,188,143,0.25)'),
    // End of 2nd H
    yearLine(BALANCED_YEAR + 2 * H, l ? 'rgba(30,130,30,0.2)' : 'rgba(143,188,143,0.12)'),
  ];
}

export function stdAnnotations() {
  const l = isLight();
  return [
    // Now
    { x: new Date().getFullYear(), y: 1.04, yref: 'paper', text: '<b>Now</b>',
      showarrow: false, font: { size: 10, color: l ? 'rgba(180,90,0,0.9)' : 'rgba(255,200,100,0.8)' },
      xanchor: 'center', yanchor: 'bottom' },
    // Balanced year
    { x: BALANCED_YEAR, y: 1.04, yref: 'paper', text: 'Balanced Year',
      showarrow: false, font: { size: 9, color: l ? 'rgba(20,100,20,0.85)' : 'rgba(143,188,143,0.6)' },
      xanchor: 'center', yanchor: 'bottom' },
    // Balanced Year 2
    { x: BALANCED_YEAR + H, y: 1.04, yref: 'paper', text: 'Balanced Year 2',
      showarrow: false, font: { size: 9, color: l ? 'rgba(20,100,20,0.85)' : 'rgba(143,188,143,0.6)' },
      xanchor: 'center', yanchor: 'bottom' },
    // 2H
    { x: BALANCED_YEAR + 2 * H, y: 1.04, yref: 'paper', text: '2H',
      showarrow: false, font: { size: 9, color: l ? 'rgba(20,100,20,0.5)' : 'rgba(143,188,143,0.3)' },
      xanchor: 'center', yanchor: 'bottom' },
  ];
}

// ── Chart IDs ──────────────────────────────────────────────────────────────

const ALL_CHART_IDS = [
  'chart-eccentricity', 'chart-obliquity', 'chart-inclination',
  'chart-ascending-node', 'chart-arg-perihelion', 'chart-lon-perihelion',
  'chart-distance',
];

// ── Render all active planets onto shared charts ───────────────────────────

export function renderAllCharts(planetDataMap) {
  renderOverlayChart('chart-eccentricity', planetDataMap, 'eccentricity', {
    yaxis: { title: { text: 'Eccentricity' }, tickformat: '.6f', autorange: true, rangemode: 'normal' },
  });

  renderObliquityChart(planetDataMap);
  renderInclinationChart(planetDataMap);

  renderAngleChart('chart-ascending-node', planetDataMap, 'ascendingNode', 'Ascending Node (°)',
    { secondary: 'ascNodeInvPlane', secondaryLabel: 'Inv. Plane' });
  renderAngleChart('chart-arg-perihelion', planetDataMap, 'argPerihelion', 'Argument of Perihelion (°)',
    { secondary: 'argPeriInvPlane', secondaryLabel: 'Inv. Plane' });
  renderAngleChart('chart-lon-perihelion', planetDataMap, 'lonPerihelion', 'Longitude of Perihelion (°)',
    { secondary: 'lonPerihelionICRF', secondaryLabel: 'ICRF' });

  renderDistanceChart(planetDataMap);

  setupSyncZoom();
}

// ── Generic overlay chart (multiple planets on same axes) ──────────────────

function renderOverlayChart(divId, planetDataMap, field, layoutOverrides) {
  const div = document.getElementById(divId);
  const traces = [];

  for (const [name, data] of Object.entries(planetDataMap)) {
    const fc = data.fullCycle;
    let yData;

    if (field === 'obliquity') {
      // For Earth: show obliquity; for others: show inclination
      yData = name === 'earth' ? fc.obliquity : fc.inclination;
    } else {
      yData = fc[field];
    }

    if (!yData) continue;

    const label = field === 'obliquity'
      ? (name === 'earth' ? 'Obliquity' : 'Inclination')
      : '';
    const displayName = PLANET_NAMES[name] + (label ? ` (${label})` : '');

    traces.push({
      x: fc.years, y: yData,
      type: 'scattergl', mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: displayName,
      hovertemplate: `${PLANET_NAMES[name]}: %{y:.6f}<extra></extra>`,
    });
  }

  const layout = makePlotlyLayout({
    shapes: stdShapes(),
    annotations: stdAnnotations(),
    legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', font: { size: 10 }, tracegroupgap: 2, itemwidth: 20 },
    ...layoutOverrides,
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Obliquity chart (3 components per planet) ──────────────────────────────

function renderObliquityChart(planetDataMap) {
  const div = document.getElementById('chart-obliquity');
  const traces = [];

  for (const [name, data] of Object.entries(planetDataMap)) {
    const fc = data.fullCycle;
    const color = PLANET_COLORS[name];
    const pName = PLANET_NAMES[name];

    // Primary: Obliquity (axial tilt, oscillating for all planets)
    if (fc.obliquity) {
      traces.push({
        x: fc.years, y: fc.obliquity,
        type: 'scattergl', mode: 'lines',
        line: { color, width: 1.5 },
        name: `${pName} Obliquity`,
        hovertemplate: `${pName} Obliquity: %{y:.4f}°<extra></extra>`,
      });
    }

    // Secondary: Inclination tilt absolute (orbital plane component)
    if (fc.inclinationTilt) {
      traces.push({
        x: fc.years, y: fc.inclinationTilt,
        type: 'scattergl', mode: 'lines',
        line: { color, width: 1, dash: 'dash' },
        name: `${pName} Incl. tilt`,
        visible: 'legendonly',
        hovertemplate: `${pName} Incl. tilt: %{y:.4f}°<extra></extra>`,
      });
    }

    // Axial tilt component (all planets with obliquity cycle + Earth)
    if (fc.axialTilt) {
      traces.push({
        x: fc.years, y: fc.axialTilt,
        type: 'scattergl', mode: 'lines',
        line: { color, width: 1, dash: 'dot' },
        name: `${pName} Axial tilt`,
        visible: 'legendonly',
        hovertemplate: `${pName} Axial tilt: %{y:.4f}°<extra></extra>`,
      });
    }

    // Relative deviation traces (all planets)
    if (fc.inclinationTiltRel) {
      traces.push({
        x: fc.years, y: fc.inclinationTiltRel,
        type: 'scattergl', mode: 'lines',
        line: { color: '#5cb85c', width: 1, dash: 'dash' },
        name: `${pName} Incl. tilt (rel)`,
        visible: 'legendonly',
        hovertemplate: `${pName} Incl. tilt rel: %{y:+.4f}°<extra></extra>`,
      });
    }
    if (fc.axialTiltRel) {
      traces.push({
        x: fc.years, y: fc.axialTiltRel,
        type: 'scattergl', mode: 'lines',
        line: { color: '#e8a838', width: 1, dash: 'dot' },
        name: `${pName} Axial tilt (rel)`,
        visible: 'legendonly',
        hovertemplate: `${pName} Axial tilt rel: %{y:+.4f}°<extra></extra>`,
      });
    }
  }

  const layout = makePlotlyLayout({
    yaxis: { title: { text: 'Degrees (°)' }, ticksuffix: '°', tickformat: '.2f', autorange: true, rangemode: 'normal' },
    shapes: stdShapes(),
    annotations: stdAnnotations(),
    legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', font: { size: 10 }, tracegroupgap: 2, itemwidth: 20 },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Angle chart (0-360 range, handles wrapping) ────────────────────────────

function renderAngleChart(divId, planetDataMap, field, yTitle, opts = {}) {
  const div = document.getElementById(divId);
  const traces = [];

  for (const [name, data] of Object.entries(planetDataMap)) {
    const fc = data.fullCycle;
    const yData = fc[field];
    if (!yData) continue;

    traces.push({
      x: fc.years, y: yData,
      type: 'scattergl', mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: PLANET_NAMES[name],
      hovertemplate: `${PLANET_NAMES[name]}: %{y:.2f}°<extra></extra>`,
    });

    // Optional secondary trace (e.g. invariable plane variant)
    if (opts.secondary && fc[opts.secondary]) {
      traces.push({
        x: fc.years, y: fc[opts.secondary],
        type: 'scattergl', mode: 'lines',
        line: { color: PLANET_COLORS[name], width: 1.5, dash: 'dash' },
        name: PLANET_NAMES[name] + ' ' + (opts.secondaryLabel || ''),
        visible: 'legendonly',
        hovertemplate: `${PLANET_NAMES[name]} ${opts.secondaryLabel || ''}: %{y:.2f}°<extra></extra>`,
      });
    }
  }

  const layout = makePlotlyLayout({
    yaxis: { title: { text: yTitle }, ticksuffix: '°', range: [0, 360] },
    shapes: stdShapes(),
    annotations: stdAnnotations(),
    legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', font: { size: 10 }, tracegroupgap: 2, itemwidth: 20 },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Inclination (invariable plane + ecliptic) ─────────────────────────────

function renderInclinationChart(planetDataMap) {
  const div = document.getElementById('chart-inclination');
  if (!div) return;
  const traces = [];

  for (const [name, data] of Object.entries(planetDataMap)) {
    const fc = data.fullCycle;
    if (!fc.inclination) continue;

    // Invariable plane inclination (primary)
    traces.push({
      x: fc.years, y: fc.inclination,
      type: 'scattergl', mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: PLANET_NAMES[name] + ' (inv)',
      hovertemplate: `${PLANET_NAMES[name]} inv: %{y:.4f}°<extra></extra>`,
    });

    // Ecliptic inclination (secondary, shown by default with dashed line)
    if (fc.eclipticInclination) {
      traces.push({
        x: fc.years, y: fc.eclipticInclination,
        type: 'scattergl', mode: 'lines',
        line: { color: PLANET_COLORS[name], width: 1, dash: 'dash' },
        name: PLANET_NAMES[name] + ' (ecl)',
        hovertemplate: `${PLANET_NAMES[name]} ecl: %{y:.4f}°<extra></extra>`,
      });
    }
  }

  const layout = makePlotlyLayout({
    yaxis: { title: { text: 'Inclination (°)' }, ticksuffix: '°', autorange: true, rangemode: 'tozero' },
    shapes: stdShapes(),
    annotations: stdAnnotations(),
    legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', font: { size: 10 }, tracegroupgap: 2, itemwidth: 20 },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Perihelion / Aphelion Distance ────────────────────────────────────────

function renderDistanceChart(planetDataMap) {
  const div = document.getElementById('chart-distance');
  if (!div) return;
  const traces = [];

  for (const [name, data] of Object.entries(planetDataMap)) {
    const fc = data.fullCycle;
    if (!fc.perihelionDist) continue;

    traces.push({
      x: fc.years, y: fc.perihelionDist,
      type: 'scattergl', mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1.5 },
      name: PLANET_NAMES[name] + ' perihelion',
      hovertemplate: `${PLANET_NAMES[name]} peri: %{y:.6f} AU<extra></extra>`,
    });

    traces.push({
      x: fc.years, y: fc.aphelionDist,
      type: 'scattergl', mode: 'lines',
      line: { color: PLANET_COLORS[name], width: 1, dash: 'dot' },
      name: PLANET_NAMES[name] + ' aphelion',
      visible: 'legendonly',
      hovertemplate: `${PLANET_NAMES[name]} aph: %{y:.6f} AU<extra></extra>`,
    });
  }

  const layout = makePlotlyLayout({
    yaxis: { title: { text: 'Distance (AU)' }, autorange: true },
    shapes: stdShapes(),
    annotations: stdAnnotations(),
    legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', font: { size: 10 }, tracegroupgap: 2, itemwidth: 20 },
  });

  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Synchronized zoom ──────────────────────────────────────────────────────

let syncTimeout = null;

export function setupSyncZoom() {
  for (const id of ALL_CHART_IDS) {
    const div = document.getElementById(id);
    if (!div || !div.data || !div.data.length) continue;

    if (div._syncHandler) {
      div.removeListener('plotly_relayout', div._syncHandler);
    }

    div._syncHandler = (eventData) => {
      if (syncTimeout) return;
      const x0 = eventData['xaxis.range[0]'];
      const x1 = eventData['xaxis.range[1]'];
      const autorange = eventData['xaxis.autorange'];

      if (x0 === undefined && x1 === undefined && !autorange) return;

      syncTimeout = setTimeout(() => { syncTimeout = null; }, 100);

      const update = autorange
        ? { 'xaxis.autorange': true }
        : { 'xaxis.range': [x0, x1] };

      for (const otherId of ALL_CHART_IDS) {
        if (otherId !== id) {
          const otherDiv = document.getElementById(otherId);
          if (otherDiv && otherDiv.data && otherDiv.data.length) {
            Plotly.relayout(otherDiv, update);
          }
        }
      }
    };

    div.on('plotly_relayout', div._syncHandler);
  }
}

export { ALL_CHART_IDS };
