import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GripVertical, Heart } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { visiblePrice } from "@/lib/store-pricing";
import type { Promotion, PromotionCategory } from "@/lib/promotions";
import { InlineEditor } from "@/components/InlineEditor";
import { useAdminEdit, useSiteContent } from "@/lib/admin-edit";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;
export type DisplaySize = "normal" | "large";
export type FeaturedProduct = { id: string; size: DisplaySize };
type Curation = {
  title: string;
  configured: boolean;
  featured: FeaturedProduct[];
  [key: string]: unknown;
};

type Props = {
  scope: string;
  products: Product[];
  categories: Category[];
  wishlistIds: Set<string>;
  onWishlist: (productId: string, event: React.MouseEvent) => void;
  onSaveProduct: (product: Product, values: Record<string, unknown>) => Promise<void>;
  showFavorites?: boolean;
  searching?: boolean;
  automaticPromotions?: Promotion[];
  promotionCategories?: PromotionCategory[];
};

/** Keep product display sizes attached to products when their order changes. */
export function reorderPublishedProducts(featured: FeaturedProduct[], orderedIds: string[]): FeaturedProduct[] {
  const visibleIds = new Set(orderedIds);
  const byId = new Map(featured.map(item => [item.id, item]));
  let index = 0;
  return featured.map(item => visibleIds.has(item.id)
    ? (byId.get(orderedIds[index++]!) ?? item)
    : item);
}

function moveId(ids: string[], source: string, destination: string): string[] {
  const start = ids.indexOf(source);
  const target = ids.indexOf(destination);
  if (start < 0 || target < 0 || start === target) return ids;
  const updated = [...ids];
  updated.splice(start, 1);
  updated.splice(target, 0, source);
  return updated;
}

