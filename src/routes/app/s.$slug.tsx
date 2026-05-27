import { createFileRoute, useParams, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/s/$slug")({
  component: SlugRedirect,
});

function SlugRedirect() {
  const { slug } = useParams({ from: "/app/s/$slug" });
  const router = useRouter();
  const [state, setState] = useState<"loading" | "notfound">("loading");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("servers").select("id").eq("slug", slug).maybeSingle();
      if (data?.id) {
        router.navigate({ to: "/app/servers/$serverId", params: { serverId: data.id }, replace: true });
      } else {
        setState("notfound");
      }
    })();
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="h-full grid place-items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return (
    <div className="h-full grid place-items-center p-6 text-center">
      <div className="space-y-3">
        <p className="text-lg font-semibold">Panela @{slug} não encontrada</p>
        <p className="text-sm text-muted-foreground">Pode ter sido renomeada ou ser privada.</p>
        <Link to="/app/discover"><Button variant="outline">Descobrir panelas</Button></Link>
      </div>
    </div>
  );
}
