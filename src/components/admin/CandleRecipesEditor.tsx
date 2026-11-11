import { useState, type ComponentProps } from "react";
import { CandleEssenceEditor } from "./CandleEssenceEditor";
import { recipeTargets, type VariantRecipes } from "@/lib/candle-recipes";
import type { VariantSetup } from "@/lib/product-variants";

type Props = ComponentProps<typeof CandleEssenceEditor> & {
  variants: VariantSetup;
  variantRecipes: VariantRecipes;
  onVariantRecipesChange: (recipes: VariantRecipes) => void;
};

export function CandleRecipesEditor({
  variants,
  variantRecipes,
  onVariantRecipesChange,
  ...props
}: Props) {
  const [selected, setSelected] = useState("");
  const targets = recipeTargets(variants);
  const current = targets.find((target) => target.id === selected);
  const ownIngredients = current ? variantRecipes[current.id] : undefined;
  const useOwn = !!ownIngredients?.length;

  return (
    <div className="space-y-3">
      {targets.length > 0 && (
        <section
          className="space-y-3 rounded border border-primary/25 p-4"
          aria-label="Receitas por tamanho"
        >
          <label className="block text-sm text-foreground">
            Receita para
            <select
              value={current?.id ?? ""}
              disabled={props.saving}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-1 w-full rounded border border-primary/30 bg-[#fbf7eb] px-3 py-2 text-[#34402b] [color-scheme:light]"
            >
              <option value="">Receita padrão</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Cadastre a quantidade usada por uma vela de cada tamanho. Cada compra usa a receita do
            tamanho escolhido; os tamanhos sem receita própria usam a receita padrão, sem aumentar
            ou reduzir as quantidades automaticamente.
          </p>
          {current && (
            <p role="status" aria-label="Receita selecionada" className="text-sm text-foreground">
              {useOwn
                ? `Editando a receita de ${current.label}.`
                : `${current.label} usa a receita padrão. Adicione uma essência abaixo para definir uma receita própria.`}
            </p>
          )}
          {current && useOwn && (
            <button
              type="button"
              disabled={props.saving}
              className="text-sm text-primary underline"
              onClick={() => {
                if (
                  !window.confirm(
                    `Usar a receita padrão em ${current.label}? A receita própria só será substituída quando salvar o produto.`,
                  )
                )
                  return;
                const next = { ...variantRecipes };
                delete next[current.id];
                onVariantRecipesChange(next);
              }}
            >
              Usar receita padrão neste tamanho
            </button>
          )}
        </section>
      )}
      <CandleEssenceEditor
        {...props}
        key={current?.id ?? "default"}
        recipeLabel={current?.label ?? ""}
        ingredients={current ? (ownIngredients ?? []) : props.ingredients}
        onIngredientsChange={(items) => {
          if (current) onVariantRecipesChange({ ...variantRecipes, [current.id]: items });
          else props.onIngredientsChange(items);
        }}
      />
      {current && !useOwn && props.ingredients.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Receita padrão atual:{" "}
          {props.ingredients
            .map((item) => `${item.name}: ${item.quantity_ml} ${item.stock_unit ?? "ml"}`)
            .join("; ")}
          .
        </p>
      )}
    </div>
  );
}
