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
