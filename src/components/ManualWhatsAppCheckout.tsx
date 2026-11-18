import { createElement, useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { checkoutRecipientFromMetadata } from "@/lib/checkout-recipient";
import {
  buildManualOrderWhatsAppLink,
  manualDeliveryIsComplete,
  type ManualOrderDelivery,
  type ManualPaymentPreference,
} from "@/lib/manual-checkout";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { toast } from "sonner";

const blank: ManualOrderDelivery = {
  name: "", phone: "", postal_code: "", street: "", number: "",
  complement: "", district: "", city: "", state: "",
};

const fields: Array<{
  key: keyof ManualOrderDelivery;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}> = [
  { key: "name", label: "Nome completo", autoComplete: "name", required: true },
  { key: "phone", label: "Telefone com DDD", placeholder: "(47) 99999-9999", autoComplete: "tel", required: true },
  { key: "postal_code", label: "CEP", placeholder: "00000-000", autoComplete: "postal-code", required: true },
  { key: "street", label: "Rua / avenida", autoComplete: "address-line1", required: true },
  { key: "number", label: "Número", required: true },
  { key: "complement", label: "Complemento (opcional)", autoComplete: "address-line2" },
  { key: "district", label: "Bairro", required: true },
  { key: "city", label: "Cidade", autoComplete: "address-level2", required: true },
  { key: "state", label: "UF (ex.: SC)", autoComplete: "address-level1", required: true },
];

export function ManualWhatsAppCheckout() {
  const cart = useCart();
  const [delivery, setDelivery] = useState<ManualOrderDelivery>({ ...blank });
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<ManualPaymentPreference>("pix");
  const [isGift, setIsGift] = useState(false);
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [account, profile] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("site_profile").select("whatsapp_number").eq("id", true).maybeSingle(),
        ]);
        if (!active) return;
        if (!account.error && account.data.user) {
          const saved = checkoutRecipientFromMetadata(account.data.user.user_metadata);
          setDelivery({
            name: saved.name,
            phone: saved.phone,
            postal_code: saved.postal_code,
            street: saved.street,
            number: saved.number,
            complement: saved.complement,
            district: saved.district,
            city: saved.city,
            state: saved.state,
          });
        }
        if (!profile.error) setPhone(profile.data?.whatsapp_number ?? "");
      } catch {
        // Keep the form editable and never expose private error details.
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted) {
      toast.error("Confirme que deseja enviar os dados de entrega pelo WhatsApp.");
      return;
    }
    if (!manualDeliveryIsComplete(delivery)) {
      toast.error("Confira nome, telefone, CEP e endereço de entrega.");
      return;
    }
    const url = buildManualOrderWhatsAppLink(phone, cart.items, {
      delivery,
      payment,
      isGift,
      note,
      coupon,
    });
    if (!url) {
      toast.error("Não foi possível abrir o WhatsApp. Confira os dados e o contato da Hiraeth.");
      return;
    }
    // Deliberate user interaction, not an automatic submission. WhatsApp still
    // requires the customer to review and send the prefilled message.
    window.location.assign(url);
  }

  return <div className="min-h-screen min-w-0">
    <SiteHeader />
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <Link to="/carrinho" className="text-sm text-primary underline underline-offset-2">Voltar à sacola</Link>
      <p className="eyebrow mt-8">Correio da Fênix · atendimento personalizado</p>
      <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">Solicitar meu pedido</h1>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
        Durante nossa venda especial, a confirmação do pedido será feita pela Guardiã da Chama no WhatsApp.
        Preencha seus dados de entrega e escolha como prefere pagar. Você receberá a confirmação de estoque,
        valor final, frete e prazo antes de efetuar qualquer pagamento.
      </p>
      <p className="mt-3 rounded-lg border border-primary/30 bg-card px-4 py-3 text-sm text-foreground">
        Este formulário não cobra valores, não reserva estoque e não gera um pedido automático.
        A solicitação só será recebida após você conferir e <strong>enviar a mensagem no WhatsApp</strong>.
      </p>
      {cart.items.length===0
        ? <section className="mt-8 rounded-xl border border-primary/25 p-5">
            <p>Sua sacola está vazia. Escolha as velas antes de solicitar seu pedido.</p>
            <Link to="/loja" className="btn-gold mt-4 inline-flex">Conhecer o acervo</Link>
          </section>
        : <form onSubmit={submit} className="mt-8 space-y-6">
            <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
              <h2 className="font-display text-2xl text-foreground">Suas chamas escolhidas</h2>
              <ul className="mt-4 space-y-3">
                {cart.items.map(item=><li key={item.productId+"-"+(item.variantKey??"default")} className="flex gap-3 border-b border-primary/10 pb-3 last:border-0">
                  {item.image&&<img src={item.image} alt="" className="h-16 w-14 shrink-0 rounded object-cover" />}
                  <div>
                    <p className="font-medium text-foreground">{item.quantity}× {item.name}</p>
                    {typeof item.variantDetails?.["size"]==="string"&&<p className="text-xs text-muted-foreground">Tamanho: {item.variantDetails["size"]}</p>}
                    {typeof item.variantDetails?.["house"]==="string"&&<p className="text-xs text-muted-foreground">Casa: {item.variantDetails["house"]}</p>}
                  </div>
                </li>)}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Preços promocionais, disponibilidade e frete serão conferidos no atendimento antes do pagamento.</p>
            </section>

            <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
              <h2 className="font-display text-2xl text-foreground">Para onde enviamos sua encomenda?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Se você já tem cadastro, seus dados podem aparecer preenchidos. Confira tudo ou informe outro endereço.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map(field=><label key={field.key} className="block text-sm font-medium text-foreground">
                  {field.label}
                  <input
                    required={!!field.required}
                    value={delivery[field.key]}
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    maxLength={field.key==="complement"?100:field.key==="name"?120:80}
                    onChange={event=>setDelivery(prev=>({...prev,[field.key]:field.key==="state"?event.target.value.toUpperCase():event.target.value}))}
                    className="mt-2 w-full min-w-0 rounded-lg border border-primary/35 bg-background px-3 py-2.5 text-foreground"
                  />
                </label>)}
              </div>
            </section>

            <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
              <h2 className="font-display text-2xl text-foreground">Como prefere pagar?</h2>
              <label className="mt-4 block text-sm font-medium text-foreground">
                Forma de pagamento para combinar com a Hiraeth
                <select value={payment} onChange={event=>setPayment(event.target.value as ManualPaymentPreference)}
                  className="mt-2 w-full rounded-lg border border-primary/35 bg-background px-3 py-2.5 text-foreground">
                  <option value="pix">Pix (a Hiraeth enviará os dados após conferir o pedido)</option>
                  <option value="card_link">Cartão (solicitar link seguro, se disponível)</option>
                  <option value="discuss">Conversar sobre as opções</option>
                </select>
              </label>
              <p className="mt-2 text-xs text-muted-foreground">Não envie número, validade, senha ou código de segurança do cartão pelo WhatsApp.</p>
              <label className="mt-4 flex items-center gap-3 text-sm text-foreground">
                <input type="checkbox" checked={isGift} onChange={event=>setIsGift(event.target.checked)} className="h-4 w-4 accent-[#878e47]" />
                Será um presente
              </label>
              <label className="mt-4 block text-sm font-medium text-foreground">
                Cupom de desconto (se tiver)
                <input maxLength={30} value={coupon} onChange={event=>setCoupon(event.target.value)}
                  placeholder="A Hiraeth confirmará a validade" className="mt-2 w-full rounded-lg border border-primary/35 bg-background px-3 py-2.5 text-foreground" />
              </label>
              <label className="mt-4 block text-sm font-medium text-foreground">
                Recado para a Guardiã da Chama (opcional)
                <textarea rows={3} maxLength={280} value={note} onChange={event=>setNote(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-primary/35 bg-background px-3 py-2.5 text-foreground"
                  placeholder="Deseja incluir alguma observação sobre sua encomenda?" />
              </label>
            </section>

            <section className="rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
              <label className="flex items-start gap-3 text-sm text-foreground">
                <input type="checkbox" required checked={accepted} onChange={event=>setAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#878e47]" />
                <span>Concordo em abrir o WhatsApp com as velas escolhidas e meus dados de entrega preenchidos para enviá-los à Hiraeth e receber atendimento sobre esta solicitação. Sei que ainda não fiz um pedido confirmado.</span>
              </label>
              <p className="mt-3 text-xs text-muted-foreground">
                Seu CPF e dados de cartão não são enviados neste formulário. Para a nota fiscal e envio, a Hiraeth poderá solicitar outros dados necessários por um canal adequado.
              </p>
              <button type="submit" disabled={loading||!phone||!accepted}
                className="btn-gold mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">
                {loading?"Preparando atendimento...":"Enviar solicitação no WhatsApp"}
              </button>
              {!loading&&!phone&&<p role="alert" className="mt-3 text-sm text-destructive">
                O contato do WhatsApp está temporariamente indisponível. Use o contato da Hiraeth no rodapé da página.
              </p>}
              <p className="mt-3 text-xs text-muted-foreground">Você poderá revisar a mensagem antes de enviá-la. A sacola permanecerá salva na sua conta.</p>
            </section>
          </form>}
    </main>
    <SiteFooter />
  </div>;
}
