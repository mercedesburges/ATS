import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  beforeLoad: ({ context }) => {
    const role = (context as any).role;
    if (role === "admin") throw redirect({ to: "/app/admin" });
    if (role === "candidate") throw redirect({ to: "/app/candidate" });
    throw redirect({ to: "/app/portal" });
  },
});
