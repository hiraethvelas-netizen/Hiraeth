import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HOUSES, HOUSE_CHANGED_EVENT, type HouseId, percentage } from "@/lib/house-cup";
import { HouseChoiceCards } from "@/components/HouseChoiceCards";
import { toast } from "sonner";

type Score = Record<string, number>;
const EMPTY: Score = { leao: 0, texugo: 0, aguia: 0, serpente: 0 };

export function HouseCup({ variant = "community" }: { variant?: "community" | "portal" }) {
  const [scores, setScores] = useState<Score>(EMPTY);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const portal = variant === "portal";
  const [canChoose, setCanChoose] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [claimError, setClaimError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data, error: resultError } = await (supabase as any).rpc("house_totals");
      if (resultError || !Array.isArray(data)) throw resultError || new Error("Placares indisponíveis");
      const next: Score = { ...EMPTY };
      for (const entry of data as { house: string; participant_count: number }[]) {
        if (entry.house in next) next[entry.house] = Number(entry.participant_count) || 0;
      }
      setScores(next); setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 45000);
    window.addEventListener(HOUSE_CHANGED_EVENT, refresh);
    return () => { window.clearInterval(interval); window.removeEventListener(HOUSE_CHANGED_EVENT, refresh); };
  }, [refresh]);

  async function discoverHouse() {
    setClaimError("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const token = window.sessionStorage.getItem("hiraeth:nfc:pending-token");
      if (!token || !/^[0-9a-f]{64}$/.test(token)) {
        setClaimError("Para desbloquear o selinho, acesse o portal pelo NFC individual de uma vela Hiraeth.");
        return;
      }
      window.location.assign("/auth?mode=signup&source=portal-nfc&redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    const { data: eligible } = await (supabase as any).rpc("has_verified_house_nfc_access", { p_user: data.user.id });
    if (eligible === true) {
      setCanChoose(true); setShowChoice(true);
      return;
    }
    const token = window.sessionStorage.getItem("hiraeth:nfc:pending-token");
    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
      setClaimError("O selinho é exclusivo de quem ativa um código NFC individual de uma vela Hiraeth.");
      return;
    }
    const { data: claimed, error: failed } = await (supabase as any).rpc("claim_house_nfc_access_code", { p_token: token });
    if (failed || claimed !== true) {
      setClaimError("Este NFC não pôde ser ativado. Confira se o código pertence a uma vela sua e se já foi vinculado.");
      return;
    }
    window.sessionStorage.removeItem("hiraeth:nfc:pending-token");
    setCanChoose(true); setShowChoice(true);
    toast.success("Portal NFC vinculado à sua conta!");
  }

  async function chooseHouse(house: HouseId | null) {
    const { data } = await supabase.auth.getUser();
    if (!data.user || !canChoose) return;
    setChoosing(true);
    try {
      const { error } = await (supabase as any).from("member_houses").upsert({
        user_id: data.user.id, house, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      window.dispatchEvent(new Event(HOUSE_CHANGED_EVENT));
      toast.success(house ? "Seu selinho da casa foi ativado!" : "Você pode escolher sua casa depois.");
      setShowChoice(false);
      await refresh();
      if (house === null) window.location.assign("/produto/a-seletora");
    } catch {
      toast.error("Não foi possível salvar sua casa. Tente novamente.");
    } finally {
      setChoosing(false);
    }
  }

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return <section id={portal ? "portal-taca-casas" : undefined} aria-label="Taça das Casas"
    className={portal
      ? "relative mx-auto w-full max-w-6xl bg-transparent px-2 pb-12 pt-10 text-[#f8f5ee] sm:px-10 sm:pt-14"
      : "mx-auto w-full max-w-5xl rounded-2xl border border-primary/30 bg-card px-4 py-8 text-foreground sm:px-8"}>
    <div className="relative z-10 text-center">
      {!portal && <p className="text-[10px] font-semibold uppercase tracking-[.3em] text-primary">O Mundo da Magia</p>}
      <h2 className="mt-3 font-display text-3xl sm:text-5xl">Taça das Casas</h2>
      {!portal && <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
        Cada chama representa uma casa. Qual delas vai iluminar o nosso salão?
      </p>}
      {error ? <p role="status" className="mt-8 text-sm">Não foi possível atualizar as porcentagens agora.</p> :
        <div className="mx-auto mt-9 grid max-w-2xl grid-cols-4 items-start gap-1.5 sm:gap-6">
          {HOUSES.map(house => <div key={house.id} className="flex min-w-0 flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-2xl shadow-[0_0_20px_rgba(0,0,0,0.25)] sm:h-[84px] sm:w-[84px] sm:text-4xl"
              style={{backgroundColor:house.background,borderColor:house.border}}
              role="img" aria-label={house.label}>
              <span aria-hidden="true">{house.animal}</span>
            </div>
            <h3 className="mt-4 min-h-8 text-center text-[11px] font-semibold leading-4 sm:min-h-0 sm:text-sm">{house.label}</h3>
            <p className={portal ? "mt-1 font-display text-2xl tabular-nums text-[#f6dfa8] sm:text-4xl" : "mt-1 font-display text-2xl tabular-nums sm:text-4xl"}>
              {loading ? "—" : percentage(scores[house.id] ?? 0, total) + "%"}
            </p>
          </div>)}
        </div>}
      {!portal && !loading && !error && total === 0 && <p className="mt-5 text-xs text-muted-foreground">
        Seja uma das primeiras pessoas a representar sua casa.
      </p>}
      {claimError && <p role="alert" className="mx-auto mt-5 max-w-lg text-sm font-semibold text-[#ffdf9c]">{claimError}</p>}
      {showChoice && <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#b1bee9]/70 bg-[#f7efda] p-5 text-[#223047]">
        <h3 className="mb-2 font-display text-2xl">Escolha sua casa</h3>
        <p className="mb-4 text-sm">Agora que seu NFC foi validado, escolha a casa do seu selinho.</p>
        <HouseChoiceCards selected={null} onSelect={chooseHouse} busy={choosing} />
      </div>}
      <button type="button" onClick={() => void discoverHouse()}
        className={portal
          ? "mt-9 min-h-12 rounded-full border border-[#f0dba2] bg-[#e8d7a4] px-8 py-3 text-sm font-bold text-[#152045] shadow-[0_0_25px_rgba(233,211,151,0.18)] transition hover:bg-[#fff0ba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          : "btn-gold mt-9 min-h-12 rounded-full px-8 py-3 text-sm"}>
        Descubra a sua casa
      </button>
    </div>
  </section>;
}
