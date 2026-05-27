import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, type ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsernameBadge } from "@/components/UsernameBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Meu perfil — PANELA" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const isPro = profile?.current_plan === "pro";

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [nameColor, setNameColor] = useState("#e4d8b4");
  const [nameColorsStr, setNameColorsStr] = useState("");
  const [nameEffect, setNameEffect] = useState<string>("none");
  const [twitter, setTwitter] = useState(""); const [instagram, setInstagram] = useState("");
  const [statusText, setStatusText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setNameColor(profile.name_color ?? "#e4d8b4");
    setNameColorsStr(((profile.name_colors as string[] | null) ?? []).join(", "));
    setNameEffect(profile.name_effect ?? "none");
    const links = (profile.social_links as Record<string, string> | null) ?? {};
    setTwitter(links.twitter ?? ""); setInstagram(links.instagram ?? "");
    setStatusText(profile.status_text ?? "");
  }, [profile]);

  async function uploadFile(kind: "avatar" | "banner", file: File) {
    if (!user) return;
    setUploading(kind);
    const bucket = kind === "avatar" ? "avatars" : "banners";
    const path = `${user.id}/${kind}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (upErr) { setUploading(null); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    const field = kind === "avatar" ? "avatar_url" : "banner_url";
    const { error } = await supabase.from("profiles").update({ [field]: pub.publicUrl }).eq("id", user.id);
    setUploading(null);
    if (error) return toast.error(error.message);
    toast.success(`${kind === "avatar" ? "Avatar" : "Banner"} atualizado`);
    refreshProfile();
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const colorsArr = nameColorsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const update: any = {
      display_name: displayName || null,
      bio: bio || null,
      name_color: nameColor,
      status_text: statusText || null,
      social_links: { twitter: twitter || null, instagram: instagram || null },
      updated_at: new Date().toISOString(),
    };
    if (isPro) {
      update.name_colors = colorsArr.length >= 2 ? colorsArr.slice(0, 5) : null;
      update.name_effect = nameEffect === "none" ? null : nameEffect;
    }
    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil salvo");
    refreshProfile();
  }

  if (!profile) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
      <h1 className="text-2xl font-bold">Meu perfil</h1>

      {/* Preview */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/40 to-gold/30 relative" style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="p-5 -mt-10 flex items-end gap-4">
          <Avatar className="h-20 w-20 ring-4 ring-card"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="text-lg"><UsernameBadge profile={{ ...profile, display_name: displayName, name_color: nameColor, name_colors: isPro && nameColorsStr ? nameColorsStr.split(",").map((s)=>s.trim()).filter(Boolean) : null, name_effect: isPro ? nameEffect : null }} roles={roles} /></div>
            <div className="text-sm text-muted-foreground">@{profile.username}</div>
            {statusText && <div className="text-xs text-muted-foreground mt-1">{statusText}</div>}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="appearance">Aparência {!isPro && <Lock className="ml-1 h-3 w-3" />}</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="social">Redes</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div className="space-y-1.5"><Label>Nome de exibição</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} /></div>
            <div className="space-y-1.5"><Label>Status</Label><Input value={statusText} onChange={(e) => setStatusText(e.target.value)} maxLength={80} placeholder="Codando algo retrô…" /></div>
            <div className="space-y-1.5"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={isPro ? 1000 : 200} /><p className="text-xs text-muted-foreground">{bio.length}/{isPro ? 1000 : 200} {!isPro && "· PRO libera bio rica até 1000 caracteres"}</p></div>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div className="space-y-1.5"><Label>Cor do nome</Label><Input type="color" value={nameColor} onChange={(e) => setNameColor(e.target.value)} className="h-10 w-20 p-1" /></div>
            <div className="space-y-1.5 relative">
              <div className="flex items-center gap-2"><Label>Cores gradiente (mín. 2, máx. 5)</Label>{!isPro && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />PRO</Badge>}</div>
              <Input disabled={!isPro} value={nameColorsStr} onChange={(e) => setNameColorsStr(e.target.value)} placeholder="#ff6b6b, #ffd43b, #51cf66" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><Label>Efeito</Label>{!isPro && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />PRO</Badge>}</div>
              <Select value={nameEffect} onValueChange={setNameEffect} disabled={!isPro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="glow">Glow</SelectItem>
                  <SelectItem value="rainbow">Rainbow</SelectItem>
                  <SelectItem value="typing">Typing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Avatar</Label>
              <FileBtn kind="avatar" uploading={uploading} onPick={(f) => uploadFile("avatar", f)} />
              <p className="text-xs text-muted-foreground mt-1">{isPro ? "PRO: PNG/JPG/GIF até 100MB" : "PNG/JPG até 8MB"}</p>
            </div>
            <div>
              <Label className="flex items-center gap-2">Banner {!isPro && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />PRO</Badge>}</Label>
              <FileBtn kind="banner" uploading={uploading} onPick={(f) => uploadFile("banner", f)} disabled={!isPro} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div className="space-y-1.5"><Label>Twitter / X</Label><Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@username" /></div>
            <div className="space-y-1.5"><Label>Instagram</Label><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" /></div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar alterações</Button>
      </div>
    </div>
  );
}

function FileBtn({ kind, uploading, onPick, disabled }: { kind: "avatar" | "banner"; uploading: string | null; onPick: (f: File) => void; disabled?: boolean }) {
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) onPick(f);
  }
  return (
    <label className={`mt-1 inline-flex items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm cursor-pointer hover:bg-accent ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      {uploading === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Escolher arquivo
      <input type="file" accept="image/*" className="hidden" disabled={disabled || !!uploading} onChange={onChange} />
    </label>
  );
}
