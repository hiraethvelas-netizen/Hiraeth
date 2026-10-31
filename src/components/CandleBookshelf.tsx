import { useMemo, useState } from "react";
import { Flame, Heart, ImagePlus, X } from "lucide-react";

export type CandleLibraryItem = {
  id: string;
  title: string;
  aroma?: string | null;
  image_url?: string | null;
  category?: string | null;
  acquired_at?: string | null;
  notes?: string | null;
  rating?: number | null;
  favorite?: boolean;
  order_item_id?: string | null;
  purchase_status?: string | null;
  quantity?: number | null;
  variant_details?: Record<string, unknown> | null;
};

export type CandleDraft = {
  title: string;
  aroma: string;
  category: string;
  acquired_at: string;
  notes: string;
  rating: number;
};

export type CandleDraftInput = CandleDraft & { image: File | null };

type CandleBookshelfProps = {
  items: CandleLibraryItem[];
  editable?: boolean;
  onAdd?: (values: CandleDraftInput) => Promise<void>;
  onUpdate?: (id: string, values: CandleDraftInput) => Promise<void>;
  onFavorite?: (item: CandleLibraryItem) => Promise<void>;
  onRemove?: (item: CandleLibraryItem) => Promise<void>;
};

const EMPTY_DRAFT: CandleDraft = {
  title: "",
  aroma: "",
  category: "",
  acquired_at: "",
  notes: "",
  rating: 0,
};

function draftFromItem(item: CandleLibraryItem): CandleDraft {
  return {
    title: item.title ?? "",
    aroma: item.aroma ?? "",
    category: item.category ?? "",
    acquired_at: item.acquired_at ?? "",
    notes: item.notes ?? "",
    rating: item.rating ?? 0,
  };
}

function statusLabel(status?: string | null) {
  if (!status) return "";
  const labels: Record<string, string> = {
    pending: "Pedido registrado",
    paid: "Pedido pago",
    shipped: "A caminho",
    delivered: "Entregue",
    cancelled: "Pedido cancelado",
    refunded: "Pedido reembolsado",
  };
  return labels[status] ?? status;
}

