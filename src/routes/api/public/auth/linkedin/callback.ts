import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = process.env.SITE_URL || "https://www.vivid-talent.com";

export const Route = createFileRoute("/api/public/auth/linkedin/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        if (error) return new Response(`LinkedIn error: ${error}`, { status: 400 });
        if (!code || !state) return new Response("Faltan parámetros", { status: 400 });

        // CSRF: validate state from cookie
        const cookie = request.headers.get("cookie") ?? "";
        const m = cookie.match(/(?:^|;\s*)li_oauth=([^;]+)/);
        if (!m) return new Response("Sesión OAuth expirada. Reintentá.", { status: 400 });
        const [candidateId, savedState] = decodeURIComponent(m[1]).split(".");
        if (!candidateId || savedState !== state) {
          return new Response("Estado OAuth inválido", { status: 400 });
        }

        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        if (!clientId || !clientSecret) return new Response("LinkedIn no configurado", { status: 500 });

        // 1) Exchange code -> access_token
        const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: `${SITE_URL}/api/public/auth/linkedin/callback`,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        });
        if (!tokenRes.ok) {
          const t = await tokenRes.text();
          console.error("LinkedIn token error", tokenRes.status, t);
          return new Response("No se pudo autenticar con LinkedIn", { status: 502 });
        }
        const tokenJson = (await tokenRes.json()) as { access_token: string };

        // 2) Fetch OIDC userinfo
        const uiRes = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        if (!uiRes.ok) {
          return new Response("No se pudo leer el perfil de LinkedIn", { status: 502 });
        }
        const profile = (await uiRes.json()) as {
          sub: string;
          email?: string;
          email_verified?: boolean;
          name?: string;
          given_name?: string;
          family_name?: string;
          picture?: string;
        };
        if (!profile.email) {
          return new Response("Tu cuenta de LinkedIn no tiene email verificado.", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 3) Load candidate, verify it matches the LinkedIn email
        const { data: candidate } = await supabaseAdmin
          .from("candidates")
          .select("id,email,auth_user_id,full_name,photo_url,headline")
          .eq("id", candidateId)
          .maybeSingle();
        if (!candidate) return new Response("Candidato no encontrado", { status: 404 });

        if (candidate.email && candidate.email.toLowerCase() !== profile.email.toLowerCase()) {
          return new Response(
            `El email de LinkedIn (${profile.email}) no coincide con el email registrado por el reclutador. Iniciá sesión con la cuenta de LinkedIn que usa el email ${candidate.email}.`,
            { status: 403 },
          );
        }

        // 4) Find or create Supabase user
        let userId = candidate.auth_user_id as string | null;
        if (!userId) {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const found = existing?.users?.find((u: any) => u.email?.toLowerCase() === profile.email!.toLowerCase());
          if (found) {
            userId = found.id;
          } else {
            const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
              email: profile.email,
              email_confirm: true,
              user_metadata: {
                first_name: profile.given_name ?? profile.name?.split(" ")[0] ?? "",
                last_name: profile.family_name ?? profile.name?.split(" ").slice(1).join(" ") ?? "",
                avatar_url: profile.picture,
                linkedin_sub: profile.sub,
              },
            });
            if (cErr) return new Response(cErr.message, { status: 500 });
            userId = created.user!.id;
          }
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: userId, role: "candidate" },
            { onConflict: "user_id,role" },
          );
        }

        // 5) Link & enrich candidate with LinkedIn data (don't overwrite if already set)
        const patch: Record<string, unknown> = {
          auth_user_id: userId,
          linkedin_sub: profile.sub,
          linkedin_linked_at: new Date().toISOString(),
          email: candidate.email ?? profile.email,
        };
        if (!candidate.full_name && profile.name) patch.full_name = profile.name;
        if (!candidate.photo_url && profile.picture) patch.photo_url = profile.picture;
        await supabaseAdmin.from("candidates").update(patch).eq("id", candidate.id);

        // 6) Generate magic link for that user and redirect through it to log them in
        const { data: link, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: profile.email,
          options: { redirectTo: `${SITE_URL}/app/candidate` },
        });
        if (lErr || !link?.properties?.action_link) {
          return new Response(lErr?.message ?? "No se pudo generar la sesión", { status: 500 });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: link.properties.action_link,
            "Set-Cookie": "li_oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
          },
        });
      },
    },
  },
});
