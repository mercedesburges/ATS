import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Plus, X } from "lucide-react";

export const Route = createFileRoute("/app/admin/jobs")({
  component: JobsList,
});

function JobsList() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ["all-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,title,area,is_active,clients(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
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

      <section className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Briefcase className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin puestos</p>
            <p className="text-sm text-muted-foreground mt-2">Creá un puesto desde acá o desde la ficha de un cliente.</p>
          </div>
        )}
        {jobs?.map((j: any) => (
          <Link key={j.id} to="/app/admin/jobs/$jobId" params={{ jobId: j.id }} className="bg-white rounded-3xl border border-border p-6 hover:border-primary/20">
            <p className="text-xs text-muted-foreground">{j.clients?.name}</p>
            <h3 className="font-display text-xl mt-2">{j.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{j.area}</p>
          </Link>
        ))}
      </section>

      {showNew && (
        <NewJobDialog
          clients={clients ?? []}
          onClose={() => setShowNew(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["all-jobs"] })}
        />
      )}
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
