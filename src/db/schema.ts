import {
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
  index,
} from "drizzle-orm/pg-core";

/**
 * Notes are the core entity. Each note carries:
 *  - the user's raw markdown content
 *  - AI-generated enrichment (title, summary, tags)
 *  - a 1024-dim embedding (Voyage `voyage-3.5`) used for semantic search + RAG
 *
 * `ownerId` scopes rows to a user. Until auth is wired up it defaults to a
 * shared demo owner, so the app is fully runnable out of the box.
 */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().default("demo-user"),

    title: text("title").notNull().default("Untitled"),
    content: text("content").notNull().default(""),

    // AI enrichment
    summary: text("summary"),
    tags: text("tags").array().notNull().default([]),

    // Semantic search vector. voyage-3.5 => 1024 dimensions.
    embedding: vector("embedding", { dimensions: 1024 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // HNSW index for fast approximate nearest-neighbour search over embeddings.
    index("notes_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("notes_owner_idx").on(table.ownerId),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
