import { describe, expect, it } from "vitest";
import { buildFragrancePyramid, emptyNotes, essenceNotesPayload, notesDraft } from "./fragrance";
describe("Candle fragrance composition", () => {
  it("combines pure ingredients and compound notes without duplicate notes", () => {
    const orange = {
      name: "Laranja",
      ...essenceNotesPayload("Laranja", { ...emptyNotes, note_layer: "top" }),
    };
    const vanilla = {
      name: "Baunilha",
      ...essenceNotesPayload("Baunilha", { ...emptyNotes, note_layer: "base" }),
    };
    const blend = {
      name: "Mistura",
      ...essenceNotesPayload("Mistura", {
        ...emptyNotes,
        is_pure: false,
        top: "Laranja, Bergamota",
        heart: "Canela",
        base: "Baunilha, Âmbar",
      }),
    };
    expect(buildFragrancePyramid([orange, vanilla, blend])).toEqual({
      top: ["Laranja", "Bergamota"],
      heart: ["Canela"],
      base: ["Baunilha", "Âmbar"],
    });
    expect(notesDraft(vanilla).note_layer).toBe("base");
  });
  it("keeps a pure essence name and omits hidden compound draft values", () => {
    expect(essenceNotesPayload(" Lavanda ", { ...emptyNotes, top: "old" })).toEqual({
      is_pure: true,
      top_notes: [],
      heart_notes: ["Lavanda"],
      base_notes: [],
    });
  });
});
