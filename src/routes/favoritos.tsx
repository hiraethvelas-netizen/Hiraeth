import { createFileRoute, redirect } from "@tanstack/react-router";

/** Opens the shopper's saved products without changing the standard storefront. */
export const Route = createFileRoute("/favoritos")({
  beforeLoad: () => {
    throw redirect({ to: "/loja", search: { favoritos: "1" } });
  },
});
