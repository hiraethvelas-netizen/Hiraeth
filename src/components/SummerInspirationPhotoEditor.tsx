import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, RotateCcw, RotateCw, X, ZoomIn } from "lucide-react";
import { SummerInspirationArtwork } from "@/components/SummerInspirationArtwork";
import type { SummerInspiration } from "@/lib/summer-inspirations";
import "./SummerInspirationExperience.css";
import "./SummerInspirationPhotoEditor.css";

type CropPatch = Pick<SummerInspiration, "image_x" | "image_y" | "image_zoom" | "image_rotation" | "image_fit">;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function SummerInspirationPhotoEditor({
  item,
  onChange,
  onUpload,
  uploading,
  onClose,
}: {
  item: SummerInspiration;
  onChange: (patch: Partial<SummerInspiration>) => void;
  onUpload: (file: File) => void | Promise<void>;
  uploading: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number; originalX: number; originalY: number } | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollBefore = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeys(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", handleKeys);
    return () => {
      document.body.style.overflow = scrollBefore;
      document.removeEventListener("keydown", handleKeys);
      previousFocus.current?.focus();
    };
  }, [onClose]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!item.image_url) return;
    pointerRef.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      originalX: item.image_x, originalY: item.image_y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = pointerRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = rect.width ? 100 * (event.clientX - drag.x) / rect.width : 0;
    const dy = rect.height ? 100 * (event.clientY - drag.y) / rect.height : 0;
    onChange({
      image_x: Math.round(clamp(drag.originalX + dx, -100, 100)),
      image_y: Math.round(clamp(drag.originalY + dy, -100, 100)),
    });
  }
  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerRef.current?.id === event.pointerId) pointerRef.current = null;
  }
  function reset() {
    onChange({ image_zoom: 1, image_rotation: 0, image_x: 0, image_y: 0, image_fit: "contain" });
  }
  function rotate(deg: number) {
    const next = item.image_rotation + deg;
    onChange({ image_rotation: next > 180 ? next - 360 : next < -180 ? next + 360 : next });
  }
  const markup = <div className="summer-image-editor__backdrop"
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="summer-image-editor" ref={dialogRef} role="dialog" aria-modal="true"
      aria-labelledby="summer-image-editor-title">
      <div className="summer-image-editor__header">
        <div>
          <p className="summer-image-editor__eyebrow">Portal de Verão · Inspirações</p>
          <h3 id="summer-image-editor-title">Editar foto · {item.title}</h3>
        </div>
        <button ref={closeRef} type="button" className="summer-image-editor__close"
          aria-label="Fechar editor de foto" onClick={onClose}><X size={21}/></button>
      </div>
      <div className="summer-image-editor__body">
        <div className="summer-image-editor__preview">
          <div className="summer-image-editor__stage" onPointerDown={startDrag}
            onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
            aria-label="Prévia circular da foto; arraste para ajustar a posição">
            <SummerInspirationArtwork item={item} className="summer-image-editor__artwork" />
          </div>
          <span>Prévia da bolinha</span>
          <p>Arraste a imagem para reposicionar dentro do círculo.</p>
        </div>

        <div className="summer-image-editor__controls">
          <label className="summer-image-editor__upload">
            <ImagePlus size={19} aria-hidden="true"/>
            {uploading ? "Enviando imagem original…" : item.image_url ? "Substituir fotografia" : "Enviar fotografia"}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void onUpload(file);
              }} />
          </label>
          <small>A foto original fica armazenada sem compressão nem recorte. JPG, PNG ou WebP, até 12 MB.</small>

          <label className="summer-image-editor__control">Enquadramento
            <select value={item.image_fit} onChange={e => onChange({image_fit: e.target.value as "contain" | "cover"})}>
              <option value="contain">Mostrar a vela inteira</option>
              <option value="cover">Preencher todo o círculo</option>
            </select>
          </label>

          <label className="summer-image-editor__control"><span><ZoomIn size={15}/> Zoom <strong>{Math.round(item.image_zoom * 100)}%</strong></span>
            <input type="range" min={0.8} max={3.5} step={0.05} value={item.image_zoom}
              onChange={e => onChange({image_zoom:Number(e.target.value)})}/>
          </label>
          <label className="summer-image-editor__control"><span>Posição horizontal <strong>{item.image_x}%</strong></span>
            <input type="range" min={-100} max={100} step={1} value={item.image_x}
              onChange={e => onChange({image_x:Number(e.target.value)})}/>
          </label>
          <label className="summer-image-editor__control"><span>Posição vertical <strong>{item.image_y}%</strong></span>
            <input type="range" min={-100} max={100} step={1} value={item.image_y}
              onChange={e => onChange({image_y:Number(e.target.value)})}/>
          </label>
          <label className="summer-image-editor__control"><span>Girar <strong>{item.image_rotation}°</strong></span>
            <input type="range" min={-180} max={180} step={1} value={item.image_rotation}
              onChange={e => onChange({image_rotation:Number(e.target.value)})}/>
          </label>
          <div className="summer-image-editor__buttons">
            <button type="button" onClick={() => rotate(-90)}><RotateCcw size={16}/> -90°</button>
            <button type="button" onClick={() => rotate(90)}><RotateCw size={16}/> +90°</button>
            <button type="button" onClick={reset}>Redefinir enquadramento</button>
          </div>
          <div className="summer-image-editor__footer">
            {item.image_url && <button type="button" className="summer-image-editor__remove"
              onClick={() => onChange({image_url:""})}>Remover foto</button>}
            <button type="button" className="summer-image-editor__done" onClick={onClose}>
              Aplicar enquadramento
            </button>
          </div>
          <small className="summer-image-editor__reminder">Para publicar no portal, clique em <strong>Salvar alterações</strong> no painel administrativo.</small>
        </div>
      </div>
    </div>
  </div>;

  return typeof document !== "undefined" ? createPortal(markup, document.body) : null;
}
