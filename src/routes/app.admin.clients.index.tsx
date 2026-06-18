import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Building2, X } from "lucide-react";

export const Route = createFileRoute("/app/admin/clients/")({
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,industry,logo_url,jobs(id,is_active)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-8 py-6 border-b border-border flex justify-between items-end">
        <div>
          <p className="text-sm text-muted-foreground">Empresas que confían en vos</p>
          <h1 className="font-display text-4xl mt-1">Clientes</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="size-4" /> Nuevo cliente
        </button>
      </header>

      <section className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-reveal">
        {clients?.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-border p-12 text-center">
            <Building2 className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Todavía no hay clientes</p>
            <p className="text-sm text-muted-foreground mt-2">Creá el primero para empezar a cargar puestos.</p>
          </div>
        )}
        {clients?.map((c: any) => {
          const activeJobs = (c.jobs ?? []).filter((j: any) => j.is_active).length;
          const isActive = activeJobs > 0;
          return (
            <ClientCard key={c.id} client={c} activeJobs={activeJobs} isActive={isActive} />
          );
        })}
      </section>

      {showNew && (
        <NewClientDialog
          onClose={() => setShowNew(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["clients"] })}
        />
      )}
    </div>
  );
}

function ClientCard({ client, activeJobs, isActive }: { client: any; activeJobs: number; isActive: boolean }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    if (!client.logo_url) { setLogoUrl(null); return; }
    supabase.storage.from("client-logos").createSignedUrl(client.logo_url, 60 * 60).then(({ data }) => {
      if (!cancel) setLogoUrl(data?.signedUrl ?? null);
    });
    return () => { cancel = true; };
  }, [client.logo_url]);

  return (
    <Link
      to="/app/admin/clients/$clientId"
      params={{ clientId: client.id }}
      className="group bg-white rounded-2xl border border-border p-4 hover:border-primary/30 transition-all flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-stone-100 grid place-items-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={client.name} className="size-full object-cover" />
          ) : (
            <Building2 className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base truncate">{client.name}</h3>
          {client.industry && <p className="text-[11px] text-muted-foreground truncate">{client.industry}</p>}
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
          {isActive ? "Activo" : "Inactivo"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-bold text-foreground">{activeJobs}</span> {activeJobs === 1 ? "posición activa" : "posiciones activas"}
      </p>
    </Link>
  );
}

function NewClientDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("clients").insert({ name, industry: industry || null });
      if (error) throw error;
      toast.success("Cliente creado. Ahora podés agregarle contactos y puestos desde su ficha.");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-background w-full max-w-md rounded-3xl border border-border">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-2xl">Nuevo cliente</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nombre de la empresa</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Industria (opcional)</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : "Crear cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}
