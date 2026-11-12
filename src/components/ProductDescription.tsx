import { useState } from "react";
import { BookOpenText, ChevronDown } from "lucide-react";
import { parseProductStory } from "@/lib/product-story";

type Pyramid = { top: string[]; heart: string[]; base: string[] };

type Props = {
  id: string;
  description: string | null | undefined;
  features: string[] | null | undefined;
  pyramid: Pyramid;
  showPyramid: boolean;
};

export function ProductDescription({ id, description, features, pyramid, showPyramid }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { summary, story, details } = parseProductStory(description, features);
  const hasPyramid = showPyramid && (pyramid.top.length + pyramid.heart.length + pyramid.base.length > 0);
  const hasMore = Boolean(story || details.length || hasPyramid);
  if (!summary && !hasMore) return null;

  const contentId = `descricao-vela-${id}`;

  return <section className="mt-7 rounded-2xl border border-primary/25 bg-secondary/40 px-5 py-5 text-foreground sm:px-7 sm:py-6"
    aria-label="Descubra esta vela">
    <p className="text-xs font-semibold uppercase tracking-[.19em] text-[#6d753e] dark:text-[#d5bf86]">
      Uma história em cada chama
    </p>
    {summary && <p className="mt-3 text-[.97rem] leading-7 text-foreground/90 sm:text-base">
      {summary}
    </p>}
    {hasMore && <>
      <button type="button" onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded} aria-controls={contentId}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-primary/45 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <BookOpenText size={17} aria-hidden="true" />
        {expanded ? "Recolher descrição" : "Ler descrição completa"}
        <ChevronDown size={16} aria-hidden="true" className={expanded ? "rotate-180" : ""} />
      </button>
      {expanded && <div id={contentId} role="region" aria-label="Descrição completa da vela"
        className="mt-5 space-y-5 border-t border-primary/25 pt-5">
        {story && <div>
          <h2 className="font-display text-2xl text-foreground">A inspiração</h2>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-foreground/90 sm:text-base">{story}</p>
        </div>}
        {details.length > 0 && <div>
          <h2 className="font-display text-2xl text-foreground">Detalhes desta chama</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground/90 marker:text-primary sm:text-base">
            {details.map((detail, index) => <li key={index}>{detail}</li>)}
          </ul>
        </div>}
        {hasPyramid && <div>
          <h2 className="font-display text-2xl text-foreground">Pirâmide olfativa</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([["Saída", "top"], ["Corpo", "heart"], ["Fundo", "base"]] as const).map(([label, key]) =>
              pyramid[key].length > 0 ? <div key={key}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#6d753e] dark:text-[#d5bf86]">{label}</h3>
                <p className="mt-1 text-sm leading-6 text-foreground/90">{pyramid[key].join(", ")}</p>
              </div> : null)}
          </div>
        </div>}
      </div>}
    </>}
  </section>;
}
