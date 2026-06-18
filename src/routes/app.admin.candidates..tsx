
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
