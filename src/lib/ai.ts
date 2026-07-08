import Anthropic from "@anthropic-ai/sdk";

export const CHAT_MODEL = "claude-opus-4-8";
export const ENRICH_MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local — see .env.example.",
    );
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface Enrichment {
  title: string;
  summary: string;
  tags: string[];
}

export async function enrichNote(content: string): Promise<Enrichment> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: ENRICH_MODEL,
    max_tokens: 512,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "A concise, specific title (max ~8 words).",
            },
            summary: {
              type: "string",
              description: "One sentence capturing the note's essence.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "1-5 lowercase topical tags, no '#'.",
            },
          },
          required: ["title", "summary", "tags"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "user",
        content: `Analyze this note and produce a title, summary, and tags.\n\n---\n${content}\n---`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  const parsed = JSON.parse(text && "text" in text ? text.text : "{}");
  return {
    title: parsed.title || "Untitled",
    summary: parsed.summary || "",
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
  };
}
