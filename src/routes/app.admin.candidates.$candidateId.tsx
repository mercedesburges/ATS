import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Plus, Trash2, User } from "lucide-react";

export const Route = createFileRoute("/app/admin/candidates/$candidateId")({
  component: CandidateEditor,
});

function CandidateEditor() {
  const { candidateId } = useParams({ from: "/app/admin/candidates/$candidateId" });
  const qc = useQueryClient();

  const { data: candidate, refetch } = useQuery({
    queryKey: ["candidate-edit", candidateId],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("*,jobs(id,title,clients(name)),candidate_skills(*),candidate_experiences(*),interview_videos(*)").eq("id", candidateId).single();
      return data;
    },
  });

  if (!candidate) return <div className="p-8 text-muted-foreground">Cargando…</div>;

  return (
    <div>
      <header className="px-8 py-6 border-b border-border">
        <Link to="/app/admin/candidates" className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Volver</Link>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{candidate.jobs?.clients?.name} · {candidate.jobs?.title}</p>
            <h1 className="font-display text-4xl mt-1">{candidate.full_name}</h1>
          </div>
          <VisibilityToggle candidateId={candidate.id} visibility={candidate.visibility} onChange={() => refetch()} />
        </div>
      </header>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <PhotoSection candidate={candidate} onUpdate={refetch} />
          <BasicInfo candidate={candidate} onUpdate={refetch} />
          <CvSection candidate={candidate} onUpdate={refetch} />
        </div>
        <SkillsSection candidate={candidate} onUpdate={refetch} />
        <div className="space-y-6">
          <ExperienceSection candidate={candidate} onUpdate={refetch} />
          <VideoSection candidate={candidate} onUpdate={refetch} />
        </div>
      </div>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-border p-6">
      <h3 className="font-display text-xl mb-4">{title}</h3>
      {children}
    </div>
  );
}

function PhotoSection({ candidate, onUpdate }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${candidate.id}.${ext}`;
      const { error } = await supabase.storage.from("candidate-photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("candidate-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase.from("candidates").update({ photo_url: signed?.signedUrl }).eq("id", candidate.id);
      toast.success("Foto subida");
      onUpdate();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  return (
    <Card title="Foto">
      <div className="aspect-[4/5] bg-stone-100 rounded-2xl overflow-hidden mb-3">
        {candidate.photo_url ? <img src={candidate.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full grid place-items-center text-stone-400"><User className="size-12" /></div>}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button onClick={() => ref.current?.click()} disabled={uploading} className="w-full py-2.5 bg-stone-50 border border-border rounded-xl text-sm font-medium hover:bg-stone-100 disabled:opacity-50">
        {uploading ? "Subiendo..." : "Cambiar foto"}
      </button>
    </Card>
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

  return (
    <Card title="CV (PDF)">
      {candidate.cv_url ? (
        <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="block py-3 bg-stone-50 border border-border rounded-xl text-sm font-medium text-center hover:bg-stone-100">
          Ver CV actual
        </a>
      ) : <p className="text-xs text-muted-foreground mb-3">Sin CV cargado.</p>}
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button onClick={() => ref.current?.click()} disabled={uploading} className="mt-2 w-full py-2.5 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
        <Upload className="size-4" /> {uploading ? "Subiendo..." : "Subir CV"}
      </button>
    </Card>
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
