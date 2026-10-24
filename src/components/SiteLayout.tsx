import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const cart = useCart();
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5">
      <Link to="/" className="font-display text-2xl tracking-widest text-primary">
        HIRAETH
      </Link>
      <nav className="flex items-center gap-5 text-sm uppercase tracking-[0.2em] text-foreground/80">
        <Link to="/loja" className="hover:text-primary">Loja</Link>
        <Link to="/sobre" className="hover:text-primary">Sobre</Link>
        <Link to="/cuidados" className="hover:text-primary">Cuidados</Link>
        <Link to="/carrinho" className="hover:text-primary">
          Carrinho{cart.count > 0 ? ` (${cart.count})` : ""}
        </Link>
        <Link to="/biblioteca" className="hover:text-primary">Entrar</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
      <p className="font-display text-lg italic text-primary">Onde a Chama Acesa te Espera</p>
      <p className="mt-3">
        © {new Date().getFullYear()} Hiraeth ·{" "}
        <Link to="/privacidade" className="underline hover:text-primary">Privacidade</Link>
      </p>
    </footer>
  );
}

export function PageShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 pb-20 pt-32">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-5xl text-foreground">{title}</h1>
        <div className="mt-8 space-y-5 leading-relaxed text-foreground/85">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
