import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/actions", () => ({ retrieveContext: vi.fn() }));
vi.mock("@/lib/ai", () => ({ getAnthropic: vi.fn(), CHAT_MODEL: "claude-opus-4-8" }));

import { POST } from "./route";
import { retrieveContext } from "@/lib/actions";
import { getAnthropic } from "@/lib/ai";

async function* textStream(chunks: string[]) {
  for (const text of chunks) {
    yield { type: "content_block_delta", delta: { type: "text_delta", text } };
  }
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const streamMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnthropic).mockReturnValue({
    messages: { stream: streamMock },
  } as unknown as ReturnType<typeof getAnthropic>);
});

describe("POST /api/chat", () => {
  it("returns 400 when the message is missing", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it("grounds the answer in retrieved notes and streams the text", async () => {
    vi.mocked(retrieveContext).mockResolvedValue([
      { id: "n1", title: "Note One", content: "vector db facts", similarity: 0.9 },
    ]);
    streamMock.mockReturnValue(textStream(["Hello ", "world"]));

    const res = await post({ message: "what did I learn?" });
    expect(res.status).toBe(200);

    // The streamed body is the concatenated deltas.
    expect(await res.text()).toBe("Hello world");

    // The system prompt is grounded in the retrieved note.
    const systemPrompt = streamMock.mock.calls[0][0].system as string;
    expect(systemPrompt).toContain("Note One");
    expect(systemPrompt).toContain("vector db facts");
  });

  it("exposes the cited sources via the x-sources header", async () => {
    vi.mocked(retrieveContext).mockResolvedValue([
      { id: "n1", title: "Note One", content: "c", similarity: 0.9 },
    ]);
    streamMock.mockReturnValue(textStream(["ok"]));

    const res = await post({ message: "q" });
    const sources = JSON.parse(
      decodeURIComponent(res.headers.get("x-sources") ?? ""),
    );
    expect(sources).toEqual([{ id: "n1", title: "Note One" }]);
  });

  it("degrades gracefully when retrieval fails", async () => {
    vi.mocked(retrieveContext).mockRejectedValue(new Error("db down"));

    const res = await post({ message: "q" });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("couldn't reach your notes");
    // Should never have attempted to call the model.
    expect(streamMock).not.toHaveBeenCalled();
  });
});
