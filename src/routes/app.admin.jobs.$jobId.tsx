import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, User, Upload, Sparkles, Trash2, MessageSquareQuote } from "lucide-react";
import { suggestInterviewQuestions } from "@/lib/interview.functions";

export const Route = createFileRoute("/app/admin/jobs/$jobId")({
  component: JobDetail,
});

const STAGE_COLORS: Record<string, string> = {
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  primary: "bg-primary-soft text-primary border-primary/10",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
};

function JobDetail() {
  const { jobId } = useParams({ from: "/app/admin/jobs/$jobId" });
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*,clients(name)").eq("id", jobId).single();
      return data;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["stages", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("job_stages").select("*").eq("job_id", jobId).eq("is_enabled", true).order("position");
      return data ?? [];
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["job-candidates", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("id,full_name,headline,photo_url,visibility,current_stage_id,years_experience")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function togglePublish(candidateId: string, current: string) {
    const next = current === "draft" ? "published" : "draft";
    await supabase.from("candidates").update({ visibility: next }).eq("id", candidateId);
    qc.invalidateQueries({ queryKey: ["job-candidates", jobId] });
    toast.success(next === "published" ? "Candidato visible para el cliente" : "Candidato oculto del cliente");
  }

  const byStage = (stages ?? []).map((s: any) => ({
    stage: s,
    items: (candidates ?? []).filter((c: any) => c.current_stage_id === s.id || (!c.current_stage_id && s.position === 1)),
  }));

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <Link to="/app/admin/jobs" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Volver a puestos</Link>
        <div className="flex justify-between items-end mt-2">
          <div>
            <p className="text-sm text-muted-foreground">{job?.clients?.name}</p>
            <h1 className="font-display text-4xl mt-1">{job?.title ?? "..."}</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold">
            <Plus className="size-4" /> Agregar candidato
          </button>
        </div>
      </header>

      <InterviewQuestionsPanel jobId={jobId} />

      <div className="p-8 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {byStage.map(({ stage, items }) => (
            <div key={stage.id} className="w-72 shrink-0">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage.color] ?? "bg-stone-400"}`}></span>
                  {stage.name} ({items.length})
                </h3>
              </div>
              <div className="space-y-3 min-h-[100px]">
                {items.map((c: any) => (
                  <div key={c.id} className="bg-white rounded-2xl border border-border p-3 hover:border-primary/20">
                    <Link to="/app/admin/candidates/$candidateId" params={{ candidateId: c.id }} className="flex items-center gap-3">
                      {c.photo_url ? <img src={c.photo_url} alt="" className="size-10 rounded-lg object-cover" /> : <div className="size-10 rounded-lg bg-stone-100 grid place-items-center"><User className="size-4 text-muted-foreground" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.headline ?? `${c.years_experience ?? 0}Y exp`}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => togglePublish(c.id, c.visibility)}
                      className={`mt-2 w-full text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-full transition-colors ${c.visibility === "published" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                    >
                      {c.visibility === "published" ? "Visible al cliente" : "Borrador (oculto)"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && stages && (
        <NewCandidateDialog
          jobId={jobId}
          firstStageId={stages[0]?.id}
          onClose={() => setShowAdd(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["job-candidates", jobId] })}
        />
      )}
    </div>
  );
}

function NewCandidateDialog({ jobId, firstStageId, onClose, onCreated }: { jobId: string; firstStageId?: string; onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [years, setYears] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
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
      toast.success("Candidato agregado");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
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
          <Field label="Nombre completo" value={fullName} onChange={setFullName} required />
          <Field label="Email (opcional)" type="email" value={email} onChange={setEmail} />
          <Field label="Headline (ej: Senior Product Lead)" value={headline} onChange={setHeadline} />
          <Field label="Años de experiencia" type="number" value={years} onChange={setYears} />
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CV (PDF / DOC) — opcional</label>
            <label className="mt-1 flex items-center justify-center gap-2 cursor-pointer border border-dashed border-border rounded-2xl py-3 px-4 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">
              <Upload className="size-3.5" /> {cv ? cv.name : "Subir archivo"}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Foto, skills, video y experiencia se agregan después en la ficha del candidato.</p>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : "Crear candidato"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: any) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
    </div>
  );
}

function InterviewQuestionsPanel({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const suggestFn = useServerFn(suggestInterviewQuestions);
  const [suggesting, setSuggesting] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTime, setDraftTime] = useState(120);

  const { data: questions } = useQuery({
    queryKey: ["interview-qs", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("job_interview_questions").select("*").eq("job_id", jobId).order("position");
      return data ?? [];
    },
  });

  async function add(question: string, time_limit_seconds: number, position?: number) {
    const pos = position ?? (questions?.length ?? 0) + 1;
    await supabase.from("job_interview_questions").insert({ job_id: jobId, question, time_limit_seconds, position: pos });
    qc.invalidateQueries({ queryKey: ["interview-qs", jobId] });
  }
  async function remove(id: string) {
    await supabase.from("job_interview_questions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["interview-qs", jobId] });
  }
  async function suggest() {
    setSuggesting(true);
    try {
      const proposed = await suggestFn({ data: { jobId } });
      if (!proposed || proposed.length === 0) { toast.error("La IA no devolvió preguntas. Probá de nuevo."); return; }
      const start = (questions?.length ?? 0) + 1;
      const rows = proposed.map((q: any, i: number) => ({ job_id: jobId, question: q.question, time_limit_seconds: q.time_limit_seconds, position: start + i }));
      const { error } = await supabase.from("job_interview_questions").insert(rows);
      if (error) throw error;
      toast.success(`${proposed.length} preguntas sugeridas. Editá lo que quieras.`);
      qc.invalidateQueries({ queryKey: ["interview-qs", jobId] });
    } catch (e: any) { toast.error(e.message); } finally { setSuggesting(false); }
  }

  return (
    <section className="px-8 py-6 border-b border-border bg-stone-50/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="size-4 text-primary" />
          <h2 className="font-display text-xl">Preguntas de entrevista AI</h2>
        </div>
        <button onClick={suggest} disabled={suggesting} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold flex items-center gap-2 hover:bg-primary/15 disabled:opacity-50">
          <Sparkles className="size-3.5" /> {suggesting ? "Generando…" : "Sugerir con IA"}
        </button>
      </div>
      <div className="space-y-2">
        {(questions ?? []).map((q: any, i: number) => (
          <div key={q.id} className="flex items-center gap-3 bg-white border border-border rounded-2xl px-4 py-3">
            <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
            <input
              defaultValue={q.question}
              onBlur={async (e) => {
                if (e.target.value !== q.question) {
                  await supabase.from("job_interview_questions").update({ question: e.target.value }).eq("id", q.id);
                  qc.invalidateQueries({ queryKey: ["interview-qs", jobId] });
                }
              }}
              className="flex-1 bg-transparent text-sm outline-none border-b border-transparent focus:border-primary/30"
            />
            <input
              type="number" min={30} max={300} defaultValue={q.time_limit_seconds}
              onBlur={async (e) => {
                const v = parseInt(e.target.value) || 120;
                if (v !== q.time_limit_seconds) {
                  await supabase.from("job_interview_questions").update({ time_limit_seconds: v }).eq("id", q.id);
                  qc.invalidateQueries({ queryKey: ["interview-qs", jobId] });
                }
              }}
              className="w-16 bg-stone-50 text-xs px-2 py-1 rounded-lg outline-none border border-border"
            />
            <span className="text-xs text-muted-foreground">s</span>
            <button onClick={() => remove(q.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="size-3.5" /></button>
          </div>
        ))}
        {(questions ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sin preguntas aún. Sugerí con IA o cargá manualmente.</p>}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { add(draft.trim(), draftTime); setDraft(""); } }}
        className="mt-3 flex gap-2"
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Agregar pregunta…" className="flex-1 bg-white border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        <input type="number" min={30} max={300} value={draftTime} onChange={(e) => setDraftTime(parseInt(e.target.value) || 120)} className="w-20 bg-white border border-border rounded-2xl px-3 py-2 text-xs outline-none" />
        <button type="submit" className="px-4 bg-primary text-primary-foreground rounded-full text-xs font-bold">+ Agregar</button>
      </form>
    </section>
  );
}
