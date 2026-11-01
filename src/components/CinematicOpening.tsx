import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminEdit, useSiteContent } from "@/lib/admin-edit";
import openingVideo from "@/assets/hira appVídeo sem título-26-10-2026, 13-46-2.mp4";

type OpeningSettings = Record<string, unknown> & {
  phoenixVideoUrl: string;
  enabled: boolean;
};

const DEFAULT_SETTINGS: OpeningSettings = { phoenixVideoUrl: "", enabled: true };
const VISIT_KEY = "hiraeth-phoenix-opening-seen";

export function CinematicOpening() {
  const navigate = useNavigate();
  const { editing } = useAdminEdit();
  const [settings, saveSettings] = useSiteContent<OpeningSettings>("phoenix-cinematic-opening", DEFAULT_SETTINGS);
  const [draftUrl, setDraftUrl] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shortVisit, setShortVisit] = useState(false);
  const [complete, setComplete] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigated = useRef(false);

  const hasPhoenixVideo = settings.enabled && /^https?:\/\//i.test(settings.phoenixVideoUrl.trim());
  const duration = shortVisit ? 2700 : 10000;

  useEffect(() => {
    setShortVisit(window.sessionStorage.getItem(VISIT_KEY) === "yes");
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!hasPhoenixVideo || showEditor) return;
    if (reducedMotion) {
      setComplete(true);
      return;
    }
    const timeout = window.setTimeout(() => setComplete(true), duration);
    return () => window.clearTimeout(timeout);
  }, [hasPhoenixVideo, showEditor, duration, reducedMotion]);

  useEffect(() => {
    if (!complete || showEditor || navigated.current) return;
    navigated.current = true;
    window.sessionStorage.setItem(VISIT_KEY, "yes");
    const timeout = window.setTimeout(() => { void navigate({ to: "/inicio" }); }, 650);
    return () => window.clearTimeout(timeout);
  }, [complete, navigate, showEditor]);

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

  // The approved phoenix video must be hosted before replacing the existing opening.
  // Until then, preserve the original opening without any visual or behavioral changes.
  if (!hasPhoenixVideo) {
    return (
      <main className="hiraeth-opening" aria-label="Abertura da Hiraeth">
        <video className="opening-video" autoPlay muted playsInline loop preload="auto" aria-hidden="true" tabIndex={-1}>
          <source src={openingVideo} type="video/mp4" />
        </video>
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
        key={settings.phoenixVideoUrl}
        className="opening-video"
        src={settings.phoenixVideoUrl}
        autoPlay muted playsInline preload="auto"
        aria-hidden="true" tabIndex={-1}
        onEnded={() => setComplete(true)}
        onError={() => setComplete(true)}
      />
      <div className="hiraeth-phoenix-vignette" aria-hidden="true" />
      <div className={`hiraeth-phoenix-wordmark ${complete ? "is-leaving" : ""}`} aria-label="Hiraeth">HIRAETH</div>
      <div className={`hiraeth-phoenix-portal ${complete ? "is-opening" : ""}`} aria-hidden="true"><span /></div>
      <button className="hiraeth-phoenix-skip" type="button" onClick={() => setComplete(true)}>Pular abertura</button>
      {editing && <button type="button" className="hiraeth-phoenix-config" onClick={() => { setDraftUrl(settings.phoenixVideoUrl); setShowEditor(true); }}>Editar abertura</button>}
      {showEditor && renderEditor()}
    </main>
  );

  function renderEditor() {
    return (
      <div className="hiraeth-phoenix-editor" role="dialog" aria-modal="true" aria-label="Configurar vídeo da Fênix">
        <div className="hiraeth-phoenix-editor-panel">
          <h2>Vídeo da Fênix</h2>
          <p>Hospede o vídeo aprovado em um endereço MP4 público. A abertura antiga permanece disponível se este campo ficar vazio.</p>
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
