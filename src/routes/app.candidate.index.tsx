import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, CheckCircle2, Circle, Sparkles, Save } from "lucide-react";
import { processInterview } from "@/lib/interview.functions";

export const Route = createFileRoute("/app/candidate/")({
  component: CandidateHome,
});

function CandidateHome() {
  const routeCtx = useRouteContext({ from: "/app/candidate" }) as any;
  const user = routeCtx?.user ?? null;
  const qc = useQueryClient();

  const { data: candidate, refetch } = useQuery({
    queryKey: ["my-candidate", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id,full_name,email,ai_profile,profile_validated_at,job_id,jobs(title,clients(name))")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["my-questions", candidate?.job_id],
    enabled: !!candidate?.job_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("job_interview_questions")
        .select("*")
        .eq("job_id", candidate!.job_id)
        .order("position");
      return data ?? [];
    },
  });

  const { data: answers } = useQuery({
    queryKey: ["my-answers", candidate?.id],
    enabled: !!candidate?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("candidate_interview_answers")
        .select("*")
        .eq("candidate_id", candidate!.id);
      return data ?? [];
    },
  });

  if (!candidate) {
    return (
      <div className="min-h-screen grid place-items-center p-8 bg-background">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl">Hola 👋</h1>
          <p className="text-sm text-muted-foreground mt-3">No encontramos un proceso de selección asociado a tu mail. Si creés que es un error, contactá a la recruiter que te invitó.</p>
        </div>
      </div>
    );
  }

  const allDone = (questions ?? []).length > 0 && (questions ?? []).every((q: any) => answers?.some((a: any) => a.question_id === q.id && a.video_url));

  return (
    <div className="min-h-screen bg-background">
      <header className="px-8 py-6 border-b border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{candidate.jobs?.clients?.name} · {candidate.jobs?.title}</p>
        <h1 className="font-display text-4xl mt-1">Tu entrevista, {candidate.full_name?.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">Grabá un video corto para cada pregunta. Podés repetir cuantas veces quieras antes de pasar a la siguiente. Cuando termines, vas a poder revisar el perfil que armó la IA.</p>
      </header>

      <div className="p-8 max-w-3xl mx-auto space-y-4">
        {(questions ?? []).length === 0 && (
          <div className="bg-white rounded-3xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">La recruiter todavía no cargó las preguntas. Volvé en un rato.</p>
          </div>
        )}
        {(questions ?? []).map((q: any, i: number) => {
          const answer = answers?.find((a: any) => a.question_id === q.id);
          return <QuestionCard key={q.id} index={i} question={q} candidateId={candidate.id} answer={answer} onSaved={() => qc.invalidateQueries({ queryKey: ["my-answers", candidate.id] })} />;
        })}

        {allDone && (
          <ProfileValidation candidate={candidate} onUpdated={() => refetch()} />
        )}
      </div>
    </div>
  );
}

function QuestionCard({ index, question, candidateId, answer, onSaved }: any) {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(answer?.video_url ?? null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setPreviewUrl(answer?.video_url ?? null); }, [answer?.video_url]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640 }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play(); }
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm" });
      recorderRef.current = mr;
      const local: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) local.push(e.data); };
      mr.onstop = () => { setChunks(local); };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => {
        if (s + 1 >= question.time_limit_seconds) { stop(); return s + 1; }
        return s + 1;
      }), 1000);
    } catch (e: any) {
      toast.error("No pude acceder a tu cámara/mic: " + e.message);
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }

  async function upload() {
    if (chunks.length === 0) { toast.error("No hay grabación"); return; }
    setUploading(true);
    try {
      const blob = new Blob(chunks, { type: "video/webm" });
      const path = `${candidateId}/${question.id}.webm`;
      const { error } = await supabase.storage.from("interview-videos").upload(path, blob, { upsert: true, contentType: "video/webm" });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("interview-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error: uErr } = await supabase.from("candidate_interview_answers").upsert({
        candidate_id: candidateId,
        question_id: question.id,
        video_url: signed?.signedUrl,
        storage_path: path,
        duration_seconds: elapsed || null,
      }, { onConflict: "candidate_id,question_id" });
      if (uErr) throw uErr;
      toast.success("Respuesta guardada");
      setChunks([]);
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  const hasRecorded = chunks.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-border p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-8 rounded-full grid place-items-center text-xs font-bold shrink-0 mt-0.5 border border-border">
          {previewUrl ? <CheckCircle2 className="size-4 text-emerald-600" /> : <span>{index + 1}</span>}
        </div>
        <div className="flex-1">
          <p className="font-medium">{question.question}</p>
          <p className="text-xs text-muted-foreground mt-1">Tiempo máximo: {question.time_limit_seconds}s</p>
        </div>
      </div>

      {recording ? (
        <>
          <video ref={videoRef} className="w-full aspect-video bg-black rounded-2xl mb-3" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono">{elapsed}s / {question.time_limit_seconds}s</span>
            <div className="flex-1 mx-3 h-1 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${(elapsed / question.time_limit_seconds) * 100}%` }} />
            </div>
          </div>
          <button onClick={stop} className="w-full py-3 bg-red-500 text-white rounded-full text-sm font-bold">Detener</button>
        </>
      ) : hasRecorded ? (
        <>
          <video src={URL.createObjectURL(new Blob(chunks, { type: "video/webm" }))} controls className="w-full aspect-video bg-black rounded-2xl mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setChunks([]); start(); }} className="py-3 border border-border rounded-full text-sm font-medium">Regrabar</button>
            <button onClick={upload} disabled={uploading} className="py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">{uploading ? "Subiendo…" : "Guardar respuesta"}</button>
          </div>
        </>
      ) : previewUrl ? (
        <>
          <video src={previewUrl} controls className="w-full aspect-video bg-black rounded-2xl mb-3" />
          <button onClick={start} className="w-full py-3 border border-border rounded-full text-sm font-medium flex items-center justify-center gap-2"><Video className="size-4" /> Volver a grabar</button>
        </>
      ) : (
        <button onClick={start} className="w-full py-4 bg-primary text-primary-foreground rounded-full text-sm font-bold flex items-center justify-center gap-2"><Video className="size-4" /> Grabar respuesta</button>
      )}
    </div>
  );
}

