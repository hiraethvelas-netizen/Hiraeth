import { useEffect, useId, useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EssenceNotesFields } from "@/components/admin/EssenceNotesFields";
import { emptyNotes, type NotesDraft } from "@/lib/fragrance";
import { essenceUnit, type CandleIngredient, type StockUnit } from "@/lib/candle-recipes";
export type { CandleIngredient } from "@/lib/candle-recipes";

export type StockEssence = {
  id: string;
  name: string;
  stock_ml: number;
  active: boolean;
  stock_unit?: StockUnit;
};

type Props = {
  essences: StockEssence[];
  ingredients: CandleIngredient[];
  onIngredientsChange: (items: CandleIngredient[]) => void;
  onCreate: (data: { name: string; stock_ml: number; stock_unit?: StockUnit; notes: NotesDraft }) => Promise<StockEssence>;
  onRefresh: () => Promise<void>;
  stockError?: string | null;
  refreshing?: boolean;
  saving?: boolean;
  recipeLabel?: string;
};

const fold = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

const inputCls = "mt-1 w-full rounded border border-primary/30 bg-[#fbf7eb] px-3 py-2 text-[#34402b] placeholder:text-[#625f4b] [color-scheme:light]";

export function CandleEssenceEditor({
  essences, ingredients, onIngredientsChange, onCreate, onRefresh,
  stockError, refreshing = false, saving = false, recipeLabel,
}: Props) {
  const [tab, setTab] = useState<"stock" | "new">("stock");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsId = useId();
  const [quantity, setQuantity] = useState("");
  const [newName, setNewName] = useState("");
  const [newStock, setNewStock] = useState("0");
  const newUnit: StockUnit = "g";
  const [notes, setNotes] = useState<NotesDraft>({ ...emptyNotes });
  const [creating, setCreating] = useState(false);

  const available = useMemo(
    () => essences.filter(item => item.active && fold(item.name).includes(fold(search)))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [essences, search],
  );
  const activeSelected = essences.find(item => item.id === selectedId && item.active);

  useEffect(() => {
    if (suggestionsOpen && highlightedIndex >= 0) {
      document.getElementById(`${suggestionsId}-${highlightedIndex}`)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [suggestionsOpen, suggestionsId, highlightedIndex]);

  function selectEssence(item: StockEssence) {
    setSelectedId(item.id);
    setSearch(item.name);
    setSuggestionsOpen(false);
    setHighlightedIndex(-1);
  }

  function addIngredient() {
    const essence = essences.find(item => item.id === selectedId && item.active);
    const qty = Number(quantity);
    if (!essence) { toast.error("Selecione uma essência do estoque."); return; }
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(`Informe a quantidade de essência em ${essenceUnit(essence)} por vela.`);
      return;
    }
    onIngredientsChange([
      ...ingredients.filter(item => item.essence_id !== essence.id),
      { essence_id: essence.id, name: essence.name, quantity_ml: qty, ...(essence.stock_unit ? { stock_unit: essence.stock_unit } : {}) },
    ]);
    setQuantity("");
    toast.success(ingredients.some(item => item.essence_id === essence.id)
      ? "Quantidade da essência atualizada na receita."
      : "Essência adicionada à receita da vela.");
  }

  async function createEssence() {
    const name = newName.trim();
    const stock = Number(newStock);
    if (!name || !newStock.trim() || !Number.isFinite(stock) || stock < 0) {
      toast.error("Informe o nome e um saldo inicial válido.");
      return;
    }
    if (essences.some(item => fold(item.name) === fold(name))) {
      toast.error("Essa essência já existe. Pesquise e selecione no estoque.");
      setSearch(name);
      setSelectedId("");
      setHighlightedIndex(-1);
      setTab("stock");
      setSuggestionsOpen(true);
      return;
    }
    if (!notes.is_pure && ![notes.top, notes.heart, notes.base].some(value => value.trim())) {
      toast.error("Informe as notas da essência composta.");
      return;
    }
    if (creating) return;
    setCreating(true);
    try {
      const item = await onCreate({ name, stock_ml: stock, stock_unit: newUnit, notes });
      selectEssence(item);
      setTab("stock");
      setQuantity("");
      setNewName("");
      setNewStock("0");
      setNotes({ ...emptyNotes });
      toast.success("Essência cadastrada no estoque. Informe a quantidade para adicioná-la à vela.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar a essência.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-4 border border-primary/20 p-4" aria-label="Aromas da vela">
      <div>
        <h3 className="text-lg text-foreground">Aromas da vela{recipeLabel ? ` — ${recipeLabel}` : ""}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Escolha uma essência já cadastrada ou cadastre uma nova sem sair do produto.
          A quantidade é por uma vela, na mesma unidade do estoque (g ou ml), e só aparece na administração. Gramas e mililitros não são convertidos automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Gerenciar essências">
        <button type="button" role="tab" aria-selected={tab === "stock"} aria-controls="aromas-estoque"
          onClick={() => setTab("stock")}
          className={"rounded border px-3 py-2 text-sm " + (tab === "stock" ? "border-primary bg-primary/10 text-primary" : "border-primary/30 text-foreground")}>
          Pesquisar estoque
        </button>
        <button type="button" role="tab" aria-selected={tab === "new"} aria-controls="aromas-nova"
          onClick={() => setTab("new")}
          className={"rounded border px-3 py-2 text-sm " + (tab === "new" ? "border-primary bg-primary/10 text-primary" : "border-primary/30 text-foreground")}>
          + Cadastrar um aroma novo
        </button>
      </div>

      {tab === "stock" ? (
        <div id="aromas-estoque" role="tabpanel" className="space-y-3">
          <div className="flex items-end gap-2">
            <label className="relative block min-w-0 flex-1 text-sm text-muted-foreground">
              Pesquisar aroma no estoque
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 text-muted-foreground" />
              <input type="search" role="combobox" autoComplete="off" value={search}
                aria-autocomplete="list" aria-expanded={suggestionsOpen}
                aria-controls={suggestionsOpen ? suggestionsId : undefined}
                aria-activedescendant={suggestionsOpen && available[highlightedIndex]
                  ? `${suggestionsId}-${highlightedIndex}` : undefined}
                disabled={saving}
                onFocus={() => { setSuggestionsOpen(true); setHighlightedIndex(-1); }}
                onBlur={() => { setSuggestionsOpen(false); setHighlightedIndex(-1); }}
                onChange={event => {
                  setSearch(event.target.value);
                  setSelectedId("");
                  setSuggestionsOpen(true);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={event => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setSuggestionsOpen(true);
                    if (available.length) setHighlightedIndex(index => {
                      if (!suggestionsOpen || index < 0) return event.key === "ArrowDown" ? 0 : available.length - 1;
                      return (index + (event.key === "ArrowDown" ? 1 : -1) + available.length) % available.length;
                    });
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const item = available[highlightedIndex];
                    if (suggestionsOpen && item) selectEssence(item);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setSuggestionsOpen(false);
                    setHighlightedIndex(-1);
                  }
                }}
                placeholder="Ex.: Baunilha, Floresta de Inverno..."
                className={inputCls + " pl-9"} />
            </label>
            <button type="button" disabled={refreshing || saving}
              onClick={() => { void onRefresh().catch(error => toast.error(error instanceof Error ? error.message : "Falha ao atualizar o estoque.")); }} className="rounded border border-primary/40 p-2.5 text-primary disabled:opacity-40"
              aria-label="Atualizar estoque de essências" title="Atualizar estoque">
              <RefreshCw size={19} aria-hidden="true" />
            </button>
          </div>

          {stockError && <p role="alert" className="text-sm text-destructive">
            {stockError} Use “Atualizar estoque” para tentar novamente.
          </p>}
          {refreshing && <p role="status" className="text-xs text-muted-foreground">Consultando estoque...</p>}
          {suggestionsOpen && <div id={suggestionsId} role="listbox" aria-label="Essências do estoque"
            className="max-h-48 space-y-1 overflow-y-auto rounded border border-primary/20 bg-background p-2">
            {available.length > 0 ? available.map((item, index) => (
              <button key={item.id} id={`${suggestionsId}-${index}`} type="button" role="option"
                aria-selected={highlightedIndex === index || (highlightedIndex < 0 && selectedId === item.id)} tabIndex={-1}
                aria-label={item.name}
                disabled={saving}
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectEssence(item)}
                className={"flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm " +
                  (selectedId === item.id || highlightedIndex === index ? "bg-primary/15 text-primary" : "text-foreground hover:bg-primary/10")}>
                <span>{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {Number(item.stock_ml).toLocaleString("pt-BR")} {essenceUnit(item)} em estoque
                </span>
              </button>
            )) : <p role="status" className="p-2 text-sm text-muted-foreground">
              {stockError ? "Estoque indisponível." : "Nenhuma essência encontrada. Cadastre uma nova na outra aba."}
            </p>}
          </div>}
          <div className="grid gap-3 sm:grid-cols-[9rem_auto]">
            <label className="block text-sm text-muted-foreground">
              Quantidade ({essenceUnit(activeSelected)})
              <input type="number" min="0.001" step="0.001" placeholder="Ex.: 8"
                value={quantity} onChange={event => setQuantity(event.target.value)}
                className={inputCls} />
            </label>
            <button type="button" onClick={addIngredient} disabled={saving || !activeSelected}
              className="btn-gold self-end disabled:opacity-40">
              Adicionar aroma
            </button>
          </div>
          {activeSelected && <p className="text-xs text-muted-foreground">
            Selecionada: {activeSelected.name}. Saldo cadastrado: {Number(activeSelected.stock_ml).toLocaleString("pt-BR")} {essenceUnit(activeSelected)}.
          </p>}
        </div>
      ) : (
        <div id="aromas-nova" role="tabpanel" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted-foreground">
              Nome do aroma
              <input type="text" value={newName} onChange={event => setNewName(event.target.value)}
                placeholder="Ex.: Floresta de Inverno" className={inputCls} />
            </label>
            <label className="block text-sm text-muted-foreground">
              Saldo inicial ({newUnit})
              <input type="number" min="0" step="0.001"
                value={newStock} onChange={event => setNewStock(event.target.value)}
                className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Novas essências são sempre cadastradas em gramas (g).</p>
          <EssenceNotesFields value={notes} onChange={setNotes} inputClass={inputCls} />
          <button type="button" disabled={creating || saving} onClick={() => void createEssence()}
            className="btn-gold disabled:opacity-40">
            {creating ? "Cadastrando essência..." : "Salvar essência no estoque"}
          </button>
          <p className="text-xs text-muted-foreground">
            Depois de salvar, a essência aparece na pesquisa e pode ser adicionada à fórmula desta vela.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Essências adicionadas nesta vela</h4>
        {ingredients.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma essência selecionada ainda.</p>
        ) : ingredients.map(item => (
          <div key={item.essence_id} className="flex items-center justify-between gap-3 border-b border-primary/20 py-2 text-sm">
            <span className="text-foreground">{item.name} <span className="text-xs text-muted-foreground">
              · {item.quantity_ml.toLocaleString("pt-BR")} {item.stock_unit ?? essenceUnit(essences.find(essence => essence.id === item.essence_id))} por vela
            </span></span>
            <button type="button" disabled={saving}
              onClick={() => onIngredientsChange(ingredients.filter(row => row.essence_id !== item.essence_id))}
              className="text-xs text-destructive">Remover</button>
          </div>
        ))}
      </div>
    </section>
  );
}
