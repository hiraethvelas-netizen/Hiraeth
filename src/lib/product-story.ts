/** Mantém o texto original do catálogo, mas oferece uma leitura curta e organizada. */
export type ProductStory = {
  summary: string;
  story: string;
  details: string[];
};

function shortOpening(text: string): { summary: string; remainder: string } {
  const firstSentence = text.match(/^.{1,210}?[.!?](?=\s|$)/s)?.[0];
  if (firstSentence) {
    return { summary: firstSentence.trim(), remainder: text.slice(firstSentence.length).trim() };
  }
  if (text.length <= 180) return { summary: text, remainder: "" };
  const cutAt = text.lastIndexOf(" ", 180);
  const boundary = cutAt > 110 ? cutAt : 180;
  return { summary: text.slice(0, boundary).trimEnd() + "…", remainder: text.slice(boundary).trim() };
}

export function parseProductStory(description: string | null | undefined, features: string[] | null | undefined = []): ProductStory {
  const original = (description ?? "").trim();
  const divider = /(?:✨\s*)*Detalhes que tornam sua experiência especial\s*:\s*/i;
  const match = divider.exec(original);
  const narrative = (match ? original.slice(0, match.index) : original).trim();
  const detailBlock = match ? original.slice(match.index + match[0].length) : "";
  const { summary, remainder } = shortOpening(narrative);
  const listed = detailBlock
    .split(/\s*(?:[–—•]\s+|(?:^|\n)\s*-\s+)/m)
    .map(item => item.trim())
    .filter(Boolean);
  const details = [...listed, ...(features ?? [])]
    .map(item => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex(other => other.toLocaleLowerCase("pt-BR") === item.toLocaleLowerCase("pt-BR")) === index);
  return { summary, story: remainder, details };
}
