import { describe, expect, test } from "bun:test";
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

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const STAGES = ["heads_up", "friendly", "firm", "final", "escalate", "hold", "none"];

// [text token, background token, minimum ratio]. 4.5 for text, 3 for UI components and focus rings.
const PAIRS: Array<[string, string, number]> = [
  ["ink", "paper", 4.5],
  ["ink", "surface", 4.5],
  ["ink", "surface-sunk", 4.5],
  ["muted", "paper", 4.5],
  ["muted", "surface", 4.5],
  ["muted", "surface-sunk", 4.5],
  ["accent", "paper", 4.5],
  ["accent", "surface", 4.5],
  ["accent", "surface-sunk", 4.5],
  ["on-accent", "accent", 4.5],
  ["paper", "ink", 4.5],
  ["accent", "paper", 3],
  ...STAGES.map((s): [string, string, number] => [`stage-${s}`, `stage-${s}-bg`, 4.5]),
];

describe("design tokens", () => {
  for (const [fg, bg, min] of PAIRS) {
    test(`${fg} on ${bg} is at least ${min}:1`, () => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
    });
  }
});
