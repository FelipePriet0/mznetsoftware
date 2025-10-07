import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export function useCurrentUser() {
  const { profile } = useAuth();
  
  const [name] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("currentUserName");
      console.log('🔍 useCurrentUser - localStorage currentUserName:', stored);
      return stored && stored.trim() ? stored : "Felipe";
    } catch {
      return "Felipe";
    }
  });

  // Debug: log quando profile mudar
  useEffect(() => {
    console.log('🔍 useCurrentUser - profile from AuthContext:', profile);
    console.log('🔍 useCurrentUser - name from localStorage:', name);
  }, [profile, name]);

  // Priorizar o full_name do profile do AuthContext se disponível
  const currentName = profile?.full_name || name || "Usuário";
  
  console.log('🔍 useCurrentUser - returning name:', currentName);

  // In a real app, you could also expose id, role, etc.
  return useMemo(() => ({ name: currentName }), [currentName]);
}
