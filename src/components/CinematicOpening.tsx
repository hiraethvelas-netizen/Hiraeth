import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import forest from "@/assets/opening-forest.jpg";
import portal from "@/assets/opening-portal.jpg";
import phoenix from "@/assets/opening-phoenix.png";

export function CinematicOpening() {
  return (
    <main className="hiraeth-opening" aria-label="Abertura da Hiraeth">
      <div className="opening-scene opening-forest" aria-hidden="true">
        <img src={forest} alt="" fetchPriority="high" />
      </div>
      <div className="opening-scene opening-castle" aria-hidden="true">
        <img src={portal} alt="" fetchPriority="high" />
      </div>
      <div className="opening-shade" aria-hidden="true" />
      <img src={phoenix} alt="Fênix Hiraeth" className="opening-seal" />
      <div className="opening-copy">
        <p className="opening-welcome">Bem-vindo ao Círculo do Fogo</p>
        <h1>O Portal Foi Aberto</h1>
        <p className="opening-description">Produtos literários dos seus universos favoritos.</p>
        <Button asChild variant="outline" className="opening-enter">
          <Link to="/loja">Atravessê o Portal</Link>
        </Button>
      </div>
    </main>
  );
}