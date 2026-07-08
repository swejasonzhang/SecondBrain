import {
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
  index,
} from "drizzle-orm/pg-core";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().default("demo-user"),

    title: text("title").notNull().default("Untitled"),
    content: text("content").notNull().default(""),

    summary: text("summary"),
    tags: text("tags").array().notNull().default([]),

    embedding: vector("embedding", { dimensions: 1024 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notes_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("notes_owner_idx").on(table.ownerId),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
