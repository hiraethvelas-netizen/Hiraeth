import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";

type Review = { id: string; rating: number; message: string; created_at: string; order_id: string | null; photo_urls?: string[] };
type EligibleOrder = { id: string; created_at: string; status: string };

export function CustomerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<EligibleOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
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
      const { data: eligible } = await (supabase as any).from("orders").select("id,created_at,status").eq("user_id", user.id).order("created_at", { ascending: false });
      const { data: existing } = await (supabase as any).from("customer_reviews").select("order_id").eq("user_id", user.id);
      const reviewed = new Set((existing ?? []).map((item: { order_id: string | null }) => item.order_id).filter(Boolean));
      const available = ((eligible ?? []) as EligibleOrder[]).filter((order) => !reviewed.has(order.id));
      setOrders(available);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (message.trim().length < 3) return;
    setSending(true);
    setNotice("");
    try {
      const photoUrls: string[] = [];
      for (const file of photos.slice(0, 4)) {
        if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("Envie apenas imagens de até 8 MB cada.");
        const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
        const path = `${userId ?? "guest"}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("review-photos").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        photoUrls.push(supabase.storage.from("review-photos").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await (supabase as any).from("customer_reviews").insert({ order_id: userId ? (selectedOrder || null) : null, user_id: userId, rating, message: message.trim(), photo_urls: photoUrls, approved: false });
      if (error) throw error;
      setMessage("");
      setPhotos([]);
      if (selectedOrder) setOrders((current) => current.filter((order) => order.id !== selectedOrder));
      setSelectedOrder("");
      setNotice("Seu relato foi recebido! Ele aparecerá no Acervo depois da revisão. Obrigada por compartilhar sua experiência!");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível enviar seu relato. Tente novamente.");
    } finally { setSending(false); }
  }

  return <section className="border-y border-primary/20 bg-card/50 px-5 py-12 md:px-8 md:py-16">
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Experiências reais</p><h2 className="mt-2 text-3xl text-foreground md:text-4xl">Relatos do Acervo</h2><p className="mt-3 text-muted-foreground">Cada pedido guarda uma história. Conte pra gente como foi receber a sua.</p></div>
      {loading ? <p className="mt-8 text-center text-sm text-muted-foreground">Carregando relatos...</p> : reviews.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => <article key={review.id} className="border border-primary/20 bg-background/70 p-5">
          <div className="flex gap-1" aria-label={`Avaliação de ${review.rating} de 5 foguinhos`}>{[1,2,3,4,5].map((flame) => <Flame key={flame} size={17} className={flame <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"} />)}</div>
          <p className="mt-3 whitespace-pre-wrap text-foreground/90">“{review.message}”</p>{review.photo_urls?.length ? <div className="mt-4 grid grid-cols-2 gap-2">{review.photo_urls.map((url) => <img key={url} src={url} alt="Foto compartilhada por cliente da Hiraeth" loading="lazy" className="aspect-square w-full rounded object-cover" />)}</div> : null}
          <p className="mt-4 text-[10px] uppercase tracking-widest text-primary">Compra verificada</p>
        </article>)}
      </div> : <p className="mt-8 text-center text-sm text-muted-foreground">As primeiras histórias do Acervo aparecerão aqui em breve.</p>}
      <div className="mx-auto mt-10 max-w-xl border border-primary/25 bg-background p-5 sm:p-6">
        <h3 className="font-display text-2xl text-foreground">Deixe seu recadinho</h3>
        <p className="mt-1 text-sm text-muted-foreground">Já comprou uma vela Hiraeth, mesmo há bastante tempo? Conte como foi sua experiência e, se quiser, compartilhe fotos. Todos os relatos passam por revisão antes da publicação.</p>
        {!userId ? <form onSubmit={submitReview} className="mt-4 space-y-4">
          {userId && <label className="block text-sm">Pedido (opcional)<select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} className="mt-1 w-full border bg-transparent px-3 py-2 text-foreground"><option value="">Minha compra foi antiga ou não aparece aqui</option>{orders.map((order) => <option key={order.id} value={order.id}>Pedido de {new Date(order.created_at).toLocaleDateString("pt-BR")} · {order.id.slice(0, 8).toUpperCase()}</option>)}</select></label>}
          <fieldset><legend className="text-sm">Quantos foguinhos merece sua experiência?</legend><div className="mt-2 flex gap-3">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} foguinhos`} aria-pressed={rating === value} className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-primary"><Flame size={28} className={value <= rating ? "fill-primary text-primary" : "text-muted-foreground/35"} /></button>)}</div></fieldset>
          <label className="block text-sm">Conte sobre sua experiência<textarea required minLength={3} maxLength={1200} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Como foi sua vela? O aroma, a embalagem, o momento em que acendeu..." className="mt-1 w-full border bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground" /></label>
          <label className="block text-sm">Fotos das suas velas (opcional, até 4 fotos de 8 MB cada)<input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 4)} className="mt-2 block w-full text-sm text-muted-foreground" /></label>{photos.length > 0 && <p className="text-xs text-muted-foreground">{photos.length} foto(s) selecionada(s).</p>}
          <button disabled={sending} type="submit" className="btn-gold disabled:opacity-50">{sending ? "Enviando..." : "Enviar avaliação"}</button>
        </form>}
        {notice && <p role="status" className="mt-3 text-sm text-primary">{notice}</p>}
      </div>
    </div>
  </section>;
}
