import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Building, AlertTriangle } from "lucide-react";

interface HistoryItem {
  id: string;
  status_final: string;
  company_name: string;
  comercial_name: string;
  analista_name: string;
  decided_at: string;
}

interface HistoryInsightsProps {
  items: HistoryItem[];
}

export function HistoryInsights({ items }: HistoryInsightsProps) {
  const insights = useMemo(() => {
    if (items.length === 0) {
      return {
        totalApplications: 0,
        approvalRate: 0,
        totalCompanies: 0,
        totalCollaborators: 0,
        recentDecisions: 0,
        topPerformer: null,
      };
    }

    const totalApplications = items.length;
    const approvedCount = items.filter(item => item.status_final === 'aprovado').length;
    const approvalRate = (approvedCount / totalApplications) * 100;
    
    const companies = new Set(items.map(item => item.company_name).filter(Boolean));
    const totalCompanies = companies.size;
    
    const collaborators = new Set([
      ...items.map(item => item.comercial_name).filter(Boolean),
      ...items.map(item => item.analista_name).filter(Boolean),
    ]);
    const totalCollaborators = collaborators.size;
    
    // Decisões dos últimos 7 dias
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentDecisions = items.filter(item => 
      new Date(item.decided_at) >= weekAgo
    ).length;

    // Analista com melhor performance (maior taxa de aprovação)
    const analystStats = items.reduce((acc, item) => {
      if (!item.analista_name) return acc;
      
      if (!acc[item.analista_name]) {
        acc[item.analista_name] = { total: 0, approved: 0 };
      }
      
      acc[item.analista_name].total++;
      if (item.status_final === 'aprovado') {
        acc[item.analista_name].approved++;
      }
      
      return acc;
    }, {} as Record<string, { total: number; approved: number }>);

    const topPerformer = Object.entries(analystStats)
      .map(([name, stats]) => ({
        name,
        rate: (stats.approved / stats.total) * 100,
        total: stats.total,
      }))
      .filter(analyst => analyst.total >= 5) // Mínimo 5 análises
      .sort((a, b) => b.rate - a.rate)[0];

    return {
      totalApplications,
      approvalRate,
      totalCompanies,
      totalCollaborators,
      recentDecisions,
      topPerformer,
    };
  }, [items]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Fichas
          </CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.totalApplications}</div>
          <p className="text-xs text-muted-foreground">
            {insights.totalCompanies} empresa{insights.totalCompanies !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Taxa de Aprovação
          </CardTitle>
          {insights.approvalRate >= 50 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {insights.approvalRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {items.filter(i => i.status_final === 'aprovado').length} aprovadas de {insights.totalApplications}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Colaboradores
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.totalCollaborators}</div>
          <p className="text-xs text-muted-foreground">
            Ativos no período
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Últimos 7 dias
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.recentDecisions}</div>
          <p className="text-xs text-muted-foreground">
            Decisões recentes
          </p>
        </CardContent>
      </Card>

      {/* Placeholder para insights de inadimplência */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Insights de Inadimplência
          </CardTitle>
          <CardDescription>
            Dados disponíveis após importação da planilha de inadimplência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-2">
              <p className="text-2xl font-bold text-muted-foreground">-</p>
              <p className="text-xs text-muted-foreground">Taxa de Inadimplência</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-muted-foreground">-</p>
              <p className="text-xs text-muted-foreground">Valor Total em Atraso</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance do melhor analista */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Melhor Performance
          </CardTitle>
          <CardDescription>
            Analista com melhor taxa de aprovação (mín. 5 análises)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.topPerformer ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{insights.topPerformer.name}</span>
                <Badge variant="default">
                  {insights.topPerformer.rate.toFixed(1)}% de aprovação
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {insights.topPerformer.total} análises realizadas
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Dados insuficientes para análise de performance
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}