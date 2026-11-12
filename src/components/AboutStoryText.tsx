import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { splitPortalStory } from "@/lib/portal-story-preview";

export function AboutStoryText({ text, alwaysOpen = false }: { text: string; alwaysOpen?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { preview, rest } = splitPortalStory(text, 390);
  return <div className="font-serif text-base leading-[1.75] sm:text-lg">
    <p className="whitespace-pre-line">{preview}</p>
    {rest && (expanded || alwaysOpen) && <p className="mt-4 whitespace-pre-line">{rest}</p>}
    {rest && !alwaysOpen && <button type="button" aria-expanded={expanded}
      onClick={() => setExpanded(value => !value)}
      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-current/50 px-4 py-2 font-sans text-xs font-semibold transition-colors hover:bg-[#878e47]/10">
      {expanded ? "Recolher capítulo" : "Continuar este capítulo"}
      <ChevronDown size={16} className={expanded ? "rotate-180" : ""} aria-hidden="true"/>
    </button>}
  </div>;
}
