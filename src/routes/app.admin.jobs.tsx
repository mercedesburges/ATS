import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Plus, X, Sliders } from "lucide-react";

export const Route = createFileRoute("/app/admin/jobs")({
  component: JobsList,
});

type JobRow = {
  id: string;
  title: string;
  area: string | null;
  is_active: boolean;
  created_at: string;
  clients: { name: string } | null;
  job_stages: { id: string; name: string; position: number; is_terminal: boolean; is_rejected: boolean }[];
  candidates: { id: string; current_stage_id: string | null; created_at: string; updated_at: string }[];
  job_metrics: { recruiter_warn_days: number; recruiter_alert_days: number; hiring_team_warn_days: number; hiring_team_alert_days: number } | null;
};

const DEFAULTS = { recruiter_warn_days: 5, recruiter_alert_days: 10, hiring_team_warn_days: 4, hiring_team_alert_days: 8 };

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

function light(days: number, warn: number, alert: number) {
  if (days >= alert) return "red";
  if (days >= warn) return "amber";
  return "green";
}

const LIGHT_BG: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};
const LIGHT_SOFT: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
};

function JobsList() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [metricsJob, setMetricsJob] = useState<JobRow | null>(null);

  const { data: jobs } = useQuery({
    queryKey: ["all-jobs-with-stages"],
    queryFn: async (): Promise<JobRow[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,area,is_active,created_at,clients(name),job_stages(id,name,position,is_terminal,is_rejected),candidates(id,current_stage_id,created_at,updated_at),job_metrics(recruiter_warn_days,recruiter_alert_days,hiring_team_warn_days,hiring_team_alert_days)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id,name").order("name");
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border flex justify-between items-end">
        <div>
          <p className="text-sm text-muted-foreground">Todos los puestos</p>
          <h1 className="font-display text-4xl mt-1">Puestos</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="size-4" /> Nuevo puesto
        </button>
      </header>

      <section className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {jobs?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Briefcase className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin puestos</p>
            <p className="text-sm text-muted-foreground mt-2">Creá un puesto desde acá o desde la ficha de un cliente.</p>
          </div>
        )}
        {jobs?.map((j) => (
          <JobCard key={j.id} job={j} onConfigure={() => setMetricsJob(j)} />
        ))}
      </section>

      {showNew && (
        <NewJobDialog
          clients={clients ?? []}
          onClose={() => setShowNew(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["all-jobs-with-stages"] })}
        />
      )}
      {metricsJob && (
        <MetricsDialog
          job={metricsJob}
          onClose={() => setMetricsJob(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["all-jobs-with-stages"] })}
        />
      )}
    </div>
  );
}

