import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/AuthGate";

export const Route = createFileRoute("/app")({
  component: () => (
    <RequireAuth>
      <AppShell><Outlet /></AppShell>
    </RequireAuth>
  ),
});
