import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
const cart = useCart();

return (
<header className="relative z-20 w-full border-b border-primary/20 bg-background/95 px-5 py-4 md:px-10">
<div className="mx-auto grid max-w-7xl grid-cols-3 items-center">
{/* Minha conta */}
<Link
to="/biblioteca"
className="flex w-fit items-center gap-2 text-sm text-foreground/85 transition-colors hover:text-primary"
aria-label="Minha conta"
>
<svg
xmlns="http://www.w3.org/2000/svg"
width="22"
height="22"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="1.5"
strokeLinecap="round"
strokeLinejoin="round"
aria-hidden="true"
>
<circle cx="12" cy="8" r="4" />
<path d="M5 21v-2a7 7 0 0 1 14 0v2" />
</svg>
<span className="hidden sm:inline">Minha conta</span>
</Link>

    {/* Logo centralizada */}
    <Link
      to="/"
      className="justify-self-center font-display text-xl tracking-[0.18em] text-primary sm:text-2xl md:text-3xl"
      aria-label="Hiraeth - início"
    >
      HIRAETH
    </Link>

    {/* Sacola de compras */}
    <Link
      to="/carrinho"
      className="relative ml-auto flex items-center gap-2 text-sm text-foreground/85 transition-colors hover:text-primary"
      aria-label={`Sacola de compras${cart.count > 0 ? `, ${cart.count} itens` : ""}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 8h14l1 13H4L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <span className="hidden sm:inline">Sacola</span>
      {cart.count > 0 && (
        <span className="ml-[-4px] text-xs text-primary">
          {cart.count}
        </span>
      )}
    </Link>
  </div>
</header>

);
}

export function SiteFooter() {
return (
<footer className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
<p className="font-display text-lg italic text-primary">
Onde a Chama Acesa te Espera
</p>
<p className="mt-3">
© {new Date().getFullYear()} Hiraeth ·{" "}
<Link to="/privacidade" className="underline hover:text-primary">
Privacidade
</Link>
</p>
</footer>
);
}

export function PageShell({
eyebrow,
title,
children,
}: {
eyebrow: string;
title: string;
children: ReactNode;
}) {
return (
<div className="min-h-screen">
<SiteHeader />
<main className="mx-auto max-w-2xl px-6 pb-20 pt-12 md:pt-16">
<p className="eyebrow">{eyebrow}</p>
<h1 className="mt-2 text-5xl text-foreground">{title}</h1>
<div className="mt-8 space-y-5 leading-relaxed text-foreground/85">
{children}
</div>
</main>
<SiteFooter />
</div>
);
}