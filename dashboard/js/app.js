// ═══════════════════════════════════════════════════════════════════════════
// APP — Dashboard entry point (multi-planet toggle)
// ═══════════════════════════════════════════════════════════════════════════

import { loadPlanetData } from './data-loader.js';
import { renderAllCharts, ALL_CHART_IDS } from './charts.js';
import { capitalize, fmtSci, fmtDeg } from './utils.js';

// ── State ──────────────────────────────────────────────────────────────────

const activePlanets = new Set(['earth']);
const planetDataCache = {};

// ── Info panel rendering ───────────────────────────────────────────────────

function renderInfoPanel() {
  const grid = document.getElementById('info-grid');
  const items = [];
  const addItem = (label, value) => items.push(
    `<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`
  );

  for (const name of activePlanets) {
    const data = planetDataCache[name];
    if (!data) continue;
    const c = data.constants;

    addItem(`${capitalize(name)} — Eccentricity (base)`, fmtSci(c.eccentricityBase, 8));
    addItem(`${capitalize(name)} — Eccentricity (J2000)`, fmtSci(c.eccentricityJ2000, 8));
    if (name === 'earth') {
      addItem(`${capitalize(name)} — Obliquity (mean)`, fmtDeg(c.obliquityMean, 5));
    } else {
      addItem(`${capitalize(name)} — Obliquity (mean)`, fmtDeg(c.obliquityMean, 2));
    }
    addItem(`${capitalize(name)} — Fibonacci d`, c.fibonacciD);
    addItem(`${capitalize(name)} — Type`, c.type);
  }

  grid.innerHTML = items.join('');
  document.getElementById('info-panel').style.display = activePlanets.size > 0 ? '' : 'none';
}

// ── Refresh all charts ─────────────────────────────────────────────────────

async function refreshCharts() {
  const loading = document.getElementById('loading');
  loading.style.display = 'flex';

  try {
    const dataMap = {};
    for (const name of activePlanets) {
      if (!planetDataCache[name]) {
        planetDataCache[name] = await loadPlanetData(name);
      }
      dataMap[name] = planetDataCache[name];
    }

    renderAllCharts(dataMap);
    renderInfoPanel();
    if (isLightMode) applyPlotlyTheme();
  } catch (err) {
    console.error('Failed to load data:', err);
  } finally {
    loading.style.display = 'none';
  }
}

// ── Expand/focus mode ──────────────────────────────────────────────────────

function setupExpandMode() {
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.chart-panel');
      const isExpanded = panel.classList.contains('expanded');

      // Collapse any currently expanded panel
      document.querySelectorAll('.chart-panel.expanded').forEach(p => {
        p.classList.remove('expanded');
        p.querySelector('.expand-btn').innerHTML = '&#x2922;';
      });

      if (!isExpanded) {
        panel.classList.add('expanded');
        btn.innerHTML = '&#x2923;'; // collapse icon
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Trigger Plotly resize after CSS transition
      setTimeout(() => {
        const chartDiv = panel.querySelector('.chart-container');
        if (chartDiv && chartDiv.data) {
          Plotly.Plots.resize(chartDiv);
        }
      }, 350);
    });
  });

  // Escape key to collapse
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.chart-panel.expanded').forEach(p => {
        p.classList.remove('expanded');
        p.querySelector('.expand-btn').innerHTML = '&#x2922;';
        const chartDiv = p.querySelector('.chart-container');
        if (chartDiv && chartDiv.data) {
          setTimeout(() => Plotly.Plots.resize(chartDiv), 350);
        }
      });
    }
  });
}

// ── Jump navigation ────────────────────────────────────────────────────────

function setupJumpNav() {
  const links = document.querySelectorAll('.jump-link');

  // Smooth scroll on click
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.panel);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Highlight current panel on scroll (Intersection Observer)
  const panels = document.querySelectorAll('.chart-panel');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.jump-link[data-panel="${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px' });

  panels.forEach(panel => observer.observe(panel));
}

// ── CSV export ─────────────────────────────────────────────────────────────

