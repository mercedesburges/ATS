import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";

const SITE_URL = process.env.SITE_URL || "https://www.vivid-talent.com";

export const Route = createFileRoute("/api/public/auth/linkedin/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const candidateId = url.searchParams.get("c");
        const token = url.searchParams.get("t");
        if (!candidateId || !token) {
          return new Response("Missing candidate or token", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: candidate } = await supabaseAdmin
          .from("candidates")
          .select("id,linkedin_invite_token")
          .eq("id", candidateId)
          .maybeSingle();
        if (!candidate || candidate.linkedin_invite_token !== token) {
          return new Response("Invitación inválida o expirada", { status: 401 });
        }

        const clientId = process.env.LINKEDIN_CLIENT_ID;
        if (!clientId) return new Response("LinkedIn no configurado", { status: 500 });

        const state = randomBytes(16).toString("hex");
        const redirectUri = `${SITE_URL}/api/public/auth/linkedin/callback`;
        const authorizeUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
        authorizeUrl.searchParams.set("response_type", "code");
        authorizeUrl.searchParams.set("client_id", clientId);
        authorizeUrl.searchParams.set("redirect_uri", redirectUri);
        authorizeUrl.searchParams.set("scope", "openid profile email");
        authorizeUrl.searchParams.set("state", state);

        // Stateless cookie carrying candidateId + state for CSRF check
        const payload = `${candidateId}.${state}`;
        return new Response(null, {
          status: 302,
          headers: {
            Location: authorizeUrl.toString(),
            "Set-Cookie": `li_oauth=${payload}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      },
    },
  },
});