function JobCard({ job, onConfigure }: { job: JobRow; onConfigure: () => void }) {
  const metrics = job.job_metrics ?? DEFAULTS;

  const { stageCounts, recruiterDays, hiringDays } = useMemo(() => {
    const sorted = [...job.job_stages].sort((a, b) => a.position - b.position);
    const counts = sorted.map((s) => ({
      stage: s,
      count: job.candidates.filter((c) => c.current_stage_id === s.id).length,
    }));
    // recruiter: days since last candidate added
    const lastCand = job.candidates.reduce((acc, c) => (!acc || new Date(c.created_at) > new Date(acc) ? c.created_at : acc), "" as string);
    const rDays = lastCand ? daysSince(lastCand) : daysSince(job.created_at);
    // hiring team: max days a non-terminal candidate has been in current stage
    const nonTerminalStageIds = new Set(sorted.filter((s) => !s.is_terminal && !s.is_rejected).map((s) => s.id));
    const stuck = job.candidates
      .filter((c) => c.current_stage_id && nonTerminalStageIds.has(c.current_stage_id))
      .map((c) => daysSince(c.updated_at));
    const hDays = stuck.length ? Math.max(...stuck) : 0;
    return { stageCounts: counts, recruiterDays: rDays, hiringDays: hDays };
  }, [job]);

  const rLight = light(recruiterDays, metrics.recruiter_warn_days, metrics.recruiter_alert_days);
  const hLight = light(hiringDays, metrics.hiring_team_warn_days, metrics.hiring_team_alert_days);

  return (
    <div className="bg-white rounded-3xl border border-border p-6 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <Link to="/app/admin/jobs/$jobId" params={{ jobId: job.id }} className="flex-1 min-w-0 group">
          <p className="text-xs text-muted-foreground">{job.clients?.name}</p>
          <h3 className="font-display text-xl mt-1 group-hover:text-primary transition-colors">{job.title}</h3>
          {job.area && <p className="text-sm text-muted-foreground mt-0.5">{job.area}</p>}
        </Link>
        <button onClick={onConfigure} title="Setear métricas" className="size-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
          <Sliders className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {stageCounts.map(({ stage, count }) => (
          <div key={stage.id} className="text-[11px] bg-stone-50 border border-border rounded-full px-2.5 py-1 inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">{stage.name}</span>
            <span className="font-bold">{count}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-border">
        <SemaphoreRow label="Reclutadora" days={recruiterDays} state={rLight} hint={recruiterDays === 0 ? "Hoy" : `Hace ${recruiterDays}d`} sub="último candidato sumado" />
        <SemaphoreRow label="Hiring team" days={hiringDays} state={hLight} hint={hiringDays === 0 ? "Sin demora" : `${hiringDays}d`} sub="máx en mismo stage" />
      </div>
    </div>
  );
}

function SemaphoreRow({ label, state, hint, sub }: { label: string; days: number; state: string; hint: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`size-2.5 rounded-full ${LIGHT_BG[state]} shrink-0`} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm leading-tight">
          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${LIGHT_SOFT[state]}`}>{hint}</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

function MetricsDialog({ job, onClose, onSaved }: { job: JobRow; onClose: () => void; onSaved: () => void }) {
  const m = job.job_metrics ?? DEFAULTS;
  const [rWarn, setRWarn] = useState(m.recruiter_warn_days);
  const [rAlert, setRAlert] = useState(m.recruiter_alert_days);
  const [hWarn, setHWarn] = useState(m.hiring_team_warn_days);
  const [hAlert, setHAlert] = useState(m.hiring_team_alert_days);
  const [loading, setLoading] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(false);

  async function loadDefaults() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data } = await supabase.from("metric_defaults" as any).select("*").eq("user_id", user.user.id).maybeSingle();
    const d: any = data ?? DEFAULTS;
    setRWarn(d.recruiter_warn_days);
    setRAlert(d.recruiter_alert_days);
    setHWarn(d.hiring_team_warn_days);
    setHAlert(d.hiring_team_alert_days);
    setUsingDefaults(true);
    toast.success(data ? "Defaults cargados." : "Aún no configuraste defaults — usando valores estándar.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rWarn >= rAlert || hWarn >= hAlert) { toast.error("El umbral amarillo debe ser menor al rojo."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("job_metrics").upsert({
        job_id: job.id,
        recruiter_warn_days: rWarn,
        recruiter_alert_days: rAlert,
        hiring_team_warn_days: hWarn,
        hiring_team_alert_days: hAlert,
      });
      if (error) throw error;
      toast.success("Métricas guardadas.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-background w-full max-w-lg rounded-3xl border border-border my-8">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="font-display text-2xl">Métricas del semáforo</h2>
            <p className="text-xs text-muted-foreground mt-1">{job.title}</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-6">
          <div>
            <p className="font-display text-lg mb-1">Reclutadora</p>
            <p className="text-xs text-muted-foreground mb-3">Días sin sumar un candidato nuevo al puesto.</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="🟡 Amarillo desde" value={rWarn} onChange={setRWarn} />
              <NumField label="🔴 Rojo desde" value={rAlert} onChange={setRAlert} />
            </div>
          </div>
          <div>
            <p className="font-display text-lg mb-1">Hiring team</p>
            <p className="text-xs text-muted-foreground mb-3">Días que un candidato lleva sin moverse de stage (peor caso del puesto).</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="🟡 Amarillo desde" value={hWarn} onChange={setHWarn} />
              <NumField label="🔴 Rojo desde" value={hAlert} onChange={setHAlert} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : "Guardar métricas"}
          </button>
        </form>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type="number" min={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
      <p className="text-[10px] text-muted-foreground mt-1">días</p>
    </div>
  );
}

function NewJobDialog({ clients, onClose, onCreated }: { clients: { id: string; name: string }[]; onClose: () => void; onCreated: () => void }) {
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { toast.error("Elegí un cliente"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("jobs").insert({ client_id: clientId, title, area: area || null, description: description || null });
      if (error) throw error;
      toast.success("Puesto creado con etapas por defecto.");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-background w-full max-w-lg rounded-3xl border border-border">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-2xl">Nuevo puesto</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cliente</label>
            <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm">
              <option value="">Seleccioná un cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {clients.length === 0 && <p className="text-[11px] text-muted-foreground mt-1.5">Todavía no tenés clientes. Creá uno primero.</p>}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Título del puesto</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Área (opcional)</label>
            <input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descripción / JD (opcional)</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : "Crear puesto"}
          </button>
        </form>
      </div>
    </div>
  );
}
