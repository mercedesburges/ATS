import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ListOrdered, Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";

export const Route = createFileRoute("/app/admin/stages")({
  component: StagesPage,
});

type StageRow = {
  id?: string;
  name: string;
  position: number;
  category: string;
  color: string;
  is_terminal: boolean;
  is_rejected: boolean;
  triggers_availability_email: boolean;
};

const FALLBACK: StageRow[] = [
  { name: "Review", position: 1, category: "review", color: "amber", is_terminal: false, is_rejected: false, triggers_availability_email: false },
  { name: "Interview", position: 2, category: "interview", color: "emerald", is_terminal: false, is_rejected: false, triggers_availability_email: true },
  { name: "Technical Task", position: 3, category: "advanced", color: "blue", is_terminal: false, is_rejected: false, triggers_availability_email: false },
  { name: "Offer", position: 4, category: "advanced", color: "primary", is_terminal: false, is_rejected: false, triggers_availability_email: false },
  { name: "Rejected", position: 5, category: "rejected", color: "stone", is_terminal: true, is_rejected: true, triggers_availability_email: false },
];

const CATEGORIES = [
  { value: "review", label: "Review" },
  { value: "interview", label: "Interview" },
  { value: "advanced", label: "Advanced" },
  { value: "rejected", label: "Rejected" },
  { value: "other", label: "Other" },
];

function StagesPage() {
  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Configurá tus etapas por defecto y los overrides por cliente</p>
        <h1 className="font-display text-4xl mt-1 flex items-center gap-3">
          <ListOrdered className="size-8 text-primary" /> Stages
        </h1>
      </header>
      <div className="p-8 space-y-8 max-w-3xl">
        <DefaultsEditor />
        <ClientsEditor />
      </div>
    </div>
  );
}

function DefaultsEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["stage-defaults"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("stage_defaults" as any).select("*").eq("user_id", u.user.id).order("position");
      return (data as any[]) ?? [];
    },
  });

  const [stages, setStages] = useState<StageRow[]>([]);
  useEffect(() => {
    if (!isLoading) setStages(data && data.length ? data : FALLBACK);
  }, [data, isLoading]);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error: delErr } = await supabase.from("stage_defaults" as any).delete().eq("user_id", u.user.id);
    if (delErr) { toast.error(delErr.message); return; }
    const rows = stages.map((s, i) => ({ ...s, id: undefined, position: i + 1, user_id: u.user!.id }));
    const { error } = await supabase.from("stage_defaults" as any).insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success("Defaults guardados. Se aplican a cada nuevo puesto.");
    qc.invalidateQueries({ queryKey: ["stage-defaults"] });
  }

  return (
    <section className="bg-white border border-border rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl">Defaults globales</h2>
          <p className="text-xs text-muted-foreground mt-1">Se aplican a cada nuevo puesto, salvo que el cliente tenga overrides.</p>
        </div>
        <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold">Guardar defaults</button>
      </div>
      <StageList stages={stages} setStages={setStages} />
    </section>
  );
}

function ClientsEditor() {
  const { data: clients } = useQuery({
    queryKey: ["clients-list-for-stages"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id,name").order("name");
      return data ?? [];
    },
  });

  return (
    <section className="bg-white border border-border rounded-3xl p-6">
      <h2 className="font-display text-2xl">Overrides por cliente</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Personalizá las etapas para un cliente puntual. Si no configurás nada, se usan los defaults.
      </p>
      <div className="space-y-2">
        {clients?.length === 0 && <p className="text-sm text-muted-foreground py-4">Todavía no tenés clientes.</p>}
        {clients?.map((c) => <ClientStagesRow key={c.id} client={c as any} />)}
      </div>
    </section>
  );
}

function ClientStagesRow({ client }: { client: { id: string; name: string } }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["client-stage-defaults", client.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("client_stage_defaults" as any).select("*").eq("client_id", client.id).order("position");
      return (data as any[]) ?? [];
    },
  });
  const { data: defaults } = useQuery({
    queryKey: ["stage-defaults"],
    enabled: open,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("stage_defaults" as any).select("*").eq("user_id", u.user.id).order("position");
      return (data as any[]) ?? [];
    },
  });

  const [stages, setStages] = useState<StageRow[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  useEffect(() => {
    if (open && !isLoading) {
      if (data && data.length) { setStages(data); setUsingDefaults(false); }
      else { setStages(defaults && defaults.length ? defaults : FALLBACK); setUsingDefaults(true); }
    }
  }, [open, isLoading, data, defaults]);

  async function save() {
    const { error: delErr } = await supabase.from("client_stage_defaults" as any).delete().eq("client_id", client.id);
    if (delErr) { toast.error(delErr.message); return; }
    const rows = stages.map((s, i) => ({ ...s, id: undefined, position: i + 1, client_id: client.id }));
    const { error } = await supabase.from("client_stage_defaults" as any).insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Stages guardadas para ${client.name}.`);
    setUsingDefaults(false);
    refetch();
    qc.invalidateQueries({ queryKey: ["client-stage-defaults", client.id] });
  }

  async function resetToDefaults() {
    const { error } = await supabase.from("client_stage_defaults" as any).delete().eq("client_id", client.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Override eliminado — ${client.name} vuelve a usar defaults.`);
    setUsingDefaults(true);
    refetch();
  }

  return (
    <div className="border border-border rounded-2xl">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50">
        <span className="flex items-center gap-2 font-medium text-sm">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {client.name}
        </span>
        <span className="text-[11px] text-muted-foreground">{open && !usingDefaults ? "Override activo" : open ? "Usando defaults" : ""}</span>
      </button>
      {open && (
        <div className="p-4 border-t border-border space-y-3">
          <StageList stages={stages} setStages={setStages} />
          <div className="flex gap-2 justify-end pt-2">
            {!usingDefaults && (
              <button onClick={resetToDefaults} className="px-4 py-2 text-xs font-bold border border-border rounded-full hover:bg-stone-50">
                Resetear a defaults
              </button>
            )}
            <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold">Guardar override</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StageList({ stages, setStages }: { stages: StageRow[]; setStages: (s: StageRow[]) => void }) {
  function update(i: number, patch: Partial<StageRow>) {
    setStages(stages.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function remove(i: number) { setStages(stages.filter((_, idx) => idx !== i)); }
  function add() {
    setStages([...stages, { name: "Nueva etapa", position: stages.length + 1, category: "other", color: "stone", is_terminal: false, is_rejected: false, triggers_availability_email: false }]);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    const copy = [...stages];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setStages(copy);
  }

  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-2 bg-stone-50 border border-border rounded-xl px-3 py-2">
          <div className="flex flex-col">
            <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground text-xs">▲</button>
            <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground text-xs">▼</button>
          </div>
          <input
            value={s.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="flex-1 bg-white border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={s.category}
            onChange={(e) => update(i, { category: e.target.value })}
            className="bg-white border border-border rounded-lg px-2 py-1.5 text-xs"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <input type="checkbox" checked={s.is_rejected} onChange={(e) => update(i, { is_rejected: e.target.checked, is_terminal: e.target.checked || s.is_terminal })} />
            rechazo
          </label>
          <button onClick={() => remove(i)} className="size-7 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button onClick={add} className="w-full py-2 border border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 inline-flex items-center justify-center gap-1.5">
        <Plus className="size-3.5" /> Agregar etapa
      </button>
    </div>
  );
}
