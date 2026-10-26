import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/SiteLayout";

type Search = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Hiraeth" },
      { name: "description", content: "Acesse sua conta Hiraeth ou crie uma nova." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  const destination = redirect && redirect.startsWith("/") ? redirect : "/biblioteca";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: destination });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setWelcomeName(name.trim().split(/\s+/)[0] || "viajante");
        if (!data.session) {
          setMessage("Sua conta foi criada. Confira seu e-mail para confirmar o acesso ao Círculo.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("Enviamos um link de recuperação para seu e-mail.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 pb-20 pt-32">
        {welcomeName ? (
          <section className="relative overflow-hidden border border-primary/40 bg-card px-7 py-10 text-center shadow-xl">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.35), transparent 68%)" }} />
            <div className="relative">
              <p className="eyebrow">O portal foi aberto</p>
              <div aria-hidden="true" className="mx-auto my-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/50 text-4xl text-primary">✦</div>
              <h1 className="text-4xl text-foreground">Olá, {welcomeName}.</h1>
              <p className="mt-4 text-lg italic text-primary">Seja bem-vindo ao Círculo do Fogo.</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">Sua história agora também faz parte da Hiraeth. Há novos mundos esperando para serem descobertos.</p>
              {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
              <button type="button" onClick={() => navigate({ to: destination })} className="btn-gold mt-7 w-full justify-center">Entrar no Círculo</button>
            </div>
          </section>
        ) : <>
        <p className="eyebrow">Círculo do Fogo</p>
        <h1 className="mt-2 text-4xl text-foreground">
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              required
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          )}
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              required
              minLength={6}
              placeholder="Senha (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <button type="submit" disabled={loading} className="btn-gold w-full justify-center">
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : mode === "signup"
                  ? "Criar conta"
                  : "Enviar link"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              <button onClick={() => setMode("forgot")} className="block w-full hover:text-primary">
                Esqueci minha senha
              </button>
              <button onClick={() => setMode("signup")} className="block w-full hover:text-primary">
                Ainda não tenho conta
              </button>
            </>
          )}
          {mode !== "login" && (
            <button onClick={() => setMode("login")} className="block w-full hover:text-primary">
              Já tenho conta
            </button>
          )}
        </div>
        </>}
      </main>
      <SiteFooter />
    </div>
  );
}
