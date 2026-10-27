import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import fenixImage from "@/assets/fenix.png";

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
{/* Menu de conta e acesso administrativo */}
<details className="relative w-fit">
  <summary
    className="flex cursor-pointer list-none items-center gap-2 text-sm text-foreground/85 transition-colors hover:text-primary [&::-webkit-details-marker]:hidden"
    aria-label="Abrir menu da conta"
    title="Conta"
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
  </summary>
  <div className="absolute left-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-md border border-primary/25 bg-background p-1.5 shadow-lg">
    <Link
      to="/biblioteca"
      className="block rounded px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary"
    >
      Minha conta
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