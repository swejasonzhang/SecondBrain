import { describe, it, expect, vi, beforeEach } from "vitest";

const generateMock = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateMock };
  },
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY" },
}));

function mockJsonResponse(obj: unknown) {
  return { text: JSON.stringify(obj) };
}

describe("enrichNote", () => {
  beforeEach(() => {
    vi.resetModules();
    generateMock.mockReset();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  it("returns the title/summary and caps tags at 5", async () => {
    generateMock.mockResolvedValue(
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

  it("uses the Gemini model and structured JSON output", async () => {
    generateMock.mockResolvedValue(
      mockJsonResponse({ title: "t", summary: "s", tags: [] }),
    );
    const { enrichNote } = await import("./ai");
    await enrichNote("content");

    const args = generateMock.mock.calls[0][0];
    expect(args.model).toBe("gemini-2.5-flash");
    expect(args.config.responseMimeType).toBe("application/json");
  });

  it("falls back to safe defaults when fields are missing", async () => {
    generateMock.mockResolvedValue(mockJsonResponse({}));
    const { enrichNote } = await import("./ai");
    const result = await enrichNote("content");

    expect(result.title).toBe("Untitled");
    expect(result.summary).toBe("");
    expect(result.tags).toEqual([]);
  });

  it("throws a helpful error when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { enrichNote } = await import("./ai");
    await expect(enrichNote("x")).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
