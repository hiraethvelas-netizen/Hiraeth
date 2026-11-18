import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { checkoutRecipientFromMetadata, emptyCheckoutRecipient } from "@/lib/checkout-recipient";
import { buildManualInquiryLink, validateManualRequest, type ManualRequestDetails } from "@/lib/manual-checkout";
import { brl } from "@/lib/format";

const initial: ManualRequestDetails = {
  ...emptyCheckoutRecipient,
  email: "",
  isGift: false,
  note: "",
  paymentPreference: "pix",
  coupon: "",
  packingVideoRequested: false,
};

const fields: Array<{
  key: "name" | "email" | "phone" | "postal_code" | "street" | "number" | "complement" | "district" | "city" | "state";
  label: string;
  autoComplete: string;
  required?: boolean;
}> = [
  { key: "name", label: "Nome de quem receberá a encomenda", autoComplete: "name", required: true },
  { key: "email", label: "E-mail para contato", autoComplete: "email", required: true },
  { key: "phone", label: "Telefone com DDD", autoComplete: "tel", required: true },
  { key: "postal_code", label: "CEP", autoComplete: "postal-code", required: true },
  { key: "street", label: "Rua / avenida", autoComplete: "address-line1", required: true },
  { key: "number", label: "Número", autoComplete: "off", required: true },
  { key: "complement", label: "Complemento (opcional)", autoComplete: "address-line2" },
  { key: "district", label: "Bairro", autoComplete: "address-level3", required: true },
  { key: "city", label: "Cidade", autoComplete: "address-level2", required: true },
  { key: "state", label: "Estado (UF)", autoComplete: "address-level1", required: true },
];

