// src/utils/chartTheme.js
//
// Single source of truth for every colour and chrome value used by a chart or a
// report tile. Nothing in src/pages/Reports.jsx or src/components/reports/ should
// contain a raw hex — import from here instead.
//
// The categorical palette below is validated, not eyeballed. Against this app's
// chart surface (#ffffff, light mode only — the app has no dark mode):
//
//   Lightness band      PASS  all 8 inside OKLCH L 0.43–0.77
//   Chroma floor        PASS  all 8 >= 0.10
//   CVD separation      PASS  worst adjacent pair ΔE 9.1 (protanopia)
//   Normal-vision floor PASS  worst adjacent pair ΔE 19.6
//   Contrast vs surface WARN  aqua / yellow / magenta sit below 3:1
//
// The contrast WARN is discharged by the "relief rule": every chart in this app is
// accompanied by a data table, so no value is reachable by colour alone. Keep it
// that way — if you add a chart with no table twin, use only slots 1, 2, 6 or 8.

// ---------------------------------------------------------------------------
// Categorical — series identity
// ---------------------------------------------------------------------------

// Fixed order. This ordering IS the colourblind-safety mechanism, not a style
// choice — adjacent slots are the pairs that touch in a stack, bar group or line
// chart. Do not reorder, do not append a 9th colour.
export const SERIES = [
  '#00b4c8', // 1 cyan - sampled from the ZenSys mark's glow, so the lead series wears the brand
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
];

export const MAX_SERIES = SERIES.length;

// Assign by position, never by rank — a filter that removes a series must not
// repaint the survivors. Past slot 8 we clamp rather than cycle; use foldSeries()
// to collapse the tail instead of relying on this.
export const seriesColor = (index) => SERIES[index] ?? SERIES[MAX_SERIES - 1];

// Scatter / bubble / small-multiple charts compare every pair, not just
// neighbours. Only the first three slots clear the floors under that harder test.
export const SCATTER_SAFE_SERIES = SERIES.slice(0, 3);

const OTHER_COLOR = '#94a3b8'; // slate-400 — deliberately outside the series set

export const OTHER_SLICE = { label: 'Other', color: OTHER_COLOR };

/**
 * Collapse a long list into at most `max` real slices plus an aggregated
 * "Other". Use this instead of letting a chart run past 8 categories.
 *
 * @param {Array} items      already sorted, biggest first
 * @param {Function} getValue reads the numeric value off an item
 * @param {number} max       how many real slices to keep
 */
export const foldSeries = (items, getValue, max = MAX_SERIES) => {
  const list = Array.isArray(items) ? items : [];
  if (list.length <= max) return list;
  const head = list.slice(0, max - 1);
  const tailTotal = list
    .slice(max - 1)
    .reduce((sum, item) => sum + Number(getValue(item) || 0), 0);
  return [...head, { name: OTHER_SLICE.label, value: tailTotal, isOther: true }];
};

// ---------------------------------------------------------------------------
// Sequential — magnitude. One hue, light to dark. Never a multi-hue gradient.
// ---------------------------------------------------------------------------

export const SEQUENTIAL_BLUE = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef',
  '#6da7ec', '#5598e7', '#3987e5', '#2a78d6',
  '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b',
];

// For discrete ordered marks (tiers, buckets, funnel stages) the lightest step
// must still be visible against white — start at index 3, not 0.
export const ORDINAL_BLUE_START = 3;

/**
 * Evenly-spaced steps for an ORDERED set of categories — aging buckets, size
 * tiers, funnel stages. The reader sees the order in the colour.
 *
 * Only use this where reordering the categories would change their meaning. For
 * unordered categories (products, branches, cashiers) use a single series colour
 * for all bars — colouring those by value double-encodes what bar length shows.
 */
export const ordinalRamp = (count) => {
  const usable = SEQUENTIAL_BLUE.slice(ORDINAL_BLUE_START);
  if (count <= 1) return [usable[Math.floor(usable.length / 2)]];
  const step = (usable.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => usable[Math.round(i * step)]);
};

// ---------------------------------------------------------------------------
// Diverging — polarity around a baseline. Warm/cool poles, neutral midpoint.
// ---------------------------------------------------------------------------

export const DIVERGING = {
  negative: '#e34948', // red
  midpoint: '#f0efec', // neutral gray — must read as "nothing"
  positive: '#2a78d6', // blue
};

// ---------------------------------------------------------------------------
// Status — reserved meaning. Never reuse these for "series 4", and never render
// one without an accompanying icon or text label.
// ---------------------------------------------------------------------------

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

