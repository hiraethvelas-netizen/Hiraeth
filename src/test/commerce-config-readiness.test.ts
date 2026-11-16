import { describe, expect, it } from "vitest";
import { freightSetupIssues } from "../../supabase/functions/_shared/commerce-config-readiness";

const configured = {
  MELHOR_ENVIO_TOKEN: "mock-only",
  MELHOR_ENVIO_USER_AGENT: "Hiraeth Auditing/1.0 (teste@example.com)",
  MELHOR_ENVIO_ORIGIN_POSTAL_CODE: "88350-000",
  HIRAETH_PACKAGE_WIDTH_CM: "13",
  HIRAETH_PACKAGE_HEIGHT_CM: "13",
  HIRAETH_PACKAGE_LENGTH_CM: "16",
  HIRAETH_PACKAGE_TARE_GRAMS: "100",
};

const getFrom = (values: Record<string, string>) => (key: string) => values[key];

describe("Hiraeth — frete só fica pronto com pacote e integração configurados", () => {
  it("aceita caixa válida em Sandbox e em produção com tara", () => {
    expect(freightSetupIssues(getFrom(configured), "sandbox")).toEqual([]);
    expect(freightSetupIssues(getFrom(configured), "production")).toEqual([]);
  });

  it("bloqueia integração sem identificação de API, dimensões ou CEP", () => {
    const invalid = { ...configured, MELHOR_ENVIO_USER_AGENT: "",
      MELHOR_ENVIO_ORIGIN_POSTAL_CODE: "123", HIRAETH_PACKAGE_HEIGHT_CM: "0" };
    expect(freightSetupIssues(getFrom(invalid), "sandbox")).toEqual([
      "MELHOR_ENVIO_USER_AGENT", "MELHOR_ENVIO_ORIGIN_POSTAL_CODE",
      "HIRAETH_PACKAGE_HEIGHT_CM",
    ]);
  });

  it("exige tara física configurada para produção sem bloquear fallback do Sandbox", () => {
    const withoutTare = { ...configured, HIRAETH_PACKAGE_TARE_GRAMS: "" };
    expect(freightSetupIssues(getFrom(withoutTare), "sandbox")).toEqual([]);
    expect(freightSetupIssues(getFrom(withoutTare), "production")).toEqual([
      "HIRAETH_PACKAGE_TARE_GRAMS",
    ]);
  });

  it("rejeita caixa irreal e peso de embalagem inválido", () => {
    const bad = { ...configured, HIRAETH_PACKAGE_WIDTH_CM: "201",
      HIRAETH_PACKAGE_TARE_GRAMS: "-2" };
    expect(freightSetupIssues(getFrom(bad), "production")).toEqual([
      "HIRAETH_PACKAGE_WIDTH_CM", "HIRAETH_PACKAGE_TARE_GRAMS",
    ]);
  });
});
