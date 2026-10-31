import { createFileRoute } from "@tanstack/react-router";
import { ExistingHomepage } from "./index";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/inicio")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({ meta: [{ title: "Círculo do Fogo — Hiraeth" }] }),
  component: ExistingHomepage,
});
