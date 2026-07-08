import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/actions", () => ({ retrieveContext: vi.fn() }));
vi.mock("@/lib/ai", () => ({ getGenAI: vi.fn(), CHAT_MODEL: "gemini-2.5-flash" }));

import { POST } from "./route";
import { retrieveContext } from "@/lib/actions";
import { getGenAI } from "@/lib/ai";

async function* textStream(chunks: string[]) {
  for (const text of chunks) {
    yield { text };
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
  vi.mocked(getGenAI).mockReturnValue({
    models: { generateContentStream: streamMock },
  } as unknown as ReturnType<typeof getGenAI>);
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
    streamMock.mockResolvedValue(textStream(["Hello ", "world"]));

    const res = await post({ message: "what did I learn?" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello world");

    const systemPrompt = streamMock.mock.calls[0][0].config.systemInstruction as string;
    expect(systemPrompt).toContain("Note One");
    expect(systemPrompt).toContain("vector db facts");
  });

  it("exposes the cited sources via the x-sources header", async () => {
    vi.mocked(retrieveContext).mockResolvedValue([
      { id: "n1", title: "Note One", content: "c", similarity: 0.9 },
    ]);
    streamMock.mockResolvedValue(textStream(["ok"]));

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
    expect(streamMock).not.toHaveBeenCalled();
  });
});
