import { getAnthropic, CHAT_MODEL } from "@/lib/ai";
import { retrieveContext } from "@/lib/actions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * "Chat with your brain" — Retrieval-Augmented Generation.
 *
 * 1. Embed the question and pull the most relevant notes (retrieveContext).
 * 2. Inject those notes as grounding context into Claude's system prompt.
 * 3. Stream the answer back token-by-token as plain text.
 *
 * The response header `x-sources` carries the cited note titles so the UI can
 * show which notes the answer was drawn from.
 */
export async function POST(req: Request) {
  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return new Response("Missing message", { status: 400 });
  }

  let sources: Awaited<ReturnType<typeof retrieveContext>> = [];
  try {
    sources = await retrieveContext(message, 5);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "retrieval failed";
    return new Response(
      `I couldn't reach your notes to answer that.\n\n${detail}\n\nMake sure DATABASE_URL and VOYAGE_API_KEY are set in .env.local.`,
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const context =
    sources.length > 0
      ? sources
          .map(
            (s, i) =>
              `[Note ${i + 1}: ${s.title}]\n${s.content}`,
          )
          .join("\n\n")
      : "(No relevant notes found in the user's second brain.)";

  const system = `You are the user's "second brain" — a thoughtful assistant that answers questions using ONLY the notes provided below as context.

Rules:
- Ground every claim in the provided notes. Cite them inline like [Note 1].
- If the notes don't contain the answer, say so plainly and don't invent facts.
- Be concise and direct. Lead with the answer.

The user's relevant notes:
---
${context}
---`;

  const anthropic = getAnthropic();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const messageStream = anthropic.messages.stream({
          model: CHAT_MODEL,
          max_tokens: 1024,
          system,
          messages: [{ role: "user", content: message }],
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Error: ${err instanceof Error ? err.message : "chat failed"}]`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-sources": encodeURIComponent(
        JSON.stringify(
          sources.map((s) => ({ id: s.id, title: s.title })),
        ),
      ),
    },
  });
}
