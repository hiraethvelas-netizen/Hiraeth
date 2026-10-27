import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

type Profile = { about_story: string; about_mari: string; about_image_url: string; story_image_url: string; instagram_url: string; whatsapp_number: string; whatsapp_url: string; contact_email: string };
const defaults: Profile = { about_story: "A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.", about_mari: "Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.", about_image_url: "", story_image_url: "", instagram_url: "", whatsapp_number: "", whatsapp_url: "", contact_email: "" };

export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre a Hiraeth — Guardiã da chama" }, { name: "description", content: "A história da Hiraeth e de Mari, Guardiã da Chama." }, { property: "og:title", content: "Sobre a Hiraeth" }, { property: "og:description", content: "Onde a Chama Acesa te Espera: a história da Hiraeth." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Sobre,
});
function Sobre() {
  const [profile, setProfile] = useState<Profile>(defaults);
  useEffect(() => { void (async () => { const { data } = await (supabase as any).from("site_profile").select("*").eq("id", true).maybeSingle(); if (data) setProfile({ ...defaults, ...data }); })(); }, []);
  return <PageShell eyebrow="Guardiã da chama" title="Sobre a Hiraeth">
    <div className="space-y-8">
      {profile.story_image_url && <img src={profile.story_image_url} alt="Memórias do início da Hiraeth" className="max-h-[28rem] w-full object-cover" />}
      <section className="space-y-4 whitespace-pre-line"><h2 className="font-display text-3xl text-foreground">A história da Hiraeth</h2><p>{profile.about_story}</p></section>
      <section className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {profile.about_image_url && <img src={profile.about_image_url} alt="Mari, Guardiã da Chama da Hiraeth" className="w-full object-cover" />}
        <div className="space-y-4 whitespace-pre-line"><p className="eyebrow">Guardiã da chama</p><h2 className="font-display text-3xl text-foreground">Prazer, eu sou a Mari</h2><p>{profile.about_mari}</p></div>
      </section>
      <p className="border-t pt-6 italic text-primary">Onde a Chama Acesa te Espera</p>
    </div>
  </PageShell>;
}
