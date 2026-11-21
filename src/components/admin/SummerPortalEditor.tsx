import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { summerRecipesFromTheme, type SummerRecipe } from "@/lib/summer-recipes";
import { summerInspirationsFromTheme, type SummerInspiration } from "@/lib/summer-inspirations";
import {
  summerRecommendationsFromTheme,
  type SummerRecommendation,
  type SummerRecommendationKind,
} from "@/lib/summer-recommendations";

type Summer = {
  show_catalog: boolean;
  recipes: SummerRecipe[];
  recommendations: SummerRecommendation[];
  inspirations: SummerInspiration[];
};

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function readTheme(raw: string): Record<string, unknown> {
  try { const value: unknown = JSON.parse(raw); return record(value) ? value : {}; }
  catch { return {}; }
}
function readSummer(theme: Record<string, unknown>): Summer {
  const source = record(theme["summer"]) ? theme["summer"] : {};
  return {
    show_catalog: source["show_catalog"] === true,
    recipes: Array.from({ length: 4 }, (_, i) => summerRecipesFromTheme(source)[i] ?? {
      title: "", ingredients: "", method: "", image_url: "", visible: false,
    }),
    recommendations: summerRecommendationsFromTheme(source),
    inspirations: summerInspirationsFromTheme(theme),
  };
}

