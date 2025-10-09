
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("-");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = user?.email ?? "-";
  const role = profile?.role ?? "-";
  const navigate = useNavigate();

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  useEffect(() => {
    // Opcional: se seu perfil já armazena avatar_url (não tipado no Profile local),
    // tentamos ler direto para iniciar o estado do campo.
    // Se não existir a coluna, nada acontece.
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url as string);
    })();
  }, [user?.id]);

  useEffect(() => {
    // Empresa não é mais exibida por ausência do relacionamento no schema atual
    setCompanyName("-");
  }, [profile?.full_name]);

  const roleLabel = useMemo(() => {
    if (role === "analista") return "Analista";
    if (role === "vendedor") return "Vendedor";
    if (role === "gestor") return "Gestor";
    return "-";
  }, [role]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!user?.id) {
        toast({ title: "Você precisa estar autenticado." });
        return;
      }
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext ?? "png"}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/*",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      if (data?.publicUrl) {
        setAvatarUrl(data.publicUrl);
        toast({ title: "Avatar enviado com sucesso." });
      }
    } catch (e: any) {
      toast({ title: "Falha no upload do avatar", description: e?.message ?? "Tente novamente." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_profile", {
        p_full_name: fullName,
        p_avatar_url: avatarUrl,
      });

      if (error) throw error;
      toast({ title: "Perfil atualizado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message ?? "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutConfirm() {
    setLoggingOut(true);
    try {
      await signOut();
      toast({ title: "Você saiu com sucesso." });
      navigate("/auth", { replace: true });
    } catch (e: any) {
      toast({ title: "Falha ao sair", description: e?.message ?? "Tente novamente." });
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) {
    return (
      <main className="p-6">
        <Card className="bg-white text-[#018942]">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Você precisa estar autenticado para ver seu perfil.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="bg-white text-[#018942]">
          <CardHeader>
            <CardTitle>Seu perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} alt={`Avatar de ${fullName || email}`} />
                <AvatarFallback>{(fullName || email || "-").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button type="button" variant="secondary" onClick={triggerFileSelect} disabled={uploading}>
                    {uploading ? "Enviando..." : "Enviar avatar"}
                  </Button>
                  {avatarUrl && (
                    <Button type="button" variant="outline" onClick={() => setAvatarUrl("")} disabled={uploading}>
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Imagem pública. Recomendada 256x256.</p>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={email} readOnly />
              </div>
              <div>
                <Label>Função</Label>
                <Input value={roleLabel} readOnly />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input value={companyName} readOnly />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="text-[#018942]"
                />
              </div>
              <div>
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-[#018942]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || uploading} className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90 disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" disabled={loggingOut}>
                    {loggingOut ? "Saindo..." : "Sair"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deseja sair da sua conta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você precisará fazer login novamente para acessar o sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loggingOut} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogoutConfirm} disabled={loggingOut}>
                      {loggingOut ? "Saindo..." : "Sair"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <p className="text-sm text-muted-foreground pt-2">
              Observação: o avatar enviado é público no bucket "avatars".
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
