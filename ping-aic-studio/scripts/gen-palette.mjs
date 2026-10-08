#!/usr/bin/env node
/**
 * Generates src/app/palette.css — the light/dark remap of Tailwind's colour scales.
 *
 *   node scripts/gen-palette.mjs
 *
 * Components keep their Tailwind class names (bg-slate-50, text-sky-600, …) and hex colours in
 * graphs/highlighters reference the same variables (var(--color-slate-400)); this file redefines
 * the --color-<family>-<shade> variables once per context:
 *
 *   :root                                 light theme — warm paper neutrals, accents mixed toward paper
 *   [data-theme=dark]                     dark theme — ramp inverted: 50–400 are dark tints over the
 *                                         tile, 600 is the bright accent, 700–950 get lighter
 *   [data-theme=dark] .code-surface       code/terminal/graph panes (authored dark): cool dark ramp
 *   :not([data-theme=dark]) .code-surface the same panes in the light theme: the warm ramp inverted,
 *                                         so they render as light paper with dark syntax colours
 *
 * sky / blue / indigo deliberately share one accent so the app has a single primary colour.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const WHITE = "#ffffff";
const BLACK = "#000000";
const PAPER = "#f8f4ed"; // light-theme tile ("white")
const PAPER_MIX = "#fbf8f2"; // what light-theme accent tints are mixed toward
const TILE_DARK = "#141519";

// family -> [light 500, light 600, light 700, dark accent]
const ACCENTS = {
  blue: ["#4a7bf0", "#2c5bd0", "#2148ad", "#6b97ff"],
  violet: ["#8a63e0", "#6a3fc8", "#55309f", "#b9a3ff"],
  teal: ["#14a38d", "#0b7666", "#08594d", "#3cc8b4"],
  cyan: ["#1aa3c4", "#0b7891", "#095e72", "#4cc3dc"],
  amber: ["#e0a222", "#9a6200", "#7a4e00", "#f2b84b"],
  orange: ["#f07b3a", "#c2560f", "#9a420a", "#ff9b5e"],
  coral: ["#e5584a", "#c2372a", "#9c2a20", "#ff7d6e"],
};
const FAMILY_OF = {
  sky: "blue", blue: "blue", indigo: "blue",
  violet: "violet", purple: "violet",
  emerald: "teal", green: "teal", teal: "teal", lime: "teal",
  cyan: "cyan",
  amber: "amber", yellow: "amber",
  orange: "orange",
  rose: "coral", red: "coral", pink: "coral", fuchsia: "coral",
};
const NEUTRALS = ["slate", "gray", "zinc", "neutral", "stone"];
// Warm paper greys for the light theme (hue taken from the canvas, so borders and muted text don't look dirty).
const NEUTRAL_LIGHT = ["#f2ede4", "#ebe5d9", "#ddd5c6", "#c9bfad", "#776d5f", "#6b6254", "#51493d", "#3c352c", "#2a251f", "#211d17", "#16130f"];
const NEUTRAL_DARK = ["#0c0d10", "#1a1b20", "#26282e", "#34363d", "#7c808a", "#8d9098", "#a3a6ad", "#c4c7cd", "#dcdee2", "#f1f2f4", "#fafafb"];
// Cool greys used inside code panes in the dark theme.
const NEUTRAL_CODE_DARK = ["#f5f6f8", "#eceef2", "#dfe2e8", "#c9cdd5", "#80858f", "#646973", "#5f646e", "#383c44", "#24272d", "#14161b", "#0c0d10"];
// Code panes in the light theme, indexed by the shade the component asked for (authored for a dark pane).
const NEUTRAL_CODE_LIGHT = ["#120f0b", "#1d1914", "#29241e", "#3a342c", "#5c5447", "#756c5e", "#8f8574", "#d8cfbf", "#e7e0d3", "#f2ede4", "#f6f2ea"];
// For accents in light code panes: which light-theme shade stands in for each authored shade.
// Text shades (300/400/500) become deep, tints (900/950) become pale, solid fills (600–800) become pale fills.
const CODE_LIGHT_SHADE = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 600, 500: 600, 600: 200, 700: 300, 800: 200, 900: 100, 950: 50 };

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** sRGB mix: `t` is the share of `a`. */
const mix = (a, b, t) => {
  const [x, y] = [rgb(a), rgb(b)];
  return "#" + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
};

function lightRamp([v, p, d], base = PAPER_MIX) {
  return [mix(v, base, 0.07), mix(v, base, 0.14), mix(v, base, 0.28), mix(v, base, 0.48), mix(v, base, 0.74),
    v, p, d, mix(d, BLACK, 0.8), mix(d, BLACK, 0.66), mix(d, BLACK, 0.5)];
}
function darkRamp(a) {
  return [mix(a, TILE_DARK, 0.1), mix(a, TILE_DARK, 0.16), mix(a, TILE_DARK, 0.28), mix(a, TILE_DARK, 0.45), mix(a, TILE_DARK, 0.7),
    mix(a, TILE_DARK, 0.88), a, mix(a, WHITE, 0.8), mix(a, WHITE, 0.62), mix(a, WHITE, 0.46), mix(a, WHITE, 0.36)];
}
function codeLightRamp(anchors) {
  const light = lightRamp(anchors);
  return SHADES.map((s) => light[SHADES.indexOf(CODE_LIGHT_SHADE[s])]);
}

const VARIANTS = {
  light: { white: PAPER, neutral: NEUTRAL_LIGHT, accent: (fam) => lightRamp(ACCENTS[fam]) },
  dark: { white: TILE_DARK, neutral: NEUTRAL_DARK, accent: (fam) => darkRamp(ACCENTS[fam][3]) },
  codeDark: { white: WHITE, neutral: NEUTRAL_CODE_DARK, accent: (fam) => lightRamp(ACCENTS[fam], WHITE) },
  codeLight: { white: NEUTRAL_CODE_LIGHT[1], neutral: NEUTRAL_CODE_LIGHT, accent: (fam) => codeLightRamp(ACCENTS[fam]) },
};

function block(variant) {
  const v = VARIANTS[variant];
  const lines = [`  --color-white: ${v.white};`];
  for (const n of NEUTRALS) SHADES.forEach((s, i) => lines.push(`  --color-${n}-${s}: ${v.neutral[i]};`));
  for (const [tw, fam] of Object.entries(FAMILY_OF)) {
    const ramp = v.accent(fam);
    SHADES.forEach((s, i) => lines.push(`  --color-${tw}-${s}: ${ramp[i]};`));
  }
  return lines.join("\n");
}

const css = `/* GENERATED by scripts/gen-palette.mjs — edit the anchors there and re-run; do not edit by hand. */

:root {
${block("light")}
}

:root[data-theme="dark"] {
${block("dark")}
}

/* Code, terminal, diff and graph panes are authored for a dark background
   (bg-slate-900, text-slate-300, syntax colours like var(--color-purple-400)).
   They follow the theme: cool and dark in the dark theme, light paper with
   deep syntax colours in the light theme. */
:root[data-theme="dark"] .code-surface {
${block("codeDark")}
}

:root:not([data-theme="dark"]) .code-surface {
${block("codeLight")}
}
`;

const out = fileURLToPath(new URL("../src/app/palette.css", import.meta.url));
writeFileSync(out, css);
console.log(`wrote ${out}`);
