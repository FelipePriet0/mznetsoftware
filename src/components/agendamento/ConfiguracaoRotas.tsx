import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Clock, Settings } from "lucide-react";
import { ROUTE_GROUP_COLORS, ROUTE_GROUP_NAMES } from "@/types/agendamento";
import type { RouteGroup } from "@/types/agendamento";

interface BairroConfig {
  nome: string;
  routeGroup: RouteGroup;
  distanciaKm?: number;
  observacoes?: string;
}

const mockBairros: BairroConfig[] = [
  { nome: "Centro", routeGroup: "patrocinio", distanciaKm: 0 },
  { nome: "Morada Nova", routeGroup: "patrocinio", distanciaKm: 5 },
  { nome: "Cidade Jardim", routeGroup: "patrocinio", distanciaKm: 3 },
  { nome: "Santa Mônica", routeGroup: "patrocinio", distanciaKm: 4 },
  { nome: "Salitre de Minas", routeGroup: "salitre_serra_tejuco", distanciaKm: 45 },
  { nome: "Serra do Salitre", routeGroup: "salitre_serra_tejuco", distanciaKm: 52 },
  { nome: "Tejuco", routeGroup: "salitre_serra_tejuco", distanciaKm: 48 },
  { nome: "Guimarânia", routeGroup: "guimarania_sao_joao_cruzeiro", distanciaKm: 38 },
  { nome: "São João da Serra Negra", routeGroup: "guimarania_sao_joao_cruzeiro", distanciaKm: 42 },
  { nome: "Cruzeiro da Fortaleza", routeGroup: "guimarania_sao_joao_cruzeiro", distanciaKm: 35 },
];

export function ConfiguracaoRotas() {
  const [bairros, setBairros] = useState<BairroConfig[]>(mockBairros);
  const [newBairro, setNewBairro] = useState<Partial<BairroConfig>>({});

  const addBairro = () => {
    if (newBairro.nome && newBairro.routeGroup) {
      setBairros(prev => [...prev, newBairro as BairroConfig]);
      setNewBairro({});
    }
  };

  const getBairrosByGroup = (group: RouteGroup) => {
    return bairros.filter(b => b.routeGroup === group);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bairros" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bairros">Bairros por Rota</TabsTrigger>
          <TabsTrigger value="horarios">Horários de Trabalho</TabsTrigger>
          <TabsTrigger value="distancias">Matriz de Distâncias</TabsTrigger>
        </TabsList>

        <TabsContent value="bairros" className="space-y-6">
          {/* Add new neighborhood */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionar Bairro
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Nome do Bairro</Label>
                <Input 
                  value={newBairro.nome || ""}
                  onChange={(e) => setNewBairro(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Centro"
                  className="text-[#018942]"
                />
              </div>
              <div>
                <Label>Grupo de Rota</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newBairro.routeGroup || ""}
                  onChange={(e) => setNewBairro(prev => ({ ...prev, routeGroup: e.target.value as RouteGroup }))}
                >
                  <option value="">Selecionar...</option>
                  {Object.entries(ROUTE_GROUP_NAMES).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Distância (km)</Label>
                <Input 
                  type="number"
                  value={newBairro.distanciaKm || ""}
                  onChange={(e) => setNewBairro(prev => ({ ...prev, distanciaKm: Number(e.target.value) }))}
                  placeholder="0"
                  className="text-[#018942]"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addBairro} className="w-full">
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Route groups */}
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(ROUTE_GROUP_NAMES).map(([groupKey, groupName]) => {
              const groupBairros = getBairrosByGroup(groupKey as RouteGroup);
              
              return (
                <Card key={groupKey}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      <Badge className={ROUTE_GROUP_COLORS[groupKey as RouteGroup]} variant="secondary">
                        {groupName}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {groupBairros.map((bairro, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{bairro.nome}</span>
                            {bairro.distanciaKm !== undefined && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({bairro.distanciaKm}km)
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {groupBairros.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          Nenhum bairro configurado
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="horarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Trabalho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Horário Matutino 1</Label>
                  <Input defaultValue="08:30" className="text-[#018942]" />
                </div>
                <div>
                  <Label>Horário Matutino 2</Label>
                  <Input defaultValue="10:30" className="text-[#018942]" />
                </div>
                <div>
                  <Label>Horário Vespertino 1</Label>
                  <Input defaultValue="13:30" className="text-[#018942]" />
                </div>
                <div>
                  <Label>Horário Vespertino 2</Label>
                  <Input defaultValue="15:30" className="text-[#018942]" />
                </div>
              </div>
              
              <div>
                <Label>Observações sobre Horários</Label>
                <Textarea 
                  placeholder="Ex: Horários podem variar conforme a cidade, técnicos saem direto de casa..."
                  className="mt-1 text-[#018942]"
                />
              </div>
              
              <Button>Salvar Horários</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distancias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Distâncias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-muted">De/Para</th>
                      {Object.values(ROUTE_GROUP_NAMES).map(name => (
                        <th key={name} className="border p-2 bg-muted text-sm">{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(ROUTE_GROUP_NAMES).map(([key, name]) => (
                      <tr key={key}>
                        <td className="border p-2 font-medium bg-muted/50">{name}</td>
                        {Object.keys(ROUTE_GROUP_NAMES).map(targetKey => (
                          <td key={targetKey} className="border p-2 text-center">
                            {key === targetKey ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <Input 
                                type="number" 
                                className="w-16 text-center text-[#018942]" 
                                placeholder="km"
                                size={1}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button>Salvar Distâncias</Button>
                <Button variant="outline">Calcular Automaticamente</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}