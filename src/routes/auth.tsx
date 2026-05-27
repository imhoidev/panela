import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireGuest } from "@/components/AuthGate";

export const Route = createFileRoute("/auth")({
  component: () => (
    <RequireGuest>
      <div className="min-h-screen grid place-items-center px-4 py-10 bg-background">
        <Outlet />
      </div>
    </RequireGuest>
  ),
});
