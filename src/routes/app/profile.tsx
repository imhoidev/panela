import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Check, Sparkles, Lock, Loader2, Upload } from "lucide-react";

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
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
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
    setTwitter(links.twitter ?? "");
    setInstagram(links.instagram ?? "");
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
    const { error } = await supabase.from("profiles").update({ [field]: pub.publicUrl } as any).eq("id", user.id);
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

  const planFeatures = [
    { label: "Bio rica até 1000 caracteres", active: true },
    { label: "Nome colorido + gradiente + efeitos", active: true },
    { label: "Avatar/banner GIF", active: false },
    { label: "Upload até 100MB", active: false },
    { label: "Tag PRO em todos os lugares", active: true },
    { label: "Badge PRO custom", active: false },
    { label: "Tema por servidor", active: false },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meu perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sua presença, estilos e benefícios PRO em um só lugar.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Badge className={isPro ? "bg-gold text-background" : "bg-muted text-muted-foreground"}>{isPro ? "PRO ativo" : "FREE"}</Badge>
          <Link to="/app/plans"><Button variant={isPro ? "outline" : "default"}>{isPro ? "Gerenciar PRO" : "Ir para PRO"}</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <ProfilePreviewCard
            profile={profile}
            displayName={displayName}
            nameColor={nameColor}
            nameColors={(isPro && nameColorsStr) ? nameColorsStr.split(",").map((s) => s.trim()).filter(Boolean) : null}
            nameEffect={isPro ? nameEffect : "none"}
            statusText={statusText}
            twitter={twitter}
            instagram={instagram}
            isPro={isPro}
            roles={roles}
          />

          <Tabs defaultValue="basic">
            <TabsList>
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="appearance">Aparência</TabsTrigger>
              <TabsTrigger value="media">Mídia</TabsTrigger>
              <TabsTrigger value="social">Redes</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card className="p-5 space-y-4">
                <div className="space-y-1.5"><Label>Nome de exibição</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} /></div>
                <div className="space-y-1.5"><Label>Status</Label><Input value={statusText} onChange={(e) => setStatusText(e.target.value)} maxLength={80} placeholder="Status curto e marcante" /></div>
                <div className="space-y-1.5"><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={isPro ? 1000 : 200} /><p className="text-xs text-muted-foreground">{bio.length}/{isPro ? 1000 : 200} {!isPro && "· PRO libera bio rica até 1000 caracteres"}</p></div>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Card className="p-5 space-y-4">
                <div className="space-y-1.5"><Label>Cor do nome</Label><Input type="color" value={nameColor} onChange={(e) => setNameColor(e.target.value)} className="h-10 w-20 p-1" /></div>
                <div className="space-y-1.5 relative">
                  <div className="flex items-center gap-2"><Label>Cores gradiente</Label>{!isPro && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />PRO</Badge>}</div>
                  <Input disabled={!isPro} value={nameColorsStr} onChange={(e) => setNameColorsStr(e.target.value)} placeholder="#ff6b6b, #ffd43b, #51cf66" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2"><Label>Efeito de nome</Label>{!isPro && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />PRO</Badge>}</div>
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
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-gold mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold">Benefícios PRO</h2>
                <p className="text-sm text-muted-foreground mt-1">Melhore sua presença com as funcionalidades mais avançadas.</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {planFeatures.map((feature) => (
                <li key={feature.label} className="flex items-start gap-3">
                  <span className={`mt-1 h-4 w-4 rounded-full ${feature.active ? "bg-primary" : "bg-muted"}`} />
                  <span className={feature.active ? "text-foreground" : "text-muted-foreground"}>{feature.label}</span>
                </li>
              ))}
            </ul>
            {!isPro ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Passe para PRO para liberar personalização completa, upload maior e identidade visual top.</p>
                <Link to="/app/plans"><Button className="w-full">Solicitar PRO</Button></Link>
              </div>
            ) : (
              <Button className="w-full">Atualizar preferências PRO</Button>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-base font-semibold">Atalhos de perfil</h3>
            <div className="grid gap-3">
              <Link to="/app/servers"><Button variant="outline" className="w-full">Ver meus servidores</Button></Link>
              <Link to="/app/discover"><Button variant="outline" className="w-full">Descobrir públicas</Button></Link>
              <Link to="/app/settings"><Button variant="outline" className="w-full">Ajustes de conta</Button></Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar alterações</Button>
      </div>
    </div>
  );
}

function ProfilePreviewCard({
  profile,
  displayName,
  nameColor,
  nameColors,
  nameEffect,
  statusText,
  twitter,
  instagram,
  isPro,
  roles,
}: {
  profile: any;
  displayName: string;
  nameColor: string;
  nameColors: string[] | null;
  nameEffect: string;
  statusText: string;
  twitter: string;
  instagram: string;
  isPro: boolean;
  roles: any[];
}) {
  const previewProfile = {
    ...profile,
    display_name: displayName,
    name_color: nameColor,
    name_colors: nameColors,
    name_effect: isPro ? nameEffect : "none",
  };

  return (
    <Card className="overflow-hidden border-border bg-card/90">
      <div className="relative h-44 bg-slate-950/10">
        {profile.banner_url ? (
          <img src={profile.banner_url} alt="Banner de perfil" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-transparent to-slate-900/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute left-5 bottom-5 flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-3xl overflow-hidden border-2 border-white/10 bg-background/80">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-2xl font-bold text-primary">{profile.username[0]?.toUpperCase()}</div>
            )}
          </div>
          <div className="text-white">
            <div className="text-xl font-semibold leading-tight"><UsernameBadge profile={previewProfile} roles={roles} /></div>
            <div className="text-xs text-white/70">@{profile.username}</div>
            {statusText && <div className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/80">{statusText}</div>}
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {twitter && <Badge variant="outline" className="text-muted-foreground">Twitter: {twitter}</Badge>}
          {instagram && <Badge variant="outline" className="text-muted-foreground">Instagram: {instagram}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{profile.bio || "Use este painel para moldar sua identidade PANELA."}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="rounded-2xl border border-border bg-background/80 p-3">
            <p className="font-semibold">Criado em</p>
            <p>{new Date(profile.created_at || Date.now()).toLocaleDateString("pt-BR")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/80 p-3">
            <p className="font-semibold">Plano</p>
            <p>{profile.current_plan?.toUpperCase() || "FREE"}</p>
          </div>
        </div>
      </div>
    </Card>
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