/** Client-only assisted-order flow: the customer voluntarily sends the data to WhatsApp. */
export function ManualOrderCheckout() {
  const cart = useCart();
  const [details, setDetails] = useState<ManualRequestDetails>(initial);
  const [merchantPhone, setMerchantPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [{data: auth}, {data: profile}] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("site_profile").select("whatsapp_number").eq("id", true).maybeSingle(),
        ]);
        if (!active) return;
        setMerchantPhone(profile?.whatsapp_number ?? "");
        if (auth.user) {
          const saved = checkoutRecipientFromMetadata(auth.user.user_metadata);
          setDetails(previous => ({
            ...previous,
            ...Object.fromEntries(
              Object.entries(saved).filter(([key, value]) => key !== "document" && typeof value === "string" && value.length > 0),
            ),
            email: auth.user?.email ?? "",
          }));
        }
      } finally {
        if (active) setLoading(false);
      }
    })().catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const setField = (key: keyof ManualRequestDetails, value: string | boolean) =>
    setDetails(previous => ({ ...previous, [key]: value }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem("");
    if (!cart.items.length) { setProblem("Sua sacola está vazia."); return; }
    const issue = validateManualRequest(details);
    if (issue) { setProblem(issue); return; }
    if (!consent) {
      setProblem("Confirme que concorda em enviar estes dados à Hiraeth pelo WhatsApp.");
      return;
    }
    const link = buildManualInquiryLink(merchantPhone, cart.items, details);
    if (!link) {
      setProblem("O WhatsApp da Hiraeth está indisponível. Confira o contato no rodapé ou fale com o suporte.");
      return;
    }
    // Executed only from the customer's direct click. No server writes or payments.
    window.location.assign(link);
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32">
        <p className="eyebrow">O Correio da Fênix</p>
        <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">Finalizar pedido</h1>
        <p role="status" className="mt-5 rounded-xl border border-primary/30 bg-card px-4 py-4 text-sm leading-7 text-foreground">
          A área de checkout ainda está em desenvolvimento. Preencha seus dados e prossiga pelo WhatsApp.
        </p>

        {cart.items.length === 0 ? (
          <div className="mt-8 space-y-4">
            <p>Sua sacola ainda está vazia.</p>
            <Link to="/loja" className="btn-gold">Conhecer o acervo</Link>
          </div>
        ) : (
          <>
            <section className="mt-8 rounded-xl border border-primary/25 bg-card p-4 sm:p-6">
              <h2 className="font-display text-2xl text-foreground">Velas escolhidas</h2>
              <ul className="mt-4 divide-y divide-primary/15">
                {cart.items.map((item, index) => (
                  <li key={item.productId + ":" + (item.variantKey ?? index)} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div>
                      <strong>{item.quantity}× {item.name}</strong>
                      {typeof item.variantDetails?.["size"] === "string" && <p className="text-muted-foreground">Tamanho: {item.variantDetails["size"]}</p>}
                      {typeof item.variantDetails?.["house"] === "string" && <p className="text-muted-foreground">Casa: {item.variantDetails["house"]}</p>}
                    </div>
                    <span className="shrink-0 tabular-nums">{brl(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right font-semibold">Subtotal de referência: {brl(cart.total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Valores promocionais, descontos, disponibilidade e frete serão conferidos no atendimento.</p>
              <Link to="/carrinho" className="mt-3 inline-flex text-sm text-primary underline">Editar minha sacola</Link>
            </section>
            <form className="mt-8 space-y-6" onSubmit={submit}>
              <section className="rounded-xl border border-primary/25 p-4 sm:p-6">
                <h2 className="font-display text-2xl text-foreground">Seus dados de entrega</h2>
                <p className="mt-2 text-sm text-muted-foreground">Confira seus dados. Não é necessário informar CPF nesta etapa.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {fields.map(field => (
                    <label key={field.key} className={"block text-sm text-foreground " + (["street", "complement"].includes(field.key) ? "sm:col-span-2" : "")}>
                      {field.label}{field.required ? " *" : ""}
                      <input
                        required={field.required}
                        maxLength={field.key === "email" ? 160 : 120}
                        autoComplete={field.autoComplete}
                        type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
                        inputMode={field.key === "postal_code" ? "numeric" : "text"}
                        value={String(details[field.key])}
                        onChange={event => setField(field.key, event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-primary/30 bg-background px-3 py-3 text-foreground"
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-5 flex items-start gap-3 text-sm text-foreground">
                  <input type="checkbox" checked={details.isGift} onChange={event => setField("isGift", event.target.checked)} className="mt-1 accent-[#878e47]" />
                  É para presente
                </label>
                <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
                  <input type="checkbox" checked={details.packingVideoRequested === true}
                    onChange={event => setDetails(previous => ({ ...previous, packingVideoRequested: event.target.checked }))}
                    className="mt-1 accent-[#878e47]" />
                  Gostaria de receber um vídeo da preparação da encomenda (conforme disponibilidade).
                </label>
                <label className="mt-4 block text-sm text-foreground">
                  Recado para a Guardiã da Chama (opcional)
                  <textarea maxLength={350} rows={3} value={details.note} onChange={event => setField("note", event.target.value)}
                    className="mt-2 w-full rounded-lg border border-primary/30 bg-background px-3 py-3 text-foreground" />
                </label>
              </section>
              <section className="rounded-xl border border-primary/25 p-4 sm:p-6">
                <label className="block text-sm text-foreground">Cupom para conferência (opcional)
                  <input maxLength={30} value={details.coupon ?? ""}
                    onChange={event => setDetails(previous => ({ ...previous, coupon: event.target.value.toUpperCase() }))}
                    className="mt-2 w-full rounded-lg border border-primary/30 bg-background px-3 py-3 text-foreground"
                    placeholder="Código do cupom" />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">Cupons e descontos serão conferidos no atendimento. O valor no site não é uma cobrança.</p>
              </section>
              <fieldset className="rounded-xl border border-primary/25 p-4 sm:p-6">
                <legend className="px-2 font-display text-2xl text-foreground">Como prefere pagar?</legend>
                <p className="mb-4 text-sm text-muted-foreground">Você não pagará nada nesta página. Combinaremos a forma de pagamento após confirmar o frete.</p>
                {([
                  ["pix", "Pix — receber o QR Code ou a chave no atendimento"],
                  ["credit", "Crédito — solicitar um link de pagamento seguro"],
                  ["debit", "Débito — consultar disponibilidade com a Hiraeth"],
                ] as const).map(([value, label]) => (
                  <label key={value} className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-foreground">
                    <input type="radio" name="manual-payment-preference" value={value}
                      checked={details.paymentPreference === value}
                      onChange={() => setField("paymentPreference", value)}
                      className="mt-1 accent-[#878e47]" />
                    {label}
                  </label>
                ))}
              </fieldset>
              <label className="flex items-start gap-3 rounded-lg border border-primary/25 bg-card p-4 text-sm text-foreground">
                <input required type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}
                  className="mt-1 accent-[#878e47]" />
                Autorizo o envio das informações que preenchi (nome, e-mail, telefone, endereço, produtos e observações) para o WhatsApp da Hiraeth. Entendo que a mensagem será aberta no WhatsApp e que a compra só será confirmada após a conferência manual. Não preciso informar CPF ou dados de cartão aqui.
              </label>
              {problem && <p role="alert" className="rounded-lg border border-destructive/50 px-4 py-3 text-sm text-destructive">{problem}</p>}
              <button type="submit" disabled={loading} className="btn-gold w-full justify-center disabled:opacity-50">
                {loading ? "Preparando atendimento..." : "Seguir pelo WhatsApp"}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Você poderá revisar a mensagem antes de enviá-la. Sua sacola permanecerá salva.
              </p>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
