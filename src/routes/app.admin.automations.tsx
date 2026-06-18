import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Zap, X, Sparkles, Mail, Pencil, Trash2 } from "lucide-react";
import { draftEmail } from "@/lib/ai.functions";

export const Route = createFileRoute("/app/admin/automations")({
  component: AutomationsPage,
});

const TRIGGER_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "cv_uploaded", label: "Se subió CV de candidato", hint: "Mail al candidato cuando carga su CV en un proceso" },
  { value: "stage_changed", label: "Cambio de stage", hint: "Mail cuando el candidato avanza de etapa" },
  { value: "candidate_rejected", label: "Candidato rechazado", hint: "Mail de cierre amable al rechazar" },
  { value: "offer_sent", label: "Oferta enviada", hint: "Mail de seguimiento luego de enviar oferta" },
];

const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(TRIGGER_OPTIONS.map((t) => [t.value, t.label]));

function AutomationsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: automations } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function toggle(id: string, enabled: boolean) {
    const { error } = await supabase.from("email_automations").update({ is_enabled: enabled }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["automations"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta automatización?")) return;
    const { error } = await supabase.from("email_automations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Automatización borrada");
    qc.invalidateQueries({ queryKey: ["automations"] });
  }

  return (
    <div>
      <header className="px-8 py-6 border-b border-border flex justify-between items-end">
        <div>
          <p className="text-sm text-muted-foreground">Mailing y flujos automáticos</p>
          <h1 className="font-display text-4xl mt-1">Automatizaciones</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90">
          <Plus className="size-4" /> Nueva automatización
        </button>
      </header>

      <section className="p-8">
        <div className="bg-primary-soft/40 border border-primary/15 rounded-3xl p-5 mb-6 flex gap-4 items-start">
          <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0"><Sparkles className="size-4" /></div>
          <div className="text-sm">
            <p className="font-medium">La AI redacta los mails por vos</p>
            <p className="text-muted-foreground mt-1">Configurás un trigger (qué evento dispara el mail) y un prompt corto explicando qué querés decir. Cuando el evento ocurra, la AI escribe el mail usando los datos del candidato. El envío real se activa cuando configures tu dominio de email (próximo paso).</p>
          </div>
        </div>

        <h2 className="font-display text-2xl mb-4">Tus automatizaciones</h2>
        {automations?.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center">
            <Zap className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-display text-2xl">Sin automatizaciones</p>
            <p className="text-sm text-muted-foreground mt-2">Creá la primera para empezar a automatizar tus mails.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations?.map((a: any) => (
              <div key={a.id} className="bg-white rounded-3xl border border-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{TRIGGER_LABEL[a.trigger_type] ?? a.trigger_type}</p>
                    <h3 className="font-display text-xl mt-1 truncate">{a.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Mail className="size-3" />{a.subject}</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" checked={a.is_enabled} onChange={(e) => toggle(a.id, e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-stone-200 peer-checked:bg-primary rounded-full peer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{a.prompt}</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setEditing(a)} className="flex-1 py-2 text-xs font-bold bg-stone-50 border border-border rounded-full hover:border-primary/30 inline-flex items-center justify-center gap-1.5">
                    <Pencil className="size-3" /> Editar
                  </button>
                  <button onClick={() => remove(a.id)} className="flex-1 py-2 text-xs font-bold bg-white border border-border text-destructive rounded-full hover:bg-destructive/5 inline-flex items-center justify-center gap-1.5">
                    <Trash2 className="size-3" /> Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(showNew || editing) && (
        <AutomationDialog
          existing={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSaved={() => qc.invalidateQueries({ queryKey: ["automations"] })}
        />
      )}
    </div>
  );
}

function AutomationDialog({ existing, onClose, onSaved }: { existing: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [triggerType, setTriggerType] = useState<string>(existing?.trigger_type ?? "cv_uploaded");
  const [subject, setSubject] = useState(existing?.subject ?? "Gracias por participar del proceso");
  const [prompt, setPrompt] = useState(existing?.prompt ?? "Agradecele al candidato por subir su CV al proceso. Pasale brevemente el job description que ya conoce y dale 3 tips útiles para preparar la entrevista (sé específica y accionable). Cerrá con calidez.");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const draft = useServerFn(draftEmail);

  async function generatePreview() {
    setPreviewLoading(true);
    try {
      const res = await draft({ data: {
        prompt,
        subject,
        context: {
          "Nombre candidato": "Lucía Pérez",
          "Puesto": "Senior Product Designer",
          "Empresa cliente": "Acme",
          "Descripción del puesto": "Diseño de producto end-to-end para una plataforma SaaS B2B. Equipo de 4. Foco en research, prototipado y handoff con ingeniería."
        }
      }});
      setPreview(res.body);
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo generar el preview");
    } finally { setPreviewLoading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (existing) {
        const { error } = await supabase.from("email_automations")
          .update({ name, trigger_type: triggerType as any, subject, prompt })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Automatización actualizada");
      } else {
        const { error } = await supabase.from("email_automations").insert({
          name, trigger_type: triggerType as any, subject, prompt, is_enabled: true,
        });
        if (error) throw error;
        toast.success("Automatización creada");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-background w-full max-w-2xl rounded-3xl border border-border my-8">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-2xl">{existing ? "Editar automatización" : "Nueva automatización"}</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nombre interno</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Welcome al subir CV" className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cuándo dispararse</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none">
              {TRIGGER_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1.5">{TRIGGER_OPTIONS.find(t => t.value === triggerType)?.hint}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Asunto del mail</label>
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Instrucciones para la AI</label>
            <textarea required rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none" />
            <p className="text-[11px] text-muted-foreground mt-1.5">La AI tiene acceso al nombre del candidato, el puesto, el cliente y la descripción del puesto.</p>
          </div>

          <div className="bg-stone-50 border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preview con datos de ejemplo</p>
              <button type="button" onClick={generatePreview} disabled={previewLoading} className="text-xs font-bold inline-flex items-center gap-1.5 text-primary hover:underline disabled:opacity-50">
                <Sparkles className="size-3" /> {previewLoading ? "Generando..." : preview ? "Regenerar" : "Generar preview"}
              </button>
            </div>
            {preview ? (
              <pre className="whitespace-pre-wrap text-sm font-body text-foreground">{preview}</pre>
            ) : (
              <p className="text-xs text-muted-foreground">Hacé clic en "Generar preview" para ver cómo redactaría la AI este mail.</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {loading ? "..." : existing ? "Guardar cambios" : "Crear automatización"}
          </button>
        </form>
      </div>
    </div>
  );
}
