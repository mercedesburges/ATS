import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GW_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(system: string, user: string, expectJson = true): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");
  const res = await fetch(GW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Límite de uso de IA alcanzado. Probá más tarde.");
    if (res.status === 402) throw new Error("Sin créditos de IA disponibles.");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  let raw: string = json?.choices?.[0]?.message?.content ?? "";
  raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return raw;
}

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const suggestInterviewQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { jobId: string }) => i)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: job } = await context.supabase
      .from("jobs")
      .select("title,area,description,clients(name,industry)")
      .eq("id", data.jobId)
      .single();
    if (!job) throw new Error("Puesto no encontrado");

    const system = `Sos una recruiter experta. Generás 5 preguntas para una entrevista en video asincrónica. Mezclá comportamentales y específicas del puesto. Devolvé SOLO un JSON: {"questions":[{"question":"...","time_limit_seconds":120}, ...]}. Cada pregunta corta (1-2 oraciones), en español rioplatense, neutra, sin sesgo. Time limit entre 60 y 180.`;
    const user = `Puesto: ${job.title}\nÁrea: ${job.area ?? "-"}\nEmpresa: ${job.clients?.name ?? "-"} (${job.clients?.industry ?? "-"})\n\nDescripción:\n${job.description ?? "(sin descripción)"}`;

    const raw = await callAI(system, user);
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { questions: [] }; }
    const qs = Array.isArray(parsed.questions) ? parsed.questions : [];
    return qs.slice(0, 5).map((q: any, i: number) => ({
      position: i + 1,
      question: String(q.question ?? "").trim(),
      time_limit_seconds: Math.min(180, Math.max(45, parseInt(q.time_limit_seconds) || 120)),
    })).filter((q: any) => q.question);
  });

export const inviteCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { candidateId: string }) => i)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: candidate } = await context.supabase
      .from("candidates")
      .select("id,email,full_name,auth_user_id")
      .eq("id", data.candidateId)
      .single();
    if (!candidate?.email) throw new Error("El candidato no tiene email cargado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId = candidate.auth_user_id;
    if (!userId) {
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = existing?.users?.find((u: any) => u.email?.toLowerCase() === candidate.email!.toLowerCase());
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email: candidate.email!,
          email_confirm: true,
          user_metadata: { first_name: candidate.full_name?.split(" ")[0] ?? "", last_name: candidate.full_name?.split(" ").slice(1).join(" ") ?? "" },
        });
        if (cErr) throw new Error(cErr.message);
        userId = created.user!.id;
      }
      await supabaseAdmin.from("candidates").update({ auth_user_id: userId, interview_invited_at: new Date().toISOString() }).eq("id", candidate.id);
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "candidate" }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "client");
    } else {
      await supabaseAdmin.from("candidates").update({ interview_invited_at: new Date().toISOString() }).eq("id", candidate.id);
    }

    const origin = process.env.SITE_URL || "";
    const { data: link, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: candidate.email!,
      options: { redirectTo: `${origin}/app/candidate` },
    });
    if (lErr) throw new Error(lErr.message);
    return { magic_link: link?.properties?.action_link ?? "", email: candidate.email };
  });

export const processInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { candidateId: string }) => i)
  .handler(async ({ data, context }) => {
    const { data: candidate } = await context.supabase
      .from("candidates")
      .select("id,full_name,email,headline,summary,years_experience,cv_url,jobs(title,description,clients(name))")
      .eq("id", data.candidateId)
      .single();
    if (!candidate) throw new Error("Candidato no encontrado");

    const { data: answers } = await context.supabase
      .from("candidate_interview_answers")
      .select("question_id,duration_seconds,transcript,job_interview_questions(question)")
      .eq("candidate_id", data.candidateId);

    const answersTxt = (answers ?? []).map((a: any, i: number) =>
      `Pregunta ${i + 1}: ${a.job_interview_questions?.question}\nDuración: ${a.duration_seconds ?? "?"}s\nTranscripción: ${a.transcript ?? "(pendiente)"}\n`
    ).join("\n");

    const system = `Sos una recruiter senior. Analizás un CV + respuestas de entrevista en video y producís un perfil estructurado del candidato. Devolvé SOLO JSON válido con esta forma:
{
  "summary": "string (2-4 oraciones)",
  "strengths": ["..."],
  "concerns": ["..."],
  "key_skills": ["..."],
  "suggested_seniority": "junior|semi-senior|senior|lead",
  "role_fit_score": 0,
  "fit_reasoning": "string"
}
role_fit_score: 0-100. Si los datos son insuficientes, devolvé valores conservadores. No inventes información. En español rioplatense.`;

    const user = `Puesto: ${candidate.jobs?.title} en ${candidate.jobs?.clients?.name ?? "-"}
Descripción del puesto:
${candidate.jobs?.description ?? "-"}

Candidato: ${candidate.full_name}
Headline: ${candidate.headline ?? "-"}
Años de experiencia: ${candidate.years_experience ?? "-"}
Resumen CV: ${candidate.summary ?? "-"}

Respuestas de entrevista:
${answersTxt || "(sin respuestas todavía)"}`;

    const raw = await callAI(system, user);
    let profile: any = {};
    try { profile = JSON.parse(raw); } catch { profile = { summary: raw }; }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("candidates").update({ ai_profile: profile }).eq("id", data.candidateId);
    return profile;
  });
