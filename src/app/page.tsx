import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { listNotes } from "@/lib/actions";
import { Workspace } from "@/components/Workspace";

export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export default async function Home() {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }

  if (!userId) return <Landing />;

  let notes: Awaited<ReturnType<typeof listNotes>> = [];
  let dbError: string | null = null;
  try {
    notes = await listNotes();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Could not reach the database.";
  }

  return <Workspace initialNotes={notes} dbError={dbError} />;
}

function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-text">
      <div className="max-w-xl">
        <div className="mb-6 text-6xl">🧠</div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your Second Brain
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-text-muted">
          Capture notes, search them by <em>meaning</em>, and chat with your own
          knowledge. Powered by semantic search and Claude.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <SignUpButton mode="modal">
            <button className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover">
              Get started — it&apos;s free
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="rounded-lg border border-border bg-bg-card px-5 py-2.5 text-sm font-medium transition hover:border-border-strong">
              Sign in
            </button>
          </SignInButton>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[
            { icon: "🔎", title: "Semantic search", body: "Find notes by meaning, not keywords." },
            { icon: "💬", title: "Chat with your notes", body: "RAG answers with cited sources." },
            { icon: "✨", title: "Auto-enrichment", body: "AI titles, summaries, and tags on save." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-bg-card p-4">
              <div className="text-xl">{f.icon}</div>
              <div className="mt-2 text-sm font-medium">{f.title}</div>
              <div className="mt-1 text-xs text-text-faint">{f.body}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-12 text-xs text-text-faint">
        Next.js · pgvector · Voyage embeddings · Claude
      </p>
    </div>
  );
}
