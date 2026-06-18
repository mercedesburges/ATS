import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Briefcase, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [clients, jobs] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return {
        clients: clients.count ?? 0,
        jobs: jobs.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Clientes", value: stats?.clients ?? 0, icon: Building2, to: "/app/admin/clients" },
    { label: "Puestos abiertos", value: stats?.jobs ?? 0, icon: Briefcase, to: "/app/admin/jobs" },
  ];

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Panel de la reclutadora</p>
        <h1 className="font-display text-4xl mt-1">Dashboard</h1>
      </header>

      <section className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-reveal">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group bg-white rounded-3xl p-6 border border-border hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="size-10 rounded-xl bg-primary/5 text-primary grid place-items-center">
                <c.icon className="size-5" />
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-6">{c.label}</p>
            <p className="font-display text-5xl mt-2">{c.value}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
