
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import openingVideo from "@/assets/hira appVídeo sem título-26-10-2026, 13-46-2.mp4";

export function CinematicOpening() {
  return (
    <main className="hiraeth-opening" aria-label="Abertura da Hiraeth">
      <video
        className="opening-video"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={openingVideo} type="video/mp4" />
      </video>

      <div className="opening-shade" aria-hidden="true" />

      <div className="opening-copy">
        <p className="opening-welcome">
          Bem-vindo ao Círculo do Fogo
        </p>

        <h1>O Portal Foi Aberto</h1>

        <p className="opening-description">
          Velas literárias e camisetas inspiradas nos universos que fazem parte de você.
        </p>

        <Button asChild variant="outline" className="opening-enter">
          <Link to="/inicio">Atravessar o Portal</Link>
        </Button>
      </div>
    </main>
  );
}