/** One instance per collection. Every category and subcategory has its own curation. */
export function CuratedProductGrid({
  scope, products, categories, wishlistIds, onWishlist, onSaveProduct,
  showFavorites = false, searching = false,
  automaticPromotions = [], promotionCategories = [],
}: Props) {
  const { isAdmin, editMode } = useAdminEdit();
  const fallbackTitle = scope === "home" ? "Chamas em Evidência" : "Tesouros deste Universo";
  const [settings, saveSettings] = useSiteContent<Curation>("store-curation-" + scope, {
    title: fallbackTitle, configured: false, featured: [],
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Curation>(settings);
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [dragPreview, setDragPreview] = useState<{ scope: string; ids: string[] } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ scope: string; pointerId: number; id: string; original: string[]; ids: string[] } | null>(null);
  const canReorder = isAdmin && editMode && !showFavorites && !searching && !editing && !saving && quickSaving === null;
  const productMap = new Map(products.map(product => [product.id, product]));
  const edited = settings.featured.filter(item => productMap.has(item.id));
  // With no curation configured yet, keep every previously published product visible.
  // Search/favorites always show matching products even if not in the curated selection.
  const baseVisible = searching || showFavorites || !settings.configured
    ? products.map(product => ({ product, size: edited.find(item => item.id === product.id)?.size ?? "normal" as DisplaySize }))
    : edited.map(item => ({ product: productMap.get(item.id)!, size: item.size }));
  const previewIds = dragPreview?.scope === scope ? dragPreview.ids : null;
  const visible = previewIds
    ? [...baseVisible].sort((a, b) => previewIds.indexOf(a.product.id) - previewIds.indexOf(b.product.id))
    : baseVisible;
  const searchResults = products.filter(p => p.name.toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR")));
  const badgeText = (badge: string | null | undefined) =>
    badge === "limited" ? "Edição limitada" : badge === "bestseller" ? "Mais vendido" : badge ? "Novidade" : "";

  function begin() {
    setDraft({
      title: settings.title || fallbackTitle,
      configured: true,
      featured: settings.configured
        ? [...settings.featured]
        : products.map(p => ({ id: p.id, size: "normal" })),
    });
    setEditing(true);
    setFilter("");
  }
  function toggle(id: string) {
    setDraft(previous => ({
      ...previous,
      featured: previous.featured.some(item => item.id === id)
        ? previous.featured.filter(item => item.id !== id)
        : [...previous.featured, { id, size: "normal" }],
    }));
  }
  function updateSize(id: string, size: DisplaySize) {
    setDraft(previous => ({
      ...previous, featured: previous.featured.map(item => item.id === id ? { ...item, size } : item),
    }));
  }
  function move(id: string, direction: -1 | 1) {
    setDraft(previous => {
      const copy = [...previous.featured];
      const index = copy.findIndex(item => item.id === id);
      const to = index + direction;
      if (index < 0 || to < 0 || to >= copy.length) return previous;
      [copy[index], copy[to]] = [copy[to]!, copy[index]!];
      return { ...previous, featured: copy };
    });
  }
  async function persistOrder(orderedIds: string[]) {
    setQuickSaving("order");
    try {
      const featured = settings.configured
        ? [...settings.featured]
        : products.map(product => ({ id: product.id, size: "normal" as DisplaySize }));
      await saveSettings({
        ...settings, title: settings.title || fallbackTitle,
        configured: true, featured: reorderPublishedProducts(featured, orderedIds),
      });
      toast.success("Nova ordem das velas salva.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar a ordem das velas.");
    } finally {
      setDragPreview(null);
      setQuickSaving(null);
    }
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (!canReorder || (event.pointerType === "mouse" && event.button !== 0)) return;
    const ids = visible.map(item => item.product.id);
    dragRef.current = { scope, pointerId: event.pointerId, id, original: ids, ids };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingId(id);
    setDragPreview({ scope, ids });
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.scope !== scope || event.pointerId !== drag.pointerId) return;
    const target = document.elementFromPoint?.(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-curation-product-id]");
    const targetId = target?.dataset.curationProductId;
    if (!targetId || !drag.ids.includes(targetId)) return;
    const next = moveId(drag.ids, drag.id, targetId);
    if (next === drag.ids) return;
    drag.ids = next;
    setDragPreview({ scope, ids: next });
  }

  function finishDrag(event: React.PointerEvent<HTMLButtonElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.scope !== scope || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    if (cancelled || drag.ids.every((id, index) => id === drag.original[index])) {
      setDragPreview(null);
      return;
    }
    void persistOrder(drag.ids);
  }

  function reorderWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, id: string) {
    if (!canReorder || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const ids = visible.map(item => item.product.id);
    const index = ids.indexOf(id);
    const direction = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
    const destination = ids[index + direction];
    if (index >= 0 && destination) void persistOrder(moveId(ids, id, destination));
  }

  async function changeCardSize(id: string, size: DisplaySize) {
    if (quickSaving) return;
    setQuickSaving(id);
    try {
      const featured = settings.configured
        ? [...settings.featured]
        : products.map(product => ({ id: product.id, size: "normal" as DisplaySize }));
      const updated = featured.some(item => item.id === id)
        ? featured.map(item => item.id === id ? { ...item, size } : item)
        : [...featured, { id, size }];
      await saveSettings({ ...settings, title: settings.title || fallbackTitle,
        configured: true, featured: updated });
      toast.success(size === "large"
        ? "Vela ampliada na vitrine."
        : "Vela ajustada para a fileira de duas.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível alterar o tamanho.");
    } finally {
      setQuickSaving(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await saveSettings({ ...draft, title: draft.title.trim() || fallbackTitle, configured: true });
      setEditing(false);
      toast.success("Vitrine do Acervo atualizada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar os destaques.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10 min-w-0" aria-label={settings.title || fallbackTitle}>
      {!showFavorites && !searching && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Uma seleção para você</p>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">{settings.title || fallbackTitle}</h2>
          </div>
          {isAdmin && editMode && (
            <button type="button" onClick={begin}
              className="rounded border border-primary/40 px-3 py-2 text-xs text-primary">
              Personalizar destaques
            </button>
          )}
        </div>
      )}
      {isAdmin && editMode && editing && (
        <div className="mb-8 rounded-xl border border-primary/40 bg-card p-4" aria-label="Editar vitrine de produtos">
          <h3 className="font-display text-xl text-foreground">Organizar chamas em evidência</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha as velas que aparecem nesta seção, organize a ordem e decida quais ficam maiores.
            Você também pode mudar o tamanho diretamente em cada vela da vitrine quando o modo Editar site estiver ligado.
          </p>
          <label className="mt-4 block text-sm text-foreground">Nome da seção
            <input value={draft.title} onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2" />
          </label>
          <label className="mt-3 block text-sm text-foreground">Pesquisar produto cadastrado
            <input type="search" value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Buscar vela pelo nome..." className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2" />
          </label>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {searchResults.map(product => {
              const selected = draft.featured.find(item => item.id === product.id);
              const index = draft.featured.findIndex(item => item.id === product.id);
              return <div key={product.id} className="flex min-w-0 flex-wrap items-center gap-2 border-b border-primary/15 py-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!selected} onChange={() => toggle(product.id)} />
                  {product.images?.[0] && <img src={product.images[0]} className="h-10 w-10 shrink-0 object-contain" alt="" />}
                  <span className="min-w-0 break-words">{product.name}</span>
                </label>
                {selected && <>
                  <select value={selected.size} onChange={e => updateSize(product.id, e.target.value as DisplaySize)}
                    aria-label={"Tamanho na vitrine: " + product.name}
                    className="max-w-32 rounded border border-primary/30 bg-background px-2 py-2 text-xs text-foreground">
                    <option value="normal">2 por fileira</option>
                    <option value="large">Grande</option>
                  </select>
                  <button type="button" disabled={index === 0} onClick={() => move(product.id, -1)}
                    className="px-2 text-primary disabled:opacity-30" aria-label={"Mover " + product.name + " para cima"}>↑</button>
                  <button type="button" disabled={index === draft.featured.length - 1} onClick={() => move(product.id, 1)}
                    className="px-2 text-primary disabled:opacity-30" aria-label={"Mover " + product.name + " para baixo"}>↓</button>
                </>}
              </div>;
            })}
            {searchResults.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{draft.featured.length} produto(s) selecionado(s) nesta vitrine.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void save()} disabled={saving}
              className="btn-gold disabled:opacity-50">{saving ? "Salvando..." : "Salvar vitrine"}</button>
            <button type="button" disabled={saving} onClick={() => setEditing(false)}
              className="rounded border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </div>
      )}
      {isAdmin && editMode && !showFavorites && !searching && !editing && (
        <p className="mb-4 text-xs text-muted-foreground">
          Segure o controle de uma vela e arraste até a posição desejada.
          A ordem é salva ao soltar. As setas do teclado também funcionam.
        </p>
      )}
      {visible.length === 0 ? <p className="py-8 text-center font-display italic text-muted-foreground">
        {settings.configured ? "Nenhuma chama selecionada para esta vitrine." : "Novas chamas chegarão em breve."}
      </p> : (
        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 md:gap-x-7" data-testid="curated-product-grid">
          {visible.map(({ product: p, size }) => {
            const isLarge = size === "large" && !searching && !showFavorites;
            const badge = (p as Product & { product_badge?: string | null }).product_badge;
            const pricePreview = visiblePrice({
              id: p.id, category_id: p.category_id,
              price: Number(p.price), sale_price: p.sale_price === null ? null : Number(p.sale_price),
            }, automaticPromotions, promotionCategories);
            const temporary = categories.some(cat => cat.id === p.category_id &&
              (cat.is_temporary || categories.some(parent => parent.id === cat.parent_id && parent.is_temporary)));
            return <div key={p.id} data-product-size={size} data-curation-product-id={p.id}
              className={"relative min-w-0 " + (isLarge ? "col-span-2 flex flex-col items-center" : "") +
                (draggingId === p.id ? " rounded-lg outline outline-2 outline-offset-2 outline-primary" : "")}>
              <Link to="/produto/$slug" params={{ slug: p.slug }}
              className={"hiraeth-product-card group relative block min-w-0 bg-transparent text-center transition-transform duration-300 " +
                (isLarge ? "hiraeth-featured-flame mx-auto w-[88%] max-w-lg" : "")}
              data-product-badge={badge ?? undefined}>
              <div className={"hiraeth-product-visual relative overflow-hidden bg-transparent " +
                (isLarge ? "aspect-[4/5] sm:aspect-square" : "aspect-square")}>
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name}
                    className="hiraeth-product-image h-full w-full object-contain p-1 transition-transform duration-700 group-hover:scale-[1.06] sm:p-3"
                    loading="lazy" />
                ) : <div className="flex h-full items-center justify-center text-xs italic text-muted-foreground">Foto em breve</div>}
                <button type="button" onClick={e => onWishlist(p.id, e)}
                  aria-label={wishlistIds.has(p.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  aria-pressed={wishlistIds.has(p.id)}
                  className="absolute right-0.5 top-0.5 z-10 rounded-full bg-[#f5efe5]/90 p-1 text-[#68764f] shadow-sm sm:right-3 sm:top-3 sm:p-2">
                  <Heart size={isLarge ? 20 : 14} strokeWidth={1.8}
                    fill={wishlistIds.has(p.id) ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="px-0.5 pb-2 pt-2 sm:px-2 sm:pt-3">
                {badge && <div className="mb-2 flex justify-center">
                  <span className={"hiraeth-product-badge inline-flex max-w-full items-center justify-center rounded-full px-2.5 py-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:px-3 sm:text-[10px] " +
                    (badge === "limited" ? "hiraeth-product-badge--limited" : "bg-[#65744d] text-[#f7efda]")}>{badgeText(badge)}</span>
                </div>}
                {temporary && <p className="mb-1 text-[9px] text-primary">Edição temporária</p>}
                <InlineEditor label={"produto " + p.name}
                  fields={[
                    { name: "name", label: "Nome", type: "text" },
                    { name: "description", label: "Descrição", type: "textarea" },
                    { name: "price", label: "Preço", type: "text" },
                    { name: "sale_price", label: "Preço promocional", type: "text" },
                    { name: "fragrance", label: "Fragrância", type: "text" },
                    { name: "images", label: "Imagens do produto", type: "images" },
                  ]}
                  values={{ name: p.name, description: p.description ?? "", price: String(p.price),
                    sale_price: p.sale_price == null ? "" : String(p.sale_price), fragrance: p.fragrance ?? "",
                    images: p.images ?? [] }}
                  onSave={values => onSaveProduct(p, values)} />
                <h3 className={"font-display break-words font-medium leading-snug text-foreground " +
                  (isLarge ? "text-xl sm:text-3xl" : "text-sm sm:text-lg")}>{p.name}</h3>
                <div className={"mt-1 flex flex-wrap items-baseline justify-center gap-1 text-primary " + (isLarge ? "text-xl" : "text-sm sm:text-base")}>
                  {pricePreview.hasDiscount && <span aria-label={"Valor original " + brl(pricePreview.original)}
                    className="text-[10px] text-muted-foreground line-through sm:text-sm">{brl(pricePreview.original)}</span>}
                  <span className={pricePreview.hasDiscount ? "font-semibold text-[#68763c] dark:text-[#d9ca9e]" : ""}>
                    {brl(pricePreview.current)}
                  </span>
                </div>
              </div>
              </Link>
              {isAdmin && editMode && !showFavorites && !searching && (
                <div role="group" aria-label={"Organizar vela " + p.name}
                  className={"mt-1 flex flex-wrap items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-card/90 p-1.5 " + (isLarge ? "mx-auto w-[88%] max-w-lg" : "")}>
                  <button type="button" disabled={quickSaving !== null || saving}
                    onClick={() => void changeCardSize(p.id, "normal")}
                    aria-label={"Exibir " + p.name + " em fileira de duas"}
                    aria-pressed={!isLarge}
                    className={"rounded px-2 py-1.5 text-[10px] sm:text-xs " +
                      (!isLarge ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary")}>
                    2 por fileira
                  </button>
                  <button type="button" disabled={quickSaving !== null || saving}
                    onClick={() => void changeCardSize(p.id, "large")}
                    aria-label={"Exibir " + p.name + " grande"}
                    aria-pressed={isLarge}
                    className={"rounded px-2 py-1.5 text-[10px] sm:text-xs " +
                      (isLarge ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary")}>
                    Grande
                  </button>
                  <button type="button" disabled={!canReorder}
                    aria-label={"Segure e arraste " + p.name + " para reorganizar"}
                    title="Segure e arraste; setas do teclado também funcionam"
                    onPointerDown={event => startDrag(event, p.id)}
                    onPointerMove={moveDrag}
                    onPointerUp={event => finishDrag(event)}
                    onPointerCancel={event => finishDrag(event, true)}
                    onKeyDown={event => reorderWithKeyboard(event, p.id)}
                    className="inline-flex min-h-9 min-w-9 touch-none select-none items-center justify-center rounded border border-primary/30 bg-background text-primary disabled:opacity-40"
                  ><GripVertical size={17} aria-hidden="true" /></button>
                </div>
              )}
            </div>;
          })}
        </div>
      )}
    </section>
  );
}
