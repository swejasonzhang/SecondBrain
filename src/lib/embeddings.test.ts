import { describe, it, expect, vi, beforeEach } from "vitest";

const embedMock = vi.fn();
vi.mock("voyageai", () => ({
  VoyageAIClient: class {
    embed = embedMock;
  },
}));

describe("embeddings", () => {
  beforeEach(() => {
    vi.resetModules();
    embedMock.mockReset();
    vi.stubEnv("VOYAGE_API_KEY", "test-key");
  });

  it("embedDocuments returns [] for empty input without calling the API", async () => {
    const { embedDocuments } = await import("./embeddings");
    const result = await embedDocuments([]);
    expect(result).toEqual([]);
    expect(embedMock).not.toHaveBeenCalled();
  });

  it("embedDocuments requests document embeddings and maps the vectors", async () => {
    embedMock.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
    });
    const { embedDocuments } = await import("./embeddings");
    const result = await embedDocuments(["a", "b"]);

    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(embedMock).toHaveBeenCalledWith({
      input: ["a", "b"],
      model: "voyage-3.5",
      inputType: "document",
    });
  });

  it("embedQuery uses the asymmetric query input type", async () => {
    embedMock.mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] });
    const { embedQuery } = await import("./embeddings");
    const result = await embedQuery("find this");

    expect(result).toEqual([1, 2, 3]);
    expect(embedMock).toHaveBeenCalledWith({
      input: ["find this"],
      model: "voyage-3.5",
      inputType: "query",
    });
  });

  it("throws a helpful error when VOYAGE_API_KEY is missing", async () => {
    vi.stubEnv("VOYAGE_API_KEY", "");
    const { embedQuery } = await import("./embeddings");
    await expect(embedQuery("x")).rejects.toThrow(/VOYAGE_API_KEY/);
  });
});
