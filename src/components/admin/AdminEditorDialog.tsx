import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import { Toaster } from "sonner";

let openDialogs = 0;
let previousBodyOverflow = "";
const notificationHosts = new Map<HTMLDialogElement, (active: boolean) => void>();

function updateNotificationHost() {
  const topDialog = [...notificationHosts.keys()].at(-1);
  notificationHosts.forEach((update, dialog) => update(dialog === topDialog));
}

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  showTitle?: boolean;
  fallbackFocus?: () => HTMLElement | null;
};

/** Native top-layer dialogs keep the product editor and its photo editor stacked. */
export function AdminEditorDialog({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
  showTitle = true,
  fallbackFocus,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hasNotifications, setHasNotifications] = useState(false);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  const fallbackRef = useRef(fallbackFocus);
  onCloseRef.current = onClose;
  busyRef.current = busy;
  fallbackRef.current = fallbackFocus;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openDialogs++ === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    notificationHosts.set(dialog, setHasNotifications);
    updateNotificationHost();
    return () => {
      notificationHosts.delete(dialog);
      updateNotificationHost();
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      if (--openDialogs === 0) document.body.style.overflow = previousBodyOverflow;
      const target = trigger?.isConnected ? trigger : fallbackRef.current?.();
      target?.focus({ preventScroll: true });
    };
  }, []);

  function requestClose() {
    if (!busyRef.current) onCloseRef.current();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={showTitle ? titleId : undefined}
      aria-label={showTitle ? undefined : title}
      aria-busy={busy}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-transparent p-3 text-foreground backdrop:bg-black/65 sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }}
      onClickCapture={(event) => {
        // Sonner's close button has no type; in a nested photo dialog it must
        // dismiss its toast without implicitly submitting the product form.
        if (event.target instanceof Element && event.target.closest("button[data-close-button]")) {
          event.preventDefault();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      {hasNotifications && (
        <Toaster
          position="top-center"
          theme="light"
          closeButton
          containerAriaLabel="Avisos do editor"
          toastOptions={{
            closeButtonAriaLabel: "Fechar aviso",
            style: {
              background: "#f7efda",
              color: "#34402b",
              borderColor: "#59612f",
              fontFamily: "var(--font-body)",
            },
          }}
        />
      )}
      <div
        className={`relative mx-auto my-2 min-w-0 rounded-xl border border-primary/35 bg-card p-4 text-card-foreground shadow-2xl sm:my-4 sm:p-6 ${wide ? "max-w-5xl" : "max-w-xl"}`}
        style={{ "--primary": "#59612f", "--color-primary": "#59612f" } as CSSProperties}
      >
        <div className="sticky top-0 z-10 mb-5 flex items-start justify-between gap-3 bg-card py-2">
          {showTitle ? (
            <h2
              id={titleId}
              className="min-w-0 break-words font-display text-2xl text-foreground sm:text-3xl"
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={busy}
            onClick={requestClose}
            aria-label={`Fechar ${title}`}
            className="shrink-0 rounded border border-primary/40 p-2 text-foreground hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