function exportChartCSV(chartDiv) {
  if (!chartDiv || !chartDiv.data || !chartDiv.data.length) return;

  const traces = chartDiv.data;
  const headers = ['Year'];
  const xData = traces[0].x;

  // Collect all trace names and y-data
  traces.forEach(t => headers.push(t.name || 'Value'));

  const rows = [headers.join(',')];
  for (let i = 0; i < xData.length; i++) {
    const row = [xData[i]];
    traces.forEach(t => row.push(t.y[i]));
    rows.push(row.join(','));
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orbital-data-${chartDiv.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Theme toggle ───────────────────────────────────────────────────────────

let isLightMode = localStorage.getItem('dashboard-theme') !== 'dark';

function applyPlotlyTheme() {
  const light = isLightMode;
  const layoutUpdate = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: light ? 'rgba(248,249,252,0.5)' : 'rgba(10,14,20,0.6)',
    'font.color': light ? '#333' : 'rgba(255,255,255,0.85)',
    'xaxis.gridcolor': light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)',
    'yaxis.gridcolor': light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)',
    'xaxis.zerolinecolor': light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
    'yaxis.zerolinecolor': light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
    'xaxis.linecolor': light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
    'yaxis.linecolor': light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
    'xaxis.tickfont.color': light ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.7)',
    'yaxis.tickfont.color': light ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.7)',
    'xaxis.title.font.color': light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.4)',
    'yaxis.title.font.color': light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.4)',
    'xaxis.spikecolor': light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
    'legend.font.color': light ? '#444' : 'rgba(255,255,255,0.8)',
    'hoverlabel.bgcolor': light ? '#fff' : 'rgba(20,25,35,0.95)',
    'hoverlabel.bordercolor': light ? 'rgba(0,0,0,0.15)' : 'rgba(100,140,200,0.4)',
    'hoverlabel.font.color': light ? '#222' : '#fff',
  };

  // Update annotations and shapes for contrast
  for (const id of ALL_CHART_IDS) {
    const div = document.getElementById(id);
    if (div && div.data && div.data.length) {
      Plotly.relayout(div, layoutUpdate);
    }
  }
}

function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  btn.addEventListener('click', async () => {
    isLightMode = !isLightMode;
    localStorage.setItem('dashboard-theme', isLightMode ? 'light' : 'dark');
    document.body.classList.toggle('light-mode', isLightMode);
    btn.innerHTML = isLightMode ? '&#x263E;' : '&#x263C;'; // moon / sun
    // Re-render charts to pick up theme-aware annotation/shape colors
    await refreshCharts();
    applyPlotlyTheme();
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

  // Planet toggle bar
  const planetBar = document.getElementById('planet-bar');
  planetBar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.planet-btn');
    if (!btn) return;

    const planet = btn.dataset.planet;

    if (activePlanets.has(planet)) {
      if (activePlanets.size <= 1) return;
      activePlanets.delete(planet);
      btn.classList.remove('active');
    } else {
      activePlanets.add(planet);
      btn.classList.add('active');
    }

    await refreshCharts();
  });

  // Range toggle
  const H = 335008;
  const BALANCED = -302355;
  const RANGE_PRESETS = {
    full: [BALANCED, BALANCED + H],
    h3:   [2000 - H / 6,  2000 + H / 6],
    h5:   [2000 - H / 10, 2000 + H / 10],
    h8:   [2000 - H / 16, 2000 + H / 16],
    h13:  [2000 - H / 26, 2000 + H / 26],
    h16:  [2000 - H / 32, 2000 + H / 32],
  };

  const rangeButtons = document.querySelectorAll('.range-btn');
  rangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      rangeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = RANGE_PRESETS[btn.dataset.range];

      for (const id of ALL_CHART_IDS) {
        const div = document.getElementById(id);
        if (!div || !div.data || !div.data.length) continue;
        if (preset) {
          Plotly.relayout(div, { 'xaxis.range': preset });
        } else {
          Plotly.relayout(div, { 'xaxis.autorange': true });
        }
      }
    });
  });

  // Theme toggle
  setupThemeToggle();

  // Setup expand mode, jump nav, and CSV export
  setupExpandMode();
  setupJumpNav();

  // CSV export buttons
  document.querySelectorAll('.csv-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chartDiv = btn.closest('.chart-panel').querySelector('.chart-container');
      exportChartCSV(chartDiv);
    });
  });

  // Apply saved theme
  document.body.classList.toggle('light-mode', isLightMode);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.innerHTML = isLightMode ? '&#x263E;' : '&#x263C;';

  // Load default planet and apply initial theme
  await refreshCharts();
  if (isLightMode) applyPlotlyTheme();
});
