"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, sql, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { notes, type Note } from "@/db/schema";
import { enrichNote } from "@/lib/ai";
import { embedDocuments, embedQuery } from "@/lib/embeddings";
import { requireUserId } from "@/lib/auth";

export type NoteListItem = Pick<
  Note,
  "id" | "title" | "summary" | "tags" | "updatedAt"
>;

export async function listNotes(): Promise<NoteListItem[]> {
  const ownerId = await requireUserId();
  return db
    .select({
      id: notes.id,
      title: notes.title,
      summary: notes.summary,
      tags: notes.tags,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(eq(notes.ownerId, ownerId))
    .orderBy(desc(notes.updatedAt));
}

export async function getNote(id: string): Promise<Note | undefined> {
  const ownerId = await requireUserId();
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)));
  return note;
}

/**
 * Create or update a note. On every save we:
 *  1. ask Claude for a title/summary/tags (AI enrichment), and
 *  2. compute a Voyage embedding of the content (for semantic search + RAG),
 * both in parallel to keep the save fast.
 */
export async function saveNote(input: {
  id?: string;
  content: string;
}): Promise<{ id: string }> {
  const ownerId = await requireUserId();
  const content = input.content.trim();
  if (!content) throw new Error("Note is empty.");

  const [enrichment, [embedding]] = await Promise.all([
    enrichNote(content),
    embedDocuments([content]),
  ]);

  if (input.id) {
    await db
      .update(notes)
      .set({
        content,
        title: enrichment.title,
        summary: enrichment.summary,
        tags: enrichment.tags,
        embedding,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, input.id), eq(notes.ownerId, ownerId)));
    revalidatePath("/");
    return { id: input.id };
  }

  const [created] = await db
    .insert(notes)
    .values({
      ownerId,
      content,
      title: enrichment.title,
      summary: enrichment.summary,
      tags: enrichment.tags,
      embedding,
    })
    .returning({ id: notes.id });

  revalidatePath("/");
  return { id: created.id };
}

export async function deleteNote(id: string): Promise<void> {
  const ownerId = await requireUserId();
  await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)));
  revalidatePath("/");
}

export interface SearchHit {
  id: string;
  title: string;
  summary: string | null;
  tags: string[];
  similarity: number;
}

/**
 * Semantic search: embed the query, then rank notes by cosine similarity
 * against their stored embeddings using pgvector's `<=>` distance operator.
 * Similarity = 1 - cosine distance.
 */
export async function searchNotes(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const ownerId = await requireUserId();

  const queryEmbedding = await embedQuery(q);
  const vectorLiteral = JSON.stringify(queryEmbedding);
  const similarity = sql<number>`1 - (${notes.embedding} <=> ${vectorLiteral}::vector)`;

  return db
    .select({
      id: notes.id,
      title: notes.title,
      summary: notes.summary,
      tags: notes.tags,
      similarity,
    })
    .from(notes)
    .where(and(eq(notes.ownerId, ownerId), sql`${notes.embedding} IS NOT NULL`))
    .orderBy(desc(similarity))
    .limit(8);
}

/**
 * Retrieve the top-k most relevant notes for a chat question — the "R" in RAG.
 * Shared by the chat route to ground Claude's answer in the user's own notes.
 */
export async function retrieveContext(
  query: string,
  k = 5,
): Promise<Array<{ id: string; title: string; content: string; similarity: number }>> {
  const ownerId = await requireUserId();
  const queryEmbedding = await embedQuery(query);
  const vectorLiteral = JSON.stringify(queryEmbedding);
  const similarity = sql<number>`1 - (${notes.embedding} <=> ${vectorLiteral}::vector)`;

  return db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      similarity,
    })
    .from(notes)
    .where(
      and(
        eq(notes.ownerId, ownerId),
        sql`${notes.embedding} IS NOT NULL`,
        // Only include reasonably relevant notes so the model isn't fed noise.
        gt(similarity, 0.3),
      ),
    )
    .orderBy(desc(similarity))
    .limit(k);
}
