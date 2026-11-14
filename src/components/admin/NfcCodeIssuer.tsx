import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { permanentPortalUrl } from "@/lib/portal-public-url";
import { toast } from "sonner";

export function NfcCodeIssuer({ portalSlug }: { portalSlug: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const publicUrl = permanentPortalUrl(portalSlug);
  const individualUrl = code ? `${publicUrl}?chave=${code}` : "";

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do portal copiado. Pode gravar na etiqueta NFC.");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Toque no endereço para selecioná-lo.");
    }
  }

  async function generate() {
    setBusy(true);
    setCode("");
    try {
      const { data, error } = await (supabase as any)
        .rpc("create_house_nfc_access_code", { p_portal_slug: portalSlug });
      if (error || typeof data !== "string" || !/^[0-9a-f]{64}$/.test(data)) {
        throw error ?? new Error("Código não disponível");
      }
      setCode(data);
      toast.success("Link individual criado para esta unidade física.");
    } catch {
      toast.error("Não foi possível gerar o código individual. Verifique a permissão administrativa.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-6" aria-label="Links de gravação NFC">
    <p className="text-xs font-semibold uppercase tracking-widest text-primary">Gravação de NFC</p>
    <h3 className="mt-2 font-display text-2xl">Link permanente do portal</h3>
    <p className="mt-2 text-sm leading-6 text-foreground">
      Este é o endereço público correto para gravar nas etiquetas NFC. Ele foi criado
      com o portal e não muda ao editar nome, fotografias, vídeos, textos ou playlist.
    </p>
    <label htmlFor="nfc-public-url" className="mt-4 block text-sm font-medium text-foreground">
      Endereço público — pronto para copiar
    </label>
    <input id="nfc-public-url" readOnly value={publicUrl}
      onFocus={event => event.currentTarget.select()}
      className="mt-2 w-full min-w-0 rounded border border-border bg-background p-3 font-mono text-xs text-foreground" />
    <button type="button" onClick={() => void copyLink(publicUrl)}
      className="mt-3 rounded-full border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
      Copiar link para gravar NFC
    </button>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">
      Use sempre o domínio <strong>hiraeth-oficial.lovable.app</strong>, nunca o endereço
      privado de pré-visualização <code>lovableproject.com</code>.
      Selos das casas já podem ser escolhidos no cadastro normal; a cliente não precisa ter um NFC individual.
    </p>

    <details className="mt-5 border-t border-primary/20 pt-4">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Avançado: criar link individual de uma unidade física (opcional)
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Esta opção adiciona um código único ao mesmo endereço permanente do portal.
        Reserve-a para experiências individuais com uma vela física; não é necessária
        para abrir o portal nem para escolher o selo da casa.
      </p>
      <button type="button" onClick={() => void generate()} disabled={busy}
        className="mt-3 rounded-full border border-primary/60 px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50">
        {busy ? "Gerando..." : "Gerar código individual (opcional)"}
      </button>
      {individualUrl && <div className="mt-4 rounded-lg border border-border bg-background p-4">
        <label htmlFor="nfc-claim-url" className="text-xs font-semibold text-foreground">
          Link individual desta vela — não divulgar publicamente
        </label>
        <textarea id="nfc-claim-url" rows={3} readOnly value={individualUrl}
          className="mt-2 w-full resize-none rounded border border-border bg-card p-3 font-mono text-xs text-foreground"
          onFocus={event => event.currentTarget.select()} />
        <button type="button" onClick={() => void copyLink(individualUrl)}
          className="mt-3 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-foreground">
          Copiar link individual
        </button>
      </div>}
    </details>
  </section>;
}
