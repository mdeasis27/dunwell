import "server-only";
import { isLlmLive } from "../mode";
import { llmDraft } from "./llm";
import { type Draft, type DraftFacts, templateDraft } from "./templates";

export interface DraftResult {
  readonly draft: Draft;
  readonly fellBack: boolean;
}

export async function getDraft(facts: DraftFacts): Promise<DraftResult> {
  if (!isLlmLive()) return { draft: templateDraft(facts), fellBack: false };
  try {
    return { draft: await llmDraft(facts), fellBack: false };
  } catch (error: unknown) {
    console.error(
      "draft: language model failed, using template",
      error instanceof Error ? error.message : error,
    );
    return { draft: templateDraft(facts), fellBack: true };
  }
}
