import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminEdit, useSiteContent } from "@/lib/admin-edit";
import phoenixVideo from "@/assets/VID_20261101_191613.mp4";
import hiraethWordmark from "@/assets/hiraeth-wordmark.svg";

type OpeningSettings = Record<string, unknown> & {
  phoenixVideoUrl: string;
  enabled: boolean;
};

const DEFAULT_SETTINGS: OpeningSettings = { phoenixVideoUrl: "", enabled: true };

export function CinematicOpening() {
  const navigate = useNavigate();
  const { editing } = useAdminEdit();
  const [settings, saveSettings] = useSiteContent<OpeningSettings>("phoenix-cinematic-opening", DEFAULT_SETTINGS);
  const [draftUrl, setDraftUrl] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigated = useRef(false);

  const publicVideoUrl = settings.phoenixVideoUrl.trim();
  const videoSrc = /^https?:\/\//i.test(publicVideoUrl) ? publicVideoUrl : phoenixVideo;
  const hasPhoenixVideo = settings.enabled;
  const maxDuration = 30000;

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!hasPhoenixVideo || showEditor) return;
    if (reducedMotion) {
      setComplete(true);
      return;
    }
    const timeout = window.setTimeout(() => setComplete(true), maxDuration);
    return () => window.clearTimeout(timeout);
  }, [hasPhoenixVideo, showEditor, reducedMotion]);

  useEffect(() => {
    if (!complete || showEditor || navigated.current) return;
    navigated.current = true;
    const timeout = window.setTimeout(() => { void navigate({ to: "/inicio" }); }, reducedMotion ? 0 : 1050);
    return () => window.clearTimeout(timeout);
  }, [complete, navigate, showEditor, reducedMotion]);

  async function saveVideo() {
    setSaving(true);
    setError("");
    try {
      const url = draftUrl.trim();
      if (url && !/^https?:\/\//i.test(url)) throw new Error("Informe um endereço HTTPS válido para o vídeo.");
      await saveSettings({ ...settings, phoenixVideoUrl: url });
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  // The approved phoenix video is bundled locally; an admin may optionally override its URL.
  // The original opening remains available if the cinematic entrance is disabled.
  if (!hasPhoenixVideo) {
    return (
      <main className="hiraeth-opening" aria-label="Abertura da Hiraeth">
        <video className="opening-video" src={phoenixVideo} autoPlay muted playsInline loop preload="auto" aria-hidden="true" tabIndex={-1} />
        <div className="opening-shade" aria-hidden="true" />
        <div className="opening-copy">
          <p className="opening-welcome">Bem-vindo ao Círculo do Fogo</p>
          <h1>O Portal Foi Aberto</h1>
          <p className="opening-description">Velas literárias e camisetas inspiradas nos universos que fazem parte de você.</p>
          <Button asChild variant="outline" className="opening-enter"><Link to="/inicio">Atravessar o Portal</Link></Button>
          {editing && <button type="button" className="mt-4 block w-full text-sm underline" onClick={() => { setDraftUrl(settings.phoenixVideoUrl); setShowEditor(true); }}>Configurar nova abertura da Fênix</button>}
        </div>
        {showEditor && renderEditor()}
      </main>
    );
  }

  return (
    <main className="hiraeth-opening hiraeth-phoenix-intro" aria-label="Abertura cinematográfica da Hiraeth">
      <video
        ref={videoRef}
        key={videoSrc}
        className={`opening-video ${complete ? "is-zooming" : ""}`}
        src={videoSrc}
        autoPlay muted playsInline preload="auto"
        aria-hidden="true" tabIndex={-1}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          const duration = video.duration;
          // Stop before the end of the source so its final scene never appears.
          if (!complete && Number.isFinite(duration) && duration >= 2.5 && video.currentTime >= duration - Math.min(1.2, duration * 0.22)) {
            video.pause();
            setComplete(true);
          }
        }}
        onEnded={() => setComplete(true)}
        onError={() => setComplete(true)}
      />
      <div className="hiraeth-phoenix-vignette" aria-hidden="true" />
      <img src={hiraethWordmark} className={`hiraeth-phoenix-wordmark ${complete ? "is-leaving" : ""}`} alt="Hiraeth" />
      <div className={`hiraeth-phoenix-curtain ${complete ? "is-closing" : ""}`} aria-hidden="true" />
      {!complete && <button className="hiraeth-phoenix-skip" type="button" onClick={() => setComplete(true)}>Pular abertura</button>}
      {editing && <button type="button" className="hiraeth-phoenix-config" onClick={() => { setDraftUrl(settings.phoenixVideoUrl); setShowEditor(true); }}>Editar abertura</button>}
      {showEditor && renderEditor()}
    </main>
  );

  function renderEditor() {
    return (
      <div className="hiraeth-phoenix-editor" role="dialog" aria-modal="true" aria-label="Configurar vídeo da Fênix">
        <div className="hiraeth-phoenix-editor-panel">
          <h2>Vídeo da Fênix</h2>
          <p>O vídeo atual da Fênix já está incluído no aplicativo. Para usar outro MP4, informe uma URL pública. Deixe vazio para usar o vídeo atual.</p>
          <label htmlFor="phoenix-video-url">URL pública do vídeo MP4</label>
          <input id="phoenix-video-url" type="url" value={draftUrl} onChange={e => setDraftUrl(e.target.value)} placeholder="https://.../fenix.mp4" />
          {error && <p role="alert">{error}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button type="button" onClick={() => setShowEditor(false)}>Cancelar</button>
            <button type="button" disabled={saving} onClick={() => void saveVideo()}>{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      </div>
    );
  }
}
