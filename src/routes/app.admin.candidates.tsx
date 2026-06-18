import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, X, Upload } from "lucide-react";

export const Route = createFileRoute("/app/admin/candidates")({
  component: CandidatesList,
});

function CandidatesList() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

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
      <header className="px-8 py-6 border-b border-border flex justify-between items-end">
        <div>
          <p className="text-sm text-muted-foreground">Talento en proceso</p>
          <h1 className="font-display text-4xl mt-1">Candidatos</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="size-4" /> Nuevo candidato
        </button>
      </header>
      <section className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {candidates?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Users className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin candidatos</p>
            <p className="text-sm text-muted-foreground mt-2">Sumá el primero asignándolo a un puesto activo.</p>
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

      {showNew && (
        <NewCandidateDialog
          onClose={() => setShowNew(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["all-candidates"] })}
        />
      )}
    </div>
  );
}

function NewCandidateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [jobId, setJobId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [years, setYears] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: activeJobs } = useQuery({
    queryKey: ["active-jobs-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,title,clients(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId) { toast.error("Elegí un puesto activo"); return; }
    setLoading(true);
    try {
      const { data: stages } = await supabase.from("job_stages").select("id,position").eq("job_id", jobId).eq("is_enabled", true).order("position");
      const firstStageId = stages?.[0]?.id;
      const { data: inserted, error } = await supabase.from("candidates").insert({
        job_id: jobId,
        full_name: fullName,
        email: email || null,
        headline: headline || null,
        years_experience: years ? parseInt(years) : null,
        current_stage_id: firstStageId,
      }).select("id").single();
      if (error) throw error;
      if (cv && inserted) {
        const path = `${inserted.id}/${cv.name}`;
        const { error: upErr } = await supabase.storage.from("cvs").upload(path, cv, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("cvs").createSignedUrl(path, 60 * 60 * 24 * 30);
        await supabase.from("candidates").update({ cv_url: signed?.signedUrl ?? null }).eq("id", inserted.id);
      }
      toast.success("Candidato creado.");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-background w-full max-w-lg rounded-3xl border border-border my-8">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-2xl">Nuevo candidato</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Asignar a puesto</label>
            <select required value={jobId} onChange={(e) => setJobId(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="">Seleccioná un puesto activo</option>
              {(activeJobs ?? []).map((j: any) => (
                <option key={j.id} value={j.id}>{j.clients?.name} — {j.title}</option>
              ))}
            </select>
            {activeJobs?.length === 0 && <p className="text-[11px] text-muted-foreground mt-1.5">No tenés puestos activos. Creá uno primero.</p>}
          </div>
          <Field label="Nombre completo" value={fullName} onChange={setFullName} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Años de experiencia" type="number" value={years} onChange={setYears} />
          </div>
          <Field label="Headline (ej: Senior Product Lead)" value={headline} onChange={setHeadline} />
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CV (PDF / DOC) — opcional</label>
            <label className="mt-1 flex items-center justify-center gap-2 cursor-pointer border border-dashed border-border rounded-2xl py-3 px-4 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">
              <Upload className="size-3.5" /> {cv ? cv.name : "Subir archivo"}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : "Crear candidato"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
    </div>
  );
}
