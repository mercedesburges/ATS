import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, X, Upload, Sparkles, Linkedin } from "lucide-react";
import { parseCv } from "@/lib/cv.functions";

export const Route = createFileRoute("/app/admin/candidates/")({
  component: CandidatesList,
});

function CandidatesList() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState("");

  const { data: candidates } = useQuery({
    queryKey: ["all-candidates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("id,full_name,headline,photo_url,visibility,years_experience,expertise,city,country,job_id,jobs(id,title,client_id,clients(id,name))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const clients = useMemo(() => {
    const m = new Map<string, string>();
    candidates?.forEach((c: any) => {
      if (c.jobs?.clients?.id) m.set(c.jobs.clients.id, c.jobs.clients.name);
    });
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [candidates]);

  const jobs = useMemo(() => {
    const m = new Map<string, { id: string; title: string; clientId: string }>();
    candidates?.forEach((c: any) => {
      if (c.jobs?.id) m.set(c.jobs.id, { id: c.jobs.id, title: c.jobs.title, clientId: c.jobs.client_id });
    });
    return Array.from(m.values()).filter((j) => !clientFilter || j.clientId === clientFilter);
  }, [candidates, clientFilter]);

  const expertises = useMemo(() => {
    const s = new Set<string>();
    candidates?.forEach((c: any) => { if (c.expertise) s.add(c.expertise); });
    return Array.from(s).sort();
  }, [candidates]);

  const filtered = candidates?.filter((c: any) => {
    if (clientFilter && c.jobs?.clients?.id !== clientFilter) return false;
    if (jobFilter && c.job_id !== jobFilter) return false;
    if (expertiseFilter && c.expertise !== expertiseFilter) return false;
    return true;
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border flex justify-between items-end flex-wrap gap-3">
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

      <div className="px-8 pt-6 flex flex-wrap gap-3 items-center">
        <select
          value={clientFilter}
          onChange={(e) => { setClientFilter(e.target.value); setJobFilter(""); }}
          className="bg-white border border-border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="bg-white border border-border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas las posiciones</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        {(clientFilter || jobFilter) && (
          <button onClick={() => { setClientFilter(""); setJobFilter(""); }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <X className="size-3" /> Limpiar filtros
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered?.length ?? 0} candidato(s)</span>
      </div>

      <section className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Users className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin candidatos</p>
            <p className="text-sm text-muted-foreground mt-2">Sumá el primero asignándolo a un puesto activo.</p>
          </div>
        )}
        {filtered?.map((c: any) => (
          <Link key={c.id} to="/app/admin/candidates/$candidateId" params={{ candidateId: c.id }} className="bg-white rounded-2xl border border-border p-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 bg-stone-100 rounded-full overflow-hidden">
                {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full grid place-items-center text-stone-400 text-[9px] uppercase tracking-wider">N/A</div>}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base truncate">{c.full_name}</h3>
                <p className="text-[11px] text-muted-foreground truncate">{c.jobs?.clients?.name} · {c.jobs?.title}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground truncate">{c.headline || "—"}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${c.visibility === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
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
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [jobId, setJobId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [headline, setHeadline] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const parseCvFn = useServerFn(parseCv);

  const { data: activeJobs } = useQuery({
    queryKey: ["active-jobs-min"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id,title,clients(name)").eq("is_active", true).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function handleCvUpload(file: File) {
    setCv(file);
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const result = await parseCvFn({ data: { fileBase64: b64, mimeType: file.type || "application/pdf", fileName: file.name } });
      setFullName(result.full_name || "");
      setEmail(result.email || "");
      setPhone(result.phone || "");
      setLinkedin(result.linkedin_url || "");
      toast.success("CV analizado. Revisá los datos.");
      setStep("review");
    } catch (err: any) {
      toast.error(err.message ?? "No pude leer el CV. Cargá los datos manualmente.");
      setStep("review");
    } finally { setParsing(false); }
  }

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
        phone: phone || null,
        linkedin_url: linkedin || null,
        headline: headline || null,
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

  const waLink = phone ? `https://wa.me/${phone.replace(/[^\d]/g, "")}` : "";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-background w-full max-w-lg rounded-3xl border border-border my-8">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-2xl">Nuevo candidato</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        {step === "upload" && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Subí el CV y la IA va a leer nombre, email, teléfono y LinkedIn automáticamente. Después revisás y completás lo que falte.</p>
            <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-2xl py-10 px-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground ${parsing ? "opacity-60 pointer-events-none" : ""}`}>
              {parsing ? <><Sparkles className="size-5 animate-pulse text-primary" /> Analizando CV…</> : <><Upload className="size-5" /> Subir CV (PDF)</>}
              <input type="file" accept="application/pdf" className="hidden" disabled={parsing} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); }} />
            </label>
            <button type="button" onClick={() => setStep("review")} className="w-full text-xs text-muted-foreground hover:text-foreground py-2">
              O cargar datos manualmente sin CV →
            </button>
          </div>
        )}

        {step === "review" && (
          <form onSubmit={submit} className="p-6 space-y-4">
            {cv && (
              <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-2xl px-3 py-2">
                <Sparkles className="size-3.5 text-primary" /> Datos extraídos de <span className="font-medium truncate">{cv.name}</span>
              </div>
            )}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Asignar a puesto</label>
              <select required value={jobId} onChange={(e) => setJobId(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">Seleccioná un puesto activo</option>
                {(activeJobs ?? []).map((j: any) => (<option key={j.id} value={j.id}>{j.clients?.name} — {j.title}</option>))}
              </select>
            </div>
            <Field label="Nombre completo" value={fullName} onChange={setFullName} required />
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Teléfono (con código de país)</label>
              <div className="mt-1 flex gap-2">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+5491134567890" className="flex-1 bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {phone && (
                  <a href={waLink} target="_blank" rel="noreferrer" className="px-4 rounded-2xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-600">WhatsApp</a>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">LinkedIn</label>
              <div className="mt-1 flex gap-2">
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://www.linkedin.com/in/..." className="flex-1 bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {linkedin && (
                  <a href={linkedin} target="_blank" rel="noreferrer" className="px-4 rounded-2xl bg-[#0a66c2] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90"><Linkedin className="size-3.5" /></a>
                )}
              </div>
            </div>
            <Field label="Headline (opcional)" value={headline} onChange={setHeadline} />
            {!cv && (
              <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-border rounded-2xl py-2.5 px-4 text-xs text-muted-foreground hover:border-primary/30">
                <Upload className="size-3.5" /> Subir CV (opcional)
                <input type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
              </label>
            )}
            <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
              {loading ? "Creando…" : "Crear candidato"}
            </button>
          </form>
        )}
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
