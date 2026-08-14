import { jsx } from "react/jsx-runtime";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { u as useAuth } from "./router-BokS3urV.js";
import { F as FullScreenLoader } from "./AuthGate-C8DikIZp.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "lucide-react";
import "./PanelaLogo-DrUIuaWG.js";
function IndexGate() {
  const {
    ready,
    user
  } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.navigate({
      to: user ? "/app" : "/auth/login",
      replace: true
    });
  }, [ready, user]);
  return /* @__PURE__ */ jsx(FullScreenLoader, { label: "Abrindo a PANELA…" });
}
export {
  IndexGate as component
};
