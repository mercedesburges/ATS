import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User } from "lucide-react";

export const Route = createFileRoute("/app/portal/jobs/$jobId")({
  component: PortalJobCandidates,
});

function PortalJobCandidates() {
  const { jobId } = useParams({ from: "/app/portal/jobs/$jobId" });

  const { data: job } = useQuery({
    queryKey: ["portal-job", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id,title,area,clients(name)").eq("id", jobId).single();
      return data;
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["portal-candidates", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("id,full_name,photo_url,headline,years_experience,current_stage_id,job_stages!candidates_current_stage_id_fkey(name,color)")
        .eq("job_id", jobId)
        .eq("visibility", "published")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <Link to="/app/portal" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Volver a mis puestos</Link>
        <div className="flex justify-between items-end mt-2">
          <div>
            <p className="text-sm text-muted-foreground">{job?.clients?.name}</p>
            <h1 className="font-display text-4xl mt-1">{job?.title}</h1>
          </div>
          <span className="px-4 py-2 bg-white border border-border rounded-full text-sm font-medium">{candidates?.length ?? 0} candidatos</span>
        </div>
      </header>

      <section className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal">
        {candidates?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <User className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin candidatos publicados todavía</p>
            <p className="text-sm text-muted-foreground mt-2">Tu reclutadora los va a publicar acá cuando estén listos.</p>
          </div>
        )}
        {candidates?.map((c: any) => (
          <Link
            key={c.id}
            to="/app/portal/jobs/$jobId/candidates/$candidateId"
            params={{ jobId, candidateId: c.id }}
            className="group bg-white rounded-[24px] p-4 border border-border hover:border-primary/30 transition-all"
          >
            <div className="w-full aspect-[4/5] bg-stone-100 rounded-[18px] mb-4 overflow-hidden">
              {c.photo_url ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" /> : <div className="h-full grid place-items-center text-stone-400"><User className="size-12" /></div>}
            </div>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-2xl truncate">{c.full_name}</h3>
                <p className="text-muted-foreground text-sm truncate">{c.headline ?? `${c.years_experience ?? ""}Y exp`}</p>
              </div>
              {c.job_stages && (
                <span className="text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-bold bg-primary-soft text-primary shrink-0">
                  {c.job_stages.name}
                </span>
              )}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
