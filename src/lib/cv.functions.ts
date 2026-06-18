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
