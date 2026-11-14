import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { HOUSES, HOUSE_CHANGED_EVENT, type HouseId } from "@/lib/house-cup";
import { HouseChoiceCards } from "@/components/HouseChoiceCards";
import { toast } from "sonner";

const eligible = new Set(["/inicio", "/comunidade", "/biblioteca"]);

export function HouseOnboarding() {
  const { pathname } = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [undecided, setUndecided] = useState(false);
  const productHref = "/produto/a-seletora";

  useEffect(() => {
    if (!eligible.has(pathname)) { setOpen(false); return; }
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!active || !user) return;
      setUserId(user.id);
      if (window.sessionStorage.getItem("hiraeth-house-skip-" + user.id)) return;
      const { data: adminRole } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!active || adminRole === true) return;
      const { data: answer, error } = await (supabase as any).from("member_houses")
        .select("user_id,house").eq("user_id", user.id).maybeSingle();
      // Do not interrupt the app when the pending database migration has not been applied.
      if (!active || error || answer) return;
      if (active) {
        setUndecided(false); setOpen(true);
      }
    })();
    return () => { active = false; };
  }, [pathname]);

  function close() {
    setOpen(false);
    if (userId) window.sessionStorage.setItem("hiraeth-house-skip-" + userId, "true");
  }

  async function choose(house: HouseId | null) {
    if (!userId) return;
    setBusy(true);
    const { error } = await (supabase as any).from("member_houses").upsert(
      { user_id: userId, house, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setBusy(false);
    if (error) { toast.error("Não foi possível registrar sua casa. Tente novamente."); return; }
    window.dispatchEvent(new Event(HOUSE_CHANGED_EVENT));
    if (house === null) { setUndecided(true); return; }
    toast.success(`Bem-vinda à ${HOUSES.find(item => item.id === house)?.label ?? "sua casa"}!`);
    close();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto bg-[#101a13]/85 p-3 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="house-welcome-title">
      <div className="my-auto w-full max-w-lg rounded-2xl border border-[#b69b70] bg-[#f7efda] p-5 text-[#253729] shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#5b1d04]">Bem-vinda ao Círculo do Fogo</p>
        <h2 id="house-welcome-title" className="mt-3 font-display text-3xl">A qual casa você pertence?</h2>
        <p className="mt-2 text-sm leading-6 text-[#5b6550]">Escolha sua casa para participar da Taça das Casas. Você poderá mudar a escolha no seu perfil.</p>
        {!undecided ? <div className="mt-5"><HouseChoiceCards selected={null} onSelect={choose} busy={busy} /></div> :
          <div className="mt-6 rounded-xl border border-[#878e47]/50 bg-white/70 p-5">
            <h3 className="font-display text-2xl">Sua casa ainda é um mistério?</h3>
            <p className="mt-2 text-sm">A Vela Seletora pode transformar essa descoberta em uma experiência. Você não precisa comprar nada para continuar.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={productHref} onClick={close} className="rounded-full bg-[#5b1d04] px-5 py-3 text-sm font-semibold text-[#f7efda]">Conhecer a Vela Seletora</a>
              <button type="button" onClick={close} className="rounded-full border border-[#878e47] px-5 py-3 text-sm">Continuar sem escolher</button>
            </div>
          </div>}
        {!undecided && <button type="button" onClick={close} className="mt-4 w-full py-2 text-xs font-medium text-[#556144] underline underline-offset-4">Prefiro escolher depois</button>}
      </div>
    </div>
  );
}