export function CandleBookshelf({
  items,
  editable = false,
  onAdd,
  onUpdate,
  onFavorite,
  onRemove,
}: CandleBookshelfProps) {
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [dialogItem, setDialogItem] = useState<CandleLibraryItem | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "add" | "edit">("view");
  const [draft, setDraft] = useState<CandleDraft>(EMPTY_DRAFT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = useMemo(
    () => [...new Set(items.map(item => item.category?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [items],
  );
  const visibleItems = categoryFilter === "Todos"
    ? items
    : categoryFilter === "Sem categoria"
      ? items.filter(item => !item.category?.trim())
      : items.filter(item => item.category?.trim() === categoryFilter);
  const rows = Array.from({ length: Math.ceil(visibleItems.length / 3) }, (_, index) => visibleItems.slice(index * 3, index * 3 + 3));
  const canEditSelected = Boolean(dialogItem && editable && (!dialogItem.order_item_id || dialogItem.purchase_status === "delivered"));
  const dialogTitle = dialogMode === "add" ? "Adicionar vela antiga" : dialogMode === "edit" ? "Editar vela" : dialogItem?.title ?? "";

  function openItem(item: CandleLibraryItem) {
    setDialogItem(item);
    setDraft(draftFromItem(item));
    setImageFile(null);
    setError("");
    setDialogMode("view");
  }

  function closeDialog() {
    if (saving) return;
    setDialogItem(null);
    setDialogMode("view");
    setImageFile(null);
    setError("");
  }

  function openAdd() {
    setDialogItem(null);
    setDraft(EMPTY_DRAFT);
    setImageFile(null);
    setError("");
    setDialogMode("add");
  }

  async function submitDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const values = { ...draft, title: draft.title.trim(), image: imageFile };
      if (!values.title) throw new Error("Informe o nome da vela.");
      if (dialogMode === "add") {
        if (!onAdd) throw new Error("A inclusão de velas não está disponível agora.");
        await onAdd(values);
      } else if (dialogItem && onUpdate) {
        await onUpdate(dialogItem.id, values);
      } else {
        throw new Error("Não foi possível salvar esta vela.");
      }
      setDialogItem(null);
      setDialogMode("view");
      setImageFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a vela.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSelected() {
    if (!dialogItem || !onRemove || dialogItem.order_item_id) return;
    if (!window.confirm("Deseja remover esta vela da sua estante?")) return;
    setSaving(true);
    try {
      await onRemove(dialogItem);
      setDialogItem(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover a vela.");
    } finally {
      setSaving(false);
    }
  }

  const filterOptions = ["Todos", ...categories, ...(items.some(item => !item.category?.trim()) ? ["Sem categoria"] : [])];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Filtrar velas por categoria">
          {filterOptions.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              aria-pressed={categoryFilter === category}
              className={`rounded-full border px-4 py-2 text-xs transition-colors ${categoryFilter === category ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
            >
              {category}
            </button>
          ))}
        </div>
        {editable && onAdd && (
          <button type="button" onClick={openAdd} className="btn-gold justify-center">
            + Adicionar vela antiga
          </button>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/30 px-5 py-12 text-center">
          <Flame className="mx-auto text-primary" size={28} />
          <p className="mt-3 font-display text-xl italic text-primary">
            {items.length ? "Nenhuma vela nesta categoria" : "Sua estante aguarda suas histórias"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length ? "Escolha outra categoria para continuar explorando." : "Suas compras aparecerão aqui. Você também pode adicionar velas antigas à sua coleção."}
          </p>
          {editable && onAdd && items.length === 0 && <button type="button" onClick={openAdd} className="btn-gold mt-5">Registrar uma vela antiga</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border-[5px] border-[#68462e] bg-[linear-gradient(135deg,#5a3d2a_0%,#3f2b20_45%,#68462e_100%)] p-2 shadow-[inset_0_0_18px_rgba(0,0,0,0.35),0_12px_24px_rgba(42,28,18,0.16)] sm:p-4">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-3 gap-2 border-b-[11px] border-[#8a6240] px-1 pb-2 pt-4 shadow-[0_7px_6px_-5px_rgba(0,0,0,0.8)] sm:gap-4 sm:px-3 sm:pb-3 sm:pt-5"
            >
              {row.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className="group flex min-w-0 flex-col items-center rounded-sm px-1 pb-2 text-center transition hover:bg-[#f7efda]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e0c58b]"
                  aria-label={`Abrir detalhes da vela ${item.title}`}
                >
                  <span className="relative block aspect-[4/5] w-full max-w-[120px] overflow-hidden rounded-sm border border-[#c2a47a] bg-[#e9dec8] shadow-[0_5px_12px_rgba(0,0,0,0.38)]">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      : <span className="flex h-full w-full items-center justify-center p-2 font-display text-xs italic text-[#634b35] sm:text-sm">{item.title}</span>}
                    {item.favorite && <span className="absolute right-1 top-1 rounded-full bg-[#f7efda] p-1 text-[#8b3426]"><Heart size={12} fill="currentColor" /></span>}
                    {item.order_item_id && <span className="absolute bottom-1 left-1 rounded bg-[#18251d]/85 px-1.5 py-0.5 text-[8px] font-semibold text-[#f7efda] sm:text-[9px]">{item.purchase_status === "delivered" ? "ENTREGUE" : "COMPRA"}</span>}
                    {(item.quantity ?? 1) > 1 && <span className="absolute right-1 bottom-1 rounded bg-[#f7efda]/95 px-1.5 py-0.5 text-[9px] font-bold text-[#3f2b20]">×{item.quantity}</span>}
                  </span>
                  <span className="mt-2 line-clamp-2 min-h-8 w-full break-words font-display text-xs font-medium text-[#f7efda] sm:text-sm">{item.title}</span>
                  {item.aroma && <span className="mt-0.5 line-clamp-1 w-full text-[9px] text-[#e4d5b8] sm:text-[10px]">{item.aroma}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {dialogMode !== "view" || dialogItem ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={dialogTitle}>
          <section className="relative my-auto max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-primary/25 bg-card p-5 shadow-2xl sm:p-7">
            <button type="button" onClick={closeDialog} disabled={saving} className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-primary/10 hover:text-foreground" aria-label="Fechar">
              <X size={20} />
            </button>
            <p className="eyebrow">{dialogMode === "add" ? "Uma lembrança da sua coleção" : "Detalhes da sua vela"}</p>
            <h3 className="mt-1 pr-8 font-display text-3xl text-foreground">{dialogTitle}</h3>

            {dialogMode === "view" && dialogItem ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,190px)_1fr]">
                <div className="overflow-hidden rounded-md border border-primary/15 bg-secondary">
                  {dialogItem.image_url ? <img src={dialogItem.image_url} alt={dialogItem.title} className="aspect-[4/5] w-full object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center p-4 text-center font-display text-primary">{dialogItem.title}</div>}
                </div>
                <div className="space-y-3 text-sm">
                  {dialogItem.category && <p><span className="font-semibold text-foreground">Categoria:</span> <span className="text-muted-foreground">{dialogItem.category}</span></p>}
                  {dialogItem.aroma && <p><span className="font-semibold text-foreground">Aroma:</span> <span className="text-muted-foreground">{dialogItem.aroma}</span></p>}
                  {dialogItem.acquired_at && <p><span className="font-semibold text-foreground">Data da compra:</span> <span className="text-muted-foreground">{new Date(dialogItem.acquired_at + "T00:00:00").toLocaleDateString("pt-BR")}</span></p>}
                  {dialogItem.order_item_id && <p><span className="font-semibold text-foreground">Pedido:</span> <span className="text-muted-foreground">{statusLabel(dialogItem.purchase_status)}</span></p>}
                  {(dialogItem.quantity ?? 1) > 1 && <p><span className="font-semibold text-foreground">Quantidade:</span> <span className="text-muted-foreground">{dialogItem.quantity}</span></p>}
                  {dialogItem.variant_details && Object.values(dialogItem.variant_details).some(value => typeof value === "string" && value.trim()) && <p><span className="font-semibold text-foreground">Variação:</span> <span className="text-muted-foreground">{Object.values(dialogItem.variant_details).filter(value => typeof value === "string" && value.trim()).join(" · ")}</span></p>}
                  <div><p className="font-semibold text-foreground">Detalhes</p><p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">{dialogItem.notes || "Nenhuma descrição adicionada ainda."}</p></div>
                  <div>
                    <p className="font-semibold text-foreground">Avaliação</p>
                    <div className="mt-1 flex gap-1" aria-label={dialogItem.rating ? `${dialogItem.rating} de 5 foguinhos` : "Ainda sem avaliação"}>
                      {[1,2,3,4,5].map(value => <Flame key={value} size={19} className={value <= (dialogItem.rating ?? 0) ? "fill-orange-500 text-orange-500" : "text-muted-foreground/30"} />)}
                    </div>
                  </div>
                  {dialogItem.order_item_id && dialogItem.purchase_status !== "delivered" && <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">Quando seu pedido for marcado como entregue, você poderá adicionar seus detalhes e avaliar esta vela com foguinhos.</p>}
                  {editable && onFavorite && <button type="button" onClick={async () => { await onFavorite(dialogItem); setDialogItem(current => current ? { ...current, favorite: !current.favorite } : current); }} className="text-sm text-primary">{dialogItem.favorite ? "♥ Remover dos favoritos" : "♡ Favoritar esta vela"}</button>}
                  {editable && canEditSelected && onUpdate && <button type="button" onClick={() => { setDraft(draftFromItem(dialogItem)); setImageFile(null); setDialogMode("edit"); setError(""); }} className="block rounded-full border border-primary/40 px-4 py-2 text-sm text-foreground transition hover:bg-primary/10">Editar detalhes</button>}
                  {editable && onRemove && !dialogItem.order_item_id && <button type="button" onClick={() => void removeSelected()} disabled={saving} className="text-xs text-destructive hover:underline">Remover da estante</button>}
                </div>
              </div>
            ) : (
              <form onSubmit={submitDraft} className="mt-5 space-y-4">
                <label className="block text-sm text-foreground">Nome da vela
                  <input required maxLength={160} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} className="mt-1 w-full border border-primary/20 bg-background px-3 py-3 text-foreground" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-foreground">Categoria / universo
                    <input maxLength={100} value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))} placeholder="Ex.: Harry Potter, Friends" className="mt-1 w-full border border-primary/20 bg-background px-3 py-3 text-foreground" />
                  </label>
                  <label className="block text-sm text-foreground">Aroma
                    <input maxLength={160} value={draft.aroma} onChange={event => setDraft(current => ({ ...current, aroma: event.target.value }))} placeholder="Nome do aroma" className="mt-1 w-full border border-primary/20 bg-background px-3 py-3 text-foreground" />
                  </label>
                </div>
                <label className="block text-sm text-foreground">Data da compra
                  <input type="date" value={draft.acquired_at} onChange={event => setDraft(current => ({ ...current, acquired_at: event.target.value }))} className="mt-1 w-full border border-primary/20 bg-background px-3 py-3 text-foreground" />
                </label>
                <label className="block text-sm text-foreground">Detalhes / descrição pessoal
                  <textarea maxLength={1500} rows={3} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="Conte o que esta vela representa para você..." className="mt-1 w-full border border-primary/20 bg-background px-3 py-3 text-foreground" />
                </label>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sua avaliação em foguinhos</p>
                  <div className="mt-2 flex gap-2" role="group" aria-label="Avaliação de um a cinco foguinhos">
                    {[1,2,3,4,5].map(value => <button key={value} type="button" onClick={() => setDraft(current => ({ ...current, rating: current.rating === value ? 0 : value }))} aria-pressed={draft.rating === value} aria-label={`${value} foguinhos`} className="rounded p-1 transition hover:scale-110 focus-visible:outline focus-visible:outline-primary">
                      <Flame size={27} className={value <= draft.rating ? "fill-orange-500 text-orange-500" : "text-muted-foreground/35"} />
                    </button>)}
                  </div>
                </div>
                <label className="block text-sm text-foreground">
                  <span className="mb-2 flex items-center gap-2"><ImagePlus size={16}/> Foto da vela (opcional)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setImageFile(event.currentTarget.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border file:border-primary/30 file:bg-background file:px-4 file:py-2 file:text-foreground" />
                  {imageFile && <span className="mt-1 block text-xs text-muted-foreground">{imageFile.name}</span>}
                </label>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => dialogMode === "edit" ? setDialogMode("view") : closeDialog()} disabled={saving} className="rounded-full border border-primary/30 px-4 py-2 text-sm text-foreground">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-gold">{saving ? "Salvando..." : dialogMode === "add" ? "Adicionar à estante" : "Salvar alterações"}</button>
                </div>
              </form>
            )}
            {dialogMode === "view" && error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          </section>
        </div>
      ) : null}
    </section>
  );
}
