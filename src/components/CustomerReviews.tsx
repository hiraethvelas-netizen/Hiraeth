import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";

type Review = { id: string; rating: number; message: string; created_at: string; order_id: string };
type EligibleOrder = { id: string; created_at: string; status: string };

export function CustomerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<EligibleOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    const [{ data: publicReviews }, { data: authData }] = await Promise.all([
      (supabase as any).from("customer_reviews").select("id,rating,message,created_at,order_id").eq("approved", true).order("created_at", { ascending: false }).limit(12),
      supabase.auth.getUser(),
    ]);
    setReviews((publicReviews ?? []) as Review[]);
    const user = authData.user;
    setUserId(user?.id ?? null);
    if (user) {
      const { data: eligible } = await (supabase as any).from("orders").select("id,created_at,status").eq("user_id", user.id).in("status", ["delivered", "completed", "entregue", "concluido", "concluído"]).in("payment_status", ["paid", "approved", "succeeded"]).order("created_at", { ascending: false });
      const { data: existing } = await (supabase as any).from("customer_reviews").select("order_id").eq("user_id", user.id);
      const reviewed = new Set((existing ?? []).map((item: { order_id: string }) => item.order_id));
      const available = ((eligible ?? []) as EligibleOrder[]).filter((order) => !reviewed.has(order.id));
      setOrders(available);
      setSelectedOrder((current) => current || available[0]?.id || "");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!userId || !selectedOrder || message.trim().length < 3) return;
    setSending(true);
    setNotice("");
    const { error } = await (supabase as any).from("customer_reviews").insert({ order_id: selectedOrder, user_id: userId, rating, message: message.trim(), approved: false });
    setSending(false);
    if (error) {
      setNotice(error.code === "23505" ? "Este pedido já tem uma avaliação." : "Não foi possível enviar. Confira se o pedido foi entregue e pago e tente novamente.");
      return;
    }
    setMessage("");
    setOrders((current) => current.filter((order) => order.id !== selectedOrder));
    setSelectedOrder("");
    setNotice("Sua avaliação foi recebida e aparecerá no Acervo depois da revisão. Obrigada por compartilhar sua experiência!");
  }

  return <section className="border-y border-primary/20 bg-card/50 px-5 py-12 md:px-8 md:py-16">
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Experiências reais</p><h2 className="mt-2 text-3xl text-foreground md:text-4xl">Relatos do Acervo</h2><p className="mt-3 text-muted-foreground">Cada pedido guarda uma história. Conte pra gente como foi receber a sua.</p></div>
      {loading ? <p className="mt-8 text-center text-sm text-muted-foreground">Carregando relatos...</p> : reviews.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => <article key={review.id} className="border border-primary/20 bg-background/70 p-5">
          <div className="flex gap-1" aria-label={`Avaliação de ${review.rating} de 5 foguinhos`}>{[1,2,3,4,5].map((flame) => <Flame key={flame} size={17} className={flame <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"} />)}</div>
          <p className="mt-3 whitespace-pre-wrap text-foreground/90">“{review.message}”</p>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-primary">Compra verificada</p>
        </article>)}
      </div> : <p className="mt-8 text-center text-sm text-muted-foreground">As primeiras histórias do Acervo aparecerão aqui em breve.</p>}
      <div className="mx-auto mt-10 max-w-xl border border-primary/25 bg-background p-5 sm:p-6">
        <h3 className="font-display text-2xl text-foreground">Deixe seu recadinho</h3>
        <p className="mt-1 text-sm text-muted-foreground">Avaliações são vinculadas a pedidos pagos e entregues e passam por revisão antes de serem publicadas.</p>
        {!userId ? <p className="mt-4 text-sm">Entre na sua conta para avaliar um pedido entregue. <Link to="/auth" search={{ redirect: "/loja" }} className="text-primary underline underline-offset-4">Entrar</Link></p> : orders.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Quando você tiver um pedido pago e entregue que ainda não avaliou, poderá deixar seu relato aqui.</p> : <form onSubmit={submitReview} className="mt-4 space-y-4">
          <label className="block text-sm">Pedido para avaliar<select required value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} className="mt-1 w-full border bg-transparent px-3 py-2 text-foreground">{orders.map((order) => <option key={order.id} value={order.id}>Pedido de {new Date(order.created_at).toLocaleDateString("pt-BR")} · {order.id.slice(0, 8).toUpperCase()}</option>)}</select></label>
          <fieldset><legend className="text-sm">Quantos foguinhos merece sua experiência?</legend><div className="mt-2 flex gap-3">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} foguinhos`} aria-pressed={rating === value} className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-primary"><Flame size={28} className={value <= rating ? "fill-primary text-primary" : "text-muted-foreground/35"} /></button>)}</div></fieldset>
          <label className="block text-sm">Seu recadinho<textarea required minLength={3} maxLength={1200} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Como foi receber seu pedido Hiraeth?" className="mt-1 w-full border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground" /></label>
          <button disabled={sending || !selectedOrder} type="submit" className="btn-gold disabled:opacity-50">{sending ? "Enviando..." : "Enviar avaliação"}</button>
        </form>}
        {notice && <p role="status" className="mt-3 text-sm text-primary">{notice}</p>}
      </div>
    </div>
  </section>;
}
