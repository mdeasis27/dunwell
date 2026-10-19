import "server-only";

export interface ServiceModes {
  readonly llm: boolean;
  readonly mail: boolean;
  readonly payments: boolean;
}

export const STRIPE_TEST_PREFIX = "sk_test_";

export function isLlmLive(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GEMINI_API_KEY || env.GROQ_API_KEY || env.OPENROUTER_API_KEY);
}

export function isMailLive(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

/** Only test-mode keys count, so a real charge is impossible. */
export function isPaymentsLive(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY?.startsWith(STRIPE_TEST_PREFIX));
}

export function serviceModes(env: NodeJS.ProcessEnv = process.env): ServiceModes {
  return { llm: isLlmLive(env), mail: isMailLive(env), payments: isPaymentsLive(env) };
}
