import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit } from "@/lib/admin-edit";

type Banner = { id: string; title: string | null; image_url: string; href: string; position: number; active: boolean };

export function StoreBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const { isAdmin, editMode } = useAdminEdit();
  useEffect(() => {
    let alive = true;
    void (supabase as any).from("site_banners").select("*").eq("active", true).order("position").limit(3)
      .then(({ data }: { data: Banner[] | null }) => { if (alive) setBanners(data ?? []); });
    return () => { alive = false; };
  }, []);

  async function save(banner: Banner, values: Record<string, unknown>) {
    const payload = { title: String(values.title ?? "").trim() || null, image_url: String(values.image_url ?? banner.image_url), href: String(values.href ?? banner.href) };
    const { error } = await (supabase as any).from("site_banners").update(payload).eq("id", banner.id);
    if (error) throw error;
    setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, ...payload } : item));
  }

  if (!banners.length) return null;
  return <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
    <div className="mb-4"><p className="eyebrow">Recém-chegados ao Acervo</p><h2 className="mt-1 text-3xl text-foreground md:text-4xl">Novidades e coleções especiais</h2></div>
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
      {banners.map((banner) => <article key={banner.id} className="w-[88%] min-w-[88%] snap-start sm:w-[60%] sm:min-w-[60%] md:w-[calc(33.333%-11px)] md:min-w-[calc(33.333%-11px)]">
        <Link to={banner.href as never} className="group relative block aspect-[4/3] overflow-hidden rounded-lg border border-primary/20 bg-card">
          <img src={banner.image_url} alt={banner.title ?? "Novidade Hiraeth"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          {banner.title && <span className="absolute inset-x-4 bottom-4 font-display text-2xl text-white">{banner.title}</span>}
        </Link>
        {isAdmin && editMode && <InlineEditor label={`banner de novidade: ${banner.title ?? "sem título"}`} className="mt-2" fields={[{ name: "title", label: "Nome/título", type: "text" }, { name: "image_url", label: "Imagem do banner", type: "image" }, { name: "href", label: "Destino do clique", type: "text" }]} values={{ title: banner.title ?? "", image_url: banner.image_url, href: banner.href }} onSave={(values) => save(banner, values)} />}
      </article>)}
    </div>
    {isAdmin && editMode && <p className="mt-2 text-xs text-muted-foreground">Os banners são editáveis aqui. Para adicionar ou remover banners, gerencie os registros de site_banners no painel administrativo.</p>}
  </section>;
}
