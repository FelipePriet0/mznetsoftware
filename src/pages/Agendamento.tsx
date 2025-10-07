import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Settings, Users } from "lucide-react";
import { AgendamentoGrid } from "@/components/agendamento/AgendamentoGrid";
import { GestaoTecnicos } from "@/components/agendamento/GestaoTecnicos";
import { ConfiguracaoRotas } from "@/components/agendamento/ConfiguracaoRotas";
import { useWeekNavigation } from "@/hooks/useWeekNavigation";

export default function Agendamento() {
  const [activeTab, setActiveTab] = useState("agenda");
  const { currentWeekStart, goToNextWeek, goToPreviousWeek, goToCurrentWeek } = useWeekNavigation();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#018942]">Gestão de Agendamentos</h1>
          <p className="text-muted-foreground">
            Controle completo da agenda dos técnicos e roteamento inteligente
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agenda Semanal
          </TabsTrigger>
          <TabsTrigger value="tecnicos" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestão Técnicos
          </TabsTrigger>
          <TabsTrigger value="rotas" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Config. Rotas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-4">
          <Card className="bg-white text-[#018942]">
            <CardHeader>
              <CardTitle>Agenda Semanal dos Técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              <AgendamentoGrid 
                weekStart={currentWeekStart}
                onNextWeek={goToNextWeek}
                onPreviousWeek={goToPreviousWeek}
                onCurrentWeek={goToCurrentWeek}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tecnicos" className="space-y-4">
          <Card className="bg-white text-[#018942]">
            <CardHeader>
              <CardTitle>Gestão de Técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              <GestaoTecnicos />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rotas" className="space-y-4">
          <Card className="bg-white text-[#018942]">
            <CardHeader>
              <CardTitle>Configuração de Rotas</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfiguracaoRotas />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
