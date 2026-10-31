import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders"> & { order_items: Tables<"order_items">[] };

function variantLabel(details: Tables<"order_items">["variant_details"]) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const value = details as Record<string, unknown>;
  return [
    typeof value["size"] === "string" ? `Tamanho: ${value["size"]}` : "",
    typeof value["house"] === "string" ? `Casa: ${value["house"]}` : "",
  ].filter(Boolean).join(" · ");
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Admin Hiraeth" }] }),
  component: AdminPedidos,
});

function AdminPedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError("Não foi possível carregar os pedidos. Verifique sua conexão e as permissões de administrador.");
      setLoading(false);
      return;
    }
    setLoadError(null);
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar o status. Confira as permissões e tente novamente.");
      return;
    }
    toast.success("Status atualizado.");
    load();
  }

  const filtered = orders.filter((o) => {
    if (filter && o.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.customer_email ?? "").toLowerCase().includes(q) ||
        (o.customer_name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inputCls =
    "border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

  return (
    <div>
      <h1 className="text-4xl text-foreground">Pedidos</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input placeholder="Buscar por nº, e-mail ou nome" value={query} onChange={(e) => setQuery(e.target.value)} className={`flex-1 ${inputCls}`} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-8 text-muted-foreground">Carregando...</p>
      ) : loadError ? (
        <div className="mt-8 border bg-card p-5 text-foreground">
          <p>{loadError}</p>
          <button onClick={load} className="btn-gold mt-3">Tentar novamente</button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <div className="mt-8 space-y-4">
          {filtered.map((o) => (
            <article key={o.id} className="border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-foreground">#{o.id.slice(0, 8)} · {o.customer_name || "Cliente sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{o.customer_email ?? "E-mail não informado"}</p>
                  <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg text-primary">{brl(Number(o.total))}</span>
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className={inputCls}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <ul className="mt-3 text-sm text-foreground/85">
                {o.order_items.map((i) => (
                  <li key={i.id}>
                    {i.quantity}× {i.product_name} — {brl(Number(i.unit_price) * i.quantity)}
                    {variantLabel(i.variant_details) && <p className="text-xs text-muted-foreground">{variantLabel(i.variant_details)}</p>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
