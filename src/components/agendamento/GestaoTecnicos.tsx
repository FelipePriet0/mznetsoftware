import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UserPlus, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ROUTE_GROUP_NAMES } from "@/types/agendamento";
import type { Tecnico, TecnicoStatusDiario, TecnicoStatus, RouteGroup } from "@/types/agendamento";

// Mock data
const mockTecnicos: Tecnico[] = [
  { id: "1", nome: "Alessandro", telefone: "(34) 99999-0001", bairro_residencia: "Centro", ativo: true },
  { id: "2", nome: "Fabio", telefone: "(34) 99999-0002", bairro_residencia: "Morada Nova", ativo: true },
  { id: "3", nome: "Gustavo", telefone: "(34) 99999-0003", bairro_residencia: "Cidade Jardim", ativo: true },
  { id: "4", nome: "Jorge", telefone: "(34) 99999-0004", bairro_residencia: "Santa Mônica", ativo: true },
  { id: "5", nome: "Matheus", telefone: "(34) 99999-0005", bairro_residencia: "Alto dos Caiçaras", ativo: true },
  { id: "6", nome: "Cássio", telefone: "(34) 99999-0006", bairro_residencia: "Nossa Senhora Aparecida", ativo: false },
  { id: "7", nome: "Italo", telefone: "(34) 99999-0007", bairro_residencia: "Canaã", ativo: true },
  { id: "8", nome: "Francisco", telefone: "(34) 99999-0008", bairro_residencia: "Vila Prado", ativo: true },
];

const statusColors: Record<TecnicoStatus, string> = {
  instalacao: "bg-blue-100 text-blue-800 border-blue-300",
  manutencao: "bg-orange-100 text-orange-800 border-orange-300", 
  fora_servico: "bg-gray-100 text-gray-800 border-gray-300"
};

const statusLabels: Record<TecnicoStatus, string> = {
  instalacao: "Instalação",
  manutencao: "Manutenção",
  fora_servico: "Fora de Serviço"
};

export function GestaoTecnicos() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tecnicosStatus, setTecnicosStatus] = useState<TecnicoStatusDiario[]>([]);
  const [showAddTecnico, setShowAddTecnico] = useState(false);

  const getTecnicoStatus = (tecnicoId: string): TecnicoStatus => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const status = tecnicosStatus.find(s => s.tecnico_id === tecnicoId && s.data === dateStr);
    return status?.status || "instalacao";
  };

  const updateTecnicoStatus = (tecnicoId: string, status: TecnicoStatus, routeGroup?: RouteGroup) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setTecnicosStatus(prev => {
      const existing = prev.findIndex(s => s.tecnico_id === tecnicoId && s.data === dateStr);
      const newStatus: TecnicoStatusDiario = {
        id: existing >= 0 ? prev[existing].id : Date.now().toString(),
        tecnico_id: tecnicoId,
        data: dateStr,
        status,
        route_group: routeGroup
      };

      if (existing >= 0) {
        return prev.map((s, i) => i === existing ? newStatus : s);
      } else {
        return [...prev, newStatus];
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with date selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Status dos Técnicos</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button 
          onClick={() => setShowAddTecnico(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Adicionar Técnico
        </Button>
      </div>

      {/* Technicians grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockTecnicos.map(tecnico => {
          const currentStatus = getTecnicoStatus(tecnico.id);
          
          return (
            <Card key={tecnico.id} className={`transition-all ${!tecnico.ativo ? "opacity-50" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{tecnico.nome}</CardTitle>
                    <p className="text-sm text-muted-foreground">{tecnico.telefone}</p>
                    {tecnico.bairro_residencia && (
                      <p className="text-xs text-muted-foreground">{tecnico.bairro_residencia}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={tecnico.ativo}
                      disabled // Will be enabled when backend is connected
                    />
                    <Label className="text-xs">Ativo</Label>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Status do Dia</Label>
                  <Select 
                    value={currentStatus}
                    onValueChange={(status: TecnicoStatus) => updateTecnicoStatus(tecnico.id, status)}
                    disabled={!tecnico.ativo}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors[value as TecnicoStatus]} variant="secondary">
                              {label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(currentStatus === "instalacao" || currentStatus === "manutencao") && (
                  <div>
                    <Label className="text-sm font-medium">Grupo de Rota</Label>
                    <Select 
                      onValueChange={(routeGroup: RouteGroup) => 
                        updateTecnicoStatus(tecnico.id, currentStatus, routeGroup)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecionar rota..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROUTE_GROUP_NAMES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Bairros
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Dia - {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            {Object.entries(statusLabels).map(([status, label]) => {
              const count = mockTecnicos.filter(t => 
                t.ativo && getTecnicoStatus(t.id) === status
              ).length;
              
              return (
                <div key={status} className="space-y-2">
                  <Badge className={statusColors[status as TecnicoStatus]} variant="secondary">
                    {label}
                  </Badge>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">técnicos</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}