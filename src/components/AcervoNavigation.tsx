import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, X, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Category = {
  id: string; name: string; slug: string; parent_id: string | null;
  is_temporary?: boolean; starts_at?: string | null; ends_at?: string | null;
};

export function AcervoNavigation() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    void supabase.from("categories").select("id,name,slug,parent_id,is_temporary,starts_at,ends_at").eq("visible", true).order("position")
      .then(({ data }) => {
        if (!alive) return;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        setCategories(((data ?? []) as Category[]).filter((c) => !c.is_temporary || Boolean(c.starts_at && c.ends_at && c.starts_at <= today && c.ends_at >= today)));
      });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => categories.filter((c) => !c.parent_id).map((parent) => ({
    ...parent, children: categories.filter((c) => c.parent_id === parent.id),
  })), [categories]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    void navigate({ to: "/loja", search: { q: value } as never });
    setMenuOpen(false);
  }

  return (
    <div className="mx-auto mt-4 grid w-full max-w-5xl grid-cols-[1fr_auto] items-start gap-3 border-t border-primary/15 pt-3">
      {searchOpen ? <form onSubmit={submitSearch} role="search" className="flex min-w-0 items-center gap-2 rounded-full border border-primary/30 bg-card/70 px-4 py-2.5 focus-within:border-primary focus-within:shadow-[var(--glow)]">
        <Search size={18} className="shrink-0 text-primary" aria-hidden="true" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por aroma, livro, filme, série, música ou tema..." aria-label="Pesquisar no Acervo Hiraeth" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        <button type="submit" className="text-xs uppercase tracking-wider text-primary hover:opacity-75">Buscar</button>
        <button type="button" aria-label="Fechar pesquisa" onClick={() => setSearchOpen(false)} className="rounded-full p-1 text-muted-foreground hover:text-primary"><X size={16} /></button>
      </form> : <button type="button" aria-label="Abrir pesquisa do Acervo" title="Pesquisar no Acervo" onClick={() => setSearchOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-card/70 text-primary transition-colors hover:bg-primary/10"><Search size={19} aria-hidden="true" /></button>}
      <div className="relative">
        <button type="button" aria-label="Ver todas as categorias e subcategorias" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex h-11 items-center gap-1.5 rounded-full border border-primary/30 px-3 text-sm text-foreground transition-colors hover:bg-primary/10">
          <MoreHorizontal size={20} /><span className="hidden sm:inline">Acervo</span>
        </button>
        {menuOpen && <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[min(88vw,340px)] overflow-y-auto rounded-lg border border-primary/25 bg-background p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between"><p className="font-display text-xl">Todo o Acervo</p><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="rounded p-1 hover:bg-primary/10">×</button></div>
          <Link to="/loja" onClick={() => setMenuOpen(false)} className="mb-2 block border-b border-primary/15 px-2 py-2 text-sm text-primary">Ver todos os produtos</Link>
          {groups.map((parent) => <details key={parent.id} className="border-b border-primary/10 py-1.5" open={groups.length <= 4}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden"><ChevronDown size={15} className="text-primary" /> <span className="flex-1">{parent.name}</span></summary>
            <div className="pb-1 pl-6">
              <Link to="/loja" search={{ categoria: parent.slug } as never} onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm text-muted-foreground hover:text-primary">Todas de {parent.name}</Link>
              {parent.children.map((child) => <Link key={child.id} to="/loja" search={{ categoria: child.slug } as never} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-1.5 text-sm text-foreground/85 hover:text-primary"><ChevronRight size={13} /><span className="flex-1">{child.name}</span>{child.is_temporary && <span className="rounded border border-amber-600/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-amber-700">Temporária</span>}</Link>)}
            </div>
          </details>)}
          {categories.filter((c) => c.parent_id && !categories.some((p) => p.id === c.parent_id)).map((c) => <Link key={c.id} to="/loja" search={{ categoria: c.slug } as never} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-b border-primary/10 px-2 py-2 text-sm hover:text-primary"><span className="flex-1">{c.name}</span>{c.is_temporary && <span className="rounded border border-amber-600/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-amber-700">Temporária</span>}</Link>)}
        </div>}
      </div>
    </div>
  );
}
