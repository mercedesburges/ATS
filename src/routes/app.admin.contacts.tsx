import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Search, Contact as ContactIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/contacts")({
  component: ContactsPage,
});

const CONTACT_TYPE_LABEL: Record<string, string> = {
  hr: "HR",
  hiring_manager: "Hiring Manager",
  team_member: "Team Member",
  recruiter: "Recruiter",
};

function ContactsPage() {
  const [search, setSearch] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ["all-contacts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_members")
        .select("id,first_name,last_name,invited_email,contact_area,contact_position,contact_type,client_id,user_id,clients(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts ?? [];
    return (contacts ?? []).filter((c: any) =>
      `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.invited_email ?? ""} ${c.clients?.name ?? ""} ${c.contact_position ?? ""}`.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <p className="text-sm text-muted-foreground">Toda la red de hiring & recruiting</p>
        <h1 className="font-display text-4xl mt-1">Contactos</h1>
        <p className="text-xs text-muted-foreground mt-2">Cada contacto que sumás a un cliente queda guardado acá. Cuando agregás un nuevo contacto a otro cliente podés reutilizarlo sin volver a cargar los datos.</p>
      </header>

      <section className="p-8 max-w-4xl mx-auto">
        <div className="relative mb-5">
          <Search className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, cliente o posición…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center">
            <ContactIcon className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">{search ? "Sin resultados" : "Sin contactos aún"}</p>
            <p className="text-sm text-muted-foreground mt-2">{search ? "Probá con otro término." : "Cargá contactos desde la ficha de un cliente."}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((c: any) => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.invited_email;
              return (
                <li key={c.id}>
                  <Link
                    to="/app/admin/clients/$clientId"
                    params={{ clientId: c.client_id }}
                    className="flex items-center gap-4 bg-white border border-border rounded-2xl px-4 py-3 hover:border-primary/30"
                  >
                    <div className="size-9 rounded-full bg-accent-gold/20 text-accent-gold grid place-items-center text-xs font-bold shrink-0">
                      {(c.first_name?.[0] ?? c.invited_email?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                        <Mail className="size-3" /> {c.invited_email}
                      </p>
                    </div>
                    <div className="hidden md:block min-w-0 text-right">
                      <p className="text-xs font-medium truncate">{c.clients?.name}</p>
                      {c.contact_position && <p className="text-[11px] text-muted-foreground truncate">{c.contact_position}</p>}
                    </div>
                    {c.contact_type && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary-soft text-primary shrink-0">
                        {CONTACT_TYPE_LABEL[c.contact_type] ?? c.contact_type}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
