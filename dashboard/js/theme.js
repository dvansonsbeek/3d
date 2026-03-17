// ═══════════════════════════════════════════════════════════════════════════
// THEME — Dark Plotly layout template + planet colors
// ═══════════════════════════════════════════════════════════════════════════

// Brightened for WCAG 3:1 contrast on dark background
export const PLANET_COLORS = {
  earth:   '#2e64be',
  mercury: '#9e9e9e',   // was #6e6e6e — too dark
  venus:   '#d5ab37',
  mars:    '#d04a3e',   // was #b03a2e — too dark
  jupiter: '#c97e4f',
  saturn:  '#d9b65c',
  uranus:  '#37c6d0',
  neptune: '#4a7abf',   // was #2c539e — too dark
};

export const PLANET_NAMES = {
  earth:   'Earth',
  mercury: 'Mercury',
  venus:   'Venus',
  mars:    'Mars',
  jupiter: 'Jupiter',
  saturn:  'Saturn',
  uranus:  'Uranus',
  neptune: 'Neptune',
};

const AXIS_COMMON = {
  gridcolor: 'rgba(255, 255, 255, 0.08)',   // was 0.06 — too subtle
  zerolinecolor: 'rgba(255, 255, 255, 0.15)',
  linecolor: 'rgba(255, 255, 255, 0.15)',
  tickfont: { family: '"IBM Plex Mono", monospace', size: 10, color: 'rgba(255,255,255,0.7)' },
  title: { font: { family: 'Inter, system-ui, sans-serif', size: 11, color: 'rgba(255,255,255,0.4)' } },
  // Crosshair spikes
  showspikes: true,
  spikemode: 'across',
  spikethickness: 1,
  spikecolor: 'rgba(255, 255, 255, 0.15)',
  spikedash: 'dot',
};

export function makePlotlyLayout(overrides = {}) {
  return {
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(10, 14, 20, 0.6)',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: 'rgba(255, 255, 255, 0.85)',
      size: 12,
    },
    xaxis: {
      ...AXIS_COMMON,
      title: { text: 'Year (negative = BC)', ...AXIS_COMMON.title },
      tickformat: ',d',          // show -300,000 not -3e5
      separatethousands: true,
      exponentformat: 'none',
      range: [-302355, -302355 + 335008],  // default: 1H from balanced year
    },
    yaxis: {
      ...AXIS_COMMON,
    },
    hoverlabel: {
      bgcolor: 'rgba(20, 25, 35, 0.95)',
      bordercolor: 'rgba(100, 140, 200, 0.4)',
      font: { family: '"IBM Plex Mono", monospace', size: 11, color: '#fff' },
    },
    legend: {
      bgcolor: 'rgba(0,0,0,0)',
      font: { size: 11, color: 'rgba(255,255,255,0.8)' },
      orientation: 'h',
      y: 1.08,
    },
    margin: { l: 90, r: 30, t: 55, b: 45 },
    hovermode: 'x unified',
    ...overrides,
  };
}

export const PLOTLY_CONFIG = {
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
  scrollZoom: true,
  responsive: true,
  displaylogo: false,
};

// Annotation for a specific year (J2000, now, etc.)
export function yearAnnotation(year, label, color = 'rgba(255,255,255,0.4)') {
  return {
    x: year,
    y: 1,
    yref: 'paper',
    text: label,
    showarrow: false,
    font: { size: 9, color },
    xanchor: 'center',
    yanchor: 'bottom',
  };
}

export function yearLine(year, color = 'rgba(255,255,255,0.15)') {
  return {
    type: 'line',
    x0: year, x1: year,
    y0: 0, y1: 1,
    yref: 'paper',
    line: { color, width: 1, dash: 'dot' },
  };
}
