import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin Hiraeth" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, pending: 0, revenue: 0, portals: 0, subscribers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [prods, orders, portals, subs] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status"),
        supabase.from("portals").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      ]);
      const rows = orders.data ?? [];
      setStats({
        products: prods.count ?? 0,
        orders: rows.length,
        pending: rows.filter((o) => o.status === "pending").length,
        revenue: rows.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.total), 0),
        portals: portals.count ?? 0,
        subscribers: subs.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: "Produtos", value: String(stats.products), to: "/admin/produtos" },
    { label: "Pedidos", value: String(stats.orders), to: "/admin/pedidos" },
    { label: "Aguardando pagamento", value: String(stats.pending), to: "/admin/pedidos" },
    { label: "Receita confirmada", value: brl(stats.revenue), to: "/admin/financeiro" },
    { label: "Portais NFC", value: String(stats.portals), to: "/admin/portais" },
    { label: "Assinantes da newsletter", value: String(stats.subscribers), to: "/admin" },
  ] as const;

  return (
    <div>
      <h1 className="text-4xl text-foreground">Dashboard</h1>
      {loading ? (
        <p className="mt-8 text-muted-foreground">Carregando...</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} to={c.to} className="border bg-card p-6 transition-shadow hover:shadow-[var(--glow)]">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <p className="mt-2 text-3xl text-primary">{c.value}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
