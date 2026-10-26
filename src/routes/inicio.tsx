import { createFileRoute } from "@tanstack/react-router";
import { ExistingHomepage } from "./index";

export const Route = createFileRoute("/inicio")({
  head: () => ({ meta: [{ title: "Círculo do Fogo — Hiraeth" }] }),
  component: ExistingHomepage,
});
