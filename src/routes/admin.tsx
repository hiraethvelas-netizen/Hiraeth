import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Hiraeth" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/produtos", label: "Produtos" },
  { to: "/admin/promocoes", label: "Promoções" },
  { to: "/admin/essencias", label: "Estoque de essências" },
  { to: "/admin/categorias", label: "Categorias" },
  { to: "/admin/pedidos", label: "Pedidos" },
  { to: "/admin/avaliacoes", label: "Relatos do Acervo" },
  { to: "/admin/portais", label: "Portais NFC" },
  { to: "/admin/financeiro", label: "Financeiro" },
  { to: "/admin/aparencia", label: "Aparência" },
  { to: "/admin/sobre", label: "Sobre e contatos" },
  { to: "/admin/banners", label: "Banners da inicial" },
  { to: "/sobre", label: "Editar Conheça a Hiraeth" },
  { to: "/loja", label: "Editar página da loja" },
  { to: "/biblioteca", label: "Editar Biblioteca e favoritos" },
  { to: "/cuidados", label: "Editar cuidados com a vela" },

] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
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
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
          <Link to="/" className="font-display text-xl tracking-widest text-primary">HIRAETH</Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Administração</span>
          <Link to="/inicio" className="inline-flex items-center gap-2 border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary">Visualizar loja</Link>
          <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"} title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"} className="inline-flex items-center gap-2 border px-3 py-2 text-sm text-foreground transition-colors hover:border-primary">
            {darkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            {darkMode ? "Modo claro" : "Modo escuro"}
          </button>
          <nav className="ml-auto flex flex-wrap gap-4 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/admin" }}
                className="text-muted-foreground hover:text-primary [&.active]:text-primary"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
