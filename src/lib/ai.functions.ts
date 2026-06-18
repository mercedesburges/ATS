import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const draftEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; subject?: string; context?: Record<string, string> }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const ctxLines = data.context
      ? Object.entries(data.context).map(([k, v]) => `- ${k}: ${v}`).join("\n")
      : "";

    const system = `Sos una asistente de reclutamiento de Vividtalent. Redactás emails en español rioplatense, cálidos, profesionales y concisos (máximo 180 palabras). No usás markdown, devolvés solo el cuerpo del mail en texto plano con saltos de línea entre párrafos. Firmá como "Equipo Vividtalent".`;

    const user = `Instrucción para este mail:
${data.prompt}

${ctxLines ? `Datos del candidato/proceso disponibles:\n${ctxLines}` : ""}

Asunto sugerido: ${data.subject ?? "(definir)"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
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
    const body = json?.choices?.[0]?.message?.content ?? "";
    return { body: body.trim() };
  });
