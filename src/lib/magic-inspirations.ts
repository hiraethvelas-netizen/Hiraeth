import type { Tables } from "@/integrations/supabase/types";

export type InspirationFragment = Tables<"portal_fragments">;
export const magicHouseNames = ["Casa do Leão", "Casa do Texugo", "Casa da Serpente", "Casa da Águia"] as const;
type Chapter = "origin" | "selector" | "houses" | "christmas" | "letter";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function groupMagicInspirations(fragments: InspirationFragment[]) {
  const chapters: Record<Chapter, InspirationFragment[]> = { origin: [], selector: [], houses: [], christmas: [], letter: [] };
  const houses: InspirationFragment[][] = magicHouseNames.map(() => []);
  let current: Chapter = "origin";
  let currentHouse: number | undefined;
  for (const fragment of [...fragments].filter(item => item.visible !== false).sort((a, b) => a.position - b.position)) {
    const title = normalize(fragment.title);
    const house = [/\bleao\b|grifinoria/, /\btexugo\b|lufa.lufa/, /\bserpente\b|sonserina/, /\baguia\b|corvinal/].findIndex(pattern => pattern.test(title));
    let chapter: Chapter | undefined;
    if (/carta|guardia/.test(title)) chapter = "letter";
    else if (/natal|christmas/.test(title)) chapter = "christmas";
    else if (/seletor/.test(title)) chapter = "selector";
    else if (house >= 0 || /quatro casas|quatro essencias/.test(title)) chapter = "houses";
    else if (/como nasceu|origem|nasceu a colecao|inspirada no universo|harry potter/.test(title)) chapter = "origin";
    if (chapter) {
      current = chapter;
      currentHouse = house >= 0 ? house : undefined;
    }
    if (current === "houses" && currentHouse !== undefined) houses[currentHouse]?.push(fragment);
    else chapters[current].push(fragment);
  }
  return { chapters, houses };
}