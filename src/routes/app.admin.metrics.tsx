import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gauge, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/admin/metrics")({
  component: MetricsDefaults,
});

const FALLBACK = {
  recruiter_warn_days: 5,
  recruiter_alert_days: 10,
  hiring_team_warn_days: 4,
  hiring_team_alert_days: 8,
};

type Metric = typeof FALLBACK;

function MetricsDefaults() {
  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Umbrales del semáforo: defaults globales y overrides por cliente</p>
        <h1 className="font-display text-4xl mt-1 flex items-center gap-3">
          <Gauge className="size-8 text-primary" /> Métricas
        </h1>
      </header>

      <div className="p-8 space-y-8 max-w-2xl">
        <GlobalDefaults />
        <ClientOverrides />
      </div>
    </div>
  );
}

function GlobalDefaults() {
  const qc = useQueryClient();
  const { data: defaults } = useQuery({
    queryKey: ["metric-defaults"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data } = await supabase
        .from("metric_defaults" as any)
        .select("*")
        .eq("user_id", user.user.id)
        .maybeSingle();
      return (data as any) ?? null;
    },
  });

  const [m, setM] = useState<Metric>(FALLBACK);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (defaults) setM({
    recruiter_warn_days: defaults.recruiter_warn_days,
    recruiter_alert_days: defaults.recruiter_alert_days,
    hiring_team_warn_days: defaults.hiring_team_warn_days,
    hiring_team_alert_days: defaults.hiring_team_alert_days,
  }); }, [defaults]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (m.recruiter_warn_days >= m.recruiter_alert_days || m.hiring_team_warn_days >= m.hiring_team_alert_days) {
      toast.error("El umbral amarillo debe ser menor al rojo."); return;
    }
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sesión no válida");
      const { error } = await supabase.from("metric_defaults" as any).upsert({ user_id: user.user.id, ...m });
      if (error) throw error;
      toast.success("Defaults globales guardados.");
      qc.invalidateQueries({ queryKey: ["metric-defaults"] });
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-border rounded-3xl p-6 space-y-6">
      <div>
        <h2 className="font-display text-2xl">Defaults globales</h2>
        <p className="text-xs text-muted-foreground mt-1">Se aplican a cada puesto, salvo que el cliente o el puesto tengan overrides.</p>
      </div>
      <MetricFields value={m} onChange={setM} />
      <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
        {loading ? "..." : "Guardar defaults"}
      </button>
    </form>
  );
}

function ClientOverrides() {
  const { data: clients } = useQuery({
    queryKey: ["clients-list-for-metrics"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id,name").order("name");
      return data ?? [];
    },
  });

  return (
    <section className="bg-white border border-border rounded-3xl p-6">
      <h2 className="font-display text-2xl">Overrides por cliente</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Personalizá los umbrales para un cliente puntual. Si no configurás nada, se usan los defaults.
      </p>
      <div className="space-y-2">
        {clients?.length === 0 && <p className="text-sm text-muted-foreground py-4">Todavía no tenés clientes.</p>}
        {clients?.map((c) => <ClientRow key={c.id} client={c as any} />)}
      </div>
    </section>
  );
}

function ClientRow({ client }: { client: { id: string; name: string } }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: globalDefaults } = useQuery({
    queryKey: ["metric-defaults"],
    enabled: open,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("metric_defaults" as any).select("*").eq("user_id", u.user.id).maybeSingle();
      return (data as any) ?? null;
    },
  });
  const { data: clientMetric, refetch } = useQuery({
    queryKey: ["client-metric-defaults", client.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("client_metric_defaults" as any).select("*").eq("client_id", client.id).maybeSingle();
      return (data as any) ?? null;
    },
  });

  const [m, setM] = useState<Metric>(FALLBACK);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (clientMetric) {
      setM({
        recruiter_warn_days: clientMetric.recruiter_warn_days,
        recruiter_alert_days: clientMetric.recruiter_alert_days,
        hiring_team_warn_days: clientMetric.hiring_team_warn_days,
        hiring_team_alert_days: clientMetric.hiring_team_alert_days,
      });
      setHasOverride(true);
    } else {
      const base = globalDefaults ?? FALLBACK;
      setM({
        recruiter_warn_days: base.recruiter_warn_days,
        recruiter_alert_days: base.recruiter_alert_days,
        hiring_team_warn_days: base.hiring_team_warn_days,
        hiring_team_alert_days: base.hiring_team_alert_days,
      });
      setHasOverride(false);
    }
  }, [open, clientMetric, globalDefaults]);

  async function save() {
    if (m.recruiter_warn_days >= m.recruiter_alert_days || m.hiring_team_warn_days >= m.hiring_team_alert_days) {
      toast.error("El umbral amarillo debe ser menor al rojo."); return;
    }
    const { error } = await supabase.from("client_metric_defaults" as any).upsert({ client_id: client.id, ...m }, { onConflict: "client_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Override guardado para ${client.name}.`);
    setHasOverride(true);
    refetch();
    qc.invalidateQueries({ queryKey: ["client-metric-defaults", client.id] });
  }

  async function reset() {
    const { error } = await supabase.from("client_metric_defaults" as any).delete().eq("client_id", client.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${client.name} vuelve a usar defaults.`);
    setHasOverride(false);
    refetch();
  }

  return (
    <div className="border border-border rounded-2xl">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50">
        <span className="flex items-center gap-2 font-medium text-sm">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {client.name}
        </span>
        <span className="text-[11px] text-muted-foreground">{open ? (hasOverride ? "Override activo" : "Usando defaults") : ""}</span>
      </button>
      {open && (
        <div className="p-4 border-t border-border space-y-4">
          <MetricFields value={m} onChange={setM} />
          <div className="flex gap-2 justify-end">
            {hasOverride && (
              <button onClick={reset} className="px-4 py-2 text-xs font-bold border border-border rounded-full hover:bg-stone-50">
                Resetear a defaults
              </button>
            )}
            <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold">
              Guardar override
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricFields({ value, onChange }: { value: Metric; onChange: (v: Metric) => void }) {
  const update = (patch: Partial<Metric>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-lg mb-1">Reclutadora</p>
        <p className="text-xs text-muted-foreground mb-3">Días sin sumar un candidato nuevo al puesto.</p>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="🟡 Amarillo desde" value={value.recruiter_warn_days} onChange={(n) => update({ recruiter_warn_days: n })} />
          <NumField label="🔴 Rojo desde" value={value.recruiter_alert_days} onChange={(n) => update({ recruiter_alert_days: n })} />
        </div>
      </div>
      <div>
        <p className="font-display text-lg mb-1">Hiring team</p>
        <p className="text-xs text-muted-foreground mb-3">Días que un candidato lleva sin moverse de stage.</p>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="🟡 Amarillo desde" value={value.hiring_team_warn_days} onChange={(n) => update({ hiring_team_warn_days: n })} />
          <NumField label="🔴 Rojo desde" value={value.hiring_team_alert_days} onChange={(n) => update({ hiring_team_alert_days: n })} />
        </div>
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
