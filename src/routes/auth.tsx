import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Ingresar — Vividtalent" },
      { name: "description", content: "Accedé a tu portal de candidatos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisá tu email si pide confirmación.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message ?? "Error al ingresar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) {
      toast.error("No pudimos iniciar con Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="size-9 bg-primary-foreground/15 rounded-lg" />
          <span className="font-display text-2xl tracking-tight">VIVIDTALENT</span>
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-5xl leading-tight">
            Cercanía real<br />y datos precisos.
          </h1>
          <p className="mt-6 text-primary-foreground/80 max-w-sm">
            Mucho más que un PDF. La forma más ágil y fácil de evaluar candidatos a fondo antes de la primera reunión.
          </p>
        </div>
        <p className="text-xs uppercase tracking-widest text-primary-foreground/60">© Vividtalent</p>
        <div className="absolute -bottom-20 -right-20 size-80 rounded-full bg-accent-gold/20 blur-3xl" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-8 bg-primary rounded-lg" />
            <span className="font-display text-xl">VIVIDTALENT</span>
          </div>
          <h2 className="font-display text-4xl">{mode === "signin" ? "Bienvenida de vuelta" : "Crear cuenta"}</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === "signin" ? "Ingresá a tu portal de candidatos." : "Empezá a presentar tus candidatos."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-8 w-full flex items-center justify-center gap-3 py-3 bg-white border border-border rounded-full text-sm font-bold hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar con Google
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">o</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "..." : mode === "signin" ? "Ingresar" : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-bold hover:underline"
            >
              {mode === "signin" ? "Crear una" : "Ingresar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
