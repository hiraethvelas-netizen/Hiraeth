import { useState } from "react";
import { toast } from "sonner";
import { InlineEditor } from "@/components/InlineEditor";
import { useSiteContent } from "@/lib/admin-edit";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;
type HeroSettings = { bannerImage: string; [key: string]: unknown };

/** Independent category/subcategory cover; never changes its navigation-circle image. */
export function CategoryHeroBanner({
  category, onNameChange,
}: { category: Category; onNameChange: (name: string) => Promise<void> }) {
  const [settings, saveSettings] = useSiteContent<HeroSettings>(
    "category-banner-" + category.id, { bannerImage: "" },
  );
  const [name, setName] = useState(category.name);
  const image = settings.bannerImage || category.image_url || "";
  return (
    <section className="hiraeth-category-hero hiraeth-reveal relative mb-10 mt-7 min-w-0 overflow-hidden rounded-xl border border-primary/40">
      {image ? <img src={image} alt={"Banner da coleção " + category.name}
        className="h-64 w-full object-cover sm:h-80 md:h-[26rem]" /> :
        <div className="h-48 w-full bg-[radial-gradient(ellipse_at_center,_var(--color-secondary),_var(--color-background)_70%)] sm:h-64 md:h-80" aria-hidden="true" />}
      <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-[#07110b]/95 via-[#07110b]/25 to-transparent p-6 sm:p-10">
        <div>
          <p className="eyebrow !text-[#e2c477]">Entre neste universo</p>
          <h2 className="hiraeth-editorial-title !mx-0 mt-2 !text-left text-4xl text-[#f7efda] sm:text-5xl md:text-6xl">{category.name}</h2>
          {category.is_temporary && <span className="mt-2 inline-flex border border-amber-200/80 bg-black/25 px-2 py-1 text-[10px] uppercase tracking-widest text-amber-100">
            Coleção temporária{category.ends_at ? " · até " + new Date(category.ends_at + "T12:00:00").toLocaleDateString("pt-BR") : ""}
          </span>}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 z-10 flex flex-wrap justify-end gap-1">
        <InlineEditor label={"banner da coleção " + category.name}
          fields={[
            { name: "bannerImage", label: "Foto do banner (não altera a bolinha)", type: "image", cropAspect: "landscape", help: "Escolha uma foto diferente da imagem redonda da coleção. Ajuste corte e zoom antes de salvar." },
          ]}
          values={{ bannerImage: settings.bannerImage }}
          onSave={async values => saveSettings({ ...settings, bannerImage: String(values["bannerImage"] ?? "") })} />
      </div>
      <div className="relative border-t border-primary/30 bg-background/95 p-2">
        <InlineEditor label={"nome da coleção " + category.name}
          fields={[{ name: "name", label: "Nome da coleção", type: "text" }]}
          values={{ name: name }}
          onSave={async values => {
            const next = String(values["name"] ?? "").trim();
            if (!next) { toast.error("Informe o nome da coleção."); return; }
            await onNameChange(next);
            setName(next);
          }} />
      </div>
    </section>
  );
}
