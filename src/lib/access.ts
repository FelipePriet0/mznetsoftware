import type { Profile } from "@/context/AuthContext";

function norm(role?: string | null) {
  return (role || "").toString().toLowerCase();
}

// Legacy premium concept no longer used; keep false by default
export function isPremium(_profile: Profile | null | undefined) {
  return false;
}

export function canIngressar(profile: Profile | null | undefined) {
  // Gestor e Analista podem ingressar
  const r = norm(profile?.role);
  return r === "gestor" || r === "analista";
}

export function canChangeStatus(profile: Profile | null | undefined) {
  // Gestor e Analista podem mudar status
  const r = norm(profile?.role);
  return r === "gestor" || r === "analista";
}

export function canEditReanalysis(profile: Profile | null | undefined) {
  // Analista e Gestor podem editar reanálise
  const r = norm(profile?.role);
  return r === "analista" || r === "gestor";
}

export function isSenior(profile: Profile | null | undefined) {
  // Gestor é o nível mais alto
  return norm(profile?.role) === "gestor";
}

// ===================================================
// FUNÇÕES DE CONTROLE DE ACESSO PARA ANEXOS
// ===================================================

export function canViewAttachment(profile: Profile | null | undefined) {
  if (!profile) return false;
  
  const role = norm(profile.role);
  
  // Todos os roles podem ver anexos (sistema único de empresa)
  return role === "vendedor" || role === "analista" || role === "gestor";
}

export function canUploadAttachment(profile: Profile | null | undefined) {
  if (!profile) return false;
  
  const role = norm(profile.role);
  
  // Todos os roles podem fazer upload (sistema único de empresa)
  return role === "vendedor" || role === "analista" || role === "gestor";
}

export function canDownloadAttachment(profile: Profile | null | undefined, attachmentAuthorId?: string, currentUserId?: string) {
  if (!profile) return false;
  
  const role = norm(profile.role);
  
  // Todos os roles podem baixar anexos (sistema único de empresa)
  return role === "vendedor" || role === "analista" || role === "gestor";
}

export function canDeleteAttachment(profile: Profile | null | undefined, attachmentAuthorId?: string, currentUserId?: string) {
  if (!profile) return false;
  
  const role = norm(profile.role);
  
  // Todos os roles podem deletar anexos (sistema único de empresa)
  return role === "vendedor" || role === "analista" || role === "gestor";
}
