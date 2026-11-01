export type NoteLayer = "top" | "heart" | "base";
export type EssenceNotes = {
  name: string;
  is_pure?: boolean;
  top_notes?: string[] | null;
  heart_notes?: string[] | null;
  base_notes?: string[] | null;
};
export type NotesDraft = {
  is_pure: boolean;
  note_layer: NoteLayer;
  top: string;
  heart: string;
  base: string;
};
export const emptyNotes: NotesDraft = {
  is_pure: true,
  note_layer: "heart",
  top: "",
  heart: "",
  base: "",
};
export function splitNotes(value: string) {
  return value
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}
export function essenceNotesPayload(name: string, draft: NotesDraft) {
  return {
    is_pure: draft.is_pure,
    top_notes: draft.is_pure
      ? draft.note_layer === "top"
        ? [name.trim()]
        : []
      : splitNotes(draft.top),
    heart_notes: draft.is_pure
      ? draft.note_layer === "heart"
        ? [name.trim()]
        : []
      : splitNotes(draft.heart),
    base_notes: draft.is_pure
      ? draft.note_layer === "base"
        ? [name.trim()]
        : []
      : splitNotes(draft.base),
  };
}
export function notesDraft(essence: EssenceNotes): NotesDraft {
  return {
    is_pure:
      essence.is_pure ??
      ![essence.top_notes, essence.heart_notes, essence.base_notes].some((notes) => notes?.length),
    note_layer: essence.top_notes?.length ? "top" : essence.base_notes?.length ? "base" : "heart",
    top: essence.top_notes?.join(", ") ?? "",
    heart: essence.heart_notes?.join(", ") ?? "",
    base: essence.base_notes?.join(", ") ?? "",
  };
}
export function buildFragrancePyramid(essences: EssenceNotes[]) {
  const unique = (notes: string[]) =>
    [
      ...new Map(
        notes.map((note) => [note.trim().toLocaleLowerCase("pt-BR"), note.trim()]),
      ).values(),
    ].filter(Boolean);
  return {
    top: unique(essences.flatMap((essence) => essence.top_notes ?? [])),
    heart: unique(
      essences.flatMap((essence) =>
        essence.heart_notes?.length
          ? essence.heart_notes
          : essence.is_pure && !essence.top_notes?.length && !essence.base_notes?.length
            ? [essence.name]
            : [],
      ),
    ),
    base: unique(essences.flatMap((essence) => essence.base_notes ?? [])),
  };
}
