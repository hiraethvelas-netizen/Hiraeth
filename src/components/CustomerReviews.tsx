import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, ImagePlus, Video, X } from "lucide-react";

type Review = { id: string; rating: number; message: string; display_name?: string; created_at: string; media_urls?: string[] };
const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function CustomerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    const [{ data: publicReviews }, { data: authData }] = await Promise.all([
      (supabase as any).from("customer_reviews").select("id,rating,message,display_name,media_urls,created_at").eq("approved", true).order("created_at", { ascending: false }).limit(12),
      supabase.auth.getUser(),
    ]);
    setReviews((publicReviews ?? []) as Review[]);
    setUserId(authData.user?.id ?? null);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || message.trim().length < 3) return;
    setSending(true);
    setNotice("");
    try {
      const mediaUrls: string[] = [];
      for (const file of photos.slice(0, MAX_FILES)) {
        if (!(file.type.startsWith("image/") || file.type.startsWith("video/")) || file.size > MAX_FILE_SIZE) {
          throw new Error("Envie imagens ou vídeos de até 25 MB cada.");
        }
        const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || (file.type.startsWith("video/") ? "mp4" : "jpg");
        const path = `public/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("review-media").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        mediaUrls.push(supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await (supabase as any).from("customer_reviews").insert({
        order_id: null, user_id: userId, display_name: name.trim(), rating,
        message: message.trim(), media_urls: mediaUrls, approved: false,
      });
      if (error) throw error;
      setName(""); setMessage(""); setPhotos([]); setRating(5); setFormOpen(false);
      setNotice("Seu relato foi recebido! Ele aparecerá no Acervo depois da revisão. Obrigada por compartilhar sua experiência!");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível enviar seu relato. Tente novamente.");
    } finally { setSending(false); }
  }

  return <section className="hiraeth-reviews-section border-y border-primary/20 px-5 py-10 md:px-8 md:py-14">
    <div className="mx-auto max-w-6xl">
      <div className="hiraeth-review-invite mx-auto max-w-3xl rounded-2xl border px-6 py-7 text-center sm:px-10">
        <div className="mb-3 flex items-center justify-center gap-2.5" aria-label="Cinco foguinhos em destaque">
          {[1, 2, 3, 4, 5].map((flame) => <Flame key={flame} size={23} aria-hidden="true" className="hiraeth-review-flame is-active" />)}
        </div>
        <p className="eyebrow font-bold">A chama continua acesa</p>
        <h2 className="mt-2 font-body text-3xl font-bold tracking-tight sm:text-4xl">Avaliações dos clientes</h2>
        <p className="mt-2 font-body text-xl font-semibold leading-snug sm:text-2xl">Sua história também faz parte da Hiraeth</p>
        <p className="mx-auto mt-2 max-w-xl font-body text-sm font-semibold leading-relaxed opacity-90">Conte como foi sua experiência com nossos produtos. Seu carinho ajuda nossa chama a continuar acesa.</p>
        <button type="button" onClick={() => { setFormOpen(true); setNotice(""); }} className="hiraeth-review-action mt-5 inline-flex items-center rounded-full border px-6 py-3 font-body text-base font-semibold transition-transform hover:-translate-y-0.5">Compartilhar minha experiência <span className="ml-2" aria-hidden="true">＋</span></button>
      </div>

      {notice && <p role="status" className="mx-auto mt-4 max-w-2xl text-center text-sm text-primary">{notice}</p>}

      {loading ? <p className="mt-8 text-center text-sm font-medium text-muted-foreground">Carregando relatos...</p> : reviews.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => <article key={review.id} className="hiraeth-review-card rounded-xl border p-5">
          <div className="flex gap-1" aria-label={`Avaliação de ${review.rating} de 5 foguinhos`}>{[1,2,3,4,5].map((flame) => <Flame key={flame} size={18} className={flame <= review.rating ? "hiraeth-review-flame is-active" : "hiraeth-review-flame text-muted-foreground/30"} />)}</div>
          <p className="mt-3 whitespace-pre-wrap font-body font-semibold leading-relaxed text-foreground">“{review.message}”</p>
          {review.media_urls?.length ? <div className="mt-4 grid grid-cols-2 gap-2">{review.media_urls.map((url) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? <video key={url} src={url} controls playsInline className="aspect-square w-full rounded object-cover" /> : <img key={url} src={url} alt="Registro compartilhado por cliente da Hiraeth" loading="lazy" className="aspect-square w-full rounded object-cover" />)}</div> : null}
          <p className="mt-4 font-body text-sm font-bold text-primary">{review.display_name || "Cliente Hiraeth"} · <span className="text-[10px] uppercase tracking-widest">Experiência compartilhada</span></p>
        </article>)}
      </div> : <p className="mt-8 text-center text-sm text-muted-foreground">As primeiras histórias do Acervo aparecerão aqui em breve.</p>}

      {formOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="hiraeth-review-title">
        <div className="hiraeth-review-dialog relative my-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl border p-5 shadow-2xl sm:p-8">
          <button type="button" onClick={() => setFormOpen(false)} aria-label="Fechar formulário" className="absolute right-4 top-4 rounded-full p-2 hover:bg-black/5"><X size={20}/></button>
          <p className="hiraeth-review-eyebrow text-xs font-semibold uppercase tracking-[.22em]">Seu relato para o Acervo</p>
          <h3 id="hiraeth-review-title" className="mt-2 font-display text-3xl">Conte sua experiência</h3>
          <p className="mt-1 text-sm font-medium text-current/80">Queremos saber como foi viver um pedacinho da Hiraeth.</p>
          <form onSubmit={submitReview} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Seu nome<input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos te chamar?" className="hiraeth-review-field mt-1 w-full rounded border px-3 py-2.5 placeholder:opacity-60" /></label>
            <fieldset><legend className="text-sm font-medium">Quantos foguinhos merece sua experiência?</legend><div className="mt-2 flex gap-3">{[1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} foguinhos`} aria-pressed={rating === value} className="rounded p-1 transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-[#94753c]"><Flame size={31} className={value <= rating ? "hiraeth-review-flame is-active" : "hiraeth-review-flame text-[#b9ad94]"} /></button>)}</div></fieldset>
            <label className="block text-sm font-medium">O que você achou?<textarea required minLength={3} maxLength={1200} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte sobre o aroma, a embalagem, o momento em que acendeu..." className="hiraeth-review-field mt-1 w-full rounded border px-3 py-2.5 placeholder:opacity-60" /></label>
            <label className="block text-sm font-medium">Fotos e vídeos dos seus produtos <span className="font-normal text-current/75">(opcional, até 5 arquivos de 25 MB)</span><span className="mt-2 flex items-center gap-2 text-xs text-[#625d4c]"><ImagePlus size={15}/> Fotos <Video size={15}/> Vídeos</span><input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, MAX_FILES))} className="hiraeth-review-field mt-2 block w-full rounded border p-2 text-xs file:mr-3 file:rounded-full file:border file:px-3 file:py-2" /></label>
            {photos.length > 0 && <p className="text-xs text-[#625d4c]">{photos.length} arquivo(s) selecionado(s): {photos.map((file) => file.name).join(", ")}</p>}
            <p className="text-xs text-current/70">Os relatos passam por revisão antes de aparecerem publicamente.</p>
            <button disabled={sending} type="submit" className="hiraeth-review-submit inline-flex rounded-full border px-6 py-3 font-display text-lg disabled:opacity-50">{sending ? "Enviando..." : "Enviar minha experiência"}</button>
          </form>
        </div>
      </div>}
    </div>
  </section>;
}
