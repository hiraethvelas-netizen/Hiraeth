import { useCallback, useEffect, useRef, useState } from "react";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { HOUSES, HOUSE_CHANGED_EVENT, type HouseId, percentage } from "@/lib/house-cup";
import { HouseChoiceCards } from "@/components/HouseChoiceCards";
import { toast } from "sonner";

type Score = Record<string, number>;
const EMPTY: Score = { leao: 0, texugo: 0, aguia: 0, serpente: 0 };

function scoreErrorMessage(code?: string): string {
  if (code === "PGRST202" || code === "42883") {
    return "A contagem das casas ainda não está disponível no servidor.";
  }
  if (code === "42501" || code === "PGRST301") {
    return "A contagem está temporariamente indisponível por uma configuração de acesso.";
  }
  return "Não foi possível carregar a contagem das casas. Confira sua conexão e tente novamente.";
}

export function HouseCup({ variant = "community" }: { variant?: "community" | "portal" }) {
  const [scores, setScores] = useState<Score>(EMPTY);
  const [hasLoadedScores, setHasLoadedScores] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const portal = variant === "portal";
  const [canChoose, setCanChoose] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingAccess = useRef(false);
  const [claimError, setClaimError] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error: resultError } = await (supabase as any).rpc("house_totals");
      if (resultError || !Array.isArray(data)) throw resultError || new Error("Placares indisponíveis");
      const next: Score = { ...EMPTY };
      for (const entry of data as { house: string; participant_count: number }[]) {
        if (entry.house in next) next[entry.house] = Math.max(0, Number(entry.participant_count) || 0);
      }
      setScores(next);
      setHasLoadedScores(true);
      setErrorMessage("");
    } catch (caught) {
      const code = typeof caught === "object" && caught !== null && "code" in caught
        ? String(caught.code) : undefined;
      setErrorMessage(scoreErrorMessage(code));
      console.warn("[HouseCup] Falha ao buscar placar da Taça das Casas", { code });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 45000);
    window.addEventListener(HOUSE_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(HOUSE_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  async function discoverHouse() {
    if (checkingAccess.current || choosing) return;
    checkingAccess.current = true;
    setChecking(true);
    setClaimError("");
    setCanChoose(false);
    setShowChoice(false);
    try {
      const { data, error: sessionError } = await supabase.auth.getUser();
      if (sessionError && !isAuthSessionMissingError(sessionError)) throw sessionError;
      if (!data.user) {
        const token = window.sessionStorage.getItem("hiraeth:nfc:pending-token");
        if (!token || !/^[0-9a-f]{64}$/.test(token)) {
          setClaimError("Para desbloquear o selinho, acesse o portal pelo NFC individual de uma vela Hiraeth.");
          return;
        }
        window.location.assign("/auth?mode=signup&source=portal-nfc&redirect=" + encodeURIComponent(window.location.pathname));
        return;
      }
      const { data: eligible, error: accessError } = await (supabase as any).rpc("has_verified_house_nfc_access", { p_user: data.user.id });
      if (accessError || typeof eligible !== "boolean") {
        setClaimError("Não foi possível verificar seu acesso NFC agora. Tente novamente em instantes.");
        return;
      }
      if (eligible) {
        setCanChoose(true); setShowChoice(true);
        return;
      }
      const token = window.sessionStorage.getItem("hiraeth:nfc:pending-token");
      if (!token || !/^[0-9a-f]{64}$/.test(token)) {
        setClaimError("O selinho é exclusivo de quem ativa um código NFC individual de uma vela Hiraeth.");
        return;
      }
      const { data: claimed, error: failed } = await (supabase as any).rpc("claim_house_nfc_access_code", { p_token: token });
      if (failed) {
        setClaimError("Não foi possível validar seu NFC agora. Tente novamente.");
        return;
      }
      if (claimed !== true) {
        setClaimError("Este NFC não pôde ser ativado. Confira se o código pertence a uma vela sua e se já foi vinculado.");
        return;
      }
      try {
        if (window.sessionStorage.getItem("hiraeth:nfc:pending-token") === token) {
          window.sessionStorage.removeItem("hiraeth:nfc:pending-token");
        }
      } catch { /* A limpeza local não desfaz a validação já concluída no servidor. */ }
      setCanChoose(true); setShowChoice(true);
      toast.success("Portal NFC vinculado à sua conta!");
    } catch {
      setClaimError("Não foi possível verificar seu acesso agora. Tente novamente.");
    } finally {
      checkingAccess.current = false;
      setChecking(false);
    }
  }

  async function chooseHouse(house: HouseId | null) {
    if (!canChoose || choosing || checkingAccess.current) return;
    setChoosing(true);
    try {
      const { data, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !data.user) throw sessionError || new Error("Sessão indisponível");
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
      {errorMessage && <div role="status" className="mx-auto mt-6 max-w-lg rounded-xl border border-current/25 px-4 py-4 text-sm">
        <p>{errorMessage}{hasLoadedScores ? " Exibindo a última contagem disponível." : ""}</p>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}
          className="mt-3 min-h-11 rounded-full border border-current/50 px-5 py-2 font-semibold transition hover:bg-white/10 disabled:opacity-60">
          {refreshing ? "Atualizando..." : "Tentar novamente"}
        </button>
      </div>}
      <div className="mx-auto mt-9 grid max-w-2xl grid-cols-4 items-start gap-1.5 sm:gap-6">
          {HOUSES.map(house => <div key={house.id} className="flex min-w-0 flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-2xl shadow-[0_0_20px_rgba(0,0,0,0.25)] sm:h-[84px] sm:w-[84px] sm:text-4xl"
              style={{backgroundColor:house.background,borderColor:house.border}}
              role="img" aria-label={house.label}>
              <span aria-hidden="true">{house.animal}</span>
            </div>
            <h3 className="mt-4 min-h-8 text-center text-[11px] font-semibold leading-4 sm:min-h-0 sm:text-sm">{house.label}</h3>
            <p className={portal ? "mt-1 font-display text-2xl tabular-nums text-[#f6dfa8] sm:text-4xl" : "mt-1 font-display text-2xl tabular-nums sm:text-4xl"}>
              {loading || !hasLoadedScores ? "—" : percentage(scores[house.id] ?? 0, total) + "%"}
            </p>
          </div>)}
      </div>
      {!portal && !loading && !errorMessage && total === 0 && <p className="mt-5 text-xs text-muted-foreground">
        Seja uma das primeiras pessoas a representar sua casa.
      </p>}
      {claimError && <p role="alert" className={`mx-auto mt-5 max-w-lg text-sm font-semibold ${portal ? "text-[#ffdf9c]" : "text-foreground"}`}>{claimError}</p>}
      {showChoice && <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-[#b1bee9]/70 bg-[#f7efda] p-5 text-[#223047]">
        <h3 className="mb-2 font-display text-2xl">Escolha sua casa</h3>
        <p className="mb-4 text-sm">Agora que seu NFC foi validado, escolha a casa do seu selinho.</p>
        <HouseChoiceCards selected={null} onSelect={chooseHouse} busy={choosing} />
      </div>}
      <button type="button" onClick={() => void discoverHouse()} disabled={checking || choosing} aria-busy={checking}
        className={portal
          ? "mt-9 min-h-12 rounded-full border border-[#f0dba2] bg-[#e8d7a4] px-8 py-3 text-sm font-bold text-[#152045] shadow-[0_0_25px_rgba(233,211,151,0.18)] transition hover:bg-[#fff0ba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          : "btn-gold mt-9 min-h-12 rounded-full px-8 py-3 text-sm"}>
        {checking ? "Verificando acesso..." : "Descubra a sua casa"}
      </button>
    </div>
  </section>;
}
