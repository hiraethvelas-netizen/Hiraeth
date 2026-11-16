import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { visitFromPath, visitSessionKey } from "../lib/visitor-insights";

describe("Hiraeth — mensuração sem identificação de anônimos", () => {
  it("conta acesso à loja e reconhece portais permanentes", () => {
    expect(visitFromPath("/inicio")).toEqual({channel:"app",portalSlug:null});
    expect(visitFromPath("/loja")).toEqual({channel:"app",portalSlug:null});
    expect(visitFromPath("/comunidade")).toEqual({channel:"app",portalSlug:null});
    expect(visitFromPath("/portal/o-mundo-de-magia")).toEqual({
      channel:"portal",portalSlug:"o-mundo-de-magia",
    });
    expect(visitFromPath("/portal/o-mundo-de-magia/inspiracoes")).toEqual({
      channel:"portal",portalSlug:"o-mundo-de-magia",
    });
  });

  it("não registra rotas administrativas nem o login como acessos de clientes", () => {
    for (const path of ["/admin","/admin/dados","/auth","/privacidade","/seguranca",
      "/portal","/rota-inexistente"]) {
      expect(visitFromPath(path)).toBeNull();
    }
  });

  it("usa chave temporária por sessão, canal, dia e estado de login", () => {
    const visit = visitFromPath("/portal/o-mundo-de-magia")!;
    const first = visitSessionKey(visit,"visitor","2026-11-16");
    expect(first).toBe(visitSessionKey(visit,"visitor","2026-11-16"));
    expect(first).not.toBe(visitSessionKey(visit,"user-123","2026-11-16"));
    expect(first).not.toBe(visitSessionKey(visit,"visitor","2026-11-17"));
  });
});

describe("Hiraeth — CRM com proteção de dados", () => {
  const migration = readFileSync("supabase/migrations/20261116150000_admin_customer_insights.sql","utf8");
  const admin = readFileSync("src/routes/admin/dados.tsx","utf8");
  const account = readFileSync("src/routes/_authenticated/configuracoes.tsx","utf8");

  it("usa RPCs com checagem de papel admin, sem abrir dados de auth.users", () => {
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain("not public.has_role(auth.uid(), 'admin')");
    expect(migration).toContain("revoke all on function public.hiraeth_admin_customers");
    expect(migration).toContain("revoke all on function public.hiraeth_admin_customer_detail");
    expect(migration).toContain("to authenticated;");
    expect(migration).not.toContain("grant select on auth.users");
    expect(migration).toContain("enable row level security");
  });

  it("não cria identificador permanente para anônimos ou envia email/WhatsApp automático", () => {
    expect(migration).toContain("if v_user is not null then");
    expect(migration).toContain("auth.uid()");
    expect(admin).toContain('href={`mailto:${email}`}');
    expect(admin).toContain('https://wa.me/');
    expect(admin).toContain("marketing_opt_in");
    expect(account).toContain("hiraeth_marketing_opt_in: marketingOptIn");
    expect(account).toContain("checked={marketingOptIn}");
  });

  it("separa cadastros de visitas e informa limites de precisão", () => {
    expect(admin).toContain("Acessos ao aplicativo");
    expect(admin).toContain("Pessoas cadastradas");
    expect(admin).toContain("Contas que acessaram o app");
    expect(admin).toContain("Visitantes anônimos");
    expect(admin).toContain("não recupera acessos anteriores");
  });
});
