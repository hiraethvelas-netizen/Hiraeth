import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit } from "@/lib/admin-edit";

type Category = { id: string; name: string; slug: string; image_url: string | null; parent_id: string | null; position: number; is_temporary?: boolean; starts_at?: string | null; ends_at?: string | null };

export function CollectionPortals() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entering, setEntering] = useState<Category | null>(null);
  const { isAdmin, editMode } = useAdminEdit();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    void supabase.from("categories").select("id,name,slug,image_url,parent_id,position,is_temporary,starts_at,ends_at").eq("visible", true).not("parent_id", "is", null).order("position")
      .then(({ data }) => {
        if (!alive) return;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const active = ((data ?? []) as Category[]).filter((c) => !c.is_temporary || Boolean(c.starts_at && c.ends_at && c.starts_at <= today && c.ends_at >= today));
        setCategories(active.sort((a, b) => a.position - b.position));
      });
    return () => { alive = false; };
  }, []);

  async function saveCategory(category: Category, values: Record<string, unknown>) {
    const payload = { name: String(values.name ?? category.name).trim(), image_url: String(values.image_url ?? category.image_url ?? "").trim() || null };
    const { error } = await (supabase as any).from("categories").update(payload).eq("id", category.id);
    if (error) throw error;
    setCategories(current => current.map(item => item.id === category.id ? { ...item, ...payload } : item));
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const updates = reordered.map((item, position) => ({ id: item.id, position: position + 1 }));
    const results = await Promise.all(updates.map(item => (supabase as any).from("categories").update({ position: item.position }).eq("id", item.id)));
    const failed = results.find((result: { error: unknown }) => result.error);
    if (failed?.error) throw failed.error;
    setCategories(reordered.map((item, position) => ({ ...item, position: position + 1 })));
  }

  function enter(category: Category) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void navigate({ to: "/loja", search: { categoria: category.slug } as never });
      return;
    }
    setEntering(category);
    window.setTimeout(() => {
      void navigate({ to: "/loja", search: { categoria: category.slug } as never });
      setEntering(null);
    }, 620);
  }

  if (!categories.length) return null;

  return <>
    <section className="hiraeth-collection-portals mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <h2 className="hiraeth-editorial-title hiraeth-acervo-heading mt-3 text-center !text-4xl md:!text-6xl">Conheça <em>o Acervo Hiraeth</em></h2><div className="hiraeth-ornament" aria-hidden="true"><span>✧</span></div>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">Escolha um universo e atravesse o portal.</p>
      {isAdmin && editMode && <p className="mx-auto mt-3 max-w-xl text-center text-xs text-primary">Use as setas para definir a ordem das bolinhas. A primeira será exibida primeiro na página.</p>}
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((category) => <div key={category.id} className="flex flex-col items-center gap-3 text-center">
          <button type="button" onClick={() => enter(category)} className="group flex w-full flex-col items-center gap-3 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <span className="hiraeth-collection-card relative block aspect-square w-full max-w-44 overflow-hidden rounded-full bg-card p-1.5 group-active:scale-95">
            {category.image_url ? <img src={category.image_url} alt="" className="h-full w-full rounded-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-[radial-gradient(ellipse_at_35%_25%,#40523b,#17271c_72%)] px-3 font-display text-xl text-[#d8bd7a]">{category.name}</span>}
            <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[inset_0_0_30px_rgba(198,166,91,0.65)] transition-opacity duration-500 group-hover:opacity-100" />
          </span>
          <span className="hiraeth-collection-label font-display text-xl text-foreground transition-colors group-hover:text-primary">{category.name}</span>
          </button>
          {category.is_temporary && <span className="border border-amber-600/60 px-2 py-0.5 text-[9px] uppercase tracking-widest text-amber-700">Temporária</span>}
          {isAdmin && editMode && <div className="mt-1 flex flex-wrap items-center justify-center gap-1" onClick={event => event.stopPropagation()}>
            <button type="button" disabled={categories.indexOf(category) === 0} onClick={() => void moveCategory(categories.indexOf(category), -1).catch(error => window.alert("Não foi possível alterar a ordem: " + (error instanceof Error ? error.message : "erro")))} className="rounded border px-2 py-1 text-xs disabled:opacity-30" aria-label={`Mover ${category.name} para cima`}>↑</button>
            <button type="button" disabled={categories.indexOf(category) === categories.length - 1} onClick={() => void moveCategory(categories.indexOf(category), 1).catch(error => window.alert("Não foi possível alterar a ordem: " + (error instanceof Error ? error.message : "erro")))} className="rounded border px-2 py-1 text-xs disabled:opacity-30" aria-label={`Mover ${category.name} para baixo`}>↓</button>
            <InlineEditor label={`categoria ${category.name}`} fields={[{ name: "name", label: "Nome da categoria", type: "text" }, { name: "image_url", label: "Imagem da bolinha", type: "image", help: "Envie uma imagem JPG, PNG ou WebP, até 5 MB." }]} values={{ name: category.name, image_url: category.image_url ?? "" }} onSave={values => saveCategory(category, values)} />
          </div>}
        </div>)}
      </div>
    </section>
    {entering && <div className="portal-entry-overlay" aria-hidden="true">
      {entering.image_url ? <img src={entering.image_url} alt="" className="portal-entry-image" /> : <div className="portal-entry-placeholder"><span>{entering.name}</span></div>}
      <div className="portal-entry-glow" />
    </div>}
  </>;
}