function ProfileValidation({ candidate, onUpdated }: any) {
  const processFn = useServerFn(processInterview);
  const [processing, setProcessing] = useState(false);
  const [profile, setProfile] = useState<any>(candidate.ai_profile ?? null);
  const [saving, setSaving] = useState(false);

  async function run() {
    setProcessing(true);
    try {
      const p = await processFn({ data: { candidateId: candidate.id } });
      setProfile(p);
      toast.success("Perfil generado. Revisalo y validalo.");
      onUpdated();
    } catch (e: any) { toast.error(e.message); } finally { setProcessing(false); }
  }

  async function saveAndValidate() {
    setSaving(true);
    const { error } = await supabase.from("candidates").update({
      ai_profile: profile,
      profile_validated_at: new Date().toISOString(),
    }).eq("id", candidate.id);
    if (error) toast.error(error.message); else { toast.success("¡Listo! Tu perfil quedó validado."); onUpdated(); }
    setSaving(false);
  }

  return (
    <div className="bg-primary/5 rounded-3xl border border-primary/10 p-6">
      <div className="flex items-center gap-2 mb-3"><Sparkles className="size-5 text-primary" /><h2 className="font-display text-2xl">Tu perfil generado por IA</h2></div>
      {!profile ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">Completaste todas las respuestas 🎉. Generamos un resumen automático de tu perfil para que lo revises antes de que lo vea la empresa.</p>
          <button onClick={run} disabled={processing} className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50">
            {processing ? "Procesando…" : "Generar mi perfil con IA"}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          {candidate.profile_validated_at && (
            <div className="bg-emerald-50 text-emerald-700 rounded-2xl px-4 py-2 text-xs font-bold inline-flex items-center gap-2"><CheckCircle2 className="size-4" /> Validado el {new Date(candidate.profile_validated_at).toLocaleDateString("es-AR")}</div>
          )}
          <Field label="Resumen" value={profile.summary ?? ""} onChange={(v) => setProfile({ ...profile, summary: v })} textarea />
          <ListField label="Fortalezas" items={profile.strengths ?? []} onChange={(v) => setProfile({ ...profile, strengths: v })} />
          <ListField label="A profundizar / dudas" items={profile.concerns ?? []} onChange={(v) => setProfile({ ...profile, concerns: v })} />
          <ListField label="Skills clave" items={profile.key_skills ?? []} onChange={(v) => setProfile({ ...profile, key_skills: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seniority sugerida" value={profile.suggested_seniority ?? ""} onChange={(v) => setProfile({ ...profile, suggested_seniority: v })} />
            <Field label="Fit score (0-100)" value={String(profile.role_fit_score ?? "")} onChange={(v) => setProfile({ ...profile, role_fit_score: parseInt(v) || 0 })} />
          </div>
          <Field label="Por qué encajás (o no)" value={profile.fit_reasoning ?? ""} onChange={(v) => setProfile({ ...profile, fit_reasoning: v })} textarea />
          <div className="flex gap-2">
            <button onClick={run} disabled={processing} className="px-4 py-2.5 border border-border rounded-full text-xs font-bold disabled:opacity-50">{processing ? "…" : "Regenerar"}</button>
            <button onClick={saveAndValidate} disabled={saving} className="flex-1 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"><Save className="size-4" /> {saving ? "…" : "Validar y enviar a la empresa"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      )}
    </div>
  );
}

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="mt-1 flex flex-wrap gap-1.5 mb-2">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs border border-border">
            {it} <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Agregar…" className="flex-1 bg-white border border-border rounded-2xl px-3 py-2 text-xs outline-none" />
        <button onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }} className="px-3 py-2 bg-white border border-border rounded-full text-xs font-bold">+</button>
      </div>
    </div>
  );
}
