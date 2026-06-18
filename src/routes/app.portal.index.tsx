import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Building2 } from "lucide-react";

export const Route = createFileRoute("/app/portal/")({
  component: PortalJobs,
});

function PortalJobs() {
  const { data: jobs } = useQuery({
    queryKey: ["portal-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,title,area,clients(name,industry)")
        .eq("is_active", true);
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Tu portal de búsquedas</p>
        <h1 className="font-display text-4xl mt-1">Seleccioná un puesto</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Estos son los puestos abiertos donde estás presentando candidatos. Elegí uno para ver el panorama completo de personas en proceso.
        </p>
      </header>

      <section className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal">
        {jobs?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Briefcase className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Aún no tenés puestos asignados</p>
            <p className="text-sm text-muted-foreground mt-2">Tu reclutadora te avisará por email cuando haya candidatos para revisar.</p>
          </div>
        )}
        {jobs?.map((j: any) => (
          <Link
            key={j.id}
            to="/app/portal/jobs/$jobId"
            params={{ jobId: j.id }}
            className="group bg-white rounded-3xl border border-border p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Building2 className="size-3" />
              {j.clients?.name}
            </div>
            <h3 className="font-display text-3xl group-hover:text-primary transition-colors">{j.title}</h3>
            {j.area && <p className="text-sm text-muted-foreground mt-2">{j.area}</p>}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ver candidatos</span>
              <span className="text-primary text-sm font-bold">→</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
