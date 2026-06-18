import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Plus, Trash2, User, Send, Copy, Sparkles, CheckCircle2, FileText, Briefcase, Video, Mail, Phone, MapPin, Cake, Pencil, X } from "lucide-react";
import { inviteCandidate, processInterview } from "@/lib/interview.functions";
import { analyzeCvProfile } from "@/lib/cv.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function calcAge(birth?: string | null): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}
function waLink(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export const Route = createFileRoute("/app/admin/candidates/$candidateId")({
  component: CandidateEditor,
});

function CandidateEditor() {
  const { candidateId } = useParams({ from: "/app/admin/candidates/$candidateId" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: candidate, refetch, isLoading, error } = useQuery({
    queryKey: ["candidate-edit", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*,jobs(id,title,clients(name)),candidate_skills(*),candidate_experiences(*),interview_videos(*)").eq("id", candidateId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const photoRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingContact, setEditingContact] = useState(false);

  async function uploadPhoto(file: File) {
    if (!candidate) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${candidate.id}.${ext}`;
      const { error } = await supabase.storage.from("candidate-photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("candidate-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase.from("candidates").update({ photo_url: signed?.signedUrl }).eq("id", candidate.id);
      toast.success("Foto actualizada");
      refetch();
    } catch (e: any) { toast.error(e.message); } finally { setUploadingPhoto(false); }
  }

  async function deleteCandidate() {
    if (!candidate) return;
    if (!confirm(`¿Borrar a ${candidate.full_name}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("candidates").delete().eq("id", candidate.id);
      if (error) throw error;
      toast.success("Candidato eliminado");
      qc.invalidateQueries({ queryKey: ["all-candidates"] });
      navigate({ to: "/app/admin/candidates" });
    } catch (e: any) { toast.error(e.message); setDeleting(false); }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando…</div>;
  if (error) return <div className="p-8 text-destructive">Error: {(error as any).message}</div>;
  if (!candidate) return <div className="p-8 text-muted-foreground">Candidato no encontrado.</div>;

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <Link to="/app/admin/candidates" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Volver</Link>
        <div className="mt-3 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              disabled={uploadingPhoto}
              title="Cambiar foto"
              className="size-16 shrink-0 bg-stone-100 rounded-full overflow-hidden border border-border hover:opacity-80 disabled:opacity-50"
            >
              {candidate.photo_url
                ? <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" />
                : <div className="h-full grid place-items-center text-stone-400"><User className="size-6" /></div>}
            </button>
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{candidate.jobs?.clients?.name} · {candidate.jobs?.title}</p>
              <h1 className="font-display text-3xl mt-0.5 truncate">{candidate.full_name}</h1>
              <ContactStrip candidate={candidate} onEdit={() => setEditingContact(true)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VisibilityToggle candidateId={candidate.id} visibility={candidate.visibility} onChange={() => refetch()} />
            <button
              onClick={deleteCandidate}
              disabled={deleting}
              className="size-10 rounded-full grid place-items-center text-destructive border border-destructive/20 hover:bg-destructive/10 disabled:opacity-50"
              title="Eliminar candidato"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {editingContact && <ContactEditModal candidate={candidate} onClose={() => setEditingContact(false)} onSaved={() => { setEditingContact(false); refetch(); }} />}

      <div className="p-8">
        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="perfil" className="gap-2"><Briefcase className="size-4" /> Perfil & Skills</TabsTrigger>
            <TabsTrigger value="cv" className="gap-2"><FileText className="size-4" /> CV</TabsTrigger>
            <TabsTrigger value="entrevista" className="gap-2"><Video className="size-4" /> Live Cover Letter</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <ProfileSkillsTab candidate={candidate} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="cv">
            <CvSection candidate={candidate} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="entrevista" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InterviewAdminSection candidate={candidate} onUpdate={refetch} />
            <VideoSection candidate={candidate} onUpdate={refetch} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ContactStrip({ candidate, onEdit }: any) {
  const age = calcAge(candidate.birth_date);
  const wa = waLink(candidate.phone);
  const loc = [candidate.city, candidate.country].filter(Boolean).join(", ") || candidate.location;
  const items: React.ReactNode[] = [];
  if (age !== null) items.push(<span key="age" className="inline-flex items-center gap-1"><Cake className="size-3" />{age} años</span>);
  if (loc) items.push(<span key="loc" className="inline-flex items-center gap-1"><MapPin className="size-3" />{loc}</span>);
  if (candidate.expertise) items.push(<span key="exp" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider text-[10px]">{candidate.expertise}</span>);
  if (candidate.email) items.push(<a key="em" href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="size-3" />{candidate.email}</a>);
  if (candidate.phone) items.push(
    wa
      ? <a key="ph" href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-600"><Phone className="size-3" />{candidate.phone}</a>
      : <span key="ph" className="inline-flex items-center gap-1"><Phone className="size-3" />{candidate.phone}</span>
  );
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.length === 0 && <span className="italic">Sin datos personales cargados</span>}
      {items}
      <button onClick={onEdit} className="inline-flex items-center gap-1 text-primary hover:underline"><Pencil className="size-3" />Editar</button>
    </div>
  );
}

const EXPERTISE_OPTIONS = [
  "Engineering", "Product", "Design", "Data", "Marketing",
  "Sales", "Customer Success", "Operations", "Finance", "People / HR", "Legal", "Other",
];

function ContactEditModal({ candidate, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    full_name: candidate.full_name ?? "",
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    city: candidate.city ?? candidate.location ?? "",
    country: candidate.country ?? "",
    expertise: candidate.expertise ?? "",
    birth_date: candidate.birth_date ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  // Auto-fill country from city
  useEffect(() => {
    const city = form.city.trim();
    if (!city || form.country) return;
    const t = setTimeout(async () => {
      try {
        setLookingUp(true);
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es`);
        const j = await r.json();
        const c = j?.results?.[0]?.country;
        if (c) setForm((f) => f.country ? f : { ...f, country: c });
      } catch {} finally { setLookingUp(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [form.city]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("candidates").update({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      city: form.city || null,
      country: form.country || null,
      location: [form.city, form.country].filter(Boolean).join(", ") || null,
      expertise: form.expertise || null,
      birth_date: form.birth_date || null,
    }).eq("id", candidate.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Datos actualizados");
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl">Editar datos personales</h3>
          <button onClick={onClose} className="size-8 rounded-full grid place-items-center hover:bg-stone-100"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <Input label="Nombre completo" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Celular (con código país, ej +5491134567890)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Área de expertise</label>
            <select value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="">— Sin asignar —</option>
              {EXPERTISE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <Input label="Ciudad" value={form.city} onChange={(v) => setForm({ ...form, city: v, country: v ? form.country : "" })} />
          <Input label={lookingUp ? "País (buscando…)" : "País (auto)"} value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <Input label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
          <button onClick={save} disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}


function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-border p-6">
      <h3 className="font-display text-xl mb-4">{title}</h3>
      {children}
    </div>
  );
}

function BasicInfo({ candidate, onUpdate }: any) {
  const [data, setData] = useState({
    full_name: candidate.full_name,
    email: candidate.email ?? "",
    headline: candidate.headline ?? "",
    years_experience: candidate.years_experience ?? "",
    summary: candidate.summary ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("candidates").update({
      ...data,
      years_experience: data.years_experience ? parseInt(String(data.years_experience)) : null,
    }).eq("id", candidate.id);
    if (error) toast.error(error.message); else toast.success("Guardado");
    setSaving(false);
    onUpdate();
  }

  return (
    <Card title="Datos básicos">
      <div className="space-y-3">
        <Input label="Nombre" value={data.full_name} onChange={(v) => setData({ ...data, full_name: v })} />
        <Input label="Email" value={data.email} onChange={(v) => setData({ ...data, email: v })} />
        <Input label="Headline" value={data.headline} onChange={(v) => setData({ ...data, headline: v })} />
        <Input label="Años de experiencia" type="number" value={String(data.years_experience)} onChange={(v) => setData({ ...data, years_experience: v as any })} />
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumen</label>
          <textarea rows={3} value={data.summary} onChange={(e) => setData({ ...data, summary: e.target.value })} className="mt-1 w-full bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={save} disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">{saving ? "..." : "Guardar"}</button>
      </div>
    </Card>
  );
}

function CvSection({ candidate, onUpdate }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const path = `${candidate.id}/${file.name}`;
      const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("cvs").createSignedUrl(path, 60 * 60 * 24 * 30);
      await supabase.from("candidates").update({ cv_url: signed?.signedUrl }).eq("id", candidate.id);
      toast.success("CV subido");
      onUpdate();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  const isPdf = candidate.cv_url && /\.pdf(\?|$)/i.test(candidate.cv_url);

  return (
    <div className="bg-white rounded-3xl border border-border p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-display text-xl">CV</h3>
        <div className="flex items-center gap-2">
          {candidate.cv_url && (
            <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-stone-50 border border-border rounded-full text-xs font-bold hover:bg-stone-100">
              Abrir en pestaña nueva
            </a>
          )}
          <input ref={ref} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button onClick={() => ref.current?.click()} disabled={uploading} className="px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground rounded-full text-xs font-bold disabled:opacity-50">
            <Upload className="size-3.5" /> {uploading ? "Subiendo..." : candidate.cv_url ? "Reemplazar" : "Subir CV"}
          </button>
        </div>
      </div>
      {candidate.cv_url ? (
        isPdf ? (
          <iframe src={candidate.cv_url} title="CV preview" className="w-full h-[80vh] rounded-2xl border border-border bg-stone-50" />
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Vista previa no disponible para este formato. Abrilo en pestaña nueva.
          </div>
        )
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center text-sm text-muted-foreground">
          Sin CV cargado. Subí un PDF para previsualizarlo acá.
        </div>
      )}
    </div>
  );
}

function SkillsSection({ candidate, onUpdate }: any) {
  const [skill, setSkill] = useState("");
  const [years, setYears] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!skill) return;
    const { error } = await supabase.from("candidate_skills").insert({
      candidate_id: candidate.id, skill_name: skill, years: years ? parseInt(years) : null,
    });
    if (error) toast.error(error.message);
    setSkill(""); setYears("");
    onUpdate();
  }
  async function remove(id: string) {
    await supabase.from("candidate_skills").delete().eq("id", id);
    onUpdate();
  }

  return (
    <Card title="Skills y experiencia">
      <div className="flex flex-wrap gap-2 mb-4">
        {candidate.candidate_skills?.length === 0 && <p className="text-xs text-muted-foreground">Sin skills cargadas.</p>}
        {candidate.candidate_skills?.map((s: any) => (
          <span key={s.id} className="group flex items-center gap-2 px-3 py-2 bg-primary-soft text-primary rounded-lg text-sm font-bold border border-primary/10">
            {s.years ? `${s.years}Y ` : ""}{s.skill_name}
            <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="size-3" /></button>
          </span>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Ej: Python" className="flex-1 bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <input value={years} onChange={(e) => setYears(e.target.value)} type="number" placeholder="Años" className="w-20 bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <button className="px-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"><Plus className="size-4" /></button>
      </form>
    </Card>
  );
}

function ExperienceSection({ candidate, onUpdate }: any) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [period, setPeriod] = useState("");
  const [desc, setDesc] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    await supabase.from("candidate_experiences").insert({
      candidate_id: candidate.id, role, company: company || null, period: period || null, description: desc || null,
    });
    setRole(""); setCompany(""); setPeriod(""); setDesc("");
    onUpdate();
  }
  async function remove(id: string) {
    await supabase.from("candidate_experiences").delete().eq("id", id);
    onUpdate();
  }
  return (
    <Card title="Experiencia (CV timeline)">
      <div className="space-y-3 mb-4">
        {candidate.candidate_experiences?.map((e: any) => (
          <div key={e.id} className="group relative border-l-2 border-primary/20 pl-3">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">{e.period}</p>
            <p className="font-bold text-sm">{e.role}{e.company && ` @ ${e.company}`}</p>
            {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
            <button onClick={() => remove(e.id)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100"><Trash2 className="size-3 text-muted-foreground" /></button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="space-y-2">
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Puesto" className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa" className="bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
          <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2020 — Presente" className="bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Descripción" className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <button className="w-full py-2 bg-stone-50 border border-border rounded-xl text-xs font-bold hover:bg-stone-100">Agregar</button>
      </form>
    </Card>
  );
}

function VideoSection({ candidate, onUpdate }: any) {
  const existing = candidate.interview_videos?.[0];
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const path = `${candidate.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("interview-videos").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("interview-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? "";
      if (existing) {
        await supabase.from("interview_videos").update({ video_url: url }).eq("id", existing.id);
      } else {
        await supabase.from("interview_videos").insert({ candidate_id: candidate.id, video_url: url });
      }
      toast.success("Video subido");
      onUpdate();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  return (
    <Card title="Video entrevista">
      {existing?.video_url ? (
        <video src={existing.video_url} controls className="w-full aspect-video rounded-2xl bg-black mb-3" />
      ) : (
        <div className="aspect-video bg-stone-100 rounded-2xl mb-3 grid place-items-center text-xs uppercase tracking-widest text-stone-400">
          Sin video
        </div>
      )}
      <input ref={ref} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button onClick={() => ref.current?.click()} disabled={uploading} className="w-full py-2.5 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
        <Upload className="size-4" /> {uploading ? "Subiendo..." : "Subir video"}
      </button>
      <p className="text-xs text-muted-foreground mt-2">En Fase 3 esto se reemplaza por la entrevista AI automática.</p>
    </Card>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
    </div>
  );
}

function InterviewAdminSection({ candidate, onUpdate }: any) {
  const inviteFn = useServerFn(inviteCandidate);
  const processFn = useServerFn(processInterview);
  const [inviting, setInviting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  const { data: answers } = useQuery({
    queryKey: ["interview-answers", candidate.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidate_interview_answers")
        .select("*,job_interview_questions(question,position)")
        .eq("candidate_id", candidate.id);
      return data ?? [];
    },
  });

  async function invite() {
    setInviting(true);
    try {
      const res: any = await inviteFn({ data: { candidateId: candidate.id } });
      setMagicLink(res.magic_link);
      if (res.emailSent) {
        toast.success(`Email enviado a ${res.email}`);
      } else {
        toast.warning(`No se pudo enviar el email${res.emailError ? `: ${res.emailError}` : ""}. Podés copiar el link manualmente.`);
      }
      onUpdate();
    } catch (e: any) { toast.error(e.message); } finally { setInviting(false); }
  }

  async function processIv() {
    setProcessing(true);
    try {
      await processFn({ data: { candidateId: candidate.id } });
      toast.success("Perfil procesado por IA");
      onUpdate();
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  }

  const profile = candidate.ai_profile;
  const sorted = (answers ?? []).slice().sort((a: any, b: any) => (a.job_interview_questions?.position ?? 0) - (b.job_interview_questions?.position ?? 0));

  return (
    <div className="bg-white rounded-3xl border border-border p-6">
      <h3 className="font-display text-xl mb-4">Entrevista AI</h3>

      <button onClick={invite} disabled={inviting || !candidate.email} className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
        <Send className="size-4" /> {inviting ? "..." : candidate.interview_invited_at ? "Reenviar invitación" : "Invitar a entrevista"}
      </button>
      {!candidate.email && <p className="text-[11px] text-muted-foreground mt-1.5">Cargá un email primero.</p>}
      {candidate.interview_invited_at && <p className="text-[11px] text-muted-foreground mt-1.5">Invitado el {new Date(candidate.interview_invited_at).toLocaleDateString("es-AR")}</p>}

      {magicLink && (
        <div className="mt-3 p-3 bg-stone-50 border border-border rounded-2xl">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Link mágico (vence en 1h) — copialo y mandalo</p>
          <div className="flex gap-2">
            <input readOnly value={magicLink} className="flex-1 text-[10px] bg-white border border-border rounded-lg px-2 py-1.5 font-mono" />
            <button onClick={() => { navigator.clipboard.writeText(magicLink); toast.success("Copiado"); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg"><Copy className="size-3" /></button>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Respuestas ({sorted.length})</p>
          {sorted.map((a: any) => (
            <details key={a.id} className="border border-border rounded-xl">
              <summary className="px-3 py-2 text-xs cursor-pointer">{a.job_interview_questions?.position}. {a.job_interview_questions?.question}</summary>
              {a.video_url && <video src={a.video_url} controls className="w-full aspect-video bg-black rounded-b-xl" />}
            </details>
          ))}
          <button onClick={processIv} disabled={processing} className="mt-3 w-full py-2.5 bg-primary/10 text-primary rounded-full text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            <Sparkles className="size-3.5" /> {processing ? "..." : profile ? "Reprocesar con IA" : "Procesar con IA"}
          </button>
        </div>
      )}

      {profile && (
        <div className="mt-5 p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-2 text-xs">
          {candidate.profile_validated_at && (
            <div className="inline-flex items-center gap-1.5 text-emerald-700 font-bold"><CheckCircle2 className="size-3" /> Validado por el candidato</div>
          )}
          {profile.summary && <p className="text-foreground/80">{profile.summary}</p>}
          {profile.role_fit_score !== undefined && (
            <p><span className="font-bold">Fit score:</span> {profile.role_fit_score}/100 — {profile.suggested_seniority}</p>
          )}
          {Array.isArray(profile.strengths) && profile.strengths.length > 0 && (
            <p><span className="font-bold">Fortalezas:</span> {profile.strengths.join(", ")}</p>
          )}
          {Array.isArray(profile.concerns) && profile.concerns.length > 0 && (
            <p><span className="font-bold">A profundizar:</span> {profile.concerns.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function VisibilityToggle({ candidateId, visibility, onChange }: any) {
  async function toggle() {
    const next = visibility === "published" ? "draft" : "published";
    await supabase.from("candidates").update({ visibility: next }).eq("id", candidateId);
    toast.success(next === "published" ? "Visible al cliente" : "Oculto del cliente");
    onChange();
  }
  return (
    <button onClick={toggle} className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider ${visibility === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      {visibility === "published" ? "Visible al cliente ✓" : "Borrador — Publicar"}
    </button>
  );
}

function ProfileSkillsTab({ candidate, onUpdate }: any) {
  const analyzeFn = useServerFn(analyzeCvProfile);
  const [analyzing, setAnalyzing] = useState(false);
  const ai = (candidate.ai_profile as any) || {};
  const techSkills = (candidate.candidate_skills ?? []).filter((s: any) => (s.category ?? "tech") === "tech");
  const softSkills = (candidate.candidate_skills ?? []).filter((s: any) => s.category === "soft");
  const experiences = candidate.candidate_experiences ?? [];
  const summary = ai.summary || candidate.summary;

  async function analyze() {
    if (!candidate.cv_url) { toast.error("Subí primero un CV en la solapa CV."); return; }
    setAnalyzing(true);
    try {
      await analyzeFn({ data: { candidateId: candidate.id } });
      toast.success("Perfil generado por IA");
      onUpdate();
    } catch (e: any) { toast.error(e.message); } finally { setAnalyzing(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={analyze} disabled={analyzing} className="px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground rounded-full text-xs font-bold disabled:opacity-50">
          <Sparkles className="size-3.5" /> {analyzing ? "Analizando CV..." : summary ? "Re-analizar CV con IA" : "Analizar CV con IA"}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-primary" />
          <h3 className="font-display text-xl">Experiencia profesional</h3>
        </div>
        {summary ? (
          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sin resumen aún. Subí el CV y tocá "Analizar CV con IA".</p>
        )}
        {experiences.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            {experiences.map((e: any) => (
              <div key={e.id} className="border-l-2 border-primary/30 pl-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{e.period || "—"}</p>
                <p className="font-bold text-sm">{e.role}{e.company && ` · ${e.company}`}</p>
                {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-border p-6">
          <h3 className="font-display text-lg mb-3">Skills técnicos</h3>
          {techSkills.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin skills cargados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {techSkills.map((s: any) => (
                <span key={s.id} className="px-3 py-1.5 bg-primary-soft text-primary rounded-lg text-xs font-bold border border-primary/10">
                  {s.skill_name}{s.years ? ` · ${s.years}Y` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-3xl border border-border p-6">
          <h3 className="font-display text-lg mb-3">Skills blandos</h3>
          {softSkills.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin skills cargados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {softSkills.map((s: any) => (
                <span key={s.id} className="px-3 py-1.5 bg-stone-100 text-foreground rounded-lg text-xs font-bold border border-border">
                  {s.skill_name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

