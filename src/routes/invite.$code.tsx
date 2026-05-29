import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$code")({
  component: InviteAccept,
});

function InviteAccept() {
  const { code } = useParams({ from: "/invite/$code" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) { setStatus("error"); setMsg("Faça login para aceitar o convite"); return; }
    supabase.rpc("accept_invite", { invite_code: code }).then(({ data, error }) => {
      if (error) { setStatus("error"); setMsg(error.message); return; }
      setStatus("success");
      setMsg("Você entrou no servidor!");
      setTimeout(() => navigate({ to: "/app/servers/$serverId", params: { serverId: data } }), 1500);
    });
  }, [code, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-sm text-center space-y-4 p-8">
        {status === "loading" && <><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /><p className="text-muted-foreground">Entrando…</p></>}
        {status === "success" && <><CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" /><p className="text-emerald-500 font-medium">{msg}</p></>}
        {status === "error" && <><XCircle className="h-12 w-12 mx-auto text-destructive" /><p className="text-destructive">{msg}</p><Button onClick={() => navigate({ to: "/auth/login" })}>Fazer login</Button></>}
      </div>
    </div>
  );
}
