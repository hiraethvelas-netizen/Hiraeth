import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/seguranca")({ head: () => ({ meta: [{ title: "Segurança e denúncias — Hiraeth" }] }), component: Safety });
function Safety() {
  const [email, setEmail] = useState("");
  useEffect(() => { void (supabase as any).from("site_profile").select("contact_email").eq("id", true).maybeSingle().then(({ data }: any) => setEmail(data?.contact_email ?? "")); }, []);
  return <PageShell eyebrow="Um espaço seguro" title="Segurança e denúncias">
    <p>A Hiraeth não solicita sua senha, códigos de autenticação ou dados completos de cartão por mensagens ou redes sociais.</p>
    <p>Desconfie de perfis, links, cobranças ou mensagens que se apresentem como oficiais sem confirmação nos canais publicados neste site.</p>
    <h2 className="pt-4 text-2xl text-primary">Como denunciar</h2>
    <p>Se encontrar um perfil falso, conteúdo impróprio, tentativa de fraude ou comportamento que coloque alguém em risco na comunidade, envie os detalhes e, se possível, capturas de tela para nossa equipe.</p>
    {email && <p><a className="text-primary underline" href={`mailto:${email}?subject=Seguranca%20e%20denuncia%20-%20Hiraeth`}>{email}</a></p>}
  </PageShell>;
}
