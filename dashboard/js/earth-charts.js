// ═══════════════════════════════════════════════════════════════════════════
// EARTH CHARTS — Plotly rendering for Earth Predictions dashboard
// ═══════════════════════════════════════════════════════════════════════════

import { AXIS_COMMON, makePlotlyLayout, PLOTLY_CONFIG, applyPlotlyTheme } from './theme.js';
import { stdShapes, stdAnnotations } from './charts.js';

export const EARTH_CHART_IDS = [
  'chart-day-lengths', 'chart-year-lengths', 'chart-cardinal',
  'chart-precession', 'chart-cardinal-ra', 'chart-solstice-obliquity',
  'chart-erd',
];

export function renderAllEarthCharts(data) {
  const fc = data.fullCycle;
  renderDayLengthsChart(fc);
  renderYearLengthsChart(fc);
  renderCardinalPointsChart(fc);
  renderPrecessionChart(fc);
  renderCardinalRAChart(fc);
  renderSolsticeObliquityChart(fc);
  renderERDChart(fc);
  setupEarthSyncZoom();
}

// ── Day Lengths ───────────────────────────────────────────────────────────

function renderDayLengthsChart(fc) {
  const div = document.getElementById('chart-day-lengths');
  if (!div) return;

  const traces = [
    {
      x: fc.years, y: fc.solarDaySeconds,
      type: 'scattergl', mode: 'lines',
      line: { color: '#e6a23c', width: 1.5 },
      name: 'Solar Day',
      hovertemplate: 'Solar: %{y:.4f}s<extra></extra>',
    },
    {
      x: fc.years, y: fc.siderealDaySeconds,
      type: 'scattergl', mode: 'lines',
      line: { color: '#67c23a', width: 1.5 },
      name: 'Sidereal Day',
      hovertemplate: 'Sidereal: %{y:.4f}s<extra></extra>',
    },
    {
      x: fc.years, y: fc.stellarDaySeconds,
      type: 'scattergl', mode: 'lines',
      line: { color: '#409eff', width: 1.5 },
      name: 'Stellar Day',
      hovertemplate: 'Stellar: %{y:.4f}s<extra></extra>',
    },
    {
      x: fc.years, y: fc.measuredSolarDaySeconds,
      type: 'scattergl', mode: 'lines',
      line: { color: '#f56c6c', width: 1, dash: 'dot' },
      name: 'Measured Solar Day',
      visible: 'legendonly',
      hovertemplate: 'Measured: %{y:.4f}s<extra></extra>',
    },
  ];

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Seconds' },
    shapes: stdShapes(), annotations: stdAnnotations(),
  });
  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Year Lengths ──────────────────────────────────────────────────────────

function renderYearLengthsChart(fc) {
  const div = document.getElementById('chart-year-lengths');
  if (!div) return;

  const traces = [
    {
      x: fc.years, y: fc.tropicalYearDays,
      type: 'scattergl', mode: 'lines',
      line: { color: '#67c23a', width: 1.5 },
      name: 'Tropical Year',
      hovertemplate: 'Tropical: %{y:.6f} days<extra></extra>',
    },
    {
      x: fc.years, y: fc.siderealYearDays,
      type: 'scattergl', mode: 'lines',
      line: { color: '#409eff', width: 1.5 },
      name: 'Sidereal Year',
      hovertemplate: 'Sidereal: %{y:.6f} days<extra></extra>',
    },
    {
      x: fc.years, y: fc.anomalisticYearDays,
      type: 'scattergl', mode: 'lines',
      line: { color: '#e6a23c', width: 1.5 },
      name: 'Anomalistic Year',
      hovertemplate: 'Anomalistic: %{y:.6f} days<extra></extra>',
    },
  ];

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Days' },
    shapes: stdShapes(), annotations: stdAnnotations(),
  });
  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Cardinal Points Year Lengths ──────────────────────────────────────────

function renderCardinalPointsChart(fc) {
  const div = document.getElementById('chart-cardinal');
  if (!div) return;

  const traces = [
    {
      x: fc.years, y: fc.ssYearLength,
      type: 'scattergl', mode: 'lines',
      line: { color: '#f56c6c', width: 1.5 },
      name: 'Summer Solstice',
      hovertemplate: 'SS: %{y:.6f} days<extra></extra>',
    },
    {
      x: fc.years, y: fc.wsYearLength,
      type: 'scattergl', mode: 'lines',
      line: { color: '#409eff', width: 1.5 },
      name: 'Winter Solstice',
      hovertemplate: 'WS: %{y:.6f} days<extra></extra>',
    },
    {
      x: fc.years, y: fc.veYearLength,
      type: 'scattergl', mode: 'lines',
      line: { color: '#67c23a', width: 1.5 },
      name: 'Vernal Equinox',
      hovertemplate: 'VE: %{y:.6f} days<extra></extra>',
    },
    {
      x: fc.years, y: fc.aeYearLength,
      type: 'scattergl', mode: 'lines',
      line: { color: '#e6a23c', width: 1.5 },
      name: 'Autumnal Equinox',
      hovertemplate: 'AE: %{y:.6f} days<extra></extra>',
    },
    {
      x: fc.years, y: fc.tropicalYearDays,
      type: 'scattergl', mode: 'lines',
      line: { color: '#9b59b6', width: 1, dash: 'dot' },
      name: 'Tropical Year',
      visible: 'legendonly',
      hovertemplate: 'Tropical: %{y:.6f} days<extra></extra>',
    },
  ];

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Year Length (days)' },
    shapes: stdShapes(), annotations: stdAnnotations(),
  });
  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Precession Periods ────────────────────────────────────────────────────

