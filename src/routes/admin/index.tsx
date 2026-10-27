import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin Hiraeth" }] }),
  component: AdminDashboard,
});

type Order = { id: string; total: number; status: string; customer_name: string | null; customer_email: string | null; created_at: string };
type ProductStock = { id: string; name: string; stock: number; status: string; price: number; sale_price: number | null };

function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, published: 0, orders: 0, pending: 0, paid: 0, revenue: 0, portals: 0, subscribers: 0, lowStock: 0, outOfStock: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowProducts, setLowProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<"week" | "month" | "all" | "custom">("month");
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA"); });
  const [dateTo, setDateTo] = useState(() => new Date().toLocaleDateString("en-CA"));

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    const [prods, orders, portals, subs] = await Promise.all([
      supabase.from("products").select("id,name,stock,status,price,sale_price"),
      supabase.from("orders").select("id,total,status,customer_name,customer_email,created_at").order("created_at", { ascending: false }),
      supabase.from("portals").select("id", { count: "exact", head: true }),
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
    ]);
    if (prods.error || orders.error || portals.error || subs.error) { setError(true); setLoading(false); return; }
    const ps = (prods.data ?? []) as ProductStock[];
    const os = (orders.data ?? []) as Order[];
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;
    if (period === "week") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const day = (from.getDay() + 6) % 7;
      from.setDate(from.getDate() - day);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (period === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (period === "custom") {
      from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    }
    const filteredOrders = os.filter((o) => {
      const created = new Date(o.created_at);
      return (!from || created >= from) && (!to || created <= to);
    });
    const paidOrders = filteredOrders.filter((o) => ["paid", "shipped", "delivered", "completed"].includes(o.status));
    setStats({
      products: ps.length, published: ps.filter((p) => p.status === "published").length,
      orders: filteredOrders.length, pending: filteredOrders.filter((o) => ["pending", "awaiting_payment"].includes(o.status)).length,
      paid: paidOrders.length, revenue: paidOrders.reduce((s, o) => s + Number(o.total), 0),
      portals: portals.count ?? 0, subscribers: subs.count ?? 0,
      lowStock: ps.filter((p) => p.stock > 0 && p.stock <= 5).length,
      outOfStock: ps.filter((p) => p.stock <= 0).length,
    });
    setRecentOrders(filteredOrders.slice(0, 6));
    setLowProducts(ps.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 6));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const cards = [
    { label: "Produtos cadastrados", value: String(stats.products), detail: `${stats.published} publicados`, to: "/admin/produtos" },
    { label: "Pedidos recebidos", value: String(stats.orders), detail: `${stats.pending} aguardando pagamento`, to: "/admin/pedidos" },
    { label: "Pedidos pagos", value: String(stats.paid), detail: "Inclui pedidos em preparação e entregues", to: "/admin/pedidos" },
    { label: "Receita dos pedidos pagos", value: brl(stats.revenue), detail: "No período selecionado", to: "/admin/pedidos" },
    { label: "Portais NFC", value: String(stats.portals), detail: "Universos cadastrados", to: "/admin/portais" },
    { label: "Newsletter", value: String(stats.subscribers), detail: "Pessoas inscritas", to: "/admin" },
  ] as const;

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-primary">Visão geral da loja</p><h1 className="mt-2 text-4xl text-foreground">Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Acompanhe vendas, catálogo e tarefas que precisam de atenção.</p></div><button onClick={() => void load()} className="border px-4 py-2 text-sm text-foreground hover:border-primary">Atualizar dados ↻</button></div>
    <section className="mt-5 border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="dashboard-period" className="text-sm text-foreground">Filtrar indicadores por data</label>
        <select id="dashboard-period" value={period} onChange={(e) => setPeriod(e.target.value as "week" | "month" | "all" | "custom")} className="min-w-44 border bg-background px-3 py-2 text-sm text-foreground">
          <option value="week">Esta semana</option>
          <option value="month">Este mês</option>
          <option value="all">Todo o período</option>
          <option value="custom">Personalizar datas</option>
        </select>
        {period === "custom" && <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">De <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="ml-1 border bg-background px-2 py-2 text-sm text-foreground" /></label>
          <label className="text-xs text-muted-foreground">Até <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="ml-1 border bg-background px-2 py-2 text-sm text-foreground" /></label>
        </div>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">O filtro altera a quantidade de pedidos, pedidos pagos e receita. Produtos, estoque, portais e newsletter continuam mostrando os totais atuais.</p>
    </section>
    {loading ? <p className="mt-8 text-muted-foreground">Carregando indicadores...</p> : error ? <div className="mt-8 border bg-card p-5"><p className="text-foreground">Não foi possível carregar todos os indicadores.</p><button onClick={() => void load()} className="btn-gold mt-3">Tentar novamente</button></div> : <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((c) => <Link key={c.label} to={c.to} className="group border bg-card p-5 transition-all hover:border-primary hover:shadow-[var(--glow)]"><p className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</p><p className="mt-3 text-3xl text-primary">{c.value}</p><p className="mt-2 text-xs text-muted-foreground">{c.detail}</p><p className="mt-4 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">Abrir seção →</p></Link>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="border bg-card p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl text-foreground">Estoque que precisa de atenção</h2><p className="mt-1 text-xs text-muted-foreground">Produtos com 5 unidades ou menos</p></div><Link to="/admin/produtos" className="text-sm text-primary">Ver produtos →</Link></div>
          <div className="mt-4 space-y-3">{lowProducts.length ? lowProducts.map((p) => <div key={p.id} className="flex items-center justify-between gap-4 border-b pb-3"><span className="text-sm text-foreground">{p.name}</span><span className={p.stock === 0 ? "text-sm font-semibold text-destructive" : "text-sm text-primary"}>{p.stock === 0 ? "Esgotado" : `${p.stock} un.`}</span></div>) : <p className="text-sm text-muted-foreground">Nenhum produto com estoque baixo.</p>}</div>
          <div className="mt-4 flex gap-4 text-xs"><span className="text-destructive">{stats.outOfStock} esgotados</span><span className="text-primary">{stats.lowStock} com estoque baixo</span></div>
        </section>
        <section className="border bg-card p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl text-foreground">Pedidos recentes</h2><p className="mt-1 text-xs text-muted-foreground">Últimos pedidos recebidos</p></div><Link to="/admin/pedidos" className="text-sm text-primary">Ver todos →</Link></div>
          <div className="mt-4 space-y-3">{recentOrders.length ? recentOrders.map((o) => <div key={o.id} className="flex items-center justify-between gap-4 border-b pb-3"><div className="min-w-0"><p className="truncate text-sm text-foreground">{o.customer_name || o.customer_email || `Pedido #${o.id.slice(0, 8)}`}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.status}</p></div><span className="whitespace-nowrap text-sm text-primary">{brl(Number(o.total))}</span></div>) : <p className="text-sm text-muted-foreground">Ainda não há pedidos cadastrados.</p>}</div>
        </section>
      </div>
    </>}
  </div>;
}
