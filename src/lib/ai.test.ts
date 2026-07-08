import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

function mockJsonResponse(obj: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(obj) }] };
}

describe("enrichNote", () => {
  beforeEach(() => {
    vi.resetModules();
    createMock.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("returns the title/summary and caps tags at 5", async () => {
    createMock.mockResolvedValue(
      mockJsonResponse({
        title: "Vector databases 101",
        summary: "How pgvector enables similarity search.",
        tags: ["a", "b", "c", "d", "e", "f", "g"],
      }),
    );

    const { enrichNote } = await import("./ai");
    const result = await enrichNote("some note content");

    expect(result.title).toBe("Vector databases 101");
    expect(result.summary).toBe("How pgvector enables similarity search.");
    expect(result.tags).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("uses the Haiku model and structured JSON output", async () => {
    createMock.mockResolvedValue(
      mockJsonResponse({ title: "t", summary: "s", tags: [] }),
    );
    const { enrichNote } = await import("./ai");
    await enrichNote("content");

    const args = createMock.mock.calls[0][0];
    expect(args.model).toBe("claude-haiku-4-5");
    expect(args.output_config.format.type).toBe("json_schema");
  });

  it("falls back to safe defaults when fields are missing", async () => {
    createMock.mockResolvedValue(mockJsonResponse({}));
    const { enrichNote } = await import("./ai");
    const result = await enrichNote("content");

    expect(result.title).toBe("Untitled");
    expect(result.summary).toBe("");
    expect(result.tags).toEqual([]);
  });

  it("throws a helpful error when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { enrichNote } = await import("./ai");
    await expect(enrichNote("x")).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
