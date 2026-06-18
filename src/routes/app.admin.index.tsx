import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Briefcase, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [clients, jobs, candidates] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("candidates").select("id", { count: "exact", head: true }),
      ]);
      return {
        clients: clients.count ?? 0,
        jobs: jobs.count ?? 0,
        candidates: candidates.count ?? 0,
      };
    },
  });

  const { data: recentJobs } = useQuery({
    queryKey: ["recent-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,title,is_active,clients(name)")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Clientes", value: stats?.clients ?? 0, icon: Building2, to: "/app/admin/clients" },
    { label: "Puestos abiertos", value: stats?.jobs ?? 0, icon: Briefcase, to: "/app/admin/jobs" },
    { label: "Candidatos", value: stats?.candidates ?? 0, icon: Users, to: "/app/admin/candidates" },
  ];

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Panel de la reclutadora</p>
        <h1 className="font-display text-4xl mt-1">Dashboard</h1>
      </header>

      <section className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-reveal">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group bg-white rounded-3xl p-6 border border-border hover:border-primary/20 transition-all"
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

      <section className="px-8 pb-8">
        <h2 className="font-display text-2xl mb-4">Puestos recientes</h2>
        <div className="bg-white rounded-3xl border border-border divide-y divide-border overflow-hidden">
          {recentJobs?.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Todavía no hay puestos. Creá tu primer cliente y puesto desde el menú.
            </div>
          )}
          {recentJobs?.map((j: any) => (
            <Link
              key={j.id}
              to="/app/admin/jobs/$jobId"
              params={{ jobId: j.id }}
              className="flex items-center justify-between p-5 hover:bg-stone-50 transition-colors"
            >
              <div>
                <p className="font-medium">{j.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{j.clients?.name}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${j.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                {j.is_active ? "Activo" : "Pausado"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
