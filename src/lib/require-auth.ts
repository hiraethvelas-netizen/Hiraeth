import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AuthGuardContext = {
  location: {
    href: string;
  };
};

export async function requireAuthenticatedUser({ location }: AuthGuardContext): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({
      to: "/auth",
      search: { redirect: location.href },
    });
  }
}

/**
 * UI navigation guard for the unpublished automatic checkout. This does NOT
 * replace the server-side admin check in commerce-checkout, which must also
 * be deployed before any automated payments can be enabled.
 */
export async function requireAdminForCheckout({ location }: AuthGuardContext): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/auth", search: { redirect: location.href } });
  }
  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  if (roleError || isAdmin !== true) throw redirect({ to: "/pedido-whatsapp" });
}
