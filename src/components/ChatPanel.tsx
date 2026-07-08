"use client";

import { useRef, useState } from "react";
import { Markdown } from "./Markdown";

interface Source {
  id: string;
  title: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  async function send() {
    const question = input.trim();
    if (!question || busy) return;

    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }

      let sources: Source[] = [];
      try {
        const raw = res.headers.get("x-sources");
        if (raw) sources = JSON.parse(decodeURIComponent(raw));
      } catch {
        sources = [];
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            role: "assistant",
            content: acc,
            sources,
          };
          return next;
        });
        scrollToBottom();
      }
    } catch (err) {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong."}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="text-lg">🧠</span>
        <div>
          <h2 className="text-sm font-semibold">Chat with your brain</h2>
          <p className="text-xs text-text-faint">
            Answers grounded in your notes, with sources
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-sm text-text-faint">
            <p className="mb-3 text-2xl">💬</p>
            Ask anything about your notes.
            <br />
            <span className="text-text-faint/70">
              &ldquo;What did I learn about vector databases?&rdquo;
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                msg.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white"
                  : "max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-bg-card px-4 py-3"
              }
            >
              {msg.role === "assistant" ? (
                msg.content ? (
                  <>
                    <Markdown>{msg.content}</Markdown>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                        <span className="text-[11px] text-text-faint">Sources:</span>
                        {msg.sources.map((s, j) => (
                          <span
                            key={s.id}
                            className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent"
                          >
                            [{j + 1}] {s.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="flex gap-1">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-faint" />
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-text-faint"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-text-faint"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </span>
                )
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask your second brain…"
            className="max-h-32 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "…" : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
