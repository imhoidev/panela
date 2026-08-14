import { jsxs, jsx } from "react/jsx-runtime";
import { B as Badge } from "./badge-YM7oB01y.js";
import { Sparkles, Crown, ShieldCheck } from "lucide-react";
function UsernameBadge({ profile, roles }) {
  const colors = profile.name_colors ?? null;
  const isPro = profile.current_plan === "pro";
  const style = {};
  if (isPro && colors && colors.length >= 2) {
    style.background = `linear-gradient(90deg, ${colors.join(",")})`;
    style.WebkitBackgroundClip = "text";
    style.backgroundClip = "text";
    style.color = "transparent";
  } else if (profile.name_color) {
    style.color = profile.name_color;
  }
  const effectClass = isPro ? profile.name_effect === "glow" ? "fx-glow" : profile.name_effect === "rainbow" ? "fx-rainbow" : profile.name_effect === "typing" ? "fx-typing" : "" : "";
  return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
    /* @__PURE__ */ jsx("span", { className: `font-semibold ${effectClass}`, style, children: profile.display_name || profile.username }),
    isPro && /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "h-5 gap-1 border-gold/40 bg-gold/10 text-gold", children: [
      /* @__PURE__ */ jsx(Sparkles, { className: "h-3 w-3" }),
      " PRO"
    ] }),
    roles?.includes("ceo") && /* @__PURE__ */ jsxs(Badge, { className: "h-5 gap-1 bg-destructive text-destructive-foreground", children: [
      /* @__PURE__ */ jsx(Crown, { className: "h-3 w-3" }),
      "CEO"
    ] }),
    roles?.includes("coo") && !roles.includes("ceo") && /* @__PURE__ */ jsxs(Badge, { className: "h-5 gap-1 bg-primary text-primary-foreground", children: [
      /* @__PURE__ */ jsx(Crown, { className: "h-3 w-3" }),
      "COO"
    ] }),
    roles?.includes("admin") && !roles.includes("coo") && !roles.includes("ceo") && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "h-5 gap-1", children: [
      /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3" }),
      "Admin"
    ] })
  ] });
}
export {
  UsernameBadge as U
};
