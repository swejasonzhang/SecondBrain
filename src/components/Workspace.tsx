"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect, useState, useTransition } from "react";
import {
  type NoteListItem,
  type SearchHit,
  deleteNote,
  getNote,
  listNotes,
  saveNote,
  searchNotes,
} from "@/lib/actions";
import { ChatPanel } from "./ChatPanel";

interface Props {
  initialNotes: NoteListItem[];
  dbError: string | null;
}

const BLANK = { id: undefined as string | undefined, content: "" };

export function Workspace({ initialNotes, dbError }: Props) {
  const [notes, setNotes] = useState<NoteListItem[]>(initialNotes);
  const [draft, setDraft] = useState(BLANK);
  const [dirty, setDirty] = useState(false);
  const [saving, startSaving] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [showChat, setShowChat] = useState(true);

  async function refresh() {
    setNotes(await listNotes());
  }

  async function openNote(id: string) {
    const note = await getNote(id);
    if (note) {
      setDraft({ id: note.id, content: note.content });
      setDirty(false);
    }
  }

  function newNote() {
    setDraft(BLANK);
    setDirty(false);
  }

  function save() {
    if (!draft.content.trim()) return;
    startSaving(async () => {
      const { id } = await saveNote(draft);
      setDraft((d) => ({ ...d, id }));
      setDirty(false);
      await refresh();
    });
  }

  async function remove(id: string) {
    await deleteNote(id);
    if (draft.id === id) newNote();
    await refresh();
  }

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchNotes(q));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const wordCount = draft.content.trim()
    ? draft.content.trim().split(/\s+/).length
    : 0;

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🧠</span>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Second Brain</h1>
            <p className="text-[11px] text-text-faint">
              AI knowledge base · semantic search · RAG chat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={newNote}
            className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm font-medium transition hover:border-border-strong"
          >
            + New note
          </button>
          <button
            onClick={() => setShowChat((s) => !s)}
            className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm font-medium transition hover:border-border-strong"
          >
            {showChat ? "Hide chat" : "Chat 🧠"}
          </button>
          <div className="ml-1 flex items-center">
            <UserButton
              appearance={{ elements: { avatarBox: "h-7 w-7" } }}
            />
          </div>
        </div>
      </header>

      {dbError && (
        <div className="border-b border-border bg-accent-soft px-5 py-2 text-xs text-accent">
          Database not connected: {dbError} — add <code>DATABASE_URL</code> to{" "}
          <code>.env.local</code> and run <code>npm run db:push</code>.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔎 Search by meaning…"
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm outline-none placeholder:text-text-faint focus:border-border-strong"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {results !== null ? (
              <>
                <p className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-text-faint">
                  {searching ? "Searching…" : `${results.length} semantic matches`}
                </p>
                {results.map((hit) => (
                  <button
                    key={hit.id}
                    onClick={() => openNote(hit.id)}
                    className="mb-1 block w-full rounded-lg px-3 py-2 text-left transition hover:bg-bg-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {hit.title}
                      </span>
                      <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent">
                        {Math.round(hit.similarity * 100)}%
                      </span>
                    </div>
                    {hit.summary && (
                      <p className="mt-0.5 truncate text-xs text-text-faint">
                        {hit.summary}
                      </p>
                    )}
                  </button>
                ))}
              </>
            ) : (
              <>
                <p className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-text-faint">
                  {notes.length} notes
                </p>
                {notes.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-text-faint">
                    No notes yet. Write your first one →
                  </p>
                )}
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`group mb-1 flex items-start gap-1 rounded-lg px-2 transition hover:bg-bg-card ${
                      draft.id === note.id ? "bg-bg-card" : ""
                    }`}
                  >
                    <button
                      onClick={() => openNote(note.id)}
                      className="min-w-0 flex-1 py-2 pl-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium">
                        {note.title}
                      </span>
                      {note.summary && (
                        <span className="mt-0.5 block truncate text-xs text-text-faint">
                          {note.summary}
                        </span>
                      )}
                      {note.tags.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {note.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => remove(note.id)}
                      title="Delete"
                      className="mt-2 shrink-0 px-1 text-text-faint opacity-0 transition hover:text-(--danger) group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
            <span className="text-xs text-text-faint">
              {draft.id ? "Editing note" : "New note"} · {wordCount} words
            </span>
            <div className="flex items-center gap-2">
              {dirty && !saving && (
                <span className="text-xs text-text-faint">Unsaved</span>
              )}
              <button
                onClick={save}
                disabled={saving || !draft.content.trim()}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-40"
              >
                {saving ? "Enriching + embedding…" : "Save"}
              </button>
            </div>
          </div>
          <textarea
            value={draft.content}
            onChange={(e) => {
              setDraft((d) => ({ ...d, content: e.target.value }));
              setDirty(true);
            }}
            placeholder={
              "Write a note in Markdown…\n\nOn save, Claude auto-generates a title, summary, and tags, and Voyage embeds it for semantic search."
            }
            className="min-h-0 flex-1 resize-none bg-transparent px-6 py-5 font-mono text-sm leading-relaxed outline-none placeholder:text-text-faint"
          />
        </main>

        {showChat && (
          <section className="w-96 shrink-0 border-l border-border">
            <ChatPanel />
          </section>
        )}
      </div>
    </div>
  );
}
