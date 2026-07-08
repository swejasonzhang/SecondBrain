import { GoogleGenAI, Type } from "@google/genai";

export const CHAT_MODEL = "gemini-2.5-flash";
export const ENRICH_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local — see .env.example.",
    );
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export interface Enrichment {
  title: string;
  summary: string;
  tags: string[];
}

export async function enrichNote(content: string): Promise<Enrichment> {
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: ENRICH_MODEL,
    contents: `Analyze this note and produce a title, summary, and tags.\n\n---\n${content}\n---`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "A concise, specific title (max ~8 words).",
          },
          summary: {
            type: Type.STRING,
            description: "One sentence capturing the note's essence.",
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "1-5 lowercase topical tags, no '#'.",
          },
        },
        required: ["title", "summary", "tags"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return {
    title: parsed.title || "Untitled",
    summary: parsed.summary || "",
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
  };
}
