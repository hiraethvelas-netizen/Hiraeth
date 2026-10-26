
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import phoenix from "@/assets/opening-phoenix.png";
import openingVideo from "@/assets/hira appVídeo sem título-26-10-2026, 13-46-2.mp4";
import portalPoster from "@/assets/opening-portal.jpg";

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
        poster={portalPoster}
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={openingVideo} type="video/mp4" />
      </video>

      <div className="opening-shade" aria-hidden="true" />

      <img
        src={phoenix}
        alt="Fênix Hiraeth"
        className="opening-seal"
      />

      <div className="opening-copy">
        <p className="opening-welcome">
          Bem-vindo ao Círculo do Fogo
        </p>

        <h1>O Portal Foi Aberto</h1>

        <p className="opening-description">
          Produtos literários dos seus universos favoritos.
        </p>

        <Button asChild variant="outline" className="opening-enter">
          <Link to="/loja">Atravessar o Portal</Link>
        </Button>
      </div>
    </main>
  );
}
