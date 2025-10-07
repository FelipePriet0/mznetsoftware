import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const DEMO_PASSWORD = "Demo1234!";
  const DEMO_EMAILS = [
    "gestor.demo@example.com",
    "analista.demo@example.com",
    "vendedor.demo@example.com",
  ] as const;

  const [demoStatus, setDemoStatus] = useState<Record<string, string>>({
    "gestor.demo@example.com": "",
    "analista.demo@example.com": "",
    "vendedor.demo@example.com": "",
  });

  useEffect(() => {
    document.title = mode === "signin" ? "Entrar – MZNET" : "Cadastrar – MZNET";
  }, [mode]);

  // Redireciona automaticamente se já estiver autenticado ou faz login automático
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(() => {
          navigate("/inicio");
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/inicio");
      } else {
        // Login automático com conta gestor demo
        setTimeout(() => {
          void handleQuickLogin("gestor.demo@example.com");
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Bem-vindo!" });
        await redirectAfterLogin();
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast({ title: "Cadastro realizado. Verifique seu e-mail." });
        navigate("/auth");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Não foi possível autenticar." });
    } finally {
      setLoading(false);
    }
  }
  
  async function redirectAfterLogin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        navigate("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", userId)
        .single();

      if (!profile?.role) {
        toast({
          title: "Perfil sem empresa/cargo",
          description:
            "Defina no painel: Supabase → Table Editor → profiles. Mapeamento: gestor.demo@example.com → gestor; analista.demo@example.com → analista; vendedor.demo@example.com → vendedor.",
        });
        return;
      }
      navigate("/inicio");
    } catch {
      navigate("/");
    }
  }

  async function handleQuickLogin(targetEmail: string) {
    setEmail(targetEmail);
    setPassword(DEMO_PASSWORD);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      toast({ title: "Login realizado" });
      navigate("/inicio");
    } catch (err: any) {
      toast({ title: "Erro ao entrar", description: err?.message || "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  async function createDemoAccounts() {
    setCreating(true);
    const redirectUrl = `${window.location.origin}/`;
    try {
      for (const e of DEMO_EMAILS) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: e,
            password: DEMO_PASSWORD,
            options: { emailRedirectTo: redirectUrl },
          });
          if (error) {
            const msg = String(error.message || "").toLowerCase();
            if (msg.includes("already") || msg.includes("registered") || (error as any).status === 422) {
              setDemoStatus((s) => ({ ...s, [e]: "Já existia" }));
            } else {
              setDemoStatus((s) => ({ ...s, [e]: "Erro" }));
            }
          } else {
            setDemoStatus((s) => ({ ...s, [e]: "Criada" }));
            if (data?.session) {
              await supabase.auth.signOut();
            }
          }
        } catch {
          setDemoStatus((s) => ({ ...s, [e]: "Erro" }));
        }
      }
      toast({ title: "Processo concluído", description: "Contas demo verificadas/criadas." });
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="text-[#018942]" />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="text-[#018942]" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="text-[#018942]" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processando..." : mode === "signin" ? "Entrar" : "Cadastrar"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-center">
            {mode === "signin" ? (
              <button className="underline" onClick={() => setMode("signup")}>Criar conta</button>
            ) : (
              <button className="underline" onClick={() => setMode("signin")}>Já tenho conta</button>
            )}
          </div>

          <section className="mt-8">
            <h3 className="text-lg font-semibold">Contas Demo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Crie e faça login rapidamente nas contas de demonstração.
            </p>

            <div className="mt-3">
              <Button variant="secondary" onClick={createDemoAccounts} disabled={creating}>
                {creating ? "Criando..." : "Criar contas demo"}
              </Button>
            </div>

            <ul className="mt-3 space-y-1 text-sm">
              <li>gestor.demo@example.com — {demoStatus["gestor.demo@example.com"] || "-"}</li>
              <li>analista.demo@example.com — {demoStatus["analista.demo@example.com"] || "-"}</li>
              <li>vendedor.demo@example.com — {demoStatus["vendedor.demo@example.com"] || "-"}</li>
            </ul>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button onClick={() => handleQuickLogin("gestor.demo@example.com")} disabled={loading}>
                Entrar como Gestor
              </Button>
              <Button onClick={() => handleQuickLogin("analista.demo@example.com")} disabled={loading}>
                Entrar como Analista
              </Button>
              <Button onClick={() => handleQuickLogin("vendedor.demo@example.com")} disabled={loading}>
                Entrar como Vendedor
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
