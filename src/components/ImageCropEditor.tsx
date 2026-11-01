import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw, ZoomIn } from "lucide-react";
import { CROP_ASPECTS, getCropGeometry, type CropAspect } from "@/lib/image-crop";

type Props = {
  source: File | string;
  aspect: CropAspect;
  onApply: (file: File) => Promise<void>;
  onCancel: () => void;
};

/** Crops in the browser before upload: drag to reposition, zoom or turn the photo. */
export function ImageCropEditor({ source, aspect, onApply, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const frameWidth = aspect === "landscape" ? 1600 : 1000;
  const frameHeight = Math.round(frameWidth / CROP_ASPECTS[aspect]);

  useEffect(() => {
    let active = true;
    setImage(null);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setError("");
    const src = typeof source === "string" ? source : URL.createObjectURL(source);
    const nextImage = new Image();
    if (typeof source === "string") nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => {
      if (active) setImage(nextImage);
    };
    nextImage.onerror = () => {
      if (active) setError("Não foi possível abrir a imagem para edição. Se ela já estiver salva, envie o arquivo original novamente.");
    };
    nextImage.src = src;
    return () => {
      active = false;
      nextImage.onload = null;
      nextImage.onerror = null;
      if (typeof source !== "string") URL.revokeObjectURL(src);
    };
  }, [source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Este navegador não permite editar a imagem.");
      return;
    }
    const frame = getCropGeometry(
      image.naturalWidth, image.naturalHeight,
      frameWidth, frameHeight,
      zoom, rotation, offset.x, offset.y,
    );
    context.clearRect(0, 0, frameWidth, frameHeight);
    context.save();
    context.translate(frameWidth / 2 + frame.x, frameHeight / 2 + frame.y);
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(
      image,
      -image.naturalWidth * frame.scale / 2,
      -image.naturalHeight * frame.scale / 2,
      image.naturalWidth * frame.scale,
      image.naturalHeight * frame.scale,
    );
    context.restore();
  }, [frameHeight, frameWidth, image, offset.x, offset.y, rotation, zoom]);

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!image || saving) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX, y: event.clientY,
      offsetX: offset.x, offsetY: offset.y,
    };
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = event.currentTarget;
    if (!drag || !image || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const frame = getCropGeometry(
      image.naturalWidth, image.naturalHeight, frameWidth, frameHeight,
      zoom, rotation,
      drag.offsetX + (event.clientX - drag.x) * frameWidth / rect.width,
      drag.offsetY + (event.clientY - drag.y) * frameHeight / rect.height,
    );
    setOffset({ x: frame.x, y: frame.y });
  }

  function pointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function applyCrop() {
    const canvas = canvasRef.current;
    if (!canvas || !image || saving) return;
    setSaving(true);
    setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          canvas.toBlob(
            (result) => result ? resolve(result) : reject(new Error("Não foi possível gerar a foto recortada.")),
            "image/webp", 0.9,
          );
        } catch (cause) {
          reject(cause);
        }
      });
      const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
      await onApply(new File([blob], `hiraeth-recorte.${extension}`, { type: blob.type || "image/png" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o recorte.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4" aria-label="Editor de recorte da imagem">
      <div>
        <h2 className="font-display text-2xl">Ajustar foto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Arraste a foto para enquadrar. Ajuste o zoom e gire se desejar. Nas bolinhas, a prévia é circular. O recorte será aplicado antes de enviar.
        </p>
      </div>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={frameWidth}
          height={frameHeight}
          aria-label="Prévia da foto recortada. Arraste para ajustar a posição."
          role="img"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
          className={`block h-auto w-full max-w-[380px] cursor-grab touch-none border border-primary/30 bg-card active:cursor-grabbing ${aspect === "square" ? "rounded-full" : "rounded"}`}
          style={{ aspectRatio: String(CROP_ASPECTS[aspect]) }}
        />
      </div>
      {!image && !error && <p className="text-center text-sm text-muted-foreground">Carregando foto...</p>}
      <label className="grid gap-2 text-sm">
        <span className="flex items-center gap-2"><ZoomIn size={17} /> Zoom: {Math.round(zoom * 100)}%</span>
        <input
          type="range" min="1" max="3" step="0.05" value={zoom} disabled={!image || saving}
          aria-label="Aproximar ou afastar foto"
          onChange={(event) => {
            setZoom(Number(event.target.value));
            setOffset({ x: 0, y: 0 });
          }}
          className="w-full accent-primary"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!image || saving}
          onClick={() => { setRotation((previous) => (previous + 270) % 360); setOffset({ x: 0, y: 0 }); }}
          className="inline-flex items-center gap-2 rounded border border-primary/40 px-3 py-2 text-sm disabled:opacity-50"
        ><RotateCcw size={16} /> Girar à esquerda</button>
        <button type="button" disabled={!image || saving}
          onClick={() => { setRotation((previous) => (previous + 90) % 360); setOffset({ x: 0, y: 0 }); }}
          className="inline-flex items-center gap-2 rounded border border-primary/40 px-3 py-2 text-sm disabled:opacity-50"
        ><RotateCw size={16} /> Girar à direita</button>
        <button type="button" disabled={!image || saving}
          onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); }}
          className="rounded border border-primary/40 px-3 py-2 text-sm disabled:opacity-50"
        >Restaurar</button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!image || saving}
          onClick={() => void applyCrop()}
          className="rounded bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
        >{saving ? "Enviando recorte..." : "Aplicar recorte"}</button>
        <button type="button" disabled={saving} onClick={onCancel}
          className="rounded border border-primary/50 px-5 py-2.5 disabled:opacity-50"
        >Voltar sem alterar</button>
      </div>
    </div>
  );
}
