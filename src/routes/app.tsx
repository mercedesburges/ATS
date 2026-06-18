import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Briefcase, Users, LogOut, Building2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // load role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const role = roles?.some((r) => r.role === "admin") ? "admin" : (roles?.[0]?.role ?? null);
    return { user: data.user, role };
  },
  component: AppLayout,
});

function AppLayout() {
  const { user, role } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("first_name,last_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user.id]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const isAdmin = role === "admin";
  const adminNav = [
    { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/admin/clients", label: "Clientes", icon: Building2 },
    { to: "/app/admin/jobs", label: "Puestos", icon: Briefcase },
    { to: "/app/admin/candidates", label: "Candidatos", icon: Users },
  ];
  const clientNav = [
    { to: "/app/portal", label: "Mis Puestos", icon: Briefcase },
  ];
  const nav = isAdmin ? adminNav : clientNav;

  const initials = ((profile?.first_name?.[0] ?? user.email?.[0] ?? "?") + (profile?.last_name?.[0] ?? "")).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background font-body text-foreground">
      <aside className="w-64 border-r border-border p-6 flex flex-col gap-8 shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="size-8 bg-primary rounded-lg" />
          <span className="font-display text-xl tracking-tight">VIVIDTALENT</span>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/app/admin" && item.to !== "/app/portal" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${active ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground hover:bg-black/5"}`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl border border-border bg-white">
            <div className="size-9 rounded-full bg-accent-gold/20 grid place-items-center text-xs font-bold text-accent-gold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{profile?.first_name ?? user.email}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
