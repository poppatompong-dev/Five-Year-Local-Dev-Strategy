import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/account/$pathname")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
