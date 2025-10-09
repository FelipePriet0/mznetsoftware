import { useEffect, useState } from "react";
import Logo from "@/assets/Logo MZNET (1).png";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  // Tela agora somente de login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Entrar – MZNET";
  }, []);

  // Redireciona automaticamente se já estiver autenticado
  useEffect(() => {
    // Executar apenas uma vez
    if (hasCheckedSession) {
      console.log('⏭️ Sessão já foi verificada, pulando...');
      return;
    }
    
    let isSubscribed = true; // Flag para evitar updates após unmount
    let subscription: any = null;
    
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isSubscribed) return; // Componente foi desmontado
        
        setHasCheckedSession(true);
        
        if (session?.user) {
          console.log('✅ Sessão ativa encontrada, redirecionando...');
          navigate("/inicio");
        } else {
          console.log('⚠️ Sem sessão ativa - pronto para login');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar sessão:', error);
        setHasCheckedSession(true);
      }
    };
    
    // Verificar sessão apenas uma vez ao montar
    checkSession();
    
    // Listener para mudanças de autenticação (APENAS para logins futuros)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      
      console.log('🔔 Auth event:', event);
      
      // Só redirecionar em eventos de SIGNED_IN, não em outros eventos
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Login detectado, redirecionando...');
        navigate("/inicio");
      }
    });
    
    subscription = authListener.subscription;

    return () => {
      isSubscribed = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [navigate, hasCheckedSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Bem-vindo!" });
      await redirectAfterLogin();
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

      // Prefer RPC que já considera o usuário autenticado (auth.uid())
      const { data: profile, error } = await supabase.rpc("current_profile");

      if (error) {
        toast({ title: "Erro ao carregar perfil", description: error.message });
        navigate("/inicio");
        return;
      }

      if (!profile?.role) {
        toast({ title: "Perfil sem cargo definido" });
        navigate("/inicio");
        return;
      }

      navigate("/inicio");
    } catch (e: any) {
      toast({ title: "Erro ao redirecionar", description: e?.message || "Tente novamente." });
      navigate("/");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 sm:px-6 bg-gradient-to-r from-primary to-black">
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl bg-gradient-to-r from-primary to-black text-white shadow-2xl shadow-[#FFFFFF]/30 rounded-[30px]">
        <CardHeader className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col items-center gap-3">
            <img src={Logo} alt="Logo" className="h-10 sm:h-12 md:h-14" />
            <CardTitle className="text-xl sm:text-2xl text-center">Entrar</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Seu e-mail" className="text-white placeholder:text-white" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Sua senha" className="text-white placeholder:text-white" />
            </div>
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? "Processando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
