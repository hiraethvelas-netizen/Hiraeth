import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  subtitle?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  ctaText?: string | null;
  onEnter: () => void;
};

/**
 * Every NFC visit begins at the video. No skip, no time-based unlock and no
 * saved "already seen" flag. Entry only unlocks after the HTML video 'ended'
 * event. A network/autoplay problem never silently bypasses the opening.
 */
export function PortalIntro({ title,subtitle,videoUrl,posterUrl,ctaText,onEnter }:Props) {
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const [finished,setFinished]=useState(false);
  const [needsTap,setNeedsTap]=useState(false);
  const [failed,setFailed]=useState(false);

  useEffect(()=>{
    const original=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=original;};
  },[]);

  async function play() {
    const video=videoRef.current;
    if (!video) return;
    setNeedsTap(false);
    setFailed(false);
    try {
      if(video.error)video.load();
      await video.play();
    } catch {
      setNeedsTap(true);
    }
  }

  return <div role="dialog" aria-modal="true" aria-label="Abertura obrigatória do portal NFC"
    className="portal-cinematic-intro fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#0c1d17]">
    {videoUrl ? <video
      ref={videoRef} src={videoUrl} poster={posterUrl??undefined}
      autoPlay muted playsInline preload="auto" controls={false} disablePictureInPicture
      controlsList="nodownload nofullscreen noremoteplayback"
      className="absolute inset-0 h-full w-full object-cover"
      onEnded={()=>{setFinished(true);setNeedsTap(false);setFailed(false);}}
      onError={()=>{setFailed(true);setNeedsTap(false);}}
      onLoadedData={event=>{
        if (!finished && event.currentTarget.paused)
          void event.currentTarget.play().catch(()=>setNeedsTap(true));
      }}
      aria-label="Vídeo cinematográfico de abertura da coleção"
    /> : posterUrl ? <img className="absolute inset-0 h-full w-full object-cover"
      src={posterUrl} alt="" /> : null}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07140f]/95 via-[#0b1c16]/20 to-[#0b1c16]/40"/>
    <div className="relative z-10 flex min-h-full w-full flex-col items-center justify-end px-5 pb-[max(8vh,env(safe-area-inset-bottom))] text-center">
      {finished ? <>
        <p className="mb-3 text-xs uppercase tracking-[0.34em] text-[#d2c28d]">A passagem foi revelada</p>
        <h1 className="max-w-3xl font-display text-4xl text-[#f7efda] drop-shadow-xl md:text-6xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-lg text-sm text-[#f3ebd8]/85">{subtitle}</p>}
        <button type="button" onClick={onEnter}
          className="portal-enter-cta mt-7 min-h-12 rounded-full border border-[#d1b57c] bg-[#c8ad72] px-8 py-3 text-sm font-semibold uppercase tracking-[.14em] text-[#14251d] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f7efda]">
          {ctaText||"Atravesse o Portal"}
        </button>
      </> : <div className="max-w-lg rounded-2xl border border-[#e1c995]/20 bg-[#10251b]/75 px-6 py-5 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[.28em] text-[#e2ce99]">Uma passagem para outro universo</p>
        <p className="mt-2 font-display text-xl text-[#f7efda]">{title}</p>
        {failed ? <>
          <p role="alert" className="mt-3 text-sm text-[#f7efda]/90">
            Não foi possível carregar o vídeo de abertura. Verifique a conexão e tente novamente.
          </p>
          <button type="button" onClick={()=>void play()}
            className="mt-4 rounded-full border border-[#d1b57c] px-5 py-2 text-sm text-[#f7efda]">
            Tentar reproduzir novamente
          </button>
        </> : !videoUrl ? <p role="status" className="mt-3 text-sm text-[#f7efda]/90">
          O vídeo de abertura desta coleção ainda está sendo preparado. Configure-o na administração do portal.
        </p> : needsTap ? <>
          <p className="mt-3 text-sm text-[#f7efda]/90">Toque para iniciar a abertura.</p>
          <button type="button" onClick={()=>void play()}
            className="mt-4 rounded-full border border-[#d1b57c] px-5 py-2 text-sm text-[#f7efda]">
            Iniciar vídeo
          </button>
        </> : <p className="mt-3 text-sm text-[#f7efda]/75">Assista à abertura para atravessar o portal.</p>}
      </div>}
    </div>
  </div>;
}
