import type { Profile, AppRole } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Crown, ShieldCheck, Sparkles } from "lucide-react";

export function UsernameBadge({ profile, roles }: { profile: Pick<Profile, "display_name" | "username" | "name_color" | "name_colors" | "name_effect" | "current_plan">; roles?: AppRole[] }) {
  const colors = (profile.name_colors as string[] | null) ?? null;
  const isPro = profile.current_plan === "pro";

  const style: React.CSSProperties = {};
  if (isPro && colors && colors.length >= 2) {
    style.background = `linear-gradient(90deg, ${colors.join(",")})`;
    style.WebkitBackgroundClip = "text";
    style.backgroundClip = "text";
    style.color = "transparent";
  } else if (profile.name_color) {
    style.color = profile.name_color;
  }

  const effectClass = isPro
    ? profile.name_effect === "glow" ? "fx-glow"
    : profile.name_effect === "rainbow" ? "fx-rainbow"
    : profile.name_effect === "typing" ? "fx-typing"
    : ""
    : "";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-semibold ${effectClass}`} style={style}>
        {profile.display_name || profile.username}
      </span>
      {isPro && (
        <Badge variant="secondary" className="h-5 gap-1 border-gold/40 bg-gold/10 text-gold">
          <Sparkles className="h-3 w-3" /> PRO
        </Badge>
      )}
      {roles?.includes("ceo") && <Badge className="h-5 gap-1 bg-destructive text-destructive-foreground"><Crown className="h-3 w-3" />CEO</Badge>}
      {roles?.includes("coo") && !roles.includes("ceo") && <Badge className="h-5 gap-1 bg-primary text-primary-foreground"><Crown className="h-3 w-3" />COO</Badge>}
      {roles?.includes("admin") && !roles.includes("coo") && !roles.includes("ceo") && (
        <Badge variant="outline" className="h-5 gap-1"><ShieldCheck className="h-3 w-3" />Admin</Badge>
      )}
    </span>
  );
}
