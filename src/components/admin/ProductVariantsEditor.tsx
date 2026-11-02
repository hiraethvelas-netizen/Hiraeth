import { useState } from "react";
import { toast } from "sonner";
import {
  legacyToManaged, validateVariantSetup, variantCombinations,
  type CombinationVariant, type LegacyVariant, type VariantGroup, type VariantSetup,
} from "@/lib/product-variants";

type Props = {
  value: VariantSetup;
  onChange: (value: VariantSetup) => void;
  basePrice: number;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
};

const fieldStyle = "min-w-0 w-full rounded border border-primary/30 bg-[#fbf7eb] px-3 py-2 text-sm text-[#34402b] [color-scheme:light]";
const buttonStyle = "rounded border border-primary/50 px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-40";

export function ProductVariantsEditor({ value, onChange, basePrice, onUpload, disabled = false }: Props) {
  const [uploadingRow, setUploadingRow] = useState<string | null>(null);
  const currentError = validateVariantSetup(value);

  function updateGroups(groups: VariantGroup[]) {
    const rows = variantCombinations(groups, value.rows, basePrice);
    // Keep previous values while one of the new fields is still being entered.
    onChange({ groups, rows: groups.length === 0 ? [] : rows.length ? rows : value.rows, legacy: null });
  }

  function addGroup() {
    if (value.groups.length >= 3) {
      toast.error("Use até três tipos de variação por produto.");
      return;
    }
    const id = crypto.randomUUID();
    updateGroups([...value.groups, {
      id, name: "", values: [{ id: crypto.randomUUID(), label: "" }],
    }]);
  }

  function removeGroup(group: VariantGroup) {
    if (!window.confirm(`Remover a variação "${group.name || "sem nome"}" e as combinações relacionadas?`)) return;
    updateGroups(value.groups.filter(item => item.id !== group.id));
  }

  function editRow(key: string, patch: Partial<CombinationVariant>) {
    onChange({
      ...value,
      rows: value.rows.map(row => row.key === key ? { ...row, ...patch } : row),
    });
  }

  function editLegacy(index: number, patch: Partial<LegacyVariant>) {
    onChange({
      ...value,
      legacy: (value.legacy ?? []).map((row, i) => i === index ? { ...row, ...patch } : row),
    });
  }

  async function uploadImage(file: File, id: string, onDone: (url: string) => void) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    setUploadingRow(id);
    try {
      const url = await onUpload(file);
      onDone(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar imagem da variação.");
    } finally {
      setUploadingRow(null);
    }
  }

  function photoField(image: string, id: string, onDone: (url: string) => void) {
    return <div className="flex flex-wrap items-center gap-3">
      {image ? (
        <img className="h-20 w-20 rounded border object-cover" src={image} alt="Foto da variação" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-primary/40 text-center text-xs text-muted-foreground">
          Sem foto
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="cursor-pointer rounded border border-primary/40 px-3 py-2 text-xs text-primary">
          {uploadingRow === id ? "Enviando foto..." : image ? "Trocar foto" : "+ Adicionar foto"}
          <input
            type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={disabled || !!uploadingRow}
            onChange={event => {
              const file = event.currentTarget.files?.item(0);
              if (file) void uploadImage(file, id, onDone);
              event.currentTarget.value = "";
            }}
            className="sr-only"
          />
        </label>
        {image && <button type="button" className="text-left text-xs text-destructive" disabled={disabled}
          onClick={() => { if (window.confirm("Remover a foto desta variação?")) onDone(""); }}>
          Remover foto
        </button>}
      </div>
    </div>;
  }

  const isLegacy = value.legacy !== null;
  // Validation must never unmount the combination editor mid-keystroke.
  // Numeric inputs are temporarily empty/invalid while merchants edit them.
  // Keep the existing rows visible and block only the final product save.
  const groupsReady = value.groups.length > 0 && value.rows.length > 0;

  return (
    <section className="space-y-4 border border-primary/25 p-4" aria-label="Variações do produto">
      <div>
        <h3 className="font-display text-2xl text-foreground">Variações do produto</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre Cor, Tamanho, Peso ou outra característica. Cada combinação tem foto, preço e estoque próprios.
          Não é necessário digitar código.
        </p>
      </div>

      {isLegacy ? (
        <>
          <p className="text-sm text-muted-foreground">Variações antigas preservadas. Você pode atualizar seus valores ou convertê-las em opções combináveis.</p>
          {(value.legacy ?? []).map((row, index) => (
            <div key={String(row.key ?? index)} className="grid gap-3 rounded border border-primary/20 p-3">
              <div className="text-sm font-medium text-foreground">{String(row.label ?? "Variação " + (index + 1))}</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-muted-foreground">Nome da opção
                  <input className={fieldStyle} value={String(row.label ?? "")} onChange={e => editLegacy(index, { label: e.target.value })} disabled={disabled} />
                </label>
                <label className="text-xs text-muted-foreground">Preço (R$)
                  <input type="number" min="0" step="0.01" className={fieldStyle} value={String(row.price ?? basePrice)}
                    onChange={e => editLegacy(index, { price: Number(e.target.value) })} disabled={disabled} />
                </label>
                <label className="text-xs text-muted-foreground">Estoque
                  <input type="number" min="0" step="1" className={fieldStyle} value={String(row.stock ?? 0)}
                    onChange={e => editLegacy(index, { stock: Number(e.target.value) })} disabled={disabled} />
                </label>
              </div>
              {photoField(typeof row.image === "string" ? row.image : "", "legacy-" + index,
                url => editLegacy(index, { image: url }))}
            </div>
          ))}
          <button type="button" disabled={disabled} className={buttonStyle}
            onClick={() => {
              if (!window.confirm("Criar combinações de variações a partir das opções antigas? Revise preços e estoques antes de salvar. Os dados existentes só serão substituídos depois que você salvar o produto.")) return;
              onChange(legacyToManaged(value.legacy ?? [], basePrice));
            }}>
            + Adicionar variações combináveis
          </button>
        </>
      ) : (
        <>
          {value.groups.map(group => <div className="space-y-3 rounded border border-primary/20 bg-background/30 p-4" key={group.id}>
            <div className="flex items-start gap-3">
              <label className="flex-1 text-sm text-muted-foreground">Nome da variação
                <input type="text" className={fieldStyle} list="variant-name-suggestions"
                  value={group.name} placeholder="Ex.: Cor, Tamanho, Peso, Casa"
                  onChange={e => updateGroups(value.groups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))}
                  disabled={disabled} />
              </label>
              <button type="button" disabled={disabled} className="mt-6 text-xs text-destructive"
                onClick={() => removeGroup(group)}>Remover</button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Opções disponíveis</p>
              {group.values.map((option, index) => <div key={option.id} className="flex items-center gap-2">
                <label className="flex-1 text-xs text-muted-foreground">
                  <span className="sr-only">Opção {index + 1} de {group.name || "variação"}</span>
                  <input type="text" className={fieldStyle} aria-label={`Opção ${index + 1} de ${group.name || "variação"}`}
                    placeholder={group.name.toLocaleLowerCase("pt-BR").includes("cor") ? "Ex.: Vermelha" : group.name.toLocaleLowerCase("pt-BR").includes("peso") ? "Ex.: 100 g" : "Ex.: P, M, G"}
                    value={option.label} disabled={disabled}
                    onChange={e => updateGroups(value.groups.map(g => g.id === group.id ?
                      { ...g, values: g.values.map(v => v.id === option.id ? { ...v, label: e.target.value } : v) } : g))}
                  />
                </label>
                <button type="button" disabled={disabled} aria-label={`Remover opção ${option.label || index + 1}`}
                  className="rounded px-2 py-1 text-destructive"
                  onClick={() => {
                    if (!window.confirm("Remover esta opção e as combinações relacionadas?")) return;
                    updateGroups(value.groups.map(g => g.id === group.id ?
                      { ...g, values: g.values.filter(v => v.id !== option.id) } : g));
                  }}>×</button>
              </div>)}
              <button type="button" disabled={disabled} className={buttonStyle}
                onClick={() => updateGroups(value.groups.map(g => g.id === group.id ?
                  { ...g, values: [...g.values, { id: crypto.randomUUID(), label: "" }] } : g))}>
                + Adicionar opção
              </button>
            </div>
          </div>)}
          <datalist id="variant-name-suggestions">
            <option value="Cor" /><option value="Tamanho" /><option value="Peso" /><option value="Casa" /><option value="Modelo" />
          </datalist>
          <button type="button" disabled={disabled || value.groups.length >= 3} className={buttonStyle}
            onClick={addGroup}>+ Adicionar variação</button>

          {currentError && <p role="status" className="text-sm text-primary">{currentError}</p>}
          {groupsReady && <div className="space-y-3">
            <div>
              <h4 className="font-display text-xl text-foreground">Preços, estoque e fotos por combinação</h4>
              <p className="text-sm text-muted-foreground">As combinações aparecem automaticamente. Personalize cada uma e salve o produto.</p>
            </div>
            {value.rows.map(row => <div key={row.key} className="grid gap-3 rounded border border-primary/25 p-4">
              <h5 className="font-medium text-foreground">{row.label}</h5>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-muted-foreground">Preço (R$) — {row.label}
                  <input required type="number" min="0" step="0.01" className={fieldStyle}
                    value={Number.isFinite(row.price) ? row.price : ""}
                    onChange={e => editRow(row.key, { price: e.target.value === "" ? Number.NaN : Number(e.target.value) })} disabled={disabled} />
                </label>
                <label className="text-xs text-muted-foreground">Preço promocional (R$) — {row.label}
                  <input type="number" min="0" step="0.01" className={fieldStyle}
                    placeholder="Opcional" value={row.sale_price ?? ""}
                    onChange={e => editRow(row.key, { sale_price: e.target.value === "" ? null : Number(e.target.value) })} disabled={disabled} />
                </label>
                <label className="text-xs text-muted-foreground">Estoque — {row.label}
                  <input required type="number" min="0" step="1" className={fieldStyle}
                    value={Number.isFinite(row.stock) ? row.stock : ""}
                    onChange={e => editRow(row.key, { stock: e.target.value === "" ? Number.NaN : Number(e.target.value) })} disabled={disabled} />
                </label>
              </div>
              {photoField(row.image, row.key, url => editRow(row.key, { image: url }))}
            </div>)}
          </div>}
        </>
      )}
    </section>
  );
}
