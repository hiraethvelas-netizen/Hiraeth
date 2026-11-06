import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  ctaText?: string | null;
  christmas?: boolean;
  onEnter: () => void;
};

/**
 * The NFC entrance retains its cinematic video. The title fades in during the
 * closing seconds and the entry button appears only in the final ~20% / 2s.
 * No early skip is offered, and playback failures never unlock the portal.
 */
export function PortalIntro({ title, subtitle, videoUrl, posterUrl, ctaText, christmas = false, onEnter }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showTitle, setShowTitle] = useState(false);
  const [nearlyFinished, setNearlyFinished] = useState(false);
  const [finished, setFinished] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  function updateProgress(video: HTMLVideoElement) {
    const { duration, currentTime } = video;
    if (!Number.isFinite(duration) || duration <= 0) return;
    // Reveal typography before the call to action, letting the video lead.
    setShowTitle(currentTime >= Math.max(duration * 0.60, duration - 3.2));
    setNearlyFinished(currentTime >= Math.max(duration * 0.80, duration - 2));
  }

  async function play() {
    const video = videoRef.current;
    if (!video) return;
    setNeedsTap(false);
    setFailed(false);
    try {
      if (video.error) video.load();
      await video.play();
    } catch {
      setNeedsTap(true);
    }
  }

  const showCopy = finished || nearlyFinished || showTitle || failed || needsTap || !videoUrl;
  const showEnter = (nearlyFinished || finished) && !failed;
  const showFeedback = failed || needsTap || !videoUrl;

  return (
    <div role="dialog" aria-modal="true" aria-label="Abertura cinematográfica do portal NFC"
      className={`portal-cinematic-intro${christmas ? " portal-cinematic-intro--christmas" : ""} fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#0c1d17]`}>
      {videoUrl ? <video
        ref={videoRef} src={videoUrl} poster={posterUrl ?? undefined}
        autoPlay muted playsInline preload="auto" controls={false} disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        className="absolute inset-0 h-full w-full object-cover"
        onTimeUpdate={event => updateProgress(event.currentTarget)}
        onEnded={() => { setFinished(true); setShowTitle(true); setNearlyFinished(true); setNeedsTap(false); setFailed(false); }}
        onError={() => { setFailed(true); setNeedsTap(false); setNearlyFinished(false); }}
        onLoadedData={event => {
          if (!finished && event.currentTarget.paused)
            void event.currentTarget.play().catch(() => setNeedsTap(true));
        }}
        aria-label="Vídeo cinematográfico de abertura da coleção"
      /> : posterUrl ? <img className="absolute inset-0 h-full w-full object-cover"
        src={posterUrl} alt="" /> : null}

      <div className="portal-intro-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="portal-intro-content relative z-10 flex min-h-full w-full flex-col items-center justify-end px-6 text-center">
        {showCopy && <div className="portal-intro-copy w-full max-w-2xl">
          <p className="portal-intro-eyebrow">
            {christmas ? "Hiraeth · Uma temporada encantada" : "Uma experiência Hiraeth"}
          </p>
          <h1 className="portal-intro-title">{title}</h1>
          {subtitle && <p className="portal-intro-subtitle">{subtitle}</p>}
        </div>}

        {showEnter && <button type="button" onClick={onEnter}
          className="portal-intro-enter portal-enter-cta mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full border px-8 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          <span>{ctaText || "Atravesse o Portal"}</span>
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5}/>
        </button>}

        {showFeedback && <div className="portal-intro-feedback mt-7 max-w-sm text-center">
          {failed ? <>
            <p role="alert">Não foi possível carregar o vídeo de abertura. Verifique a conexão e tente novamente.</p>
            <button type="button" onClick={() => void play()}
              className="portal-intro-retry mt-4 rounded-full border px-5 py-2 text-sm">
              Tentar reproduzir novamente
            </button>
          </> : !videoUrl ? <p role="status">
            O vídeo de abertura desta coleção ainda está sendo preparado. Configure-o na administração do portal.
          </p> : needsTap ? <>
            <p>Toque para iniciar a abertura.</p>
            <button type="button" onClick={() => void play()}
              className="portal-intro-retry mt-4 rounded-full border px-5 py-2 text-sm">
              Iniciar vídeo
            </button>
          </> : null}
        </div>}
      </div>
    </div>
  );
}
