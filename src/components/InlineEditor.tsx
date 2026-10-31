import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { uploadSiteImage, useAdminEdit } from "@/lib/admin-edit";

export type Field =
  | { name: string; label: string; type: "text" | "textarea"; help?: string }
  | { name: string; label: string; type: "image" | "images"; help?: string }
  | { name: string; label: string; type: "select"; options: readonly { value: string; label: string }[] }
  | { name: string; label: string; type: "checkbox" };

type Values = Record<string, unknown>;

/** Pencil button shown only to admins in edit mode; opens a viewport-centered form modal. */
export function InlineEditor({ label, fields, values, onSave, className = "" }: {
  label: string; fields: Field[]; values: Values; onSave: (v: Values) => Promise<void>; className?: string;
}) {
  const { editing } = useAdminEdit();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  const [form, setForm] = useState<Values>(values);
  const [busy, setBusy] = useState(false);
  if (!editing) return null;

  async function addImages(name: string, files: FileList | null, multiple: boolean) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadSiteImage(f, "inline"));
      setForm((p) => ({ ...p, [name]: multiple ? [...((p[name] as string[]) ?? []), ...urls] : urls[0] }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha no envio"); }
    setBusy(false);
  }

  async function saveChanges() {
    if (busy) return;
    setBusy(true);
    try {
      await onSave(form);
      toast.success("Alterações salvas.");
      setOpen(false);
    } catch (err) {
      toast.error("Não foi possível salvar: " + (err instanceof Error ? err.message : "erro"));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void saveChanges();
  }

  return (
    <>
      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setForm(values); setOpen(true); }}
        className={`inline-flex items-center gap-1.5 rounded-full border border-primary bg-background px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-primary hover:text-primary-foreground ${className}`}>
        <Pencil size={13} aria-hidden="true" /> Editar {label}
      </button>
      {typeof document !== "undefined" && createPortal(
        <dialog
          ref={dialogRef}
          onCancel={(event) => { event.preventDefault(); setOpen(false); }}
          aria-label={`Editar ${label}`}
          className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-hidden border-0 bg-transparent p-0 text-left text-foreground backdrop:bg-foreground/50 sm:max-h-[calc(100dvh-2rem)]"
        >
          <form onSubmit={submit}
            className="max-h-[calc(100dvh-1.5rem)] w-full space-y-4 overflow-y-auto overscroll-contain rounded-md border border-primary/30 bg-background p-5 text-foreground shadow-xl sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Editar {label}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            {fields.map((f) => {
              const v = form[f.name];
              if (f.type === "text" || f.type === "textarea") return (
                <label key={f.name} className="grid gap-1.5 text-sm">{f.label}
                  {f.type === "text"
                    ? <input value={(v as string) ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className="border bg-transparent px-3 py-2" />
                    : <textarea rows={6} value={(v as string) ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className="border bg-transparent px-3 py-2" />}
                  {f.help && <span className="text-xs text-muted-foreground">{f.help}</span>}
                </label>
              );
              if (f.type === "checkbox") return (
                <label key={f.name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />{f.label}</label>
              );
              if (f.type === "select") return (
                <label key={f.name} className="grid gap-1.5 text-sm">{f.label}
                  <select value={(v as string) ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className="border bg-background px-3 py-2">
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    {typeof v === "string" && /^https?:/.test(v) && !f.options.some((o) => o.value === v) && <option value={v}>Imagem enviada</option>}
                  </select>
                </label>
              );
              const multiple = f.type === "images";
              const list: string[] = multiple ? ((v as string[]) ?? []) : (v ? [v as string] : []);
              return (
                <div key={f.name} className="grid gap-1.5 text-sm">{f.label}
                  <input type="file" multiple={multiple} accept="image/jpeg,image/png,image/webp" aria-label={`Selecionar ${f.label.toLowerCase()}`} onClick={(e) => e.stopPropagation()} onChange={(e) => { const files = e.currentTarget.files; void addImages(f.name, files, multiple); e.currentTarget.value = ""; }} className="block w-full cursor-pointer rounded border bg-background px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-primary/40 file:bg-primary/10 file:px-4 file:py-2 file:font-medium file:text-primary hover:file:bg-primary/20" />
                  <div className="flex flex-wrap gap-2">
                    {list.map((url, i) => (
                      <div key={url + i} className="relative">
                        <img src={url} alt="" className="h-20 w-20 object-cover" />
                        <button type="button" aria-label="Remover imagem" onClick={() => setForm({ ...form, [f.name]: multiple ? list.filter((_, j) => j !== i) : "" })}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                  {f.help && <span className="text-xs text-muted-foreground">{f.help}</span>}
                </div>
              );
            })}
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className="bg-primary px-5 py-2.5 text-primary-foreground disabled:opacity-50">{busy ? "Salvando..." : "Salvar"}</button>
              <button type="button" onClick={() => setOpen(false)} className="border px-5 py-2.5">Cancelar</button>
            </div>
          </form>
        </dialog>,
        document.body
      )}
    </>
  );
}
