// ai-kit/demo-mode.ts
// Convention: every MDEA portfolio project with AI MUST ship pre-computed
// demo cases that work without API keys. This module defines the shape.

export type DemoCase<TInput, TOutput> = {
  id: string;
  label?: string;
  input: TInput;
  output: TOutput;
};

export function defineDemoCase<TInput, TOutput>(
  c: DemoCase<TInput, TOutput>,
): DemoCase<TInput, TOutput> {
  return c;
}

/**
 * Deterministic demo case picker — given a raw input string (e.g., a name or ID),
 * returns a stable choice from the provided cases so that demos are reproducible.
 */
export function pickDemoCase<TInput, TOutput>(
  cases: DemoCase<TInput, TOutput>[],
  input: string,
): DemoCase<TInput, TOutput> {
  if (cases.length === 0) {
    throw new Error("pickDemoCase: no cases provided");
  }
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % cases.length;
  return cases[idx];
}
