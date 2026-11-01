import { describe, expect, it } from "vitest";
import { canonicalCategory, libraryCategories } from "./library-categories";
import { activeCategories } from "./store-categories";
describe("Personal library categories", () => {
  it("reuses site names while keeping personal categories", () => {
    const names = libraryCategories(
      ["Harry Potter", "Literária"],
      ["harry  potter ", "LITERARIA", "Verity"],
    );
    expect(names).toEqual(["Harry Potter", "Literária", "Verity"]);
    expect(canonicalCategory(" HARRY POTTER ", names)).toBe("Harry Potter");
    expect(canonicalCategory("Outra categoria", names)).toBe("Outra categoria");
  });
  it("hides temporary categories outside their schedule and descendants of hidden parents", () => {
    const rows = [
      { id: "expired", is_temporary: true, starts_at: "2020-01-01", ends_at: "2020-02-01" },
      { id: "child", parent_id: "expired" },
      { id: "current", is_temporary: true, starts_at: "2026-11-01", ends_at: "2026-11-01" },
      { id: "regular" },
    ];
    expect(activeCategories(rows, new Date(2026, 10, 1)).map((c) => c.id)).toEqual([
      "current",
      "regular",
    ]);
  });
});
