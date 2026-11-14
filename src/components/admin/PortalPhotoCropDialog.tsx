import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ImageCropEditor } from "@/components/ImageCropEditor";

type Props = {
  title: string;
  source: string;
  onApply: (file: File) => Promise<void>;
  onCancel: () => void;
};

/** Keep this photo adjustment above the portal editor, including its mobile layout. */
export function PortalPhotoCropDialog({ title, source, onApply, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const cancelRef = useRef(onCancel);
  const [busy, setBusy] = useState(false);
  cancelRef.current = onCancel;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    activeRef.current = true;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      activeRef.current = false;
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  function cancel() {
    if (!busyRef.current) cancelRef.current();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Ajustar foto de ${title}`}
      aria-modal="true"
      aria-busy={busy}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-transparent p-3 text-foreground backdrop:bg-black/75 sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const controls = [
          ...dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ].filter(
          (element) => !element.closest("[hidden]") && getComputedStyle(element).display !== "none",
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog)
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="relative mx-auto my-2 w-full max-w-xl rounded-lg border border-primary/35 bg-card p-4 text-card-foreground shadow-2xl sm:my-4 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="min-w-0 break-words text-sm text-muted-foreground">{title}</p>
          <button
            type="button"
            aria-label="Fechar ajuste da foto"
            disabled={busy}
            onClick={cancel}
            className="shrink-0 rounded border border-primary/40 p-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <ImageCropEditor
          source={source}
          aspect="portrait"
          fit="contain"
          onCancel={cancel}
          onApply={async (file) => {
            // Canvas export is asynchronous; a cancelled editor must not upload later.
            if (!activeRef.current || busyRef.current) return;
            busyRef.current = true;
            setBusy(true);
            try {
              await onApply(file);
            } finally {
              busyRef.current = false;
              setBusy(false);
            }
          }}
        />
      </div>
    </dialog>
  );
}