function renderPrecessionChart(fc) {
  const div = document.getElementById('chart-precession');
  if (!div) return;

  const traces = [
    {
      x: fc.years, y: fc.precessionPeriod,
      type: 'scattergl', mode: 'lines',
      line: { color: '#409eff', width: 1.5 },
      name: 'Axial Precession',
      hovertemplate: 'Axial: %{y:.1f} yr<extra></extra>',
    },
    {
      x: fc.years, y: fc.perihelionPrecession,
      type: 'scattergl', mode: 'lines',
      line: { color: '#e6a23c', width: 1.5 },
      name: 'Perihelion Precession',
      hovertemplate: 'Perihelion: %{y:.1f} yr<extra></extra>',
    },
    {
      x: fc.years, y: fc.inclinationPrecession,
      type: 'scattergl', mode: 'lines',
      line: { color: '#67c23a', width: 1.5 },
      name: 'Inclination Precession',
      hovertemplate: 'Inclination: %{y:.1f} yr<extra></extra>',
    },
    {
      x: fc.years, y: fc.eclipticPrecession,
      type: 'scattergl', mode: 'lines',
      line: { color: '#f56c6c', width: 1.5 },
      name: 'Ecliptic Cycle',
      hovertemplate: 'Ecliptic: %{y:.1f} yr<extra></extra>',
    },
  ];

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Period (years)' },
    shapes: stdShapes(), annotations: stdAnnotations(),
  });
  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Cardinal Points RA ────────────────────────────────────────────────────

function renderCardinalRAChart(fc) {
  const div = document.getElementById('chart-cardinal-ra');
  if (!div) return;

  const traces = [
    {
      x: fc.years, y: fc.ssRA,
      type: 'scattergl', mode: 'lines',
      line: { color: '#f56c6c', width: 1.5 },
      name: 'Summer Solstice RA',
      hovertemplate: 'SS RA: %{y:.4f}°<extra></extra>',
    },
    {
      x: fc.years, y: fc.wsRA,
      type: 'scattergl', mode: 'lines',
      line: { color: '#409eff', width: 1.5 },
      name: 'Winter Solstice RA',
      hovertemplate: 'WS RA: %{y:.4f}°<extra></extra>',
    },
    {
      x: fc.years, y: fc.veRA,
      type: 'scattergl', mode: 'lines',
      line: { color: '#67c23a', width: 1.5 },
      name: 'Vernal Equinox RA',
      hovertemplate: 'VE RA: %{y:.4f}°<extra></extra>',
    },
    {
      x: fc.years, y: fc.aeRA,
      type: 'scattergl', mode: 'lines',
      line: { color: '#e6a23c', width: 1.5 },
      name: 'Autumnal Equinox RA',
      hovertemplate: 'AE RA: %{y:.4f}°<extra></extra>',
    },
  ];

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'RA (degrees)' },
    shapes: stdShapes(), annotations: stdAnnotations(),
  });
  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Solstice Obliquity ────────────────────────────────────────────────────

function renderSolsticeObliquityChart(fc) {
  const div = document.getElementById('chart-solstice-obliquity');
  if (!div) return;

  const traces = [{
    x: fc.years, y: fc.solsticeObliquity,
    type: 'scattergl', mode: 'lines',
    line: { color: '#9b59b6', width: 1.5 },
    name: 'Obliquity at Solstice',
    hovertemplate: 'Obliquity: %{y:.4f}°<extra></extra>',
  }];

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: 'Obliquity (degrees)' },
    shapes: stdShapes(), annotations: stdAnnotations(),
  });
  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── ERD ───────────────────────────────────────────────────────────────────

function renderERDChart(fc) {
  const div = document.getElementById('chart-erd');
  if (!div) return;

  const traces = [{
    x: fc.years, y: fc.erd,
    type: 'scattergl', mode: 'lines',
    line: { color: '#e6a23c', width: 1.5 },
    name: 'ERD',
    hovertemplate: 'ERD: %{y:.6f} °/yr<extra></extra>',
  }];

  const layout = makePlotlyLayout({
    yaxis: { ...AXIS_COMMON, title: '°/year' },
    shapes: stdShapes(), annotations: stdAnnotations(),
  });
  Plotly.react(div, traces, layout, PLOTLY_CONFIG);
}

// ── Synchronized zoom ─────────────────────────────────────────────────────

let _earthSyncTimeout = null;

function setupEarthSyncZoom() {
  for (const id of EARTH_CHART_IDS) {
    const div = document.getElementById(id);
    if (!div) continue;
    if (div._earthSyncHandler) div.removeListener('plotly_relayout', div._earthSyncHandler);

    div._earthSyncHandler = function (eventData) {
      if (_earthSyncTimeout) clearTimeout(_earthSyncTimeout);
      _earthSyncTimeout = setTimeout(() => {
        const xRange = eventData['xaxis.range[0]'] != null
          ? [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]
          : eventData['xaxis.range'] || null;
        if (!xRange) return;
        for (const otherId of EARTH_CHART_IDS) {
          if (otherId === id) continue;
          const otherDiv = document.getElementById(otherId);
          if (otherDiv) Plotly.relayout(otherDiv, { 'xaxis.range': xRange });
        }
      }, 100);
    };
    div.on('plotly_relayout', div._earthSyncHandler);
  }
}
