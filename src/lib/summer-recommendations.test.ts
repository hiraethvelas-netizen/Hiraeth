import { describe, expect, it } from "vitest";
import { defaultSummerRecommendations, summerRecommendationsFromTheme } from "./summer-recommendations";

describe("summer recommendations", () => {
  it("seeds books, series and films when legacy slots have no content", () => {
    const oldSlots = Array.from({ length: 4 }, () => ({ title: "", kind: "livro", visible: false }));
    const picks = summerRecommendationsFromTheme({ recommendations: oldSlots });
    expect(picks).toHaveLength(7);
    expect(picks.filter(item => item.kind === "livro")).toHaveLength(3);
    expect(picks.filter(item => item.kind === "serie")).toHaveLength(2);
    expect(picks.filter(item => item.kind === "filme")).toHaveLength(2);
    expect(picks).toEqual(defaultSummerRecommendations);
  });

  it("keeps administrator additions and removes and does not resurrect defaults", () => {
    expect(summerRecommendationsFromTheme({ recommendations_configured: true, recommendations: [] })).toEqual([]);
    const picks = summerRecommendationsFromTheme({
      recommendations_configured: true,
      recommendations: [{ id: "unique", kind: "filme", title: "Favorito", visible: false }],
    });
    expect(picks).toHaveLength(1);
    expect(picks[0]?.id).toBe("unique");
    expect(picks[0]?.visible).toBe(false);
  });

  it("keeps a stable item id for checklist and fire rating keys", () => {
    const first = summerRecommendationsFromTheme({});
    const second = summerRecommendationsFromTheme({ recommendations: [] });
    expect(first.map(item => item.id)).toEqual(second.map(item => item.id));
  });
});
