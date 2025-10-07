import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HORARIOS, DAYS_OF_WEEK, ROUTE_GROUP_COLORS, ROUTE_GROUP_NAMES } from "@/types/agendamento";
import { AgendamentoModal } from "./AgendamentoModal";
import type { AgendamentoItem, Horario, RouteGroup } from "@/types/agendamento";

interface AgendamentoGridProps {
  weekStart: Date;
  onNextWeek: () => void;
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
}

// Mock data - will be replaced with real API calls
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

const mockAgendamentos: AgendamentoItem[] = [
  {
    id: "1",
    cliente: "João Silva",
    telefone: "(34) 99999-9999",
    bairro: "Centro",
    tecnico_id: "1",
    tecnico_nome: "Alessandro",
    data: format(new Date(), "yyyy-MM-dd"),
    horario: "08:30",
    route_group: "patrocinio",
    status: "instalacao"
  }
];

export function AgendamentoGrid({ weekStart, onNextWeek, onPreviousWeek, onCurrentWeek }: AgendamentoGridProps) {
  const [selectedCell, setSelectedCell] = useState<{ day: number; horario: Horario; tecnico: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoItem | undefined>();
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>(mockAgendamentos);

  const getWeekDays = () => {
    return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  };

  const getAgendamentoForCell = (day: Date, horario: Horario, tecnicoId: string) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return agendamentos.find(
      a => a.data === dayStr && a.horario === horario && a.tecnico_id === tecnicoId
    );
  };

  const handleCellClick = (day: Date, horario: Horario, tecnicoId: string) => {
    const dayIndex = getWeekDays().findIndex(d => format(d, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
    setSelectedCell({ day: dayIndex, horario, tecnico: tecnicoId });
    
    const existingAgendamento = getAgendamentoForCell(day, horario, tecnicoId);
    setSelectedAgendamento(existingAgendamento);
    setModalOpen(true);
  };

  const handleSubmitAgendamento = (data: Partial<AgendamentoItem>) => {
    if (selectedAgendamento?.id) {
      // Update existing
      setAgendamentos(prev => 
        prev.map(a => a.id === selectedAgendamento.id ? { ...a, ...data } : a)
      );
    } else {
      // Create new
      const newAgendamento: AgendamentoItem = {
        id: Date.now().toString(),
        ...data as AgendamentoItem
      };
      setAgendamentos(prev => [...prev, newAgendamento]);
    }
  };

  const handleDeleteAgendamento = (id: string) => {
    setAgendamentos(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onCurrentWeek}>
            <Calendar className="h-4 w-4 mr-2" />
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={onNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold">
          {format(weekStart, "dd/MM", { locale: ptBR })} - {format(addDays(weekStart, 5), "dd/MM/yyyy", { locale: ptBR })}
        </h3>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium">Grupos de Rotas:</span>
        {Object.entries(ROUTE_GROUP_NAMES).map(([key, name]) => (
          <Badge key={key} className={ROUTE_GROUP_COLORS[key as RouteGroup]} variant="secondary">
            {name}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header row */}
          <div className="grid grid-cols-[120px_repeat(6,1fr)] gap-1 mb-2">
            <div className="font-semibold text-center p-2">Técnicos</div>
            {getWeekDays().map((day, index) => (
              <div key={index} className="text-center p-2 border rounded bg-muted/50">
                <div className="font-semibold">{DAYS_OF_WEEK[index]}</div>
                <div className="text-sm text-muted-foreground">
                  {format(day, "dd/MM", { locale: ptBR })}
                </div>
              </div>
            ))}
          </div>

          {/* Technician rows */}
          {mockTecnicos.map(tecnico => (
            <div key={tecnico.id} className="grid grid-cols-[120px_repeat(6,1fr)] gap-1 mb-4">
              <div className="flex items-center justify-center p-2 border rounded bg-primary/5 font-medium">
                {tecnico.nome}
              </div>
              
              {getWeekDays().map((day, dayIndex) => (
                <div key={dayIndex} className="border rounded p-1 bg-card">
                  {HORARIOS.map(horario => {
                    const agendamento = getAgendamentoForCell(day, horario, tecnico.id);
                    const isSelected = selectedCell?.day === dayIndex && 
                                     selectedCell?.horario === horario && 
                                     selectedCell?.tecnico === tecnico.id;
                    
                    return (
                      <div
                        key={horario}
                        className={`
                          min-h-[60px] p-1 mb-1 border rounded cursor-pointer transition-all
                          hover:bg-accent/50 text-xs
                          ${isSelected ? "ring-2 ring-primary" : ""}
                          ${agendamento ? ROUTE_GROUP_COLORS[agendamento.route_group] : "bg-background hover:bg-muted/50"}
                        `}
                        onClick={() => handleCellClick(day, horario, tecnico.id)}
                      >
                        <div className="font-medium text-xs mb-1">{horario}</div>
                        {agendamento && (
                          <div className="space-y-1">
                            <div className="font-semibold truncate">{agendamento.cliente}</div>
                            {agendamento.bairro && (
                              <div className="text-muted-foreground">{agendamento.bairro}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <AgendamentoModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        agendamento={selectedAgendamento}
        defaultData={selectedCell ? {
          data: getWeekDays()[selectedCell.day],
          horario: selectedCell.horario,
          tecnicoId: selectedCell.tecnico
        } : undefined}
        onSubmit={handleSubmitAgendamento}
        onDelete={handleDeleteAgendamento}
      />
    </div>
  );
}