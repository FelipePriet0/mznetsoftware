import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isPremium } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HistoryDetailModal } from "@/components/history/HistoryDetailModal";
import { HistoryInsights } from "@/components/history/HistoryInsights";
import { HistoryFileUpload } from "@/components/history/HistoryFileUpload";
import { Search, Filter, Download, Eye, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HistoryItem {
  id: string;
  application_id: string;
  company_id: string;
  status_final: string;
  customer_name: string;
  customer_cpf: string;
  decided_at: string;
  company_name: string;
  company_logo: string;
  comercial_name: string;
  analista_name: string;
  reanalista_name: string;
  decided_by_name: string;
}

const Historico = () => {
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>("all");

  useEffect(() => {
    document.title = "Histórico de Análises – MZNET";
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('view_history_list')
        .select('*')
        .order('decided_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar os dados do histórico.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customer_cpf?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || item.status_final === statusFilter;
    
    const matchesDateRange = (!startDate || new Date(item.decided_at) >= new Date(startDate)) &&
                            (!endDate || new Date(item.decided_at) <= new Date(endDate));
    
    const matchesCollaborator = collaboratorFilter === "all" || 
      item.comercial_name?.toLowerCase().includes(collaboratorFilter.toLowerCase()) ||
      item.analista_name?.toLowerCase().includes(collaboratorFilter.toLowerCase()) ||
      item.reanalista_name?.toLowerCase().includes(collaboratorFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesDateRange && matchesCollaborator;
  });

  const exportToCSV = () => {
    const headers = ['Empresa', 'Cliente', 'CPF', 'Status', 'Comercial', 'Analista', 'Reanalista', 'Data da Decisão'];
    const csvData = [
      headers.join(','),
      ...filteredItems.map(item => [
        item.company_name || '',
        item.customer_name || '',
        item.customer_cpf || '',
        item.status_final,
        item.comercial_name || '',
        item.analista_name || '',
        item.reanalista_name || '',
        new Date(item.decided_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historico_analises_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="pt-8 pb-4">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#018942]">
                Histórico de Análises
              </h1>
              <p className="mt-2 text-muted-foreground">
                Visualize fichas finalizadas, pareceres e análise de inadimplência
              </p>
            </div>
            {isPremium(currentUser) && (
              <HistoryFileUpload onUploadSuccess={fetchHistory} />
            )}
          </div>
        </div>
      </header>

      <main className="container pb-16 pt-2">
        {/* Insights Cards */}
        <HistoryInsights items={filteredItems} />

        {/* Filtros */}
        <Card className="mb-6 bg-white text-[#018942]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Filtre o histórico por empresa, status, período ou colaborador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="negado">Negado</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Data inicial"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                type="date"
                placeholder="Data final"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <div className="flex gap-2">
                <Input
                  placeholder="Colaborador..."
                  value={collaboratorFilter}
                  onChange={(e) => setCollaboratorFilter(e.target.value)}
                />
                <Button onClick={exportToCSV} variant="outline" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Histórico */}
        <Card className="bg-white text-[#018942]">
          <CardHeader>
            <CardTitle>Fichas Finalizadas ({filteredItems.length})</CardTitle>
            <CardDescription>
              Histórico completo de todas as análises finalizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comercial</TableHead>
                    <TableHead>Analista</TableHead>
                    <TableHead>Reanalista</TableHead>
                    <TableHead>Data da Decisão</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-center">
                          <AlertTriangle className="w-8 h-8 text-[#018942] mx-auto mb-2" />
                          <p className="text-muted-foreground">
                            {items.length === 0 
                              ? "Nenhuma ficha finalizada encontrada" 
                              : "Nenhum resultado encontrado com os filtros aplicados"
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.company_logo && (
                              <img 
                                src={item.company_logo} 
                                alt={item.company_name}
                                className="w-6 h-6 rounded"
                              />
                            )}
                            <span className="text-sm">{item.company_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.customer_name}</TableCell>
                        <TableCell className="font-mono text-xs">{item.customer_cpf}</TableCell>
                        <TableCell>
                          <Badge variant={item.status_final === 'aprovado' ? 'default' : 'destructive'}>
                            {item.status_final === 'aprovado' ? 'Aprovado' : 'Negado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.comercial_name || '-'}</TableCell>
                        <TableCell className="text-sm">{item.analista_name || '-'}</TableCell>
                        <TableCell className="text-sm">{item.reanalista_name || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(item.decided_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(item.decided_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Modal de Detalhes */}
      {selectedItem && (
        <HistoryDetailModal
          historyId={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default Historico;
