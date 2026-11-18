import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type WelcomePresentation = { title: string; message: string; buttonText: string };

/**
 * The first-customer welcome belongs to the authenticated home, not /auth.
 * Keep the pending flag until the message is dismissed so email-confirmation
 * and navigation cannot consume the greeting before the customer sees it.
 */
export function CustomerWelcomeDialog() {
  const [welcomePresentation, setWelcomePresentation] = useState<WelcomePresentation | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (!active || authError || auth.user?.user_metadata?.["hiraeth_welcome_pending"] !== true) return;

        const { data, error } = await supabase.from("site_content")
          .select("value").eq("key", "customer-welcome-message").maybeSingle();
        if (!active || error) return;
        const settings = data?.value;
        if (!settings || typeof settings !== "object" || Array.isArray(settings) || settings["enabled"] !== true) return;

        setWelcomePresentation({
          title: typeof settings["title"] === "string" && settings["title"].trim()
            ? settings["title"] : "A chama da Hiraeth te recebe",
          message: typeof settings["message"] === "string"
            ? settings["message"] : "Que bom ter você aqui. Este é o seu espaço para encontrar histórias, aromas e lembranças que merecem permanecer acesas.",
          buttonText: typeof settings["buttonText"] === "string" && settings["buttonText"].trim()
            ? settings["buttonText"] : "Seguir para o início",
        });
      } catch {
        // A temporary failure to load optional welcome content must not block home.
      }
    })();
    return () => { active = false; };
  }, []);

  async function dismissWelcome() {
    // Already on /inicio: closing the greeting must never navigate back to /auth.
    setWelcomePresentation(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { hiraeth_welcome_pending: false } });
      if (error) console.warn("Não foi possível registrar a primeira saudação da conta.", error);
    } catch {
      console.warn("Não foi possível registrar a primeira saudação da conta.");
    }
  }

  if (!welcomePresentation) return null;
  return <div className="fixed inset-0 z-[200] grid min-h-screen place-items-center overflow-y-auto bg-[#0d160f]/95 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Mensagem de boas-vindas">
    <section className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#b18a4b]/70 bg-[radial-gradient(ellipse_at_top,rgba(190,151,83,0.24),transparent_48%),linear-gradient(135deg,#17251c_0%,#263d2c_55%,#101a14_100%)] px-6 py-12 text-center text-[#f7efda] shadow-[0_25px_90px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:px-14 sm:py-20">
      <div className="pointer-events-none absolute inset-3 rounded-xl border border-[#c6a66a]/25 sm:inset-5"/>
      <div className="relative">
        <p className="text-[10px] uppercase tracking-[.35em] text-[#d7bd83] sm:text-xs">Onde a Chama Acesa te Espera</p>
        <div className="my-6 text-4xl text-[#d7bd83]">✧</div>
        <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight sm:text-6xl">{welcomePresentation.title}</h1>
        <p className="mx-auto mt-7 max-w-2xl whitespace-pre-wrap text-sm leading-8 text-[#eee4ce] sm:text-lg sm:leading-9">{welcomePresentation.message}</p>
        <button type="button" onClick={() => void dismissWelcome()} className="mt-10 min-h-14 rounded-full border border-[#e3c987] bg-[#d7bd83] px-10 py-4 text-xs font-semibold uppercase tracking-[.18em] text-[#1e2a20] shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:scale-[1.02] hover:bg-[#ead6a5]">{welcomePresentation.buttonText}</button>
      </div>
    </section>
  </div>;
}
