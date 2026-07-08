import { VoyageAIClient } from "voyageai";

const EMBEDDING_MODEL = "voyage-3.5";
export const EMBEDDING_DIMENSIONS = 1024;

let client: VoyageAIClient | null = null;

function getClient(): VoyageAIClient {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error(
      "VOYAGE_API_KEY is not set. Add it to .env.local — see .env.example.",
    );
  }
  client ??= new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });
  return client;
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getClient().embed({
    input: texts,
    model: EMBEDDING_MODEL,
    inputType: "document",
  });
  return (res.data ?? []).map((d) => d.embedding ?? []);
}

export async function embedQuery(text: string): Promise<number[]> {
  const res = await getClient().embed({
    input: [text],
    model: EMBEDDING_MODEL,
    inputType: "query",
  });
  return res.data?.[0]?.embedding ?? [];
}
