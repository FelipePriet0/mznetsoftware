import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Building, User, FileText, MapPin, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HistoryDetail {
  id: string;
  application_id: string;
  company_id: string;
  status_final: string;
  customer_name: string;
  customer_cpf: string;
  emprego: string;
  tipo_de_moradia: string;
  obs: string;
  ps: string;
  decision_comment: string;
  reanalysis_notes: string;
  snapshot: any;
  decided_at: string;
  company_name: string;
  company_logo: string;
  comercial_name: string;
  analista_name: string;
  reanalista_name: string;
  decided_by_name: string;
}

interface HistoryDetailModalProps {
  historyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryDetailModal({ historyId, isOpen, onClose }: HistoryDetailModalProps) {
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && historyId) {
      fetchDetail();
    }
  }, [isOpen, historyId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('view_history_detail')
        .select('*')
        .eq('id', historyId)
        .single();

      if (error) throw error;
      setDetail(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes desta ficha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportDetailToCSV = () => {
    if (!detail) return;
    
    const data = [
      ['Campo', 'Valor'],
      ['Cliente', detail.customer_name],
      ['CPF', detail.customer_cpf],
      ['Status', detail.status_final],
      ['Empresa', detail.company_name],
      ['Comercial', detail.comercial_name || ''],
      ['Analista', detail.analista_name || ''],
      ['Reanalista', detail.reanalista_name || ''],
      ['Emprego', detail.emprego || ''],
      ['Tipo de Moradia', detail.tipo_de_moradia || ''],
      ['Observações', detail.obs || ''],
      ['PS', detail.ps || ''],
      ['Parecer da Decisão', detail.decision_comment || ''],
      ['Notas de Reanálise', detail.reanalysis_notes || ''],
      ['Data da Decisão', new Date(detail.decided_at).toLocaleString('pt-BR')],
    ];

    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ficha_${detail.customer_name}_${detail.customer_cpf}.csv`;
    link.click();
  };

  const renderSnapshotSection = (title: string, data: any, icon: any) => {
    if (!data) return null;

    const Icon = icon;
    
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {Object.entries(data)
              .filter(([key, value]) => value !== null && value !== undefined && key !== 'id')
              .map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <dt className="font-medium text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="text-foreground">
                    {typeof value === 'boolean' 
                      ? (value ? 'Sim' : 'Não')
                      : typeof value === 'string' && value.length > 50
                      ? `${value.substring(0, 50)}...`
                      : String(value)
                    }
                  </dd>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando detalhes...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!detail) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Detalhes não encontrados.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-xl">
              Detalhes da Ficha - {detail.customer_name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              CPF: {detail.customer_cpf} • {detail.company_name}
            </p>
          </div>
          <Button onClick={exportDetailToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="pareceres">Pareceres</TabsTrigger>
              <TabsTrigger value="equipe">Equipe</TabsTrigger>
              <TabsTrigger value="snapshot">Dados Completos</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="w-4 h-4" />
                      Informações do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome</p>
                      <p>{detail.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CPF</p>
                      <p className="font-mono">{detail.customer_cpf}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={detail.status_final === 'aprovado' ? 'default' : 'destructive'}>
                        {detail.status_final === 'aprovado' ? 'Aprovado' : 'Negado'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building className="w-4 h-4" />
                      Informações da Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center gap-2">
                      {detail.company_logo && (
                        <img 
                          src={detail.company_logo} 
                          alt={detail.company_name}
                          className="w-8 h-8 rounded"
                        />
                      )}
                      <p>{detail.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Data da Decisão</p>
                      <p>{new Date(detail.decided_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Decidido por</p>
                      <p>{detail.decided_by_name || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Campos Importantes</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Emprego</p>
                      <p>{detail.emprego || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipo de Moradia</p>
                      <p>{detail.tipo_de_moradia || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Observações</p>
                      <p>{detail.obs || 'Nenhuma observação'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">PS</p>
                      <p>{detail.ps || 'Nenhuma nota adicional'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pareceres" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Pareceres e Comentários
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Parecer da Decisão</h4>
                    <p className="text-sm bg-muted p-3 rounded">
                      {detail.decision_comment || 'Nenhum parecer registrado na decisão.'}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Notas de Reanálise</h4>
                    <p className="text-sm bg-muted p-3 rounded">
                      {detail.reanalysis_notes || 'Nenhuma nota de reanálise registrada.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="equipe" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Equipe Responsável
                  </CardTitle>
                  <CardDescription>
                    Colaboradores envolvidos no processo desta ficha
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded">
                      <h4 className="font-medium">Comercial</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {detail.comercial_name || 'Não atribuído'}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <h4 className="font-medium">Analista</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {detail.analista_name || 'Não atribuído'}
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <h4 className="font-medium">Reanalista</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {detail.reanalista_name || 'Não atribuído'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="snapshot" className="space-y-4 mt-4">
              <div className="space-y-4">
                {detail.snapshot?.application && 
                  renderSnapshotSection("Aplicação", detail.snapshot.application, FileText)}
                
                {detail.snapshot?.customer && 
                  renderSnapshotSection("Cliente", detail.snapshot.customer, User)}
                
                {detail.snapshot?.employment && 
                  renderSnapshotSection("Emprego", detail.snapshot.employment, Briefcase)}
                
                {detail.snapshot?.address && 
                  renderSnapshotSection("Endereço", detail.snapshot.address, MapPin)}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}