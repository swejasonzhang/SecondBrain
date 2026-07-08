import { describe, it, expect, vi, beforeEach } from "vitest";

const embedMock = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { embedContent: embedMock };
  },
}));

describe("embeddings", () => {
  beforeEach(() => {
    vi.resetModules();
    embedMock.mockReset();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  it("embedDocuments returns [] for empty input without calling the API", async () => {
    const { embedDocuments } = await import("./embeddings");
    const result = await embedDocuments([]);
    expect(result).toEqual([]);
    expect(embedMock).not.toHaveBeenCalled();
  });

  it("embedDocuments requests document embeddings and maps the vectors", async () => {
    embedMock.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2] }, { values: [0.3, 0.4] }],
    });
    const { embedDocuments } = await import("./embeddings");
    const result = await embedDocuments(["a", "b"]);

    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    const args = embedMock.mock.calls[0][0];
    expect(args.model).toBe("gemini-embedding-001");
    expect(args.config.taskType).toBe("RETRIEVAL_DOCUMENT");
    expect(args.config.outputDimensionality).toBe(1024);
  });

  it("embedQuery uses the retrieval-query task type", async () => {
    embedMock.mockResolvedValue({ embeddings: [{ values: [1, 2, 3] }] });
    const { embedQuery } = await import("./embeddings");
    const result = await embedQuery("find this");

    expect(result).toEqual([1, 2, 3]);
    expect(embedMock.mock.calls[0][0].config.taskType).toBe("RETRIEVAL_QUERY");
  });

  it("throws a helpful error when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { embedQuery } = await import("./embeddings");
    await expect(embedQuery("x")).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
