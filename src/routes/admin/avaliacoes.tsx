import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Check, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Review = { id: string; rating: number; message: string; created_at: string; approved: boolean; order_id: string; user_id: string; orders?: { customer_name: string | null; customer_email: string | null; status: string } | null };

export const Route = createFileRoute("/admin/avaliacoes")({
  head: () => ({ meta: [{ title: "Avaliações — Admin Hiraeth" }] }),
  component: AdminReviews,
});

function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).from("customer_reviews").select("id,rating,message,created_at,approved,order_id,user_id,orders(customer_name,customer_email,status)").order("created_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar as avaliações.");
    setReviews((data ?? []) as Review[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setApproval(review: Review, approved: boolean) {
    const { error } = await (supabase as any).from("customer_reviews").update({ approved }).eq("id", review.id);
    if (error) { toast.error("Não foi possível alterar a publicação. Confira as permissões do banco."); return; }
    toast.success(approved ? "Avaliação publicada." : "Avaliação ocultada.");
    setReviews((current) => current.map((item) => item.id === review.id ? { ...item, approved } : item));
  }

  return <div>
    <h1 className="text-4xl text-foreground">Relatos do Acervo</h1>
    <p className="mt-2 text-sm text-muted-foreground">Revise avaliações enviadas por clientes com pedidos pagos e entregues. Somente as aprovadas aparecem publicamente.</p>
    {loading ? <p className="mt-8 text-muted-foreground">Carregando avaliações...</p> : reviews.length === 0 ? <p className="mt-8 border p-6 text-muted-foreground">Nenhuma avaliação recebida ainda.</p> : <div className="mt-6 space-y-4">
      {reviews.map((review) => <article key={review.id} className="border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex gap-1" aria-label={`${review.rating} de 5 foguinhos`}>{[1,2,3,4,5].map((flame) => <Flame key={flame} size={16} className={flame <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"} />)}</div><p className="mt-3 whitespace-pre-wrap">{review.message}</p></div>
          <span className={review.approved ? "border border-primary/40 px-2 py-1 text-xs text-primary" : "border border-amber-600/40 px-2 py-1 text-xs text-amber-700"}>{review.approved ? "Publicada" : "Aguardando revisão"}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
          <span>Pedido {review.order_id.slice(0, 8).toUpperCase()} · {review.orders?.customer_name || review.orders?.customer_email || "Cliente"} · {new Date(review.created_at).toLocaleDateString("pt-BR")}</span>
          {review.approved ? <button onClick={() => void setApproval(review, false)} className="inline-flex items-center gap-2 border px-3 py-2 hover:text-primary"><EyeOff size={15}/> Ocultar</button> : <button onClick={() => void setApproval(review, true)} className="inline-flex items-center gap-2 border border-primary px-3 py-2 text-primary hover:bg-primary/10"><Check size={15}/> Aprovar e publicar</button>}
        </div>
      </article>)}
    </div>}
  </div>;
}
