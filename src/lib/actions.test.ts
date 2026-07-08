import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  let dbResult: unknown[] = [];
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "from", "where", "orderBy", "limit",
    "insert", "values", "returning", "update", "set", "delete",
  ];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  (chain as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(dbResult).then(res, rej);
  return { chain, setDbResult: (r: unknown[]) => { dbResult = r; } };
});

vi.mock("@/db", () => ({ db: h.chain }));
vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));
vi.mock("@/lib/ai", () => ({ enrichNote: vi.fn() }));
vi.mock("@/lib/embeddings", () => ({ embedDocuments: vi.fn(), embedQuery: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  listNotes,
  saveNote,
  deleteNote,
  searchNotes,
} from "./actions";
import { requireUserId } from "@/lib/auth";
import { enrichNote } from "@/lib/ai";
import { embedDocuments, embedQuery } from "@/lib/embeddings";
import { revalidatePath } from "next/cache";

const chain = h.chain as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUserId).mockResolvedValue("user_123");
  vi.mocked(enrichNote).mockResolvedValue({ title: "T", summary: "S", tags: ["x"] });
  vi.mocked(embedDocuments).mockResolvedValue([[0.1, 0.2]]);
  vi.mocked(embedQuery).mockResolvedValue([0.1, 0.2]);
  h.setDbResult([]);
});

describe("listNotes", () => {
  it("requires a user and returns the scoped rows", async () => {
    h.setDbResult([{ id: "1", title: "A", summary: null, tags: [], updatedAt: new Date() }]);
    const result = await listNotes();
    expect(requireUserId).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(chain.where).toHaveBeenCalled();
  });
});

describe("saveNote", () => {
  it("rejects empty content and never touches the database", async () => {
    await expect(saveNote({ content: "   " })).rejects.toThrow(/empty/i);
    expect(enrichNote).not.toHaveBeenCalled();
    expect(embedDocuments).not.toHaveBeenCalled();
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("creates a note: enriches, embeds, inserts scoped to the user, revalidates", async () => {
    h.setDbResult([{ id: "new-id" }]);
    const result = await saveNote({ content: "hello world" });

    expect(result).toEqual({ id: "new-id" });
    expect(enrichNote).toHaveBeenCalledWith("hello world");
    expect(embedDocuments).toHaveBeenCalledWith(["hello world"]);

    const inserted = chain.values.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.ownerId).toBe("user_123");
    expect(inserted.title).toBe("T");
    expect(inserted.embedding).toEqual([0.1, 0.2]);

    expect(chain.update).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("updates an existing note instead of inserting", async () => {
    const result = await saveNote({ id: "abc", content: "updated text" });
    expect(result).toEqual({ id: "abc" });
    expect(chain.update).toHaveBeenCalled();
    expect(chain.set).toHaveBeenCalled();
    expect(chain.insert).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("searchNotes", () => {
  it("returns [] for a blank query without hitting auth or the embedder", async () => {
    const result = await searchNotes("   ");
    expect(result).toEqual([]);
    expect(requireUserId).not.toHaveBeenCalled();
    expect(embedQuery).not.toHaveBeenCalled();
  });

  it("embeds the query and returns ranked hits", async () => {
    h.setDbResult([
      { id: "1", title: "Match", summary: "s", tags: [], similarity: 0.92 },
    ]);
    const result = await searchNotes("vector search");
    expect(embedQuery).toHaveBeenCalledWith("vector search");
    expect(result[0].similarity).toBeCloseTo(0.92);
  });
});

describe("deleteNote", () => {
  it("deletes scoped to the user and revalidates", async () => {
    await deleteNote("note-1");
    expect(requireUserId).toHaveBeenCalledOnce();
    expect(chain.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});
