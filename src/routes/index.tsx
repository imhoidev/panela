import { createFileRoute, redirect } from "@tanstack/react-router";

// O "site" da PANELA É o app. Sem landing — manda direto pro /auth/login;
// se já houver sessão, /auth/login redireciona pra /app.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/login" });
  },
  component: () => null,
});
