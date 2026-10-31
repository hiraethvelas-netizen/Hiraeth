import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/suporte")({ head: () => ({ meta: [{ title: "Suporte — Hiraeth" }] }), component: Support });
function Support() {
  const [email, setEmail] = useState("");
  useEffect(() => { void (supabase as any).from("site_profile").select("contact_email").eq("id", true).maybeSingle().then(({ data }: any) => setEmail(data?.contact_email ?? "")); }, []);
  return <PageShell eyebrow="Estamos aqui para ajudar" title="Suporte Hiraeth">
    <p>Precisa de ajuda com sua conta, um pedido, pagamento, entrega ou com o funcionamento do site? Fale com a nossa equipe.</p>
    {email ? <p><a className="text-primary underline" href={`mailto:${email}?subject=Suporte%20Hiraeth`}>{email}</a></p> : <p>Entre em contato pelos canais oficiais da Hiraeth indicados no rodapé do site.</p>}
    <p>Ao entrar em contato, informe o assunto e, se for sobre um pedido, o número do pedido. Nunca envie sua senha ou dados completos de cartão.</p>
  </PageShell>;
}
