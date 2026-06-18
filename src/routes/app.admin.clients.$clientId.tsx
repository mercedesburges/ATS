import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Briefcase, X, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/admin/clients/$clientId")({
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = useParams({ from: "/app/admin/clients/$clientId" });
  const qc = useQueryClient();
  const [showNewJob, setShowNewJob] = useState(false);

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", clientId).single();
      return data;
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs-by-client", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id,title,area,is_active,created_at").eq("client_id", clientId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <Link to="/app/admin/clients" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-3" /> Volver a clientes</Link>
        <div className="flex justify-between items-end mt-2">
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <h1 className="font-display text-4xl mt-1">{client?.name ?? "..."}</h1>
            {client?.industry && <p className="text-sm text-muted-foreground mt-1">{client.industry}</p>}
          </div>
          <button onClick={() => setShowNewJob(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold">
            <Plus className="size-4" /> Nuevo puesto
          </button>
        </div>
      </header>

      <section className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Briefcase className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin puestos abiertos</p>
            <p className="text-sm text-muted-foreground mt-2">Creá el primer puesto para este cliente.</p>
          </div>
        )}
        {jobs?.map((j: any) => (
          <Link key={j.id} to="/app/admin/jobs/$jobId" params={{ jobId: j.id }} className="bg-white rounded-3xl border border-border p-6 hover:border-primary/20">
            <div className="flex items-start justify-between">
              <div className="size-10 rounded-xl bg-primary/5 text-primary grid place-items-center"><Briefcase className="size-5" /></div>
              <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${j.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                {j.is_active ? "Activo" : "Pausado"}
              </span>
            </div>
            <h3 className="font-display text-xl mt-4">{j.title}</h3>
            {j.area && <p className="text-sm text-muted-foreground mt-1">{j.area}</p>}
          </Link>
        ))}
      </section>

      {showNewJob && (
        <NewJobDialog
          clientId={clientId}
          onClose={() => setShowNewJob(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["jobs-by-client", clientId] })}
        />
      )}
    </div>
  );
}

function NewJobDialog({ clientId, onClose, onCreated }: { clientId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Título del puesto</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Área (opcional)</label>
            <input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descripción / JD (opcional, fase 2: lo procesa la IA)</label>
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
