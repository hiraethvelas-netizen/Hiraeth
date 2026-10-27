import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("hiraeth-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = saved ? saved === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", initialDark);
    setDark(initialDark);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("hiraeth-theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-1.5 rounded-full border border-primary/30 px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-primary/10 sm:px-3"
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <span aria-hidden="true">{dark ? "☼" : "☾"}</span>
      <span className="hidden sm:inline">{dark ? "Modo claro" : "Modo escuro"}</span>
    </button>
  );
}

export function SiteHeader() {
const cart = useCart();

return (
<header className="relative z-20 w-full border-b border-primary/20 bg-background/95 px-5 py-4 md:px-10">
<div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3">
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
      className="justify-self-center font-display text-2xl italic font-medium tracking-[0.02em] text-foreground sm:text-3xl md:text-4xl"
      aria-label="Hiraeth - início"
    >
      Hiraeth
    </Link>

    {/* Configurações da conta, tema e sacola de compras */}
    <div className="ml-auto flex items-center gap-3">
    <Link
      to="/configuracoes"
      className="flex items-center gap-1.5 text-sm text-foreground/85 transition-colors hover:text-primary"
      aria-label="Configurações da conta"
      title="Configurações da conta"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
      </svg>
      <span className="hidden lg:inline">Configurações</span>
    </Link>
    <Link
      to="/auth"
      search={{ redirect: "/admin" }}
      aria-label="Acesso administrativo"
      title="Acesso administrativo"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-primary/80 transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
    >
      <img src="/assets/fenix.png" alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
    </Link>
    <ThemeToggle />
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