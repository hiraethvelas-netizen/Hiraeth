import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NfcCodeIssuer({ portalSlug }: { portalSlug: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const url = code ? `https://hiraeth-oficial.lovable.app/portal/${encodeURIComponent(portalSlug)}?chave=${code}` : "";

  async function generate() {
    setBusy(true);
    setCode("");
    try {
      const { data, error } = await (supabase as any).rpc("create_house_nfc_access_code", { p_portal_slug: portalSlug });
      if (error || typeof data !== "string" || !/^[0-9a-f]{64}$/.test(data)) throw error ?? new Error("Código não disponível");
      setCode(data);
      toast.success("Link NFC individual criado! Grave-o em uma única vela.");
    } catch {
      toast.error("Não foi possível gerar o acesso NFC. Confira a permissão da conta administrativa.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado. Grave-o na tag NFC da vela correspondente.");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o link abaixo.");
    }
  }

  return <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-6" aria-label="Selos exclusivos via NFC">
    <p className="text-xs font-semibold uppercase tracking-widest text-primary">Ativação exclusiva</p>
    <h3 className="mt-2 font-display text-2xl">Selinhos das Casas por NFC</h3>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground">
      Gere um link diferente para cada vela física. Grave o link na etiqueta NFC daquela unidade.
      Só a primeira conta que ativar o código poderá desbloquear o selinho da casa.
    </p>
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      Atenção: a URL genérica do portal não comprova posse da vela e não libera selinho.
      Etiquetas antigas precisam ser regravadas com um link individual, ou o cliente precisará de um novo código de ativação.
      O código secreto só aparece quando é gerado. Guarde o link antes de sair.
    </p>
    <button type="button" onClick={() => void generate()} disabled={busy}
      className="mt-5 rounded-full border border-primary bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
      {busy ? "Gerando..." : "Gerar acesso NFC individual"}
    </button>
    {url && <div className="mt-5 rounded-lg border border-border bg-background p-4">
      <label className="text-xs font-semibold text-foreground" htmlFor="nfc-claim-url">Link exclusivo da vela — não divulgar publicamente</label>
      <textarea id="nfc-claim-url" rows={3} readOnly value={url}
        className="mt-2 w-full resize-none rounded border border-border bg-card p-3 font-mono text-xs text-foreground" onFocus={e => e.currentTarget.select()} />
      <button type="button" onClick={() => void copyLink()} className="mt-3 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-foreground">
        Copiar link para gravar NFC
      </button>
    </div>}
  </section>;
}
