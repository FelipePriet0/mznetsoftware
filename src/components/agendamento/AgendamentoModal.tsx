import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, User, MapPin, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ROUTE_GROUP_COLORS, ROUTE_GROUP_NAMES, HORARIOS } from "@/types/agendamento";
import type { AgendamentoItem, Horario, RouteGroup, TecnicoStatus } from "@/types/agendamento";

interface AgendamentoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento?: AgendamentoItem;
  defaultData?: {
    data: Date;
    horario: Horario;
    tecnicoId: string;
  };
  onSubmit: (data: Partial<AgendamentoItem>) => void;
  onDelete?: (id: string) => void;
}

const mockTecnicos = [
  { id: "1", nome: "Alessandro" },
  { id: "2", nome: "Fabio" },
  { id: "3", nome: "Gustavo" },
  { id: "4", nome: "Jorge" },
  { id: "5", nome: "Matheus" },
  { id: "6", nome: "Cássio" },
  { id: "7", nome: "Italo" },
  { id: "8", nome: "Francisco" },
];

export function AgendamentoModal({ 
  isOpen, 
  onOpenChange, 
  agendamento, 
  defaultData,
  onSubmit, 
  onDelete 
}: AgendamentoModalProps) {
  const [formData, setFormData] = useState<Partial<AgendamentoItem>>(() => ({
    cliente: agendamento?.cliente || "",
    telefone: agendamento?.telefone || "",
    bairro: agendamento?.bairro || "",
    tecnico_id: agendamento?.tecnico_id || defaultData?.tecnicoId || "",
    data: agendamento?.data || (defaultData?.data ? format(defaultData.data, "yyyy-MM-dd") : ""),
    horario: agendamento?.horario || defaultData?.horario || "08:30",
    route_group: agendamento?.route_group || "patrocinio",
    status: agendamento?.status || "instalacao",
    observacoes: agendamento?.observacoes || "",
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.cliente && formData.tecnico_id && formData.data && formData.horario) {
      onSubmit({
        ...formData,
        tecnico_nome: mockTecnicos.find(t => t.id === formData.tecnico_id)?.nome || ""
      });
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (agendamento?.id && onDelete) {
      onDelete(agendamento.id);
      onOpenChange(false);
    }
  };

  const isEditing = !!agendamento?.id;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cliente */}
            <div className="md:col-span-2">
              <Label htmlFor="cliente" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente *
              </Label>
              <Input
                id="cliente"
                value={formData.cliente || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
                placeholder="Nome do cliente"
                required
                className="text-[#018942]"
              />
            </div>

            {/* Telefone */}
            <div>
              <Label htmlFor="telefone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="telefone"
                value={formData.telefone || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(34) 99999-9999"
                className="text-[#018942]"
              />
            </div>

            {/* Bairro */}
            <div>
              <Label htmlFor="bairro" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Bairro
              </Label>
              <Input
                id="bairro"
                value={formData.bairro || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                placeholder="Ex: Centro"
                className="text-[#018942]"
              />
            </div>

            {/* Técnico */}
            <div>
              <Label>Técnico *</Label>
              <Select 
                value={formData.tecnico_id || ""} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, tecnico_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {mockTecnicos.map(tecnico => (
                    <SelectItem key={tecnico.id} value={tecnico.id}>
                      {tecnico.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div>
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data || ""}
                className="text-[#018942]"
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                required
              />
            </div>

            {/* Horário */}
            <div>
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário *
              </Label>
              <Select 
                value={formData.horario || ""} 
                onValueChange={(value: Horario) => setFormData(prev => ({ ...prev, horario: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORARIOS.map(horario => (
                    <SelectItem key={horario} value={horario}>
                      {horario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grupo de Rota */}
            <div>
              <Label>Grupo de Rota</Label>
              <Select 
                value={formData.route_group || ""} 
                onValueChange={(value: RouteGroup) => setFormData(prev => ({ ...prev, route_group: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROUTE_GROUP_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Badge className={ROUTE_GROUP_COLORS[key as RouteGroup]} variant="secondary">
                          {name}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status || ""} 
                onValueChange={(value: TecnicoStatus) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instalacao">Instalação</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="fora_servico">Fora de Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais..."
                className="text-[#018942]"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <div>
              {isEditing && onDelete && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                >
                  Excluir
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}