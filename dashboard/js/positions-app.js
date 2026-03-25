// ═══════════════════════════════════════════════════════════════════════════
// POSITIONS APP — Entry point for Planet Positions Explorer dashboard
// ═══════════════════════════════════════════════════════════════════════════

import { renderAllPositionCharts, renderSkyPathChart, POS_CHART_IDS } from './positions-charts.js';
import { applyPlotlyTheme } from './theme.js';

// ── State ──────────────────────────────────────────────────────────────────

const activePlanets = new Set(['mars']);
  const posDataCache = new Map();
  let sunData = null;
  let currentPlanetDataMap = null;
  let isLightMode = localStorage.getItem('dashboard-theme') !== 'dark';
  let centerYear = 2000;

  const RANGE_PRESETS = {
    '1yr':   0.5,
    '5yr':   2.5,
    '20yr':  10,
    '100yr': 50,
    'full':  200,
  };

  // ── Data loading ─────────────────────────────────────────────────────────

  async function loadPositionsData(name) {
    if (posDataCache.has(name)) return posDataCache.get(name);
    const resp = await fetch(`data/positions/${name}.json`);
    if (!resp.ok) throw new Error(`Failed to load positions/${name}.json`);
    const data = await resp.json();
    posDataCache.set(name, data);
    return data;
  }

  // ── Refresh charts ──────────────────────────────────────────────────────

  async function refreshCharts() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
      // Always load Sun data for elongation computation
      if (!sunData) sunData = await loadPositionsData('sun');

      // Load active planet data
      const promises = [...activePlanets].map(async (name) => {
        const data = await loadPositionsData(name);
        return [name, data];
      });
      const entries = await Promise.all(promises);
      const planetDataMap = new Map(entries);
      currentPlanetDataMap = planetDataMap;

      renderAllPositionCharts(planetDataMap, sunData);
      if (isLightMode) applyPlotlyTheme(POS_CHART_IDS, true);
      applyRange();
    } catch (err) {
      console.error('Failed to load position data:', err);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  // ── Range control ───────────────────────────────────────────────────────

  function applyRange() {
    const activeBtn = document.querySelector('#range-toggle .range-btn.active');
    if (!activeBtn) return;
    const rangeKey = activeBtn.dataset.range;
    const halfSpan = RANGE_PRESETS[rangeKey] || 200;
    const xRange = [centerYear - halfSpan, centerYear + halfSpan];

    const timeChartIds = ['chart-ra', 'chart-dec', 'chart-distance', 'chart-separations', 'chart-err-ra', 'chart-err-dec'];
    for (const id of timeChartIds) {
      const div = document.getElementById(id);
      if (div) Plotly.relayout(div, { 'xaxis.range': xRange });
    }

    // Re-render Sky Path to match the new time window
    if (currentPlanetDataMap) {
      renderSkyPathChart(currentPlanetDataMap, xRange);
      if (isLightMode) applyPlotlyTheme(['chart-sky'], true);
    }
  }

  // ── Expand mode ─────────────────────────────────────────────────────────

  function setupExpandMode() {
    document.querySelectorAll('.expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.chart-panel');
        if (!panel) return;

        if (panel.classList.contains('expanded')) {
          panel.classList.remove('expanded');
          btn.innerHTML = '&#x2922;';
        } else {
          document.querySelectorAll('.chart-panel.expanded').forEach(p => {
            p.classList.remove('expanded');
            p.querySelector('.expand-btn').innerHTML = '&#x2922;';
          });
          panel.classList.add('expanded');
          btn.innerHTML = '&#x2716;';
        }

        // Resize Plotly chart after transition
        setTimeout(() => {
          const chartDiv = panel.querySelector('.chart-container');
          if (chartDiv) Plotly.Plots.resize(chartDiv);
        }, 350);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.chart-panel.expanded').forEach(p => {
          p.classList.remove('expanded');
          p.querySelector('.expand-btn').innerHTML = '&#x2922;';
        });
      }
    });
  }

  // ── CSV export ──────────────────────────────────────────────────────────

  function setupCSVExport() {
    document.querySelectorAll('.csv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.chart-panel');
        const chartDiv = panel?.querySelector('.chart-container');
        if (!chartDiv || !chartDiv.data) return;

        const traces = chartDiv.data;
        const headers = ['x', ...traces.map(t => t.name || 'value')];
        const xVals = traces[0]?.x || [];
        const rows = [headers.join(',')];

        for (let i = 0; i < xVals.length; i++) {
          const row = [xVals[i]];
          for (const t of traces) row.push(t.y[i] ?? '');
          rows.push(row.join(','));
        }

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${panel.id || 'chart'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }

  // ── Jump navigation ─────────────────────────────────────────────────────

  function setupJumpNav() {
    const links = document.querySelectorAll('.jump-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.panel);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Highlight active panel on scroll
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const match = document.querySelector(`.jump-link[data-panel="${entry.target.id}"]`);
          if (match) match.classList.add('active');
        }
      }
    }, { threshold: 0.4 });

    document.querySelectorAll('.chart-panel').forEach(p => observer.observe(p));
  }

  // ── Theme toggle ────────────────────────────────────────────────────────

  function setupTheme() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      isLightMode = !isLightMode;
      localStorage.setItem('dashboard-theme', isLightMode ? 'light' : 'dark');
      document.body.classList.toggle('light-mode', isLightMode);
      btn.innerHTML = isLightMode ? '&#x263E;' : '&#x2600;';
      refreshCharts();
    });
  }

  // ── Planet toggle ───────────────────────────────────────────────────────

  function setupPlanetToggle() {
    document.querySelectorAll('.planet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const planet = btn.dataset.planet;
        if (activePlanets.has(planet)) {
          if (activePlanets.size <= 1) return; // keep at least one
          activePlanets.delete(planet);
          btn.classList.remove('active');
        } else {
          activePlanets.add(planet);
          btn.classList.add('active');
        }
        refreshCharts();
      });
    });
  }

  // ── Range toggle ────────────────────────────────────────────────────────

  function setupRangeToggle() {
    document.querySelectorAll('#range-toggle .range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#range-toggle .range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyRange();
      });
    });

    const centerInput = document.getElementById('center-year');
    if (centerInput) {
      centerInput.addEventListener('change', () => {
        centerYear = parseInt(centerInput.value) || 2000;
        centerYear = Math.max(1800, Math.min(2200, centerYear));
        centerInput.value = centerYear;
        applyRange();
      });
    }
  }

  // ── Initialize ──────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    document.body.classList.toggle('light-mode', isLightMode);
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.innerHTML = isLightMode ? '&#x263E;' : '&#x2600;';

    setupPlanetToggle();
    setupRangeToggle();
    setupExpandMode();
    setupCSVExport();
    setupJumpNav();
    setupTheme();
    refreshCharts();
  });
