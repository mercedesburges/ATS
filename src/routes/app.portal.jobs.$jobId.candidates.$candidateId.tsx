import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Play, Download } from "lucide-react";

export const Route = createFileRoute("/app/portal/jobs/$jobId/candidates/$candidateId")({
  component: PortalCandidateDetail,
});

function PortalCandidateDetail() {
  const { jobId, candidateId } = useParams({ from: "/app/portal/jobs/$jobId/candidates/$candidateId" });
  const qc = useQueryClient();
  const ctx = (Route.useRouteContext as any)(); // user

  const { data: candidate, refetch } = useQuery({
    queryKey: ["portal-candidate", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("candidates")
        .select("*,jobs(title,clients(name)),candidate_skills(*),candidate_experiences(*),interview_videos(*),current_stage_id,job_stages!candidates_current_stage_id_fkey(name,color,is_rejected)")
        .eq("id", candidateId)
        .single();
      return data;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["portal-stages", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("job_stages").select("*").eq("job_id", jobId).eq("is_enabled", true).order("position");
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["candidate-comments", candidateId],
    queryFn: async () => {
      const { data } = await supabase.from("candidate_comments").select("*,profiles(first_name,last_name)").eq("candidate_id", candidateId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!candidate) return <div className="p-8 text-muted-foreground">Cargando…</div>;

  const video = candidate.interview_videos?.[0];
  const currentStage = candidate.job_stages;

  return (
    <div className="bg-primary/5 min-h-full">
      <header className="px-8 py-6 border-b border-border bg-background">
        <Link to="/app/portal/jobs/$jobId" params={{ jobId }} className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="size-3" /> Volver a candidatos</Link>
        <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="size-20 rounded-full border-4 border-white shadow-sm overflow-hidden bg-stone-200">
              {candidate.photo_url ? <img src={candidate.photo_url} alt={candidate.full_name} className="w-full h-full object-cover" /> : <div className="h-full grid place-items-center text-stone-400"><User className="size-8" /></div>}
            </div>
            <div>
              <h1 className="font-display text-5xl">{candidate.full_name}</h1>
              {candidate.headline && <p className="text-muted-foreground mt-1">{candidate.headline}</p>}
              {currentStage && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold uppercase tracking-wider">
                    {currentStage.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          <StageActions candidateId={candidateId} stages={stages ?? []} currentStageId={candidate.current_stage_id} onChange={() => { refetch(); qc.invalidateQueries({ queryKey: ["candidate-comments", candidateId] }); }} userId={ctx?.user?.id} />
        </div>
      </header>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1: CV */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-border">
          <h4 className="font-display text-2xl mb-6">Curriculum Vitae</h4>
          {candidate.summary && <p className="text-sm text-foreground/80 leading-relaxed mb-6 italic">{candidate.summary}</p>}
          <div className="space-y-6">
            {candidate.candidate_experiences?.length === 0 && <p className="text-sm text-muted-foreground">Sin experiencia cargada.</p>}
            {candidate.candidate_experiences?.map((e: any, i: number) => (
              <div key={e.id} className={`border-l-2 pl-4 ${i === 0 ? "border-primary/20" : "border-border"}`}>
                {e.period && <p className={`text-xs font-bold mb-1 uppercase tracking-widest ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{e.period}</p>}
                <h5 className="font-bold">{e.role}{e.company && ` @ ${e.company}`}</h5>
                {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
              </div>
            ))}
            {candidate.cv_url && (
              <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-stone-50 border border-border rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors">
                <Download className="size-4" /> Descargar CV completo
              </a>
            )}
          </div>
        </div>

        {/* Column 2: Skills */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-border">
          <h4 className="font-display text-2xl mb-6">Skills & Experiencia</h4>
          <div className="flex flex-wrap gap-2 mb-8">
            {candidate.candidate_skills?.length === 0 && <p className="text-sm text-muted-foreground">Sin skills cargadas.</p>}
            {candidate.candidate_skills?.map((s: any) => (
              <span key={s.id} className={`px-3 py-2 rounded-lg text-sm font-bold border ${s.is_critical ? "bg-primary-soft text-primary border-primary/10" : "bg-stone-100 text-stone-700 border-stone-200"}`}>
                {s.years ? `${s.years}Y ` : ""}{s.skill_name}
              </span>
            ))}
          </div>
          {candidate.years_experience && (
            <div className="p-6 bg-accent-gold/5 rounded-2xl border border-accent-gold/20">
              <p className="text-xs font-bold uppercase tracking-wider text-accent-gold mb-2">Años totales</p>
              <p className="font-display text-3xl">{candidate.years_experience} años de experiencia</p>
            </div>
          )}
        </div>

        {/* Column 3: Video */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-border">
          <h4 className="font-display text-2xl mb-6">Entrevista AI</h4>
          {video?.video_url ? (
            <video src={video.video_url} controls className="w-full aspect-video rounded-2xl bg-black mb-4" poster={video.thumbnail_url ?? undefined} />
          ) : (
            <div className="w-full aspect-video bg-stone-100 rounded-2xl mb-4 grid place-items-center">
              <div className="text-center">
                <Play className="size-10 text-stone-400 mx-auto" />
                <p className="text-xs uppercase tracking-widest text-stone-400 mt-2">Sin video todavía</p>
              </div>
            </div>
          )}
          {video?.questions && Array.isArray(video.questions) && (
            <div className="space-y-3">
              {video.questions.map((q: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Pregunta {i + 1}</p>
                  <p className="text-sm font-medium">{q.text ?? q}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="p-8 pt-0">
        <div className="bg-white rounded-[32px] border border-border p-8 max-w-4xl mx-auto">
          <h4 className="font-display text-2xl mb-6">Feedback y comentarios</h4>
          <CommentForm candidateId={candidateId} onPosted={() => qc.invalidateQueries({ queryKey: ["candidate-comments", candidateId] })} />
          <div className="mt-6 space-y-4">
            {comments?.length === 0 && <p className="text-sm text-muted-foreground">Sin comentarios todavía.</p>}
            {comments?.map((c: any) => (
              <div key={c.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                <div className="size-9 rounded-full bg-accent-gold/20 grid place-items-center text-xs font-bold text-accent-gold shrink-0">
                  {(c.profiles?.first_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold">{c.profiles?.first_name} {c.profiles?.last_name}</p>
                  <p className="text-sm mt-1">{c.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString("es-AR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StageActions({ candidateId, stages, currentStageId, onChange, userId }: any) {
  const [moving, setMoving] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState<string | null>(null);

  async function moveTo(stageId: string, feedback?: string) {
    const stage = stages.find((s: any) => s.id === stageId);
    setMoving(stageId);
    const { error } = await supabase.from("candidates").update({ current_stage_id: stageId }).eq("id", candidateId);
    if (error) { toast.error(error.message); setMoving(null); return; }
    await supabase.from("candidate_status_history").insert({
      candidate_id: candidateId,
      from_stage_id: currentStageId,
      to_stage_id: stageId,
      changed_by: userId,
      feedback: feedback ?? null,
    });
    if (stage?.triggers_availability_email) {
      toast.success(`Estado actualizado. (Fase 2: se envía email automático al candidato para coordinar horario)`);
    } else {
      toast.success("Estado actualizado");
    }
    setMoving(null);
    setRejectFeedback(null);
    onChange();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2 justify-end">
        {stages.map((s: any) => {
          if (s.id === currentStageId) return null;
          const isReject = s.is_rejected;
          return (
            <button
              key={s.id}
              disabled={!!moving}
              onClick={() => isReject ? setRejectFeedback(s.id) : moveTo(s.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 ${isReject ? "bg-stone-100 text-stone-600 hover:bg-stone-200" : "bg-white border border-border hover:bg-stone-50"}`}
            >
              {moving === s.id ? "..." : `→ ${s.name}`}
            </button>
          );
        })}
      </div>
      {rejectFeedback && (
        <RejectFeedbackForm
          onCancel={() => setRejectFeedback(null)}
          onSubmit={(fb) => moveTo(rejectFeedback, fb)}
        />
      )}
    </div>
  );
}

function RejectFeedbackForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (fb: string) => void }) {
  const [fb, setFb] = useState("");
  return (
    <div className="mt-2 p-4 bg-white border border-border rounded-2xl w-80">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Feedback (obligatorio para rechazar)</p>
      <textarea required value={fb} onChange={(e) => setFb(e.target.value)} rows={3} className="w-full bg-white border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      <div className="flex gap-2 mt-2">
        <button onClick={onCancel} className="flex-1 py-2 text-xs font-bold text-muted-foreground">Cancelar</button>
        <button disabled={!fb} onClick={() => onSubmit(fb)} className="flex-1 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold disabled:opacity-50">Rechazar</button>
      </div>
    </div>
  );
}

function CommentForm({ candidateId, onPosted }: any) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("candidate_comments").insert({
      candidate_id: candidateId,
      author_id: me.user!.id,
      content,
      is_internal: false,
    });
    if (error) toast.error(error.message); else {
      setContent("");
      onPosted();
    }
    setPosting(false);
  }
  return (
    <form onSubmit={post}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="Dejá tu feedback..."
        className="w-full bg-white border border-border rounded-[20px] p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      <div className="flex justify-end mt-2">
        <button type="submit" disabled={posting || !content.trim()} className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold disabled:opacity-50">
          {posting ? "..." : "Publicar comentario"}
        </button>
      </div>
    </form>
  );
}
