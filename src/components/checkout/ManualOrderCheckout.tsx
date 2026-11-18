import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Package, ShieldCheck, Truck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { emptyCheckoutRecipient, checkoutRecipientFromMetadata } from "@/lib/checkout-recipient";
import {
  manualOrderWhatsAppLink,
  validateManualOrder,
  type ManualOrderForm,
  type ManualRecipient,
  type ManualPaymentChoice,
} from "@/lib/manual-order";

const inputClass =
  "mt-1 w-full rounded-lg border border-primary/35 bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-primary";

const initial: ManualOrderForm = {
  recipient: { ...emptyCheckoutRecipient },
  payment: "pix",
  gift: false,
  packingVideo: false,
  note: "",
  coupon: "",
};

const contactKeys = [
  ["name", "Nome completo de quem vai receber"],
  ["phone", "Telefone com DDD"],
  ["postal_code", "CEP"],
  ["street", "Rua / avenida"],
  ["number", "Número"],
  ["complement", "Complemento (opcional)"],
  ["district", "Bairro"],
  ["city", "Cidade"],
  ["state", "Estado (UF)"],
] as const satisfies ReadonlyArray<readonly [keyof ManualRecipient, string]>;

export function ManualOrderCheckout() {
  const cart = useCart();
  const [form, setForm] = useState<ManualOrderForm>(() => ({
    ...initial,
    recipient: { ...initial.recipient },
  }));
  const [merchantPhone, setMerchantPhone] = useState("");
  const [contactLoading, setContactLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [preparedLink, setPreparedLink] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [{ data: auth }, { data: contact }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("site_profile").select("whatsapp_number").eq("id", true).maybeSingle(),
        ]);
        if (!active) return;
        setMerchantPhone(contact?.whatsapp_number ?? "");
        if (auth.user) {
          const saved = checkoutRecipientFromMetadata(auth.user.user_metadata);
          setForm(previous => ({
            ...previous,
            recipient: {
              name: saved.name,
              phone: saved.phone,
              postal_code: saved.postal_code,
              street: saved.street,
              number: saved.number,
              complement: saved.complement,
              district: saved.district,
              city: saved.city,
              state: saved.state,
            },
          }));
        }
      } catch {
        // A temporary read error must never create a payment or a phantom order.
      } finally {
        if (active) setContactLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function changeRecipient(key: keyof ManualRecipient, value: string) {
    setPreparedLink(null);
    setError("");
    setForm(previous => ({
      ...previous,
      recipient: { ...previous.recipient, [key]: value },
    }));
  }

  function changeOrder(patch: Partial<ManualOrderForm>) {
    setPreparedLink(null);
    setError("");
    setForm(previous => ({ ...previous, ...patch }));
  }

  function prepareWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreparedLink(null);
    if (!consent) {
      setError("Marque a confirmação de compartilhamento dos dados de entrega antes de continuar.");
      return;
    }
    const invalid = validateManualOrder(form, cart.items);
    if (invalid) { setError(invalid); return; }
    const link = manualOrderWhatsAppLink(merchantPhone, cart.items, form);
    if (!link) {
      setError("Não conseguimos preparar sua mensagem. Confira o WhatsApp de atendimento e o tamanho do pedido.");
      return;
    }
    setError("");
    setPreparedLink(link);
    // Opening occurs only after the shopper deliberately submits the filled form.
    // WhatsApp still requires the shopper to press Send. No backend write happens.
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen w-full min-w-0">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <Link to="/carrinho" className="text-sm font-medium text-primary underline underline-offset-2">
          Voltar à sacola
        </Link>
        <p className="eyebrow mt-8">O Correio da Fênix</p>
        <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">Solicitar meu pedido</h1>
        <p className="mt-4 text-sm leading-relaxed text-foreground/85">
          Nesta edição, as solicitações são atendidas pessoalmente pela Hiraeth. Escolha suas velas
          e informe o endereço para receber no WhatsApp a confirmação do estoque, o frete e o valor final.
        </p>
        <div className="mt-5 rounded-xl border border-primary/35 bg-card px-4 py-4 text-sm text-foreground">
          <p className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> Atendimento humano, sem cobrança no aplicativo</p>
          <p className="mt-2 text-muted-foreground">
            Esta solicitação não reserva velas, não gera pedido nem cobra qualquer valor. Só pague após
            conferir os dados e receber da Hiraeth uma chave/QR Code Pix ou um link de pagamento seguro.
            Nunca envie números de cartão, senha ou CVV pelo WhatsApp.
          </p>
        </div>

        {cart.items.length === 0 ? (
          <section className="mt-8 rounded-xl border border-primary/25 bg-card p-6">
            <p className="font-display text-2xl text-primary">Sua sacola está vazia</p>
            <Link to="/loja" className="btn-gold mt-5 inline-flex">Escolher minhas velas</Link>
          </section>
        ) : (
          <>
            <section className="mt-7 rounded-xl border border-primary/25 bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-2xl text-foreground"><Package size={19} /> Suas velas</h2>
              <ul className="mt-4 divide-y divide-primary/15">
                {cart.items.map(item => (
                  <li key={item.productId + "::" + (item.variantKey ?? "default")} className="py-3 text-sm text-foreground">
                    <span className="font-semibold">{item.quantity}× {item.name}</span>
                    {typeof item.variantDetails?.["size"] === "string" && <span className="ml-2 text-muted-foreground">· {item.variantDetails["size"]}</span>}
                    {typeof item.variantDetails?.["house"] === "string" && <span className="ml-2 text-muted-foreground">· {item.variantDetails["house"]}</span>}
                    <span className="block text-xs text-muted-foreground">Referência do catálogo: {brl(item.price)} por unidade</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-primary/15 pt-3 text-sm text-muted-foreground">
                Subtotal indicativo: {brl(cart.total)}. Descontos, brindes e frete serão conferidos no atendimento.
              </p>
            </section>
            <form onSubmit={prepareWhatsApp} className="mt-8 space-y-6">
              <section className="rounded-xl border border-primary/25 bg-card p-5">
                <h2 className="flex items-center gap-2 font-display text-2xl text-foreground"><Truck size={19} /> Dados para entrega</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Confira os dados abaixo. O CPF para a nota fiscal, se necessário, será solicitado posteriormente,
                  por um canal adequado; ele não será incluído no WhatsApp automaticamente.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {contactKeys.map(([key, label]) => (
                    <label key={key} className={key === "street" || key === "name" ? "sm:col-span-2" : ""}>
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <input
                        className={inputClass}
                        type={key === "phone" ? "tel" : "text"}
                        autoComplete={
                          key === "name" ? "name" : key === "phone" ? "tel" :
                          key === "postal_code" ? "postal-code" : key === "street" ? "address-line1" :
                          key === "complement" ? "address-line2" : key === "city" ? "address-level2" :
                          key === "state" ? "address-level1" : "off"
                        }
                        inputMode={key === "postal_code" || key === "phone" ? "numeric" : "text"}
                        required={key !== "complement"}
                        maxLength={key === "state" ? 2 : key === "postal_code" ? 9 : 120}
                        value={form.recipient[key]}
                        onChange={event => changeRecipient(key, event.target.value)}
                        placeholder={key === "state" ? "SC" : key === "postal_code" ? "00000-000" : ""}
                      />
                    </label>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-primary/25 bg-card p-5">
                <h2 className="font-display text-2xl text-foreground">Como prefere pagar?</h2>
                <p className="mt-2 text-sm text-muted-foreground">Nenhum pagamento será iniciado agora.</p>
                <div className="mt-4 space-y-3 text-sm text-foreground">
                  {([
                    ["pix", "Pix — receberei a chave ou o QR Code após a confirmação"],
                    ["credito", "Crédito — quero um link seguro de pagamento"],
                    ["debito", "Débito — consultar disponibilidade de link seguro"],
                  ] as const satisfies ReadonlyArray<readonly [ManualPaymentChoice, string]>).map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-start gap-3">
                      <input type="radio" name="manual-payment" value={value} className="mt-1 accent-[#878e47]"
                        checked={form.payment === value} onChange={() => changeOrder({ payment: value })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-5 block text-sm text-foreground">
                  Cupom para conferir (opcional)
                  <input className={inputClass} maxLength={35} value={form.coupon}
                    onChange={event => changeOrder({ coupon: event.target.value.toUpperCase() })} placeholder="Código promocional" />
                </label>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 text-sm text-foreground">
                    <input type="checkbox" className="accent-[#878e47]" checked={form.gift}
                      onChange={event => changeOrder({ gift: event.target.checked })} />
                    É para presente
                  </label>
                  <label className="flex items-center gap-3 text-sm text-foreground">
                    <input type="checkbox" className="accent-[#878e47]" checked={form.packingVideo}
                      onChange={event => changeOrder({ packingVideo: event.target.checked })} />
                    Gostaria de um vídeo da embalagem
                  </label>
                </div>
                <label className="mt-5 block text-sm text-foreground">
                  Recado ou observações (opcional)
                  <textarea className={inputClass} rows={3} maxLength={250} value={form.note}
                    onChange={event => changeOrder({ note: event.target.value })} />
                </label>
              </section>
              <section className="rounded-xl border border-primary/25 bg-card p-5">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                  <input type="checkbox" required className="mt-1 accent-[#878e47]" checked={consent}
                    onChange={event => { setConsent(event.target.checked); setPreparedLink(null); }} />
                  <span>
                    Conferi os dados e autorizo abrir o WhatsApp com as velas e o endereço de entrega
                    preenchidos para atendimento da Hiraeth. Sei que o envio só ocorre quando eu confirmar
                    a mensagem no WhatsApp.
                  </span>
                </label>
                {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
                {!contactLoading && !merchantPhone && <p role="alert" className="mt-3 text-sm text-destructive">
                  O WhatsApp de atendimento ainda não está disponível. Entre em contato pelos canais oficiais no rodapé.
                </p>}
                <button type="submit" disabled={contactLoading || !merchantPhone || !consent}
                  className="btn-gold mt-5 inline-flex w-full items-center justify-center gap-2 disabled:opacity-45">
                  <MessageCircle size={18} /> Enviar solicitação pelo WhatsApp
                </button>
                {preparedLink && <p className="mt-3 text-sm text-foreground">
                  Se o WhatsApp não abriu,{" "}
                  <a href={preparedLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
                    toque aqui para continuar
                  </a>. A mensagem precisa ser enviada por você.
                </p>}
                <p className="mt-3 text-xs text-muted-foreground">
                  Seu carrinho continuará salvo. A Hiraeth calculará o frete, confirmará estoque, descontos
                  e valores, enviará a opção segura de pagamento e preparará a expedição manualmente.
                </p>
              </section>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
