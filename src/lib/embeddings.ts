import { VoyageAIClient } from "voyageai";

/**
 * Semantic embeddings via Voyage AI (Anthropic's recommended embeddings partner).
 * `voyage-3.5` returns 1024-dimensional vectors — matched by the `notes.embedding`
 * column in the Drizzle schema.
 */
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

/**
 * Embed a batch of documents (for indexing notes on save).
 * `inputType: "document"` tells Voyage to optimize for the corpus side of search.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getClient().embed({
    input: texts,
    model: EMBEDDING_MODEL,
    inputType: "document",
  });
  return (res.data ?? []).map((d) => d.embedding ?? []);
}

/**
 * Embed a single search query. `inputType: "query"` optimizes for the query side —
 * asymmetric embeddings measurably improve retrieval quality.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const res = await getClient().embed({
    input: [text],
    model: EMBEDDING_MODEL,
    inputType: "query",
  });
  return res.data?.[0]?.embedding ?? [];
}
