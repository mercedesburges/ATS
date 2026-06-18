import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const search = Route.useSearch() as { token?: string };
  const token = search.token;

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid === true) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function handleConfirm() {
    if (!token) return;
    setStatus("loading");
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
      } else if (data.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "No se pudo procesar la solicitud.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Error de red. Intentá de nuevo.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="size-12 bg-primary rounded-xl mx-auto mb-6" />
        <h1 className="font-display text-3xl text-foreground">Vividtalent</h1>

        {status === "loading" && (
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        )}

        {status === "valid" && (
          <>
            <p className="mt-4 text-muted-foreground">
              Vas a dejar de recibir correos de Vividtalent.
            </p>
            <button
              onClick={handleConfirm}
              className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Confirmar baja
            </button>
          </>
        )}

        {status === "already" && (
          <p className="mt-4 text-muted-foreground">
            Este correo ya fue dado de baja.
          </p>
        )}

        {status === "invalid" && (
          <p className="mt-4 text-muted-foreground">
            El enlace no es válido o expiró.
          </p>
        )}

        {status === "success" && (
          <p className="mt-4 text-muted-foreground">
            Te diste de baja correctamente. No vas a recibir más correos.
          </p>
        )}

        {status === "error" && (
          <>
            <p className="mt-4 text-muted-foreground">
              {errorMessage || "Hubo un error. Intentá de nuevo más tarde."}
            </p>
            {token && (
              <button
                onClick={handleConfirm}
                className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Reintentar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
