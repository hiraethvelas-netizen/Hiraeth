import { permanentPortalUrl } from "@/lib/portal-public-url";
import { toast } from "sonner";

/** The same permanent public URL is used on every NFC tag of this collection. */
export function CollectionNfcLink({ portalSlug }: { portalSlug: string }) {
  const publicUrl = permanentPortalUrl(portalSlug);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link da coleção copiado. Pode gravá-lo nas etiquetas NFC.");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o endereço no campo.");
    }
  }
  return <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-6" aria-label="Link NFC da coleção">
    <p className="text-xs font-semibold uppercase tracking-widest text-primary">Gravação de NFC</p>
    <h3 className="mt-2 font-display text-2xl">Um link permanente por coleção</h3>
    <p className="mt-2 text-sm leading-6 text-foreground">
      Grave o mesmo endereço em todas as etiquetas NFC desta coleção. O link é público,
      não exige código individual e permanece igual quando você altera nome, fotos,
      vídeos, textos ou playlist deste portal.
    </p>
    <label htmlFor="nfc-public-url" className="mt-4 block text-sm font-medium text-foreground">
      Endereço público — pronto para copiar
    </label>
    <input id="nfc-public-url" readOnly value={publicUrl}
      onFocus={event => event.currentTarget.select()}
      className="mt-2 w-full min-w-0 rounded border border-border bg-background p-3 font-mono text-xs text-foreground" />
    <button type="button" onClick={() => void copyLink()}
      className="mt-3 rounded-full border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
      Copiar link para gravar NFC
    </button>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">
      Use <strong>hiraeth-oficial.lovable.app</strong>, nunca o endereço privado
      <code> lovableproject.com</code>. A escolha da casa e o selo do Círculo do Fogo
      pertencem à conta da pessoa, sem ativação NFC.
    </p>
  </section>;
}
