import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export const Route = createFileRoute("/app/admin/candidates")({
  component: CandidatesList,
});

function CandidatesList() {
  const { data: candidates } = useQuery({
    queryKey: ["all-candidates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("id,full_name,headline,photo_url,visibility,years_experience,jobs(title,clients(name))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Talento en proceso</p>
        <h1 className="font-display text-4xl mt-1">Candidatos</h1>
      </header>
      <section className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {candidates?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Users className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin candidatos</p>
          </div>
        )}
        {candidates?.map((c: any) => (
          <Link key={c.id} to="/app/admin/candidates/$candidateId" params={{ candidateId: c.id }} className="bg-white rounded-3xl border border-border p-4 hover:border-primary/20">
            <div className="aspect-[4/5] bg-stone-100 rounded-2xl mb-3 overflow-hidden">
              {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full grid place-items-center text-stone-400 text-xs uppercase tracking-widest">Sin foto</div>}
            </div>
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <h3 className="font-display text-xl truncate">{c.full_name}</h3>
                <p className="text-xs text-muted-foreground truncate">{c.jobs?.clients?.name} · {c.jobs?.title}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${c.visibility === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {c.visibility === "published" ? "Visible" : "Borrador"}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
