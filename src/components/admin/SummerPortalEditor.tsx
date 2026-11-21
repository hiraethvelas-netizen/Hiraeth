import { useMemo } from "react";

type Recipe = { title: string; ingredients: string; method: string; image_url: string; visible: boolean };
type Recommendation = { kind: "livro" | "serie"; title: string; description: string; image_url: string; url: string; visible: boolean };
type Summer = { show_catalog: boolean; recipes: Recipe[]; recommendations: Recommendation[] };

const blankRecipe = (): Recipe => ({ title: "", ingredients: "", method: "", image_url: "", visible: false });
const blankRecommendation = (i: number): Recommendation => ({
  kind: i % 2 === 0 ? "livro" : "serie", title: "", description: "", image_url: "", url: "", visible: false,
});

function readTheme(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch { return {}; }
}

function readSummer(theme: Record<string, unknown>): Summer {
  const source = theme["summer"] && typeof theme["summer"] === "object" && !Array.isArray(theme["summer"])
    ? theme["summer"] as Record<string, unknown> : {};
  const recipes = Array.isArray(source["recipes"]) ? source["recipes"] as Partial<Recipe>[] : [];
  const recommendations = Array.isArray(source["recommendations"]) ? source["recommendations"] as Partial<Recommendation>[] : [];
  return {
    show_catalog: source["show_catalog"] === true,
    recipes: Array.from({ length: 4 }, (_, i) => ({ ...blankRecipe(), ...recipes[i] })),
    recommendations: Array.from({ length: 4 }, (_, i) => ({ ...blankRecommendation(i), ...recommendations[i] })),
  };
}

/** Edits are kept in the existing portal theme JSON; saving is handled by the parent form. */
export function SummerPortalEditor({ themeJson, onChange }: { themeJson: string; onChange: (json: string) => void }) {
  const summer = useMemo(() => readSummer(readTheme(themeJson)), [themeJson]);
  const fieldClass = "mt-1 w-full min-w-0 rounded-md border border-primary/25 bg-background px-3 py-2 text-sm text-foreground";

  const update = (next: Summer) => {
    const theme = readTheme(themeJson);
    const original = theme["summer"] && typeof theme["summer"] === "object" && !Array.isArray(theme["summer"])
      ? theme["summer"] as Record<string, unknown> : {};
    onChange(JSON.stringify({ ...theme, summer: { ...original, ...next } }, null, 2));
  };
  const updateRecipe = (i: number, patch: Partial<Recipe>) => {
    const recipes = summer.recipes.map((recipe, index) => index === i ? { ...recipe, ...patch } : recipe);
    update({ ...summer, recipes });
  };
  const updateRecommendation = (i: number, patch: Partial<Recommendation>) => {
    const recommendations = summer.recommendations.map((item, index) => index === i ? { ...item, ...patch } : item);
    update({ ...summer, recommendations });
  };

  return <section className="space-y-5 rounded-xl border border-teal-700/30 bg-[#f1fbf6] p-4 text-[#153f4b] dark:bg-[#13322f] dark:text-[#f6f1dd]" aria-labelledby="summer-editor-heading">
    <div>
      <h3 className="font-display text-2xl" id="summer-editor-heading">Conteúdos do Portal de Verão</h3>
      <p className="mt-1 text-xs opacity-75">As receitas, indicações e a visibilidade do acervo são exclusivas deste portal. Depois de editar, clique em "Salvar alterações" no final do formulário.</p>
    </div>
    <label className="flex items-center gap-3 rounded-lg border border-teal-700/25 bg-white/60 p-3 text-sm dark:bg-black/20">
      <input type="checkbox" checked={summer.show_catalog} onChange={(e) => update({ ...summer, show_catalog: e.target.checked })}/>
      <span><strong>Mostrar acervo do Verão</strong><small className="mt-1 block opacity-75">Deixe desligado até as velas estarem publicadas. No cadastro de cada vela, vincule o produto ao Portal de Verão; somente essas velas aparecerão aqui.</small></span>
    </label>

    <div className="space-y-2">
      <h4 className="font-semibold">Quatro receitas de verão</h4>
      {summer.recipes.map((recipe, i) => <details key={i} className="rounded-lg border border-teal-700/20 bg-white/70 p-3 dark:bg-black/15">
        <summary className="cursor-pointer text-sm font-medium">Drink {i+1}{recipe.title ? " — " + recipe.title : " — em preparação"}{recipe.visible ? " · Visível" : " · Oculto"}</summary>
        <div className="mt-3 grid gap-3">
          <label className="text-xs">Nome da receita
            <input className={fieldClass} value={recipe.title} onChange={(e) => updateRecipe(i, { title: e.target.value })} placeholder="Nome do drink"/>
          </label>
          <label className="text-xs">Ingredientes
            <textarea className={fieldClass} rows={2} value={recipe.ingredients} onChange={(e) => updateRecipe(i, { ingredients: e.target.value })} placeholder="Ingredientes da receita"/>
          </label>
          <label className="text-xs">Modo de preparo
            <textarea className={fieldClass} rows={3} value={recipe.method} onChange={(e) => updateRecipe(i, { method: e.target.value })} placeholder="Passos de preparo"/>
          </label>
          <label className="text-xs">Foto da receita (HTTPS ou caminho interno, opcional)
            <input className={fieldClass} value={recipe.image_url} onChange={(e) => updateRecipe(i, { image_url: e.target.value })} placeholder="https://..."/>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={recipe.visible} onChange={(e) => updateRecipe(i, { visible: e.target.checked })}/>
            Publicar esta receita (requer nome preenchido)
          </label>
        </div>
      </details>)}
    </div>

    <div className="space-y-2">
      <h4 className="font-semibold">Indicações de leitura e séries</h4>
      {summer.recommendations.map((item, i) => <details key={i} className="rounded-lg border border-teal-700/20 bg-white/70 p-3 dark:bg-black/15">
        <summary className="cursor-pointer text-sm font-medium">Indicação {i+1}{item.title ? " — " + item.title : " — em preparação"}{item.visible ? " · Visível" : " · Oculta"}</summary>
        <div className="mt-3 grid gap-3">
          <label className="text-xs">Tipo
            <select className={fieldClass} value={item.kind} onChange={(e) => updateRecommendation(i, { kind: e.target.value as "livro" | "serie" })}>
              <option value="livro">Livro</option><option value="serie">Série</option>
            </select>
          </label>
          <label className="text-xs">Título
            <input className={fieldClass} value={item.title} onChange={(e) => updateRecommendation(i, { title: e.target.value })} placeholder="Título"/>
          </label>
          <label className="text-xs">Texto de apresentação
            <textarea className={fieldClass} rows={2} value={item.description} onChange={(e) => updateRecommendation(i, { description: e.target.value })} placeholder="Por que combina com o verão?"/>
          </label>
          <label className="text-xs">Imagem (opcional)
            <input className={fieldClass} value={item.image_url} onChange={(e) => updateRecommendation(i, { image_url: e.target.value })} placeholder="https://..."/>
          </label>
          <label className="text-xs">Link (opcional)
            <input className={fieldClass} value={item.url} onChange={(e) => updateRecommendation(i, { url: e.target.value })} placeholder="https://..."/>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={item.visible} onChange={(e) => updateRecommendation(i, { visible: e.target.checked })}/>
            Publicar esta indicação (requer título preenchido)
          </label>
        </div>
      </details>)}
    </div>
  </section>;
}