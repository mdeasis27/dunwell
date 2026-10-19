// Prints the contrast table used in DESIGN.md, computed from styles/tokens.css.
// Usage: bun scripts/contrast-table.ts
import { readFileSync } from "node:fs";

const css = readFileSync("styles/tokens.css", "utf8");

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) throw new Error(`missing token ${name}`);
  return match[1];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const STAGES = ["heads_up", "friendly", "firm", "final", "escalate", "hold", "none"];
const PAIRS: Array<[string, string]> = [
  ["ink", "paper"],
  ["ink", "surface"],
  ["ink", "surface-sunk"],
  ["muted", "paper"],
  ["muted", "surface"],
  ["muted", "surface-sunk"],
  ["accent", "paper"],
  ["accent", "surface"],
  ["accent", "surface-sunk"],
  ["on-accent", "accent"],
  ["paper", "ink"],
  ...STAGES.map((s): [string, string] => [`stage-${s}`, `stage-${s}-bg`]),
];

for (const [fg, bg] of PAIRS) {
  const value = ratio(token(fg), token(bg)).toFixed(2);
  process.stdout.write(`| \`--${fg}\` ${token(fg)} | \`--${bg}\` ${token(bg)} | ${value}:1 |\n`);
}
