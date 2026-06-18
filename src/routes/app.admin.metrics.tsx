import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gauge } from "lucide-react";

export const Route = createFileRoute("/app/admin/metrics")({
  component: MetricsDefaults,
});

const FALLBACK = {
  recruiter_warn_days: 5,
  recruiter_alert_days: 10,
  hiring_team_warn_days: 4,
  hiring_team_alert_days: 8,
};

function MetricsDefaults() {
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

  const [rWarn, setRWarn] = useState(FALLBACK.recruiter_warn_days);
  const [rAlert, setRAlert] = useState(FALLBACK.recruiter_alert_days);
  const [hWarn, setHWarn] = useState(FALLBACK.hiring_team_warn_days);
  const [hAlert, setHAlert] = useState(FALLBACK.hiring_team_alert_days);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaults) {
      setRWarn(defaults.recruiter_warn_days);
      setRAlert(defaults.recruiter_alert_days);
      setHWarn(defaults.hiring_team_warn_days);
      setHAlert(defaults.hiring_team_alert_days);
    }
  }, [defaults]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rWarn >= rAlert || hWarn >= hAlert) { toast.error("El umbral amarillo debe ser menor al rojo."); return; }
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sesión no válida");
      const { error } = await supabase.from("metric_defaults" as any).upsert({
        user_id: user.user.id,
        recruiter_warn_days: rWarn,
        recruiter_alert_days: rAlert,
        hiring_team_warn_days: hWarn,
        hiring_team_alert_days: hAlert,
      });
      if (error) throw error;
      toast.success("Métricas por defecto guardadas.");
      qc.invalidateQueries({ queryKey: ["metric-defaults"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Umbrales que se aplican a cada nuevo puesto por defecto</p>
        <h1 className="font-display text-4xl mt-1 flex items-center gap-3">
          <Gauge className="size-8 text-primary" /> Métricas
        </h1>
      </header>

      <section className="p-8 max-w-2xl">
        <form onSubmit={submit} className="bg-white border border-border rounded-3xl p-6 space-y-6">
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
            <p className="text-xs text-muted-foreground mb-3">Días que un candidato lleva sin moverse de stage.</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="🟡 Amarillo desde" value={hWarn} onChange={setHWarn} />
              <NumField label="🔴 Rojo desde" value={hAlert} onChange={setHAlert} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground bg-stone-50 rounded-xl p-3">
            Desde cada puesto vas a poder <span className="font-bold text-foreground">usar estos defaults</span> o configurar valores propios.
          </p>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : "Guardar defaults"}
          </button>
        </form>
      </section>
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
