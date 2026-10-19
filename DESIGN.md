# Dunwell design

Dunwell has its own look: warm paper, dark ink, one burnt-umber accent, and a serif display face. It is
not shared with any other project. Tokens live in `styles/tokens.css`; component styles in `styles/app.css`.

## Idea

A reminder card that gets firmer. The palette is stationery (paper, ink, a wax-seal accent). The five reminder
stages each get a color, but color is never the only signal: every badge also carries its text label and a
thick left border.

## Wordmark

`dunwell`, lowercase, set in Fraunces 600. The `w` is the accent color. Three rising bars follow the word,
one per escalation step (small, medium, tall). The bars are decorative (`aria-hidden`); the link reads
as "Dunwell" to assistive tech. Source: `src/components/Wordmark.tsx`. The OG image repeats it
(`app/[lang]/app/opengraph-image.tsx`).

## Typography

| Role | Family | Loaded with | Notes |
|---|---|---|---|
| Display, wordmark, numbers | Fraunces (variable) | `next/font/google` | Headings, big numbers in Compare |
| Body and UI | Atkinson Hyperlegible 400/700 | `next/font/google` | Designed for low-vision legibility |

Scale: a 1.25 ratio, `--step--1` (0.8rem) to `--step-5` (3.05rem). `h1` uses `clamp()` so it fits at 375 px.
Line length is capped at 66ch (`--measure`).

## Color tokens

Neutrals and accent:

| Token | Value | Use |
|---|---|---|
| `--paper` | #faf6ef | Page background |
| `--surface` | #ffffff | Cards, table, inputs |
| `--surface-sunk` | #efe9dd | Hover and notices |
| `--ink` | #1f1b16 | Body text, borders |
| `--muted` | #5c5348 | Secondary text |
| `--line` | #cfc5b4 | Hairlines (decorative, never carries text) |
| `--accent` | #8a3b12 | Links, buttons, focus ring |
| `--on-accent` | #ffffff | Text on accent buttons |

Stage colors are in the table below as `--stage-*` text on `--stage-*-bg`.

## Contrast (WCAG AA minimum)

Normal text needs 4.5:1. Every pair used for text in the UI is listed with its measured ratio. The ratios are
computed from `styles/tokens.css` by `bun scripts/contrast-table.ts` and enforced by
`tests/design-contrast.test.ts`, so this table cannot drift from the tokens.

| Text | Background | Ratio |
|---|---|---|
| `--ink` #1f1b16 | `--paper` #faf6ef | 15.89:1 |
| `--ink` #1f1b16 | `--surface` #ffffff | 17.12:1 |
| `--ink` #1f1b16 | `--surface-sunk` #efe9dd | 14.16:1 |
| `--muted` #5c5348 | `--paper` #faf6ef | 7.00:1 |
| `--muted` #5c5348 | `--surface` #ffffff | 7.54:1 |
| `--muted` #5c5348 | `--surface-sunk` #efe9dd | 6.23:1 |
| `--accent` #8a3b12 | `--paper` #faf6ef | 7.18:1 |
| `--accent` #8a3b12 | `--surface` #ffffff | 7.73:1 |
| `--accent` #8a3b12 | `--surface-sunk` #efe9dd | 6.40:1 |
| `--on-accent` #ffffff | `--accent` #8a3b12 | 7.73:1 |
| `--paper` #faf6ef | `--ink` #1f1b16 | 15.89:1 |
| `--stage-heads_up` #2f5d8a | `--stage-heads_up-bg` #e6eef6 | 5.87:1 |
| `--stage-friendly` #2e6b3f | `--stage-friendly-bg` #e5f1e8 | 5.49:1 |
| `--stage-firm` #7a5600 | `--stage-firm-bg` #f7ebcb | 5.60:1 |
| `--stage-final` #a13d12 | `--stage-final-bg` #f9e3d8 | 5.33:1 |
| `--stage-escalate` #8e1b2c | `--stage-escalate-bg` #f6dde0 | 6.97:1 |
| `--stage-hold` #5c5348 | `--stage-hold-bg` #e9e3d8 | 5.90:1 |
| `--stage-none` #5c5348 | `--stage-none-bg` #f1ece2 | 6.40:1 |

Non-text: the focus ring (`--accent` on `--paper`, 7.18:1) clears the 3:1 UI minimum.

To regenerate after changing a token: `bun scripts/contrast-table.ts`.

## Interaction and accessibility

- One `h1` per page (the product name). Sections are `h2`, with `aria-labelledby`.
- Visible focus everywhere: `:focus-visible` draws a 3 px accent outline with a 2 px offset. It is never removed.
- Every control has a label. Row buttons include the client name in their accessible name
  ("Draft email for Marta Ortega Studio").
- Minimum target size is 44 px (`--target`) for buttons, inputs and links in the top bar.
- Status messages use `role="status"`, so a screen reader announces the result of draft, send and reset.
- The invoice table is a real `<table>` on wide screens. Below 760 px each row becomes a card. The header is
  visually hidden but kept for assistive tech, and each cell gets its label through `data-label`.
- Works at 375 px wide with no horizontal scroll. No animations, so there is nothing to reduce for motion.
- The page language follows the route (`<html lang>`), and the language switch links carry `lang` and `hreflang`.
