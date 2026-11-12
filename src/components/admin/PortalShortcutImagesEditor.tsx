import { useMemo, useState } from "react";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { uploadSiteImage } from "@/lib/admin-edit";
import { PORTAL_SHORTCUTS, portalShortcutImage, updatePortalShortcutImage, type PortalShortcutKey } from "@/lib/portal-shortcuts";
import { toast } from "sonner";
import { isSafePortalUrl } from "@/lib/portal-experience";

type Props = { themeJson: string; onChange: (value: string) => void };

export function PortalShortcutImagesEditor({ themeJson, onChange }: Props) {
  const [cropping, setCropping] = useState<{ key: PortalShortcutKey; file: File } | null>(null);
  const [uploading, setUploading] = useState(false);
  const theme = useMemo(() => {
    try { return JSON.parse(themeJson || "{}") as unknown; } catch { return null; }
  }, [themeJson]);

  function update(key: PortalShortcutKey, image: string) {
    if (theme === null) {
      toast.error("Corrija o JSON nas configurações avançadas antes de alterar os atalhos.");
      return;
    }
    onChange(JSON.stringify(updatePortalShortcutImage(theme, key, image), null, 2));
  }

  return <section aria-label="Editar imagens dos atalhos redondos" className="relative z-10 rounded-xl border border-primary/35 bg-card p-4 md:p-5">
    <h3 className="font-display text-2xl text-foreground">Imagens dos atalhos do Portal NFC</h3>
    <p className="mt-2 max-w-xl text-sm text-muted-foreground">
      Escolha uma foto para cada bolinha. Os nomes aparecem abaixo das imagens. Sem foto, fica um símbolo discreto.
      Salve o portal ao terminar. Os links continuam os mesmos.
    </p>
    <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
      {PORTAL_SHORTCUTS.map(({ key, label }) => {
        const image = portalShortcutImage(theme, key);
        return <div key={key} className="min-w-0 rounded-lg border border-primary/25 p-3">
          <p className="mb-3 text-center text-sm font-medium text-foreground">{label}</p>
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#c6a65b] bg-[#24362c] text-center text-xs text-[#f7efda]">
            {image ? <img src={image} alt={"Prévia de " + label} className="h-full w-full object-cover" />
              : <span>Imagem em breve</span>}
          </div>
          <label className="mt-4 block text-xs font-medium text-foreground">Enviar imagem
            <input type="file" accept="image/jpeg,image/png,image/webp"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) setCropping({ key, file });
                event.currentTarget.value = "";
              }}
              className="mt-1 w-full text-xs text-foreground file:mr-2 file:rounded-full file:border-0 file:bg-[#e9e7d2] file:px-3 file:py-2 file:text-[#34402b]" />
          </label>
          <label className="mt-3 block text-xs font-medium text-foreground">Ou URL da imagem
            <input key={key + image} type="url" defaultValue={image}
              onBlur={event => {
                const url = event.currentTarget.value.trim();
                if (!url || isSafePortalUrl(url)) {
                  if (url !== image) update(key, url);
                } else {
                  toast.error("Insira uma URL HTTPS válida para esta imagem.");
                  event.currentTarget.value = image;
                }
              }}
              placeholder="Cole uma URL HTTPS completa"
              className="mt-1 w-full min-w-0 rounded-md border border-[#878e47] bg-[#fbf7eb] px-2 py-2 text-sm text-[#34402b] placeholder:text-[#625f4b]" />
          </label>
          {image && <button type="button" onClick={() => update(key, "")}
            className="mt-2 rounded-full border border-primary/40 px-3 py-1.5 text-xs text-foreground">
            Retirar imagem
          </button>}
        </div>;
      })}
    </div>
    {theme === null && <p role="alert" className="mt-3 text-xs text-destructive">Há um erro nas configurações avançadas; corrija o JSON antes de editar.</p>}
    {cropping && <div role="dialog" aria-modal="true" aria-label="Recortar imagem do atalho"
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/85 p-4">
      <div className="my-auto max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-xl bg-[#f7efda] p-5 text-[#22372b]">
        <ImageCropEditor source={cropping.file} aspect="square" squarePreview="circle"
          onCancel={() => setCropping(null)}
          onApply={async file => {
            if (uploading) return;
            setUploading(true);
            try {
              const url = await uploadSiteImage(file, "nfc-atalhos");
              update(cropping.key, url);
              setCropping(null);
              toast.success("Imagem enviada. Salve o portal para publicar.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
            } finally { setUploading(false); }
          }} />
        {uploading && <p className="mt-2 text-sm">Enviando...</p>}
      </div>
    </div>}
  </section>;
}
