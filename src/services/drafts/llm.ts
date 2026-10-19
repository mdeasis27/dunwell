import "server-only";
import { z } from "zod";
import { chat } from "@/ai-kit/router";
import { formatCents } from "../../domain/money";
import type { Draft, DraftFacts } from "./templates";

const MAX_TOKENS = 400;
const TEMPERATURE = 0.4;
const MAX_WORDS = 120;

const ModelDraftSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

const TONE: Record<DraftFacts["stage"], string> = {
  heads_up: "a gentle notice that the invoice is due soon",
  friendly: "a warm reminder that assumes it was simply forgotten",
  firm: "polite but firm, asking for payment this week or a date",
  final: "a final reminder with a 5 day deadline and a clear consequence",
  escalate: "very serious: work is paused and the next step follows without payment",
};

function systemPrompt(facts: DraftFacts): string {
  const language = facts.lang === "es" ? "Spanish" : "English";
  return [
    `You write payment reminder emails for a freelancer, in ${language}, in the first person.`,
    `Tone: ${TONE[facts.stage]}. Plain words. No em dashes. At most ${MAX_WORDS} words in the body.`,
    'Reply with JSON only: {"subject": string, "body": string}. Include the payment link exactly as given.',
  ].join(" ");
}

function userPrompt(facts: DraftFacts): string {
  return JSON.stringify({
    client: facts.client,
    invoice: facts.invoiceId,
    amount_left: formatCents(facts.remainingCents, facts.lang),
    due_date: facts.due,
    days_overdue: Math.max(facts.daysOverdue, 0),
    payment_link: facts.link,
  });
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(text.slice(start, end + 1)) as unknown;
}

export async function llmDraft(facts: DraftFacts): Promise<Draft> {
  const response = await chat({
    messages: [
      { role: "system", content: systemPrompt(facts) },
      { role: "user", content: userPrompt(facts) },
    ],
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });
  const parsed = ModelDraftSchema.parse(extractJson(response.text));
  const body = parsed.body.includes(facts.link) ? parsed.body : `${parsed.body}\n\n${facts.link}`;
  return { subject: parsed.subject, body, source: "model" };
}
