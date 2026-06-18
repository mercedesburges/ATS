import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Briefcase, X, ArrowLeft, UserPlus, Mail, Pencil, Trash2, Globe } from "lucide-react";

export const Route = createFileRoute("/app/admin/clients/$clientId")({
  component: ClientDetail,
});

const CONTACT_TYPE_LABEL: Record<string, string> = {
  hr: "HR",
  hiring_manager: "Hiring Manager",
  team_member: "Team Member",
};

function ClientDetail() {
  const { clientId } = useParams({ from: "/app/admin/clients/$clientId" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showNewJob, setShowNewJob] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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

  const { data: contacts } = useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_members")
        .select("id,first_name,last_name,invited_email,contact_area,contact_position,contact_type,user_id")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <header className="px-6 md:px-8 py-6 border-b border-border">
        <Link to="/app/admin/clients" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-3" /> Volver a clientes</Link>
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mt-2">
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <h1 className="font-display text-3xl md:text-4xl mt-1">{client?.name ?? "..."}</h1>
            {client?.industry && <p className="text-sm text-muted-foreground mt-1">{client.industry}</p>}
            {client?.website && (
              <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" className="text-sm text-primary mt-1 inline-flex items-center gap-1.5 hover:underline">
                <Globe className="size-3.5" /> {client.website}
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowEdit(true)} className="flex items-center gap-2 px-3 py-2.5 bg-white border border-border rounded-full text-sm font-bold hover:border-primary/30">
              <Pencil className="size-4" /> Editar
            </button>
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-3 py-2.5 bg-white border border-border rounded-full text-sm font-bold text-destructive hover:bg-destructive/5 hover:border-destructive/30">
              <Trash2 className="size-4" /> Borrar
            </button>
            <button onClick={() => setShowNewContact(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-full text-sm font-bold hover:border-primary/30">
              <UserPlus className="size-4" /> Agregar contacto
            </button>
            <button onClick={() => setShowNewJob(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold">
              <Plus className="size-4" /> Nuevo puesto
            </button>
          </div>
        </div>
      </header>

      <section className="p-8">
        <h2 className="font-display text-2xl mb-4">Contactos</h2>
        {contacts?.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-8 text-center">
            <UserPlus className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Todavía no agregaste contactos para este cliente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts?.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.invited_email}</p>
                    {c.contact_position && <p className="text-xs text-muted-foreground mt-0.5">{c.contact_position}{c.contact_area ? ` · ${c.contact_area}` : ""}</p>}
                  </div>
                  {c.contact_type && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-accent-gold/20 text-accent-gold">
                      {CONTACT_TYPE_LABEL[c.contact_type]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5"><Mail className="size-3" /> {c.invited_email}</p>
                <p className="text-[10px] mt-2 uppercase tracking-wider font-bold text-muted-foreground">{c.user_id ? "Activo" : "Pendiente de registro"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-8 pb-8">
        <h2 className="font-display text-2xl mb-4">Puestos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </section>

      {showNewJob && (
        <NewJobDialog
          clientId={clientId}
          onClose={() => setShowNewJob(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["jobs-by-client", clientId] })}
        />
      )}
      {showNewContact && (
        <NewContactDialog
          clientId={clientId}
          onClose={() => setShowNewContact(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["client-contacts", clientId] })}
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

function NewContactDialog({ clientId, onClose, onCreated }: { clientId: string; onClose: () => void; onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [position, setPosition] = useState("");
  const [contactType, setContactType] = useState<string>("hr");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if a user already exists with this email in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const { error } = await supabase.from("client_members").insert({
        client_id: clientId,
        user_id: existingProfile?.id ?? null,
        invited_email: email,
        first_name: firstName || null,
        last_name: lastName || null,
        contact_area: area || null,
        contact_position: position || null,
        contact_type: contactType as any,
      });
      if (error) throw error;
      toast.success(existingProfile ? "Contacto vinculado." : "Contacto invitado. Cuando se registre con este email tendrá acceso.");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Error al agregar contacto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-background w-full max-w-lg rounded-3xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-2xl">Agregar contacto</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" value={firstName} onChange={setFirstName} required />
            <Field label="Apellido" value={lastName} onChange={setLastName} required />
          </div>
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Área" value={area} onChange={setArea} />
            <Field label="Posición" value={position} onChange={setPosition} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de contacto</label>
            <select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="hr">HR</option>
              <option value="hiring_manager">Hiring Manager</option>
              <option value="team_member">Team Member</option>
            </select>
            <p className="text-[11px] text-muted-foreground mt-1.5">Más adelante vas a poder definir qué puede hacer cada tipo en la plataforma.</p>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : "Agregar contacto"}
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
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  );
}
