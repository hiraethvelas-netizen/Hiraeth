/** Divide histórias longas em duas etapas, sem alterar o texto cadastrado. */
export function splitPortalStory(text: string, limit = 340): { preview: string; rest: string } {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return { preview: trimmed, rest: "" };
  // Preferir o final de uma frase natural perto do limite, sem cortar palavras.
  const end = Math.min(trimmed.length, limit);
  const leading = trimmed.slice(0, end);
  const matches = [...leading.matchAll(/[.!?](?=\s|$)/g)];
  const sentence = matches.at(-1);
  const sentenceEnd = sentence ? sentence.index! + 1 : 0;
  const lastSpace = leading.lastIndexOf(" ");
  const cut = sentenceEnd >= limit * 0.42 ? sentenceEnd : lastSpace >= limit * 0.55 ? lastSpace : end;
  return { preview: trimmed.slice(0, cut).trim(), rest: trimmed.slice(cut).trim() };
}

export function portalShortTeaser(text: string | null | undefined, limit = 125): string {
  if (!text) return "";
  const { preview, rest } = splitPortalStory(text.replace(/\s+/g, " ").trim(), limit);
  return rest ? preview.replace(/[,:;\s]+$/, "") + "…" : preview;
}
