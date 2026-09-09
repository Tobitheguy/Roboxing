import { describe, expect, it } from "vitest";

import {
  buildBatchPrompt,
  chunk,
  coerceClassification,
  type SignalToClassify,
} from "./classify";

const items: SignalToClassify[] = [
  { id: 1, title: "Matador defeats White Eagle", source: "gn-zh", language: "zh" },
  { id: 2, title: "CyberHero announces Riyadh card", source: "gn-en", language: "en" },
];

function reply(entries: unknown[]) {
  return { items: entries };
}

describe("chunk", () => {
  it("splits into fixed sizes and preserves order", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns nothing for an empty list", () => {
    expect(chunk([], 25)).toEqual([]);
  });
});

describe("buildBatchPrompt", () => {
  it("carries every id so the model can address rows back", () => {
    const prompt = buildBatchPrompt(items);
    expect(prompt).toContain('"id":1');
    expect(prompt).toContain('"id":2');
    expect(prompt).toContain("Matador defeats White Eagle");
  });

  it("states the count, so a short reply is visible to the model", () => {
    expect(buildBatchPrompt(items)).toContain("each of these 2 items");
  });
});

describe("coerceClassification", () => {
  it("keeps a well-formed result", () => {
    const out = coerceClassification(
      reply([{ id: 1, score: 95, category: "result", summary: " Matador won 3-2. " }]),
      items,
    );
    expect(out).toEqual([
      { id: 1, score: 95, category: "result", summary: "Matador won 3-2." },
    ]);
  });

  /*
   * The one that would actually corrupt data: an id the chunk never asked
   * about writes its score onto somebody else's row. Structured outputs make
   * it unlikely, not impossible.
   */
  it("drops ids that were not in the chunk", () => {
    const out = coerceClassification(
      reply([
        { id: 999, score: 90, category: "result", summary: "not ours" },
        { id: 2, score: 80, category: "event", summary: "ours" },
      ]),
      items,
    );
    expect(out.map((r) => r.id)).toEqual([2]);
  });

  it("keeps only the first answer for a repeated id", () => {
    const out = coerceClassification(
      reply([
        { id: 1, score: 90, category: "result", summary: "first" },
        { id: 1, score: 10, category: "other", summary: "second" },
      ]),
      items,
    );
    expect(out).toHaveLength(1);
    expect(out[0].summary).toBe("first");
  });

  /*
   * The column has a CHECK for 0-100. An out-of-range score must be clamped
   * here or the whole update throws — the schema cannot support minimum and
   * maximum, so this function is the only place the range is enforced before
   * the database sees it.
   */
  it("clamps scores into 0-100 and rounds", () => {
    const out = coerceClassification(
      reply([
        { id: 1, score: 5000, category: "result", summary: "a" },
        { id: 2, score: -12, category: "event", summary: "b" },
      ]),
      items,
    );
    expect(out.map((r) => r.score)).toEqual([100, 0]);
  });

  it("falls back to 'other' for a category outside the enum", () => {
    const out = coerceClassification(
      reply([{ id: 1, score: 50, category: "gossip", summary: "a" }]),
      items,
    );
    expect(out[0].category).toBe("other");
  });

  it("returns nothing for a malformed response rather than throwing", () => {
    expect(coerceClassification({ nope: true }, items)).toEqual([]);
    expect(coerceClassification(null, items)).toEqual([]);
    expect(coerceClassification(reply([{ id: "one" }]), items)).toEqual([]);
  });
});
