import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const parseCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileBase64: string; mimeType: string; fileName: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const system = `Sos un parser de CVs. Extraés datos básicos y devolvés SOLO un JSON válido sin markdown, con esta forma exacta:
{"first_name":"","last_name":"","full_name":"","email":"","phone":"","linkedin_url":""}

Reglas:
- phone: solo dígitos en formato internacional con + si está, sin espacios ni guiones (ej: +5491134567890). Si no hay, "".
- linkedin_url: URL completa que empiece por https://www.linkedin.com/in/ — si no aparece, "".
- email: minúsculas.
- Si no podés determinar un campo, devolvelo como string vacío.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: `Extraé los datos del CV adjunto (${data.fileName}).` },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.fileBase64}` } },
            ],
          },
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
    let raw: string = json?.choices?.[0]?.message?.content ?? "{}";
    raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    return {
      first_name: String(parsed.first_name ?? "").trim(),
      last_name: String(parsed.last_name ?? "").trim(),
      full_name: String(parsed.full_name ?? `${parsed.first_name ?? ""} ${parsed.last_name ?? ""}`).trim(),
      email: String(parsed.email ?? "").trim().toLowerCase(),
      phone: String(parsed.phone ?? "").replace(/[^\d+]/g, ""),
      linkedin_url: String(parsed.linkedin_url ?? "").trim(),
    };
  });

export const analyzeCvProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { candidateId: string }) => i)
  .handler(async ({ data, context }) => {
    const { data: cand } = await context.supabase
      .from("candidates")
      .select("id,full_name,cv_url,jobs(title,description,clients(name))")
      .eq("id", data.candidateId)
      .single();
    if (!cand?.cv_url) throw new Error("El candidato no tiene CV cargado");

    const fileRes = await fetch(cand.cv_url);
    if (!fileRes.ok) throw new Error("No se pudo descargar el CV");
    const buf = await fileRes.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const mime = fileRes.headers.get("content-type") || "application/pdf";

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const system = `Sos una recruiter senior. Analizás un CV en relación al puesto objetivo y devolvés SOLO JSON válido con esta forma exacta:
{
  "summary": "string — 4 a 6 oraciones en prosa narrativa describiendo la trayectoria profesional de la persona (NO empresa por empresa, sino una historia coherente). Usá **negritas markdown** para resaltar lo más importante: años de experiencia, seniority, tecnologías clave, logros cuantificables.",
  "highlights": ["string — 4 a 7 bullets cortos que destaquen aspectos del perfil alineados al puesto objetivo. Si algo viene de una empresa específica y es relevante, mencionala como contexto del highlight (ej: 'Lideró migración a microservicios en **MercadoLibre**, escalando a 10M req/día'). Usá **negritas markdown** en lo crítico de cada bullet."],
  "tech_skills": ["..."],
  "soft_skills": ["..."],
  "experiences": [{"role":"","company":"","period":"","description":""}]
}
En español rioplatense. No inventes datos. Si no hay puesto objetivo, hacé highlights generales del perfil. Si no hay datos, devolvé arrays vacíos.`;

    const userMsg = `Puesto objetivo: ${(cand as any).jobs?.title ?? "-"} en ${(cand as any).jobs?.clients?.name ?? "-"}.\nAnalizá el CV adjunto de ${cand.full_name}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: [
            { type: "text", text: userMsg },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ] },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Límite de uso de IA alcanzado.");
      if (res.status === 402) throw new Error("Sin créditos de IA.");
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    let raw: string = json?.choices?.[0]?.message?.content ?? "{}";
    raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    const summary = String(parsed.summary ?? "").trim();
    const highlights: string[] = Array.isArray(parsed.highlights) ? parsed.highlights.map(String).filter(Boolean) : [];
    const tech: string[] = Array.isArray(parsed.tech_skills) ? parsed.tech_skills.map(String) : [];
    const soft: string[] = Array.isArray(parsed.soft_skills) ? parsed.soft_skills.map(String) : [];
    const experiences: any[] = Array.isArray(parsed.experiences) ? parsed.experiences : [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Update summary into ai_profile (merge)
    const { data: existing } = await supabaseAdmin.from("candidates").select("ai_profile").eq("id", cand.id).single();
    const prevProfile = (existing?.ai_profile as any) || {};
    await supabaseAdmin.from("candidates").update({
      summary,
      ai_profile: { ...prevProfile, summary, highlights, tech_skills: tech, soft_skills: soft },
    }).eq("id", cand.id);

    // Replace skills + experiences
    await supabaseAdmin.from("candidate_skills").delete().eq("candidate_id", cand.id);
    const skillRows = [
      ...tech.map((s) => ({ candidate_id: cand.id, skill_name: s, category: "tech" })),
      ...soft.map((s) => ({ candidate_id: cand.id, skill_name: s, category: "soft" })),
    ].filter((r) => r.skill_name);
    if (skillRows.length) await supabaseAdmin.from("candidate_skills").insert(skillRows);

    await supabaseAdmin.from("candidate_experiences").delete().eq("candidate_id", cand.id);
    const expRows = experiences
      .map((e) => ({
        candidate_id: cand.id,
        role: String(e.role ?? "").trim(),
        company: String(e.company ?? "").trim() || null,
        period: String(e.period ?? "").trim() || null,
        description: String(e.description ?? "").trim() || null,
      }))
      .filter((e) => e.role);
    if (expRows.length) await supabaseAdmin.from("candidate_experiences").insert(expRows);

    return { summary, tech, soft, experiences: expRows.length };
  });
