import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  MAX_PORTAL_PRODUCTS,
  portalProductsKey,
  portalProductSelection,
  setPortalProductSelected,
  type PortalProductSelection,
} from "@/lib/portal-products";

type Product = Pick<Tables<"products">, "id" | "name" | "status" | "product_type">;
type PortalChoice = Pick<Tables<"portals">, "id" | "name"> & {
  selection: PortalProductSelection;
};

/** Independent selection for saved products; never changes the product itself. */
export function PortalProductPicker({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<PortalChoice[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<
    Record<string, { name: string; status: string } | null>
  >({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const request = useRef(0);
  const cancelRequest = useCallback(() => {
    request.current++;
  }, []);

  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from("portals")
        .select("id,name")
        .eq("status", "published")
        .order("name");
      if (error) throw error;
      const portals = data ?? [];
      const result = portals.length
        ? await supabase
            .from("site_content")
            .select("key,value")
            .in(
              "key",
              portals.map((portal) => portalProductsKey(portal.id)),
            )
        : { data: [], error: null };
      if (result.error) throw result.error;
      const ids = [
        ...new Set(
          (result.data ?? []).flatMap((row) => portalProductSelection(row.value).productIds),
        ),
      ];
      const selectedRows = ids.length
        ? await supabase.from("products").select("id,name,status").in("id", ids)
        : { data: [], error: null };
      if (selectedRows.error) throw selectedRows.error;
      if (version !== request.current) return;
      setSelectedProducts(
        Object.fromEntries(
          ids.map((id) => {
            const item = selectedRows.data?.find((row) => row.id === id);
            return [id, item ? { name: item.name, status: item.status } : null];
          }),
        ),
      );
      setChoices(
        portals.map((portal) => ({
          ...portal,
          selection: portalProductSelection(
            result.data?.find((row) => row.key === portalProductsKey(portal.id))?.value,
          ),
        })),
      );
    } catch {
      if (version === request.current) setLoadError(true);
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
    if (open) {
      setSaveError(null);
      void load();
    }
    return cancelRequest;
  }, [open, load, cancelRequest]);

  async function toggle(portal: PortalChoice, selected: boolean, productId = product.id) {
    if (saving) return;
    setSaving(portal.id);
    setSaveError(null);
    try {
      const selection = await setPortalProductSelected(portal.id, productId, selected);
      // A reload opened while this save was pending may contain the old selection.
      // Reconcile locally and invalidate that response, including its loading state.
      request.current++;
      setLoading(false);
      setLoadError(false);
      setChoices((current) =>
        current.map((choice) => (choice.id === portal.id ? { ...choice, selection } : choice)),
      );
      if (selected && productId === product.id) {
        setSelectedProducts((current) => ({
          ...current,
          [product.id]: { name: product.name, status: product.status },
        }));
      }
      toast.success(selected ? "Vela adicionada ao portal NFC." : "Vela retirada do portal NFC.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar a seleção.");
    } finally {
      setSaving(null);
    }
  }

  const canAdd = product.status === "published" && product.product_type !== "artifact";
  function close() {
    dialogRef.current?.close();
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Colocar ${product.name} no portal NFC`}
        className="ml-3 rounded border border-primary/40 px-2 py-1 text-xs text-primary hover:bg-primary/10"
      >
        Colocar no portal NFC
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-label={`Portais NFC de ${product.name}`}
            onCancel={(event) => {
              event.preventDefault();
              close();
            }}
            className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-primary/40 bg-background p-5 text-left text-foreground shadow-xl backdrop:bg-black/65"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">Colocar no portal NFC</h2>
                <p className="mt-2 text-sm text-muted-foreground">{product.name}</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar seleção de portais"
                className="rounded p-2 text-foreground hover:bg-primary/10"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Escolha os portais em que esta vela aparecerá. Até cinco velas por portal, com a foto
              e o link da loja.
            </p>
            {!canAdd && (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                {product.product_type === "artifact"
                  ? "Esta seleção é destinada às velas. Você pode retirar uma seleção existente."
                  : "Publique esta vela na loja antes de adicioná-la ao portal. Você pode retirar uma seleção existente."}
              </p>
            )}
            {loading ? (
              <p role="status" className="mt-6 text-sm">
                Carregando portais...
              </p>
            ) : loadError ? (
              <div className="mt-6">
                <p role="alert" className="text-sm text-destructive">
                  Não foi possível carregar os portais.
                </p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 rounded border px-3 py-2 text-sm text-primary"
                >
                  Tentar carregar portais novamente
                </button>
              </div>
            ) : choices.length ? (
              <div className="mt-6 space-y-3">
                {choices.map((portal) => {
                  const selected = portal.selection.productIds.includes(product.id);
                  const full = portal.selection.productIds.length >= MAX_PORTAL_PRODUCTS;
                  return (
                    <div key={portal.id} className="rounded border border-primary/25 p-3">
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={Boolean(saving) || (!selected && (!canAdd || full))}
                          onChange={(event) => void toggle(portal, event.target.checked)}
                          className="h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1 break-words">{portal.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {portal.selection.productIds.length}/{MAX_PORTAL_PRODUCTS}
                        </span>
                      </label>
                      {full && !selected && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Este portal já tem cinco velas. Retire uma escolha antes de adicionar
                          outra.
                        </p>
                      )}
                      {portal.selection.productIds.length > 0 && (
                        <ul className="mt-3 space-y-2 border-t border-primary/15 pt-3">
                          {portal.selection.productIds.map((id, index) => {
                            const selectedProduct = selectedProducts[id];
                            const title =
                              selectedProduct?.name ??
                              (selectedProduct === null
                                ? `Produto indisponível (seleção ${index + 1})`
                                : `Produto selecionado (seleção ${index + 1})`);
                            return (
                              <li
                                key={id}
                                className="flex flex-wrap items-center justify-between gap-2 text-xs"
                              >
                                <span className="min-w-0 break-words text-foreground">
                                  {title}
                                  {selectedProduct && selectedProduct.status !== "published" && (
                                    <span className="ml-2 text-muted-foreground">
                                      Não publicado
                                    </span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  disabled={Boolean(saving)}
                                  onClick={() => void toggle(portal, false, id)}
                                  aria-label={`Retirar ${title} do portal ${portal.name}`}
                                  className="rounded border border-primary/30 px-2 py-1 text-primary disabled:opacity-50"
                                >
                                  Retirar seleção
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                Nenhum portal publicado disponível.
              </p>
            )}
            {saving && (
              <p role="status" className="mt-4 text-sm">
                Salvando seleção...
              </p>
            )}
            {saveError && (
              <div className="mt-4">
                <p role="alert" className="text-sm text-destructive">
                  {saveError}
                </p>
                <button
                  type="button"
                  disabled={Boolean(saving)}
                  onClick={() => {
                    setSaveError(null);
                    void load();
                  }}
                  className="mt-3 rounded border px-3 py-2 text-sm text-primary disabled:opacity-50"
                >
                  Atualizar seleção dos portais
                </button>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded border border-primary/40 px-4 py-2 text-sm text-foreground"
              >
                Concluir
              </button>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
