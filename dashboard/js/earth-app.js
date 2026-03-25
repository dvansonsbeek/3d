// ═══════════════════════════════════════════════════════════════════════════
// EARTH APP — Entry point for Earth Predictions dashboard
// ═══════════════════════════════════════════════════════════════════════════

import { renderAllEarthCharts, EARTH_CHART_IDS } from './earth-charts.js';
import { applyPlotlyTheme } from './theme.js';

let isLightMode = localStorage.getItem('dashboard-theme') !== 'dark';
let earthData = null;

const H = 335008;
const BALANCED = -302355;
const RANGE_PRESETS = {
  full:  [BALANCED, BALANCED + H],
  h3:   [2000 - H / 6, 2000 + H / 6],
  h5:   [2000 - H / 10, 2000 + H / 10],
  h8:   [2000 - H / 16, 2000 + H / 16],
  h13:  [2000 - H / 26, 2000 + H / 26],
  h16:  [2000 - H / 32, 2000 + H / 32],
};

// ── Data loading ──────────────────────────────────────────────────────────

async function loadEarthData() {
  const resp = await fetch('data/earth.json');
  if (!resp.ok) throw new Error('Failed to load earth.json');
  return resp.json();
}

// ── Refresh charts ────────────────────────────────────────────────────────

async function refreshCharts() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  try {
    if (!earthData) earthData = await loadEarthData();
    renderAllEarthCharts(earthData);
    if (isLightMode) applyPlotlyTheme(EARTH_CHART_IDS, true);
    applyRange();
  } catch (err) {
    console.error('Failed to load Earth data:', err);
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// ── Range control ─────────────────────────────────────────────────────────

function applyRange() {
  const activeBtn = document.querySelector('#range-toggle .range-btn.active');
  if (!activeBtn) return;
  const preset = RANGE_PRESETS[activeBtn.dataset.range];
  if (!preset) return;

  for (const id of EARTH_CHART_IDS) {
    const div = document.getElementById(id);
    if (div) Plotly.relayout(div, { 'xaxis.range': preset });
  }
}

// ── Expand mode ───────────────────────────────────────────────────────────

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

// ── CSV export ────────────────────────────────────────────────────────────

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

// ── Jump navigation ───────────────────────────────────────────────────────

function setupJumpNav() {
  const links = document.querySelectorAll('.jump-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.panel);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
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

// ── Initialize ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  document.body.classList.toggle('light-mode', isLightMode);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.innerHTML = isLightMode ? '&#x263E;' : '&#x2600;';
    themeBtn.addEventListener('click', () => {
      isLightMode = !isLightMode;
      localStorage.setItem('dashboard-theme', isLightMode ? 'light' : 'dark');
      document.body.classList.toggle('light-mode', isLightMode);
      themeBtn.innerHTML = isLightMode ? '&#x263E;' : '&#x2600;';
      refreshCharts();
    });
  }

  // Range toggle
  document.querySelectorAll('#range-toggle .range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#range-toggle .range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyRange();
    });
  });

  setupExpandMode();
  setupCSVExport();
  setupJumpNav();
  refreshCharts();
});
