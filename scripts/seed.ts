/**
 * Seed the database with a handful of demo notes so the app looks alive on
 * first run. Each note is embedded via Voyage and enriched via Claude, exactly
 * like a real save.
 *
 *   SEED_USER_ID=user_xxx npx tsx scripts/seed.ts
 *
 * Set SEED_USER_ID to your Clerk user id (find it in the Clerk dashboard, or log
 * in and copy it from the account menu) so the demo notes show up in your account.
 * Requires DATABASE_URL, VOYAGE_API_KEY, and ANTHROPIC_API_KEY in .env.local.
 */
import "dotenv/config";
import { db } from "../src/db";
import { notes } from "../src/db/schema";
import { enrichNote } from "../src/lib/ai";
import { embedDocuments } from "../src/lib/embeddings";

const DEMO_NOTES = [
  `# Vector databases 101
Vector databases store high-dimensional embeddings and let you query by
similarity instead of exact keywords. pgvector adds this to Postgres via the
\`vector\` type and an HNSW index for fast approximate nearest-neighbour search.
Cosine distance (\`<=>\`) is the usual metric for text embeddings.`,

  `# Retrieval-Augmented Generation (RAG)
RAG grounds an LLM's answer in retrieved documents. The pipeline: embed the
user's question, pull the top-k most similar chunks from a vector store, stuff
them into the prompt as context, then let the model answer with citations. It
dramatically reduces hallucination for domain-specific questions.`,

  `# Standup notes — Tuesday
Shipped the semantic search endpoint. Blocked on the embeddings rate limit for
the bulk backfill — need to batch requests. Next: wire up streaming for the chat
answers so the UI feels instant. Pairing with Sam on the HNSW index tuning.`,

  `# Book highlights: Thinking in Systems
A system is more than the sum of its parts — it's the relationships between them.
Leverage points are places where a small shift produces big change. The least
obvious but most powerful leverage point is the mindset out of which the system's
goals and rules arise.`,

  `# Recipe: weeknight ramen
Simmer chicken stock with ginger, garlic, and a splash of soy and mirin. Soft-boil
eggs for 7 minutes. Blanch fresh noodles for 90 seconds. Top with scallions, chili
oil, and corn. Twenty minutes start to finish.`,
];

async function main() {
  const ownerId = process.env.SEED_USER_ID ?? "demo-user";
  console.log(`Seeding ${DEMO_NOTES.length} demo notes for owner "${ownerId}"…`);
  if (ownerId === "demo-user") {
    console.warn(
      "  ⚠️  SEED_USER_ID not set — notes won't be visible to a logged-in user.\n" +
        "     Re-run with SEED_USER_ID=<your Clerk user id> to see them in the app.",
    );
  }
  for (const content of DEMO_NOTES) {
    const [enrichment, [embedding]] = await Promise.all([
      enrichNote(content),
      embedDocuments([content]),
    ]);
    await db.insert(notes).values({
      ownerId,
      content: content.trim(),
      title: enrichment.title,
      summary: enrichment.summary,
      tags: enrichment.tags,
      embedding,
    });
    console.log(`  ✓ ${enrichment.title}`);
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
