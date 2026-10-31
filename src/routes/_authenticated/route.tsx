import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  component: () => <Outlet />,
});
