import { useEffect, useRef, useState } from "react";
import { Music2, Pause } from "lucide-react";

/**
 * A música é reproduzida exclusivamente pelo player oficial do Spotify.
 * O botão controla a reprodução por meio da API de iFrame do provedor.
 * Alguns navegadores/contas exigem tocar também no botão do player.
 */
const SPOTIFY_TRACK_URI = "spotify:track:6Lv7cJFhuQYRmjeI3QqaWp";
const SPOTIFY_TRACK_URL = "https://open.spotify.com/track/6Lv7cJFhuQYRmjeI3QqaWp";
const SPOTIFY_SCRIPT_URL = "https://open.spotify.com/embed/iframe-api/v1";

type PlaybackUpdate = { data?: { isPaused?: boolean } };
type SpotifyController = {
  play: () => void;
  pause: () => void;
  destroy: () => void;
  addListener: (
    event: "ready" | "playback_update",
    callback: (() => void) | ((event: PlaybackUpdate) => void),
  ) => void;
};
type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { width: string; height: number; uri: string },
    callback: (controller: SpotifyController) => void,
  ) => void;
};
type SpotifyWindow = Window & { onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void };

let spotifyApiPromise: Promise<SpotifyIframeApi> | null = null;

function spotifyIframeApi(): Promise<SpotifyIframeApi> {
  if (spotifyApiPromise) return spotifyApiPromise;

  spotifyApiPromise = new Promise<SpotifyIframeApi>((resolve, reject) => {
    const spotifyWindow = window as SpotifyWindow;
    const previousCallback = spotifyWindow.onSpotifyIframeApiReady;
    spotifyWindow.onSpotifyIframeApiReady = api => {
      previousCallback?.(api);
      resolve(api);
    };

    const script = document.createElement("script");
    script.src = SPOTIFY_SCRIPT_URL;
    script.async = true;
    script.addEventListener("error", () => {
      spotifyApiPromise = null;
      reject(new Error("Não foi possível carregar o player do Spotify."));
    });
    document.body.appendChild(script);
  });

  return spotifyApiPromise;
}

/** Bilhete musical próximo ao título, com reprodução controlada pelo Spotify. */
export function PortalReadingMusicNote() {
  const [visible, setVisible] = useState(false);
  const [requestedPlay, setRequestedPlay] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const playerHost = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyController | null>(null);
  const wantsPlay = useRef(false);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void spotifyIframeApi().then(api => {
      if (!alive || !playerHost.current) return;
      api.createController(
        playerHost.current,
        { width: "100%", height: 152, uri: SPOTIFY_TRACK_URI },
        spotifyController => {
          if (!alive) {
            spotifyController.destroy();
            return;
          }
          controller.current = spotifyController;
          spotifyController.addListener("ready", () => {
            if (!alive) return;
            setPlayerReady(true);
            if (wantsPlay.current) spotifyController.play();
          });
          spotifyController.addListener("playback_update", event => {
            if (!alive || typeof event.data?.isPaused !== "boolean") return;
            if (!event.data.isPaused) {
              wantsPlay.current = true;
              setRequestedPlay(true);
            }
          });
        },
      );
    }).catch(() => {
      if (alive) setPlayerError(true);
    });

    return () => {
      alive = false;
      controller.current?.pause();
      controller.current?.destroy();
      controller.current = null;
    };
  }, [visible]);

  function toggleMusic() {
    const next = !wantsPlay.current;
    wantsPlay.current = next;
    setRequestedPlay(next);
    if (!visible) {
      setVisible(true);
      return;
    }
    if (!controller.current) return;
    if (next) controller.current.play();
    else controller.current.pause();
  }

  return <div className="relative z-20 flex min-w-0 flex-col items-center gap-2">
    <button type="button"
      aria-label={requestedPlay ? "Pausar Runaway — AURORA" : "Tocar Runaway — AURORA"}
      aria-pressed={requestedPlay}
      aria-expanded={visible}
      aria-controls="portal-reading-music-note"
      onClick={toggleMusic}
      title={requestedPlay ? "Pausar a trilha sonora" : "Tocar a trilha sonora"}
      className={"inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d3b575]/75 bg-[#d3b575]/10 text-[#e8d09a] transition-colors hover:bg-[#d3b575]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7efda] " + (requestedPlay ? "ring-2 ring-[#d3b575]/45" : "")}>
      {requestedPlay ? <Pause size={18} aria-hidden="true" /> : <Music2 size={19} strokeWidth={1.65} aria-hidden="true" />}
    </button>
    {visible && <div id="portal-reading-music-note"
      className="w-[min(85vw,340px)] min-w-0 rounded-xl border border-[#d3b575]/35 bg-[#1b2d25]/95 px-3 py-3 text-center text-xs leading-relaxed text-[#f7efda] shadow-lg sm:text-sm">
      <p className="font-display text-lg italic text-[#ead0a0]">Sinta-se em casa.</p>
      <p className="mt-1">Deixe <strong>Runaway — AURORA</strong> acompanhar esta leitura.</p>
      <div ref={playerHost} className="mt-3 min-h-[152px] overflow-hidden rounded-lg"
        aria-label="Player oficial do Spotify para Runaway, de AURORA" />
      {!playerReady && !playerError && <p role="status" className="mt-2 text-[11px] text-[#f7efda]/75">Preparando a música...</p>}
      {playerError && <p role="alert" className="mt-2 text-[11px]">Não foi possível carregar o Spotify neste navegador.</p>}
      <p className="mt-2 text-[11px] text-[#f7efda]/80">
        Se não começar automaticamente, toque em reproduzir no Spotify.
      </p>
      <a href={SPOTIFY_TRACK_URL} target="_blank" rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-[#ead0a0] underline underline-offset-4">
        Abrir Runaway no Spotify
      </a>
    </div>}
  </div>;
}
