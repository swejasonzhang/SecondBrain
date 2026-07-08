# 🧠 Second Brain

An AI-powered knowledge base. Capture notes in Markdown, search them **by meaning** (not keywords), and **chat with your own notes** — answers are streamed from Claude and grounded in your content with cited sources.

Built to showcase a modern, production-shaped full-stack + AI stack end to end.

> **Live demo:** https://second-brain-ai-knowledge-base.vercel.app

---

## What it does

| Feature | How it works |
| --- | --- |
| **📝 Markdown notes** | Type-safe CRUD via React Server Components + Server Actions |
| **🔎 Semantic search** | Query is embedded (Voyage AI) and ranked against note embeddings using **pgvector** cosine similarity over an HNSW index — find notes by meaning, not exact words |
| **💬 Chat with your brain (RAG)** | Retrieval-Augmented Generation: your question retrieves the most relevant notes, which ground Claude's streamed answer — with inline `[Note N]` citations |
| **✨ AI auto-enrichment** | Every save asks Claude (Haiku) to generate a title, one-line summary, and topical tags via **structured outputs** (guaranteed schema, no brittle parsing) |
| **🔐 Auth & multi-tenancy** | Clerk authentication; every note, search, and chat is scoped to the signed-in user's id — full per-user data isolation |

Each save runs enrichment and embedding **in parallel**, then stores the 1024-dim vector alongside the note so it's instantly searchable and chat-ready.

## Tech stack

- **[Next.js 16](https://nextjs.org)** — App Router, React Server Components, Server Actions, streaming route handlers
- **TypeScript** (strict) + **React 19**
- **[Tailwind CSS v4](https://tailwindcss.com)** — custom dark design system
- **[Postgres + pgvector](https://github.com/pgvector/pgvector)** on **[Neon](https://neon.tech)** (serverless) — vector similarity search
- **[Drizzle ORM](https://orm.drizzle.team)** — type-safe schema, queries, and migrations
- **[Claude](https://www.anthropic.com/claude)** (`claude-opus-4-8` for chat, `claude-haiku-4-5` for enrichment) via the official Anthropic SDK
- **[Voyage AI](https://voyageai.com)** — `voyage-3.5` embeddings (Anthropic's recommended embeddings partner)
- **[Clerk](https://clerk.com)** — authentication & session management
- **[Vitest](https://vitest.dev)** — unit/integration tests with mocked externals
- **[Vercel](https://vercel.com)** — deployment

## Architecture

```
 Browser (React 19)
   │  Server Actions (save / search / delete)        POST /api/chat (RAG, streamed)
   ▼                                                   │
 ┌──────────────────────────────────────────┐         │
 │  saveNote()                               │         ▼
 │   ├─ Claude Haiku → title/summary/tags    │   retrieveContext(question)
 │   └─ Voyage      → 1024-d embedding        │     └─ embed → pgvector top-k
 │        │  (run in parallel)               │           │
 │        ▼                                  │           ▼
 │   Postgres + pgvector (Drizzle)  ◄────────┼──── Claude Opus 4.8 (streamed
 │        ▲                                  │           answer + citations)
 │        │  cosine similarity (HNSW, <=>)   │
 │   searchNotes(query)                      │
 └──────────────────────────────────────────┘
```

Key files:

- [`src/db/schema.ts`](src/db/schema.ts) — Drizzle schema with the `vector(1024)` column + HNSW index
- [`src/lib/actions.ts`](src/lib/actions.ts) — Server Actions: CRUD, `searchNotes`, `retrieveContext`
- [`src/lib/embeddings.ts`](src/lib/embeddings.ts) — Voyage embeddings (asymmetric query/document)
- [`src/lib/ai.ts`](src/lib/ai.ts) — Claude clients + structured-output enrichment
- [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) — streaming RAG endpoint
- [`src/components/`](src/components/) — `Workspace`, `ChatPanel`, `Markdown`

## Getting started

### 1. Prerequisites — three free accounts

| Service | Purpose | Get a key |
| --- | --- | --- |
| **Neon** | Serverless Postgres w/ pgvector | https://neon.tech |
| **Anthropic** | Claude (chat + enrichment) | https://console.anthropic.com |
| **Voyage AI** | Embeddings | https://dash.voyageai.com |
| **Clerk** | Authentication | https://dashboard.clerk.com |

### 2. Configure

```bash
cp .env.example .env.local
# then paste your DATABASE_URL, ANTHROPIC_API_KEY, and VOYAGE_API_KEY
```

### 3. Install & set up the database

```bash
npm install
npm run db:migrate    # creates the pgvector extension, table, and indexes
npm run db:seed       # optional: adds a few demo notes
```

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run db:generate` | Generate a migration from the schema |
| `npm run db:migrate` | Apply migrations (enables pgvector, creates tables) |
| `npm run db:push` | Push schema directly (dev convenience) |
| `npm run db:studio` | Open Drizzle Studio to inspect data |
| `npm run db:seed` | Insert demo notes |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run tests in watch mode |

## Testing

The suite (`npm test`) covers the core logic with all external services mocked, so it runs anywhere with no keys, DB, or network:

- **`retry`** — transient-failure backoff (absorbs Neon cold starts)
- **`embeddings`** — Voyage request shape (asymmetric query/document), vector mapping, missing-key handling
- **`ai`** — Claude enrichment: structured-output parsing, tag capping, safe defaults
- **`actions`** — auth scoping, the create/update save flow (enrich + embed + insert), input validation
- **`chat` route** — RAG orchestration: grounding the prompt in retrieved notes, streamed output, `x-sources` citations, and graceful degradation when retrieval fails

```bash
npm test
# Test Files  5 passed (5)
#      Tests  22 passed (22)
```

## Deploying

1. Push to GitHub and import the repo into **Vercel**.
2. Add `DATABASE_URL`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` as environment variables.
3. Run `npm run db:migrate` against your Neon database once (locally or via a Vercel build step).
4. Deploy. ✅

## Roadmap

- Note chunking for long documents (embed per-section for finer retrieval)
- Conversation memory in chat + follow-up questions
- Tag filtering and a graph view of linked notes

---

Built by Jason. Feedback and PRs welcome.
