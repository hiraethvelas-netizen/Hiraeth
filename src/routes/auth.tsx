import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getPostLoginDestination, getSafeInternalRedirect } from "@/lib/auth-routing";
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requested = getSafeInternalRedirect(redirect);
  const isAdminLogin = requested === "/admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "login") {
        localStorage.setItem("hiraeth-remember-session", rememberSession ? "true" : "false");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("Não foi possível identificar a conta autenticada.");
        const { data: adminRole, error: roleError } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        const isAdmin = !roleError && adminRole === true;
        if (isAdminLogin && !isAdmin) {
          await supabase.auth.signOut();
          setError("Esta área é reservada à administração da Hiraeth. Entre com a conta administrativa autorizada.");
          return;
        }
        await navigate({ to: getPostLoginDestination(requested, isAdmin) as never });
        return;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(requested === "/admin" ? "/inicio" : requested)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          await navigate({ to: getPostLoginDestination(requested, false) as never });
          return;
        }
        setMode("login");
        setMessage("Sua conta foi criada. Confira seu e-mail para confirmar o acesso e depois entre com suas credenciais.");
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
        <p className="eyebrow">{isAdminLogin ? "Acesso reservado" : "Círculo do Fogo"}</p>
        <h1 className="mt-2 text-4xl text-foreground">
          {isAdminLogin ? "Administração Hiraeth" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
        </h1>
        {isAdminLogin && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Entre com as credenciais da conta administrativa autorizada.</p>}

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
            <>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border bg-transparent px-4 py-3 pr-20 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-4 text-xs text-muted-foreground hover:text-primary" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {mode === "login" && <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} className="accent-primary" />Permanecer conectado neste dispositivo</label>}
            </>
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
              {!isAdminLogin && <button onClick={() => setMode("signup")} className="block w-full hover:text-primary">
                Ainda não tenho conta
              </button>}
            </>
          )}
          {mode !== "login" && (
            <button onClick={() => setMode("login")} className="block w-full hover:text-primary">
              Já tenho conta
            </button>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
