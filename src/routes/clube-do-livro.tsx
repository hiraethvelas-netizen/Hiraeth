import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/clube-do-livro")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({ meta: [{ title: "Clube do Livro — Hiraeth" }] }),
  component: ClubeDoLivro,
});

function ClubeDoLivro() {
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-4xl px-5 pb-20 pt-20">
    <section className="overflow-hidden border border-primary/25 bg-card">
      <div className="flex min-h-64 items-end bg-gradient-to-br from-[#17251b] via-[#3b3023] to-[#111b15] p-8 md:min-h-80 md:p-12">
        <div><p className="text-xs uppercase tracking-[0.35em] text-[#d5bd82]">Hiraeth apresenta</p><h1 className="mt-3 font-display text-5xl text-[#f5edda] md:text-7xl">Clube do Livro</h1><p className="mt-3 max-w-xl text-[#eee5d3]/80">Histórias que aproximam. Leituras que permanecem.</p></div>
      </div>
      <div className="px-6 py-12 text-center"><p className="eyebrow">Em breve</p><h2 className="mt-3 font-display text-3xl">Um novo capítulo está sendo escrito</h2><p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">Estamos preparando um espaço independente para compartilhar leituras, conversar sobre livros e viver novas experiências literárias. Em breve, mais novidades.</p></div>
    </section>
  </main><SiteFooter /></div>;
}
