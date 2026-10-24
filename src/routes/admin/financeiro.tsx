import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Admin Hiraeth" }] }),
  component: AdminFinanceiro,
});

function AdminFinanceiro() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = orders.filter((o) => {
    const d = o.created_at.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  const paid = filtered.filter((o) => o.status === "paid");
  const pending = filtered.filter((o) => o.status === "pending");
  const refunded = filtered.filter((o) => o.status === "refunded");
  const gross = paid.reduce((s, o) => s + Number(o.total), 0);
  const refundedTotal = refunded.reduce((s, o) => s + Number(o.total), 0);
  const pendingTotal = pending.reduce((s, o) => s + Number(o.total), 0);

  function exportCsv() {
    const header = "data,pedido,cliente,metodo,total,status\n";
    const rows = filtered
      .map((o) =>
        [o.created_at, o.id.slice(0, 8), o.customer_email ?? "", o.payment_method ?? "", Number(o.total).toFixed(2), o.status].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transacoes-hiraeth.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls =
    "border bg-transparent px-3 py-2 text-foreground focus:border-primary focus:outline-none";

  return (
    <div>
      <h1 className="text-4xl text-foreground">Financeiro</h1>

      <section className="mt-6 border bg-card p-6">
        <h2 className="text-2xl text-primary">Central de pagamentos</h2>
        <p className="mt-3 text-foreground/85">
          A integração com o Mercado Pago está preparada na estrutura, mas ainda não está conectada.
          Para ativá-la, será preciso cadastrar as credenciais da sua conta Mercado Pago (access token de teste e de produção)
          no cofre de chaves seguras da plataforma — nunca no código. Me avise quando quiser conectar e eu configuro com você.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Estado da conexão: <span className="text-destructive">não conectado</span> · ambiente de testes
        </p>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl text-primary">Visão geral</h2>
          <div className="flex gap-3 text-sm">
            <label className="text-muted-foreground">
              De <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </label>
            <label className="text-muted-foreground">
              Até <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </label>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-muted-foreground">
            Nenhuma transação no período. Os indicadores aparecerão aqui quando houver vendas reais — sem números fictícios.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Receita bruta (paga)</p>
              <p className="mt-2 text-2xl text-primary">{brl(gross)}</p>
            </div>
            <div className="border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Aguardando pagamento</p>
              <p className="mt-2 text-2xl text-foreground">{brl(pendingTotal)}</p>
              <p className="text-xs text-muted-foreground">{pending.length} pedido(s)</p>
            </div>
            <div className="border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Reembolsado</p>
              <p className="mt-2 text-2xl text-foreground">{brl(refundedTotal)}</p>
            </div>
            <div className="border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Taxas do provedor</p>
              <p className="mt-2 text-2xl text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">Disponível após conectar o Mercado Pago</p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl text-primary">Extrato de transações</h2>
          {filtered.length > 0 && (
            <button onClick={exportCsv} className="border px-4 py-2 text-sm text-muted-foreground hover:text-primary">
              Exportar CSV
            </button>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Pedido</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Método</th>
                  <th className="py-2 pr-4">Valor bruto</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-4">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-2 pr-4">#{o.id.slice(0, 8)}</td>
                    <td className="py-2 pr-4">{o.customer_email ?? "—"}</td>
                    <td className="py-2 pr-4">{o.payment_method ?? "—"}</td>
                    <td className="py-2 pr-4">{brl(Number(o.total))}</td>
                    <td className="py-2">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 border bg-card p-6">
        <h2 className="text-2xl text-primary">Recebimentos e saques</h2>
        <p className="mt-3 text-foreground/85">
          Saldo, repasses e conta bancária são gerenciados diretamente no painel do Mercado Pago.
          Quando a integração estiver conectada, os valores disponíveis e a receber aparecerão aqui automaticamente.
          Nenhum dado bancário sensível fica guardado na loja.
        </p>
      </section>
    </div>
  );
}
