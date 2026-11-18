import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Package, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { requireAuthenticatedUser } from "@/lib/require-auth";
import { checkoutRecipientFromMetadata } from "@/lib/checkout-recipient";
import { manualOrderWhatsAppLink, validateManualOrder, type ManualPaymentChoice, type ManualRecipient } from "@/lib/manual-order";

export const Route = createFileRoute("/pedido-whatsapp")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({ meta: [{ title: "Solicitar pedido — Hiraeth" }] }),
  component: ManualOrderPage,
});

const empty: ManualRecipient = {
  name: "", phone: "", postal_code: "", street: "", number: "",
  complement: "", district: "", city: "", state: "",
};

const fields: {key: keyof ManualRecipient; label: string; placeholder: string; inputMode?: "tel" | "numeric"; maxLength?: number}[] = [
  { key:"name", label:"Nome de quem vai receber", placeholder:"Nome completo", maxLength:120 },
  { key:"phone", label:"Telefone com DDD", placeholder:"(47) 99999-9999", inputMode:"tel", maxLength:20 },
  { key:"postal_code", label:"CEP", placeholder:"00000-000", inputMode:"numeric", maxLength:9 },
  { key:"street", label:"Rua / avenida", placeholder:"Nome da rua", maxLength:120 },
  { key:"number", label:"Número", placeholder:"Número ou S/N", maxLength:20 },
  { key:"complement", label:"Complemento (opcional)", placeholder:"Apartamento, bloco, referência", maxLength:100 },
  { key:"district", label:"Bairro", placeholder:"Bairro", maxLength:100 },
  { key:"city", label:"Cidade", placeholder:"Cidade", maxLength:90 },
  { key:"state", label:"UF", placeholder:"SC", maxLength:2 },
];

