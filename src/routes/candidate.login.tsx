import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Linkedin } from "lucide-react";

type Search = { c?: string; t?: string };

export const Route = createFileRoute("/candidate/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: typeof s.c === "string" ? s.c : undefined,
    t: typeof s.t === "string" ? s.t : undefined,
  }),
  component: CandidateLogin,
});

function CandidateLogin() {
  const { c, t } = useSearch({ from: "/candidate/login" });
  const valid = Boolean(c && t);
  const href = valid
    ? `/api/public/auth/linkedin/start?c=${encodeURIComponent(c!)}&t=${encodeURIComponent(t!)}`
    : "#";

  return (
    <div className="min-h-screen grid place-items-center bg-stone-50 px-6">
      <div className="max-w-md w-full bg-white border border-border rounded-3xl p-8 text-center">
        <h1 className="font-display text-3xl mb-2">Bienvenido</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Para continuar con tu entrevista, iniciá sesión con tu cuenta de LinkedIn.
        </p>

        {valid ? (
          <a
            href={href}
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#0A66C2] text-white font-bold hover:bg-[#004182] transition"
          >
            <Linkedin className="size-4" /> Continuar con LinkedIn
          </a>
        ) : (
          <p className="text-sm text-destructive">
            Link de invitación inválido. Pedile al reclutador que te reenvíe la invitación.
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Usamos LinkedIn solo para verificar tu identidad (nombre, email y foto). No publicamos nada.
        </p>
      </div>
    </div>
  );
}
