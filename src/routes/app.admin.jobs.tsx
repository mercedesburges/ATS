import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/app/admin/jobs")({
  component: JobsList,
});

function JobsList() {
  const { data: jobs } = useQuery({
    queryKey: ["all-jobs"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id,title,area,is_active,clients(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Todos los puestos</p>
        <h1 className="font-display text-4xl mt-1">Puestos</h1>
      </header>
      <section className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Briefcase className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin puestos</p>
            <p className="text-sm text-muted-foreground mt-2">Creá un puesto desde la ficha de un cliente.</p>
          </div>
        )}
        {jobs?.map((j: any) => (
          <Link key={j.id} to="/app/admin/jobs/$jobId" params={{ jobId: j.id }} className="bg-white rounded-3xl border border-border p-6 hover:border-primary/20">
            <p className="text-xs text-muted-foreground">{j.clients?.name}</p>
            <h3 className="font-display text-xl mt-2">{j.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{j.area}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
