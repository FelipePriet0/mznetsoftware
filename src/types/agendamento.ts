export type TecnicoStatus = "instalacao" | "manutencao" | "fora_servico";

export type RouteGroup = 
  | "patrocinio" 
  | "salitre_serra_tejuco" 
  | "guimarania_sao_joao_cruzeiro" 
  | "zona_rural";

export type Horario = "08:30" | "10:30" | "13:30" | "15:30";

export interface Tecnico {
  id: string;
  nome: string;
  telefone?: string;
  bairro_residencia?: string;
  ativo: boolean;
}

export interface TecnicoStatusDiario {
  id: string;
  tecnico_id: string;
  data: string; // YYYY-MM-DD
  status: TecnicoStatus;
  route_group?: RouteGroup;
  created_at?: string;
  updated_at?: string;
}

export interface AgendamentoItem {
  id: string;
  cliente: string;
  telefone?: string;
  bairro?: string;
  tecnico_id: string;
  tecnico_nome: string;
  data: string; // YYYY-MM-DD
  horario: Horario;
  route_group: RouteGroup;
  status: TecnicoStatus;
  observacoes?: string;
  application_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TecnicoBairro {
  id: string;
  tecnico_id: string;
  bairro: string;
  is_residencia: boolean;
  distancia_km?: number;
}

export const ROUTE_GROUP_COLORS = {
  patrocinio: "bg-blue-100 border-blue-300 text-blue-800",
  salitre_serra_tejuco: "bg-orange-100 border-orange-300 text-orange-800", 
  guimarania_sao_joao_cruzeiro: "bg-purple-100 border-purple-300 text-purple-800",
  zona_rural: "bg-green-100 border-green-300 text-green-800"
} as const;

export const ROUTE_GROUP_NAMES = {
  patrocinio: "Patrocínio",
  salitre_serra_tejuco: "Salitre/Serra/Tejuco",
  guimarania_sao_joao_cruzeiro: "Guimarânia/São João/Cruzeiro", 
  zona_rural: "Zona Rural"
} as const;

export const HORARIOS: Horario[] = ["08:30", "10:30", "13:30", "15:30"];

export const DAYS_OF_WEEK = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
] as const;