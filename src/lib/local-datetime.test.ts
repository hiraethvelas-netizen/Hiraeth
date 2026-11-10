import { describe, expect, it } from "vitest";
import { toLocalDateTime } from "./local-datetime";

describe("Datas dos formulários administrativos", () => {
  it("preserva o horário ao carregar UTC e salvar novamente no fuso local", () => {
    const local = "2026-11-10T12:30";
    const stored = new Date(local).toISOString();
    const fieldValue = toLocalDateTime(stored);
    expect(fieldValue).toBe(local);
    expect(new Date(fieldValue).toISOString()).toBe(stored);
  });

  it("usa o dia local ao atravessar a meia-noite UTC", () => {
    const local = "2026-11-10T23:45";
    expect(toLocalDateTime(new Date(local).toISOString())).toBe(local);
  });

  it("mantém datas ausentes e inválidas como campos vazios", () => {
    expect(toLocalDateTime(null)).toBe("");
    expect(toLocalDateTime(undefined)).toBe("");
    expect(toLocalDateTime("")).toBe("");
    expect(toLocalDateTime("invalid")).toBe("");
  });
});