export function SummerPortalEditor({ themeJson, onChange }: { themeJson: string; onChange: (json: string) => void }) {
  const summer = useMemo(() => readSummer(readTheme(themeJson)), [themeJson]);
  const [uploading, setUploading] = useState<string | null>(null);
  const input = "mt-1 w-full min-w-0 rounded-md border border-[#b0b8a5] bg-white px-3 py-2 text-sm text-[#153f4b] placeholder:text-[#697a79] dark:border-[#82908b] dark:bg-[#203c39] dark:text-[#f6f1dd]";
  function update(next: Summer) {
    const theme = readTheme(themeJson);
    const original = record(theme["summer"]) ? theme["summer"] : {};
    onChange(JSON.stringify({
      ...theme,
      summer: {
        ...original,
        ...next,
        recipes_configured: true,
        recommendations_configured: true,
        inspirations_configured: true,
      },
    }, null, 2));
  }
  function updateRecipe(i: number, patch: Partial<SummerRecipe>) {
    update({ ...summer, recipes: summer.recipes.map((x, n) => i === n ? { ...x, ...patch } : x) });
  }
  function updateRecommendation(i: number, patch: Partial<SummerRecommendation>) {
    update({ ...summer, recommendations: summer.recommendations.map((x, n) => i === n ? { ...x, ...patch } : x) });
  }
  function updateInspiration(id: string, patch: Partial<SummerInspiration>) {
    update({ ...summer, inspirations: summer.inspirations.map(item => item.id === id ? { ...item, ...patch } : item) });
  }
  function updatePyramid(id: string, field: keyof SummerInspiration["pyramid"], value: string) {
    update({ ...summer, inspirations: summer.inspirations.map(item => item.id === id
      ? { ...item, pyramid: { ...item.pyramid, [field]: value } } : item) });
  }
  function addRecommendation(kind: SummerRecommendationKind) {
    update({ ...summer, recommendations: [
      ...summer.recommendations,
      { id: `summer-custom-${crypto.randomUUID()}`, kind, title: "", description: "", creator: "",
        platform: "", image_url: "", url: "", visible: false },
    ] });
  }
  function deleteRecommendation(i: number) {
    update({ ...summer, recommendations: summer.recommendations.filter((_, n) => i !== n) });
  }

  async function uploadPicture(file: File, group: "recipes" | "recommendations", i: number) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 6 * 1024 * 1024) {
      toast.error("Use uma imagem JPG, PNG ou WebP de até 6 MB.");
      return;
    }
    const uploadKey = `${group}-${i}`;
    setUploading(uploadKey);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `portal-verao/${group}/${crypto.randomUUID()}.${ext}`;
      const bucket = supabase.storage.from("product-images");
      const { error } = await bucket.upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = bucket.getPublicUrl(path);
      if (!data.publicUrl) throw new Error("A foto não gerou um endereço público.");
      if (group === "recipes") updateRecipe(i, { image_url: data.publicUrl });
      else updateRecommendation(i, { image_url: data.publicUrl });
      toast.success("Foto enviada. Clique em Salvar alterações para publicar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally { setUploading(null); }
  }

  return <section className="space-y-6 rounded-xl border border-teal-700/30 bg-[#f1fbf6] p-4 text-[#153f4b] dark:bg-[#13322f] dark:text-[#f6f1dd]" aria-labelledby="summer-editor-heading">
    <div>
      <h3 id="summer-editor-heading" className="font-display text-2xl">Conteúdos do Portal de Verão</h3>
      <p className="mt-1 text-xs opacity-75">Organize as receitas e as indicações. As alterações só entram no portal depois de clicar em “Salvar alterações” no final.</p>
    </div>

    <label className="flex items-center gap-3 rounded-lg border border-teal-700/25 bg-white/60 p-3 text-sm dark:bg-black/20">
      <input type="checkbox" checked={summer.show_catalog}
        onChange={e => update({ ...summer, show_catalog: e.target.checked })} />
      <span><strong>Mostrar acervo do Verão</strong><small className="mt-1 block opacity-75">Mantenha desligado até revelar a coleção. Apenas velas publicadas e vinculadas a este portal aparecerão.</small></span>
    </label>

    <div className="space-y-3">
      <div><h4 className="font-display text-xl">Quatro receitas de verão</h4><p className="text-xs opacity-75">Envie fotografias reais dos pratos. Os ingredientes aparecem somente quando a pessoa toca em “Ver receita”.</p></div>
      {summer.recipes.map((recipe, i) => <details key={i} className="rounded-lg border border-teal-700/20 bg-white/70 p-3 dark:bg-black/15">
        <summary className="cursor-pointer text-sm font-semibold">Receita {i + 1}{recipe.title ? ` · ${recipe.title}` : " · em preparação"} {recipe.visible ? "✓" : "(oculta)"}</summary>
        <div className="mt-3 grid gap-3">
          <label className="text-xs">Nome da receita e referência interna (separados por —)
            <input className={input} value={recipe.title} onChange={e => updateRecipe(i, { title: e.target.value })} />
          </label>
          <label className="text-xs">Ingredientes
            <textarea rows={3} className={input} value={recipe.ingredients} onChange={e => updateRecipe(i, { ingredients: e.target.value })}/>
          </label>
          <label className="text-xs">Modo de preparo
            <textarea rows={4} className={input} value={recipe.method} onChange={e => updateRecipe(i, { method: e.target.value })}/>
          </label>
          <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
            {recipe.image_url ? <img src={recipe.image_url} alt="" className="h-24 w-24 rounded-md object-cover"/> : <div className="grid h-24 w-24 place-items-center rounded-md bg-[#d8e9df] text-xs text-[#40656b]">Sem foto</div>}
            <div className="grid gap-2"><label className="text-xs">Foto da receita
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading !== null}
                className="mt-1 block w-full text-xs"
                onChange={e => {const file=e.target.files?.[0];e.target.value="";if(file)void uploadPicture(file,"recipes",i);}}/>
              </label><input aria-label="Ou cole o endereço da foto" placeholder="Ou cole um link HTTPS" className={input}
                value={recipe.image_url} onChange={e => updateRecipe(i,{image_url:e.target.value})}/>
              {uploading === `recipes-${i}` && <span role="status" className="text-xs">Enviando foto...</span>}</div>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={recipe.visible}
            onChange={e => updateRecipe(i,{visible:e.target.checked})}/> Exibir receita no portal</label>
        </div>
      </details>)}
    </div>

    <div className="space-y-3">
      <div>
        <h4 className="font-display text-xl">Colecione sensações — inspirações de verão</h4>
        <p className="text-xs opacity-75">
          As seis bolinhas aparecem somente na página de Inspirações do Verão.
          Preencha as pirâmides olfativas quando estiverem definidas; até lá, o botão mostra que as notas serão reveladas em breve.
        </p>
      </div>
      {summer.inspirations.map(item => <details key={item.id}
        className="rounded-lg border border-teal-700/20 bg-white/70 p-3 dark:bg-black/15">
        <summary className="cursor-pointer text-sm font-semibold">
          {item.emoji} {item.title} {item.visible ? "· Visível" : "· Oculta"}
        </summary>
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-[95px_1fr] gap-3">
            <label className="text-xs">Emoji
              <input className={input} value={item.emoji}
                onChange={e => updateInspiration(item.id,{emoji:e.target.value})}/>
            </label>
            <label className="text-xs">Nome da inspiração
              <input className={input} value={item.title}
                onChange={e => updateInspiration(item.id,{title:e.target.value})}/>
            </label>
          </div>
          <label className="text-xs">Frase curta de apresentação
            <input className={input} value={item.teaser}
              onChange={e => updateInspiration(item.id,{teaser:e.target.value})}/>
          </label>
          <label className="text-xs">Texto de “Descubra a sensação”
            <textarea className={input} rows={5} value={item.sensation}
              onChange={e => updateInspiration(item.id,{sensation:e.target.value})}/>
          </label>
          <div className="rounded-lg border border-amber-700/20 bg-[#fff8ec] p-3 text-[#153f4b] dark:bg-[#3d3b30] dark:text-[#f9eedd]">
            <p className="mb-3 text-sm font-semibold">Descubra a pirâmide olfativa</p>
            <p className="mb-3 text-xs opacity-75">Pode deixar os três campos vazios por enquanto.</p>
            {([["saida","Saída"],["corpo","Corpo"],["fundo","Fundo"]] as const).map(([key,label]) =>
              <label key={key} className="mb-3 block text-xs">{label}
                <textarea className={input} rows={2} value={item.pyramid[key]}
                  placeholder={`Notas de ${label.toLowerCase()} (preencher depois)`}
                  onChange={e => updatePyramid(item.id,key,e.target.value)}/>
              </label>)}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={item.visible}
              onChange={e => updateInspiration(item.id,{visible:e.target.checked})}/>
            Mostrar esta bolinha na página de inspirações
          </label>
        </div>
      </details>)}
    </div>

    <div className="space-y-3">
      <div>
        <h4 className="font-display text-xl">Livros, séries e filmes</h4>
        <p className="text-xs opacity-75">Você pode adicionar quantos títulos quiser, alterar a capa, informar onde assistir e ocultar sugestões. Os foguinhos e o checklist pertencem à leitora, não ao painel.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-teal-700/40 px-3 py-2 text-xs" onClick={() => addRecommendation("livro")}>+ Livro</button>
        <button type="button" className="rounded-full border border-teal-700/40 px-3 py-2 text-xs" onClick={() => addRecommendation("serie")}>+ Série</button>
        <button type="button" className="rounded-full border border-teal-700/40 px-3 py-2 text-xs" onClick={() => addRecommendation("filme")}>+ Filme</button>
      </div>
      {summer.recommendations.map((item, i) => <details key={item.id} className="rounded-lg border border-teal-700/20 bg-white/70 p-3 dark:bg-black/15">
        <summary className="cursor-pointer text-sm font-semibold">{item.kind === "livro" ? "📖" : item.kind === "serie" ? "📺" : "🎬"} {item.title || "Nova indicação"} {item.visible ? "✓" : "(oculta)"}</summary>
        <div className="mt-3 grid gap-3">
          <label className="text-xs">Categoria
            <select className={input} value={item.kind} onChange={e => updateRecommendation(i,{kind:e.target.value as SummerRecommendationKind})}>
              <option value="livro">Livro</option><option value="serie">Série</option><option value="filme">Filme</option>
            </select>
          </label>
          <label className="text-xs">Título
            <input className={input} value={item.title} onChange={e => updateRecommendation(i,{title:e.target.value})}/>
          </label>
          <label className="text-xs">Descrição curta
            <textarea rows={2} className={input} value={item.description} onChange={e => updateRecommendation(i,{description:e.target.value})}/>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">Autora ou autor (opcional)
              <input className={input} value={item.creator} onChange={e => updateRecommendation(i,{creator:e.target.value})}/>
            </label>
            <label className="text-xs">Onde assistir (quando confirmado)
              <input className={input} value={item.platform} placeholder="Ex.: Prime Video" onChange={e => updateRecommendation(i,{platform:e.target.value})}/>
            </label>
          </div>
          <label className="text-xs">Link oficial (opcional)
            <input className={input} value={item.url} onChange={e => updateRecommendation(i,{url:e.target.value})}/>
          </label>
          <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
            {item.image_url ? <img src={item.image_url} alt="" className="h-28 w-20 rounded object-cover"/> : <div className="grid h-28 w-20 place-items-center rounded bg-[#d8e9df] text-xs text-[#40656b]">Sem capa</div>}
            <div className="grid gap-2">
              <label className="text-xs">Enviar foto da capa ou pôster
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading !== null}
                  className="mt-1 block w-full text-xs"
                  onChange={e => {const file=e.target.files?.[0];e.target.value="";if(file)void uploadPicture(file,"recommendations",i);}}/>
              </label>
              <input aria-label={`Ou cole link da capa de ${item.title}`} placeholder="Ou cole um link HTTPS" className={input}
                value={item.image_url} onChange={e=>updateRecommendation(i,{image_url:e.target.value})}/>
              {uploading === `recommendations-${i}` && <span role="status" className="text-xs">Enviando capa...</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.visible}
              onChange={e => updateRecommendation(i,{visible:e.target.checked})}/> Exibir indicação no portal</label>
            <button type="button" onClick={() => deleteRecommendation(i)}
              className="rounded border border-red-400/50 px-3 py-2 text-xs text-red-700 dark:text-red-300">Excluir indicação</button>
          </div>
        </div>
      </details>)}
    </div>
  </section>;
}
