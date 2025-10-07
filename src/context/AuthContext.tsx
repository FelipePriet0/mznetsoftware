
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  // Roles do sistema atual: Vendedor, Analista, Gestor
  role: "vendedor" | "analista" | "gestor";
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Cache para evitar consultas repetitivas
  const [profileCache, setProfileCache] = useState<Map<string, { profile: Profile | null; timestamp: number }>>(new Map());
  const PROFILE_CACHE_DURATION = 30000; // 30 segundos

  useEffect(() => {
    // 1) Listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (import.meta?.env?.DEV) console.log("[Auth] onAuthStateChange:", event, !!sess?.user);
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer fetching to avoid deadlocks; do NOT toggle global loading during refreshes
        setTimeout(() => void fetchProfile(sess.user.id, { setLoading: false }), 0);
      } else {
        setProfile(null);
      }
    });

    // 2) Then get existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (import.meta?.env?.DEV) console.log("[Auth] getSession -> has session?", !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // During bootstrap, allow loading spinner until profile is fetched once
        await fetchProfile(session.user.id, { setLoading: true });
      }
      // Mark bootstrap complete regardless
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, opts?: { setLoading?: boolean }) {
    if (opts?.setLoading) setLoading(true);
    
    // Verificar cache primeiro
    const cached = profileCache.get(userId);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < PROFILE_CACHE_DURATION) {
      if (import.meta?.env?.DEV) console.log("[Auth] Using cached profile for:", userId);
      setProfile(cached.profile);
      if (opts?.setLoading) setLoading(false);
      return;
    }
    
    if (import.meta?.env?.DEV) console.log("[Auth] Fetching profile for:", userId);
    try {
      // Use RPC that returns only the caller's profile (more secure and reliable)
      const { data: rpcData, error: rpcError } = await supabase.rpc('current_profile');
      
      if (rpcError) {
        if (import.meta?.env?.DEV) console.error("[Auth] RPC current_profile failed:", rpcError);
        throw rpcError;
      }

      let profileData: Profile | null = null;
      if (rpcData) {
        // rpcData comes as full row; coerce to Profile
        profileData = {
          id: (rpcData as any).id,
          full_name: (rpcData as any).full_name ?? null,
          role: (rpcData as any).role as Profile["role"],
        };
      }
      
      // Atualizar cache
      setProfileCache(prev => new Map(prev).set(userId, { profile: profileData, timestamp: now }));
      
      setProfile(profileData);
      if (import.meta?.env?.DEV) console.log("[Auth] Profile loaded successfully:", profileData);
    } catch (e) {
      if (import.meta?.env?.DEV) console.error("[Auth] Failed to load profile:", e);
      setProfile(null);
      // Cache o erro também para evitar tentativas repetitivas
      setProfileCache(prev => new Map(prev).set(userId, { profile: null, timestamp: now }));
    } finally {
      if (opts?.setLoading) setLoading(false);
    }
  }

  const signOut = async () => {
    try {
      // Limpar cache ao fazer logout
      setProfileCache(new Map());
      setProfile(null);
      await supabase.auth.signOut();
    } catch (error) {
      if (import.meta?.env?.DEV) console.error("[Auth] Error during sign out:", error);
      // Mesmo com erro, limpar o estado local
      setProfileCache(new Map());
      setProfile(null);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({ user, session, profile, loading, signOut }), [user, session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