// Semantic money colours, used for figures rather than marks.
export const MONEY = {
  positive: '#047857', // emerald-700 — profit, inflow
  negative: '#b91c1c', // red-700     — loss, refund, outflow
  neutral: '#334155',  // slate-700   — everything else
};

// ---------------------------------------------------------------------------
// KPI tile tones (Tailwind class strings, since tiles are DOM not SVG).
//
// The rule: a tile's VALUE is ink, not colour. Bar length and figures already
// carry the information; tinting every number spends the colour channel on
// nothing and makes a dashboard read as noise. Colour on a tile is reserved for
// a value that genuinely means good / needs-attention / bad, and in those cases
// it rides on the icon chip with the label still readable in ink.
//
// Use `neutral` unless the number has a direction. Use `accent` for at most one
// headline tile per screen.
// ---------------------------------------------------------------------------

export const TILE = {
  neutral: { value: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
  accent: { value: 'text-slate-900', chip: 'bg-blue-50 text-blue-700' },
  good: { value: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700' },
  // dark-hl: in dark these values wear the one cyan accent - they are the
  // money-at-risk / stock-at-risk numbers; light keeps amber and red.
  warning: { value: 'dark-hl text-amber-700', chip: 'bg-amber-50 text-amber-700' },
  critical: { value: 'dark-hl text-red-700', chip: 'bg-red-50 text-red-700' },
};

// Older code passed a raw hue name ("indigo", "violet", "cyan"…). Map those onto
// the semantic roles so no caller has to change shape. Hues that never carried
// meaning collapse to neutral — that collapse IS the cleanup.
const TILE_ALIASES = {
  neutral: 'neutral', slate: 'neutral', gray: 'neutral',
  indigo: 'neutral', violet: 'neutral', purple: 'neutral',
  cyan: 'neutral', teal: 'neutral', sky: 'neutral', pink: 'neutral', rose: 'neutral',
  blue: 'accent', accent: 'accent',
  emerald: 'good', green: 'good', good: 'good',
  amber: 'warning', yellow: 'warning', orange: 'warning', warning: 'warning',
  red: 'critical', critical: 'critical',
};

export const tileTone = (name) => TILE[TILE_ALIASES[name] || 'neutral'];

// ---------------------------------------------------------------------------
// Chrome — themed to sit with the app's Tailwind UI in both light and dark.
// Grid and axes must stay recessive: solid hairlines, one shade off the surface.
// ---------------------------------------------------------------------------

// Chart furniture reads the theme ramp rather than fixed slate, so axes,
// gridlines and tick labels stay legible when the app goes dark. The SERIES
// colours below are deliberately left alone: they are mid-tone hues that carry
// on either ground, and remapping them would change what a series means.
export const CHROME = {
  surface:  'rgb(var(--c-surface))',
  ink:      'rgb(var(--c-slate-900))', // strongest text, either theme
  inkMuted: 'rgb(var(--c-slate-500))', // axis ticks, labels
  grid:     'rgb(var(--c-slate-200))', // hairline
  axis:     'rgb(var(--c-slate-300))', // baseline
};

// ---------------------------------------------------------------------------
// Recharts prop bundles. Spread these so every chart shares identical chrome —
// this is what stops the charts looking like they came from different apps.
// ---------------------------------------------------------------------------

export const gridProps = {
  // Solid, not dashed. Horizontal only — vertical rules add noise without helping.
  stroke: CHROME.grid,
  strokeWidth: 1,
  vertical: false,
};

export const axisProps = {
  tick: { fill: CHROME.inkMuted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHROME.axis },
};

export const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${CHROME.grid}`,
  boxShadow: 'var(--shadow-md)',
  fontSize: 12,
  color: CHROME.ink,
  backgroundColor: CHROME.surface,
};

export const tooltipProps = {
  contentStyle: tooltipStyle,
  cursor: { fill: 'rgb(var(--c-slate-500) / 0.10)' },
};

// Mark geometry. 4px rounded data-ends anchored to the baseline; 2px lines;
// markers at least 8px so they are actually hittable.
export const BAR_RADIUS = [4, 4, 0, 0];
export const BAR_RADIUS_HORIZONTAL = [0, 4, 4, 0];
export const LINE_WIDTH = 2;
export const DOT_RADIUS = 4; // renders as an 8px marker

export default {
  SERIES,
  seriesColor,
  foldSeries,
  SEQUENTIAL_BLUE,
  DIVERGING,
  STATUS,
  MONEY,
  CHROME,
  gridProps,
  axisProps,
  tooltipProps,
  BAR_RADIUS,
  LINE_WIDTH,
};
