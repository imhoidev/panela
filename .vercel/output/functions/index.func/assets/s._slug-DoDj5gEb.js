import { jsx, jsxs } from "react/jsx-runtime";
import { useParams, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { s as supabase } from "./router-BokS3urV.js";
import { Loader2 } from "lucide-react";
import { B as Button } from "./button-DjOZMqFS.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
function SlugRedirect() {
  const {
    slug
  } = useParams({
    from: "/app/s/$slug"
  });
  const router = useRouter();
  const [state, setState] = useState("loading");
  useEffect(() => {
    (async () => {
      const {
        data
      } = await supabase.from("servers").select("id").eq("slug", slug).maybeSingle();
      if (data?.id) {
        router.navigate({
          to: "/app/servers/$serverId",
          params: {
            serverId: data.id
          },
          replace: true
        });
      } else {
        setState("notfound");
      }
    })();
  }, [slug]);
  if (state === "loading") {
    return /* @__PURE__ */ jsx("div", { className: "h-full grid place-items-center text-muted-foreground", children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin" }) });
  }
  return /* @__PURE__ */ jsx("div", { className: "h-full grid place-items-center p-6 text-center", children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("p", { className: "text-lg font-semibold", children: [
      "Panela @",
      slug,
      " não encontrada"
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Pode ter sido renomeada ou ser privada." }),
    /* @__PURE__ */ jsx(Link, { to: "/app/discover", children: /* @__PURE__ */ jsx(Button, { variant: "outline", children: "Descobrir panelas" }) })
  ] }) });
}
export {
  SlugRedirect as component
};
