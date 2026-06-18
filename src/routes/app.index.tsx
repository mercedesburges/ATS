import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  beforeLoad: ({ context }) => {
    const role = (context as any).role;
    if (role === "admin") throw redirect({ to: "/app/admin" });
    throw redirect({ to: "/app/portal" });
  },
});
