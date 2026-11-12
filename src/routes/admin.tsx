import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Hiraeth" }] }),
  component: AdminLayout,
});

const PRIMARY_NAV = [
  { to: "/admin", label: "Início" },
  { to: "/admin/portais", label: "Portais NFC" },
  { to: "/admin/aparencia", label: "Aparência" },
] as const;

// As rotas antigas continuam funcionando; apenas a navegação fica agrupada.
const ADMIN_GROUPS = [
  { label: "Catálogo", links: [
    { to: "/admin/produtos", label: "Produtos" },
    { to: "/admin/categorias", label: "Coleções e categorias" },
    { to: "/admin/essencias", label: "Estoque de essências" },
    { to: "/admin/promocoes", label: "Promoções" },
  ] },
  { label: "Vendas", links: [
    { to: "/admin/pedidos", label: "Pedidos" },
    { to: "/admin/expedicao", label: "Correio da Fênix · Expedição" },
    { to: "/admin/financeiro", label: "Financeiro" },
  ] },
  { label: "Relacionamento", links: [
    { to: "/admin/notificacoes", label: "Enviar notificações" },
    { to: "/admin/avaliacoes", label: "Relatos do Acervo" },
  ] },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const closeMobileMenu = () => { if (mobileMenuRef.current) mobileMenuRef.current.open = false; };
  const { isDark: darkMode, toggleTheme } = useTheme();

  useEffect(() => {
    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/auth", search: { redirect: "/admin" } });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
    }
    check();
  }, [navigate]);

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-display text-xl italic text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl text-foreground">Área restrita</h1>
          <p className="mt-3 text-muted-foreground">Esta área é reservada à administração da Hiraeth.</p>
          <Link to="/" className="btn-gold mt-6">Voltar à loja</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-primary/20 bg-background/95 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link to="/admin" className="font-display text-xl tracking-widest text-primary">HIRAETH</Link>
            <span className="hidden text-[10px] uppercase tracking-[.18em] text-muted-foreground sm:inline">Painel administrativo</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/inicio" className="rounded-full border border-primary/35 px-3 py-2 text-xs text-foreground transition-colors hover:border-primary sm:text-sm">Ver loja</Link>
            <button type="button" onClick={toggleTheme}
              aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
              title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/35 text-foreground transition-colors hover:border-primary">
              {darkMode ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>
          </div>
          <nav aria-label="Áreas do painel" className="hidden w-full items-center gap-2 border-t border-primary/15 pt-3 md:flex">
            {PRIMARY_NAV.map(item => <Link key={item.to} to={item.to}
              activeOptions={{ exact: item.to === "/admin" }}
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary [&.active]:bg-primary/10 [&.active]:text-primary">
              {item.label}
            </Link>)}
            {ADMIN_GROUPS.map(group => <details key={group.label} className="group relative">
              <summary className="cursor-pointer list-none rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary [&::-webkit-details-marker]:hidden">
                {group.label} <span aria-hidden="true">⌄</span>
              </summary>
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-primary/25 bg-background p-2 shadow-xl">
                {group.links.map(link => <Link key={link.to} to={link.to}
                  className="block rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary">
                  {link.label}
                </Link>)}
              </div>
            </details>)}
          </nav>
          <details ref={mobileMenuRef} className="w-full border-t border-primary/15 pt-2 md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
              <span>Menu do painel</span><span aria-hidden="true">☰</span>
            </summary>
            <nav aria-label="Menu do painel" className="mt-2 space-y-1 rounded-lg border border-primary/20 bg-card p-2">
              {PRIMARY_NAV.map(item => <Link key={item.to} to={item.to} onClick={closeMobileMenu}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary">
                {item.label}
              </Link>)}
              {ADMIN_GROUPS.map(group => <details key={group.label} className="rounded-lg border-t border-primary/15">
                <summary className="cursor-pointer list-none px-3 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  {group.label} <span aria-hidden="true">⌄</span>
                </summary>
                <div className="space-y-1 pb-2 pl-3">
                  {group.links.map(link => <Link key={link.to} to={link.to} onClick={closeMobileMenu}
                    className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary">
                    {link.label}
                  </Link>)}
                </div>
              </details>)}
            </nav>
          </details>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