function ManualOrderPage() {
  const cart = useCart();
  const [recipient, setRecipient] = useState<ManualRecipient>({ ...empty });
  const [payment, setPayment] = useState<ManualPaymentChoice>("pix");
  const [gift, setGift] = useState(false);
  const [packingVideo, setPackingVideo] = useState(false);
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState("");
  const [consent, setConsent] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [user, contact] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("site_profile").select("whatsapp_number").eq("id", true).maybeSingle(),
        ]);
        if (!active) return;
        const source = checkoutRecipientFromMetadata(user.data.user?.user_metadata);
        setRecipient({
          name: source.name, phone: source.phone, postal_code: source.postal_code,
          street: source.street, number: source.number, complement: source.complement,
          district: source.district, city: source.city, state: source.state,
        });
        if (!contact.error) setContactPhone(contact.data?.whatsapp_number ?? "");
        try { setCoupon(sessionStorage.getItem("hiraeth-checkout-coupon") ?? ""); }
        catch { /* O cupom é uma preferência local, não uma autorização de desconto. */ }
      } catch {
        // Os campos continuam disponíveis para preencher manualmente.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function update(key: keyof ManualRecipient, value: string) {
    setRecipient(old => ({ ...old, [key]: key === "state" ? value.toUpperCase() : value }));
  }

  function sendToWhatsApp() {
    if (loading) return;
    if (!consent) {
      toast.error("Confirme que deseja compartilhar os dados preenchidos no WhatsApp da Hiraeth.");
      return;
    }
    const data = { recipient, payment, gift, packingVideo, note, coupon };
    const invalid = validateManualOrder(data, cart.items);
    if (invalid) { toast.error(invalid); return; }
    const href = manualOrderWhatsAppLink(contactPhone, cart.items, data);
    if (!href) {
      toast.error("Não foi possível preparar a mensagem completa. Confira o contato e a quantidade de itens.");
      return;
    }
    // Only a direct click opens WhatsApp. Opening a chat is not proof the
    // shopper sent the message; never create an order or clear the sacola.
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const inputStyle = "mt-1 w-full rounded-lg border border-primary/35 bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

  return <div className="min-h-screen min-w-0 bg-background">
    <SiteHeader />
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-16 sm:px-6">
      <p className="eyebrow">Correio da Fênix</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-5xl">Seu pedido, com cuidado e magia</h1>
      <p className="mt-4 text-sm leading-relaxed text-foreground/85">
        Durante nossa edição especial, a Hiraeth confirma cada pedido pessoalmente pelo WhatsApp.
        Preencha os dados de entrega e envie sua seleção para a Guardiã da Chama.
      </p>
      <div role="status" className="mt-5 rounded-xl border border-primary/30 bg-card p-4 text-sm text-foreground">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> Sem cobrança automática</p>
        <p className="mt-2">O envio do formulário apenas abre uma conversa. Ainda não é um pedido confirmado,
        não reserva estoque e não calcula o frete. Você só receberá as instruções de pagamento depois
        de conferirmos disponibilidade, valores e envio.</p>
      </div>

      {cart.items.length === 0 ? (
        <section className="mt-8 rounded-xl border border-primary/25 bg-card p-5">
          <p className="text-foreground">Sua sacola está vazia.</p>
          <Link to="/loja" className="btn-gold mt-4 inline-flex">Explorar o acervo</Link>
        </section>
      ) : <>
        <section className="mt-8 rounded-xl border border-primary/30 bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-2xl text-foreground"><Package size={20} /> Tesouros escolhidos</h2>
          <ul className="mt-4 divide-y divide-primary/15">
            {cart.items.map(item => (
              <li key={item.productId + ":" + (item.variantKey ?? "")} className="flex justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{item.quantity}× {item.name}</p>
                  {typeof item.variantDetails?.["size"] === "string" && <p className="text-muted-foreground">Tamanho: {item.variantDetails["size"]}</p>}
                  {typeof item.variantDetails?.["house"] === "string" && <p className="text-muted-foreground">Casa: {item.variantDetails["house"]}</p>}
                  {item.variantDetails?.["options"] && typeof item.variantDetails["options"] === "object" &&
                    !Array.isArray(item.variantDetails["options"]) &&
                    Object.entries(item.variantDetails["options"] as Record<string,unknown>)
                      .map(([key,value])=><p key={key} className="text-muted-foreground">{key}: {String(value)}</p>)}
                </div>
                <span className="shrink-0 text-primary">{brl(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-primary/20 pt-3 text-right font-semibold text-primary">
            Valor da sacola: {brl(cart.total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Prévia dos produtos, sem frete. Preços e descontos serão confirmados no atendimento.</p>
          <Link to="/carrinho" className="mt-3 inline-block text-sm text-primary underline underline-offset-2">Editar minha sacola</Link>
        </section>

        <form className="mt-7 space-y-6" onSubmit={event => { event.preventDefault(); sendToWhatsApp(); }}>
          <section className="rounded-xl border border-primary/30 bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-2xl text-foreground"><Truck size={20}/> Dados para entrega</h2>
            <p className="mt-2 text-xs text-muted-foreground">Confirme os dados preenchidos automaticamente antes de compartilhá-los com a Hiraeth.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {fields.map(field => (
                <label key={field.key} className={["street","name"].includes(field.key) ? "sm:col-span-2" : ""}>
                  <span className="text-sm font-medium text-foreground">{field.label}</span>
                  <input className={inputStyle} value={recipient[field.key]}
                    onChange={e => update(field.key,e.target.value)}
                    placeholder={field.placeholder} inputMode={field.inputMode}
                    maxLength={field.maxLength} autoComplete="off"
                    required={field.key !== "complement"} />
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">CPF e dados do cartão não são pedidos neste formulário. Caso necessários para a nota fiscal, serão tratados separadamente.</p>
          </section>

          <section className="rounded-xl border border-primary/30 bg-card p-5">
            <h2 className="font-display text-2xl text-foreground">Como prefere pagar?</h2>
            <p className="mt-2 text-sm text-muted-foreground">A forma de pagamento será combinada após a confirmação do pedido.</p>
            <div className="mt-4 space-y-3">
              {([
                ["pix","Pix — receber QR Code ou chave depois da conferência"],
                ["credito","Cartão de crédito — receber link seguro"],
                ["debito","Cartão de débito — verificar disponibilidade"],
              ] as const).map(([id,label]) => (
                <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-primary/20 p-3 text-sm text-foreground">
                  <input type="radio" name="manualPaymentChoice" checked={payment===id}
                    onChange={()=>setPayment(id)} className="accent-[#878e47]"/>
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Não informe número, validade ou código de segurança de cartão pelo WhatsApp. Para cartão, utilize apenas um link de pagamento de provedor confiável.</p>
          </section>

          <section className="rounded-xl border border-primary/30 bg-card p-5">
            <h2 className="font-display text-2xl text-foreground">Um toque especial</h2>
            <label className="mt-4 flex items-center gap-3 text-sm text-foreground">
              <input type="checkbox" checked={gift} onChange={e=>setGift(e.target.checked)} className="accent-[#878e47]"/>
              É para presente
            </label>
            <label className="mt-3 flex items-center gap-3 text-sm text-foreground">
              <input type="checkbox" checked={packingVideo} onChange={e=>setPackingVideo(e.target.checked)} className="accent-[#878e47]"/>
              Gostaria de solicitar um vídeo da embalagem
            </label>
            <label className="mt-4 block text-sm text-foreground">
              Recado para a Guardiã da Chama (opcional)
              <textarea className={inputStyle} rows={3} maxLength={250} value={note}
                placeholder="Um detalhe sobre seu pedido…" onChange={e=>setNote(e.target.value)}/>
            </label>
            <label className="mt-4 block text-sm text-foreground">
              Cupom que deseja consultar (opcional)
              <input className={inputStyle} maxLength={35} value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())}
                placeholder="Código promocional"/>
            </label>
          </section>

          <section className="rounded-xl border border-primary/35 bg-card p-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground">
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}
                className="mt-1 shrink-0 accent-[#878e47]" required />
              Concordo em compartilhar as velas escolhidas, meu nome, telefone, endereço de entrega e preferências
              com o atendimento da Hiraeth pelo WhatsApp. Entendo que o pedido não será confirmado nem pago automaticamente.
            </label>
            <button type="submit" disabled={loading || !contactPhone || cart.items.length===0}
              className="btn-gold mt-5 flex w-full items-center justify-center gap-2 text-center disabled:cursor-not-allowed disabled:opacity-50">
              <MessageCircle size={19}/> {loading?"Carregando contato…":"Enviar solicitação no WhatsApp"}
            </button>
            {!loading&&!contactPhone&&<p role="alert" className="mt-3 text-sm text-destructive">
              O atendimento está temporariamente indisponível. Consulte o WhatsApp no rodapé da Hiraeth.
            </p>}
            <p className="mt-3 text-xs text-muted-foreground">
              Ao abrir o WhatsApp, confira a mensagem e toque em Enviar. A sacola não é apagada.
              A confirmação e o envio serão combinados pessoalmente.
            </p>
          </section>
        </form>
      </>}
    </main>
    <SiteFooter />
  </div>;
}
