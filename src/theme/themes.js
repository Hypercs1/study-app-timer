// ── Theme palettes ──
//
// The entire app collapses to the ~25 color roles below. Each theme provides
// the same set of keys so any screen can reference `theme.<role>` safely (a
// missing key would surface as `undefined` and break a style — the theme test
// guards against that by asserting all three palettes share an identical key
// set).
//
// Roles are semantic, not literal: `overlayBtn`/`dotIdle`/`textFaint` are the
// SessionScreen "glassy" chrome, which is white-on-dark for dark/OLED and
// black-on-light for the light theme so the immersive timer reads correctly on
// a light background.
//
// NOTE: subject colors (SUBJECT_COLORS in storage.js) and study/break phase
// colors (studyColors/breakColor in constants/sessions.js) are DATA, not theme
// — they are identity colors that flow through the `subjectColor` prop and the
// per-phase `color`, and are intentionally not themed here.

const dark = {
  name: "dark",
  isDark: true,

  bg: "#090d14",
  bgSession: "#0d1117",
  surface: "#131920",
  surfaceAlt: "#0d1117",
  surfaceActive: "#131c28",
  border: "#1e2a38",
  hairline: "rgba(255,255,255,0.07)",

  textPrimary: "#f0f6ff",
  textSecondary: "#aab4c8",
  textTertiary: "#9aabbc",
  textMuted: "#556070",
  textDisabled: "#445566",
  onAccent: "#ffffff",

  accent: "#4f8ef7",
  success: "#4caf6e",
  danger: "#e06070",
  warning: "#e0a030",
  neutral: "#778899",

  timerText: "#ffffff",
  textFaint: "rgba(255,255,255,0.4)",
  overlayBtn: "rgba(255,255,255,0.08)",
  progressTrack: "rgba(255,255,255,0.08)",
  dotIdle: "rgba(255,255,255,0.18)",
};

const oled = {
  ...dark,
  name: "oled",
  isDark: true,

  bg: "#000000",
  bgSession: "#000000",
  surface: "#0a0e14",
  surfaceAlt: "#05070a",
  surfaceActive: "#0d1420",
  border: "#161d26",
  hairline: "rgba(255,255,255,0.06)",

  overlayBtn: "rgba(255,255,255,0.06)",
  progressTrack: "rgba(255,255,255,0.06)",
};

const light = {
  name: "light",
  isDark: false,

  bg: "#f4f6fb",
  bgSession: "#eef1f7",
  surface: "#ffffff",
  surfaceAlt: "#e7ebf3",
  surfaceActive: "#dbe6fb",
  border: "#d4dae6",
  hairline: "rgba(0,0,0,0.08)",

  textPrimary: "#10151f",
  textSecondary: "#3d4757",
  textTertiary: "#55617a",
  textMuted: "#8a93a6",
  textDisabled: "#aab2c2",
  onAccent: "#ffffff",

  accent: "#2f6fe0",
  success: "#2e9e5b",
  danger: "#d64550",
  warning: "#c98a1e",
  neutral: "#6b7788",

  timerText: "#10151f",
  textFaint: "rgba(0,0,0,0.4)",
  overlayBtn: "rgba(0,0,0,0.06)",
  progressTrack: "rgba(0,0,0,0.08)",
  dotIdle: "rgba(0,0,0,0.15)",
};

export const THEMES = { dark, oled, light };

// Ordered list for rendering the theme picker (label + emoji live with the data).
export const THEME_OPTIONS = [
  { key: "dark", name: "Dark Mode", emoji: "🌙" },
  { key: "light", name: "Light", emoji: "☀️" },
  { key: "oled", name: "OLED Black", emoji: "🖤" },
];

// Resolve a persisted theme name to a palette, falling back to dark for any
// unknown/legacy value.
export function getTheme(name) {
  return THEMES[name] || THEMES.dark;
}
