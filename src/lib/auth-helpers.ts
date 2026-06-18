import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "client";

export async function getCurrentRole(): Promise<AppRole | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id)
    .order("role", { ascending: true });
  if (error || !data || data.length === 0) return null;
  // admin takes precedence
  if (data.some((r) => r.role === "admin")) return "admin";
  return data[0].role as AppRole;
}
