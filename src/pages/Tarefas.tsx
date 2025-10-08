import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/context/AuthContext';
import { Task } from '@/types/tasks';
import { Calendar, User, CheckCircle2, Clock, ListTodo, ExternalLink } from 'lucide-react';
import { format, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ModalEditarFicha from '@/components/ui/ModalEditarFicha';

type FilterType = 'today' | 'week' | 'all';

export default function Tarefas() {
  const { profile } = useAuth();
  const { tasks, isLoading, updateTaskStatus } = useTasks(profile?.id);
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>('all');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardData, setSelectedCardData] = useState<any>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    if (filter === 'today') {
      return task.deadline && isToday(new Date(task.deadline));
    } else if (filter === 'week') {
      return task.deadline && isThisWeek(new Date(task.deadline), { locale: ptBR });
    }
    return true;
  });

  // Separar pendentes e concluídas
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const completedTodayTasks = tasks.filter(t => 
    t.status === 'completed' && 
    t.completed_at && 
    isToday(new Date(t.completed_at))
  );

  const handleToggleTask = async (taskId: string, currentStatus: Task['status']) => {
    setUpdatingTaskId(taskId);
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const success = await updateTaskStatus(taskId, newStatus);
      
      if (success) {
        toast({
          title: newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reaberta',
          description: newStatus === 'completed' 
            ? 'A tarefa foi marcada como concluída.' 
            : 'A tarefa foi reaberta.',
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a tarefa.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.deadline) return false;
    return new Date(task.deadline) < new Date() && task.status === 'pending';
  };

  const handleOpenCard = async (cardId: string) => {
    setIsLoadingCard(true);
    try {
      // Buscar dados frescos do banco (mesmo jeito que KanbanBoard faz)
      const { data: freshCard, error } = await (supabase as any)
        .from('kanban_cards')
        .select(`
          id,
          area,
          stage,
          person_type,
          assignee_id,
          title,
          cpf_cnpj,
          phone,
          email,
          received_at,
          due_at,
          applicant:applicant_id ( id, primary_name, city, uf, email )
        `)
        .eq('id', cardId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar card do banco:', error);
        throw error;
      }

      console.log('✅ Card carregado:', freshCard);

      // Mapear para o formato CardItem compatível com o ModalEditarFicha
      const receivedAt = freshCard.received_at ? new Date(freshCard.received_at).toISOString() : new Date().toISOString();
      const deadline = freshCard.due_at ? new Date(freshCard.due_at).toISOString() : receivedAt;
      const toColumnId = (() => {
        if (freshCard.area === 'comercial') {
          const stageMap: Record<string, string> = {
            entrada: 'com_entrada',
            feitas: 'com_feitas',
            aguardando_doc: 'com_aguardando',
            canceladas: 'com_canceladas',
            concluidas: 'com_concluidas',
          };
          return stageMap[freshCard.stage] || 'com_entrada';
        }
        return freshCard.stage;
      })();

      const mappedCard = {
        id: freshCard.id,
        nome: freshCard.title ?? freshCard.applicant?.primary_name ?? 'Cliente',
        telefone: freshCard.phone || undefined,
        email: freshCard.email || freshCard.applicant?.email || undefined,
        cpf: freshCard.cpf_cnpj || '',
        receivedAt,
        deadline,
        updatedAt: receivedAt,
        lastMovedAt: receivedAt,
        columnId: toColumnId,
        parecer: (freshCard as any).reanalysis_notes || (freshCard as any).comments || (freshCard as any).comments_short || '',
        applicantId: freshCard.applicant?.id,
      } as any;

      setSelectedCardData(mappedCard);
      setSelectedCardId(cardId);
    } catch (error: any) {
      console.error('❌ Erro ao carregar card:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível abrir o card.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCard(false);
    }
  };

  const handleCloseCardModal = () => {
    setSelectedCardId(null);
    setSelectedCardData(null);
  };

  const handleSaveCard = async (updatedCard: any) => {
    // Salvar alterações e recarregar tarefas
    handleCloseCardModal();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ListTodo className="h-12 w-12 animate-spin mx-auto mb-4 text-[#018942]" />
          <p className="text-gray-600">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTodo className="h-8 w-8 text-[#018942]" />
          <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'today' ? 'default' : 'outline'}
          onClick={() => setFilter('today')}
          className={cn(
            filter === 'today' 
              ? 'bg-[#018942] hover:bg-[#018942]/90 text-white' 
              : 'border-[#018942] text-[#018942] hover:bg-[#018942]/10'
          )}
        >
          Hoje
        </Button>
        <Button
          variant={filter === 'week' ? 'default' : 'outline'}
          onClick={() => setFilter('week')}
          className={cn(
            filter === 'week' 
              ? 'bg-[#018942] hover:bg-[#018942]/90 text-white' 
              : 'border-[#018942] text-[#018942] hover:bg-[#018942]/10'
          )}
        >
          Semana
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={cn(
            filter === 'all' 
              ? 'bg-[#018942] hover:bg-[#018942]/90 text-white' 
              : 'border-[#018942] text-[#018942] hover:bg-[#018942]/10'
          )}
        >
          Todas
        </Button>
      </div>

      {/* Contadores */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas a Fazer</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTodayTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Tarefas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ListTodo className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-4 p-4 border rounded-lg transition-all",
                    task.status === 'completed' 
                      ? "bg-green-50 border-green-200" 
                      : isOverdue(task)
                      ? "bg-red-50 border-red-200"
                      : "bg-white border-gray-200 hover:border-[#018942]/50"
                  )}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-1">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      disabled={updatingTaskId === task.id}
                      className={cn(
                        "w-5 h-5",
                        task.status === 'completed' && "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      )}
                    />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    {/* Descrição com Botão Ir */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "font-medium flex-1",
                        task.status === 'completed' && "line-through text-gray-500"
                      )}>
                        {task.description}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenCard(task.card_id)}
                        disabled={isLoadingCard}
                        className="h-7 px-3 text-[#018942] hover:bg-[#018942]/10 hover:text-[#018942] font-medium"
                        title="Abrir card original"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ir
                      </Button>
                    </div>

                    {/* Metadados */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {/* Card */}
                      {task.card_title && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Card:</span>
                          <span>{task.card_title}</span>
                        </div>
                      )}

                      {/* Criado por */}
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{task.created_by_name}</span>
                      </div>

                      {/* Prazo */}
                      {task.deadline && (
                        <div className={cn(
                          "flex items-center gap-1",
                          isOverdue(task) && "text-red-600 font-medium"
                        )}>
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(task.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {isOverdue(task) && (
                            <Badge variant="destructive" className="ml-2">Atrasada</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <Badge
                      className={cn(
                        task.status === 'completed' 
                          ? "bg-green-500 hover:bg-green-600" 
                          : "bg-blue-500 hover:bg-blue-600"
                      )}
                    >
                      {task.status === 'completed' ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal "Editar Ficha" */}
      {selectedCardId && selectedCardData && (
        <ModalEditarFicha
          card={selectedCardData}
          onClose={handleCloseCardModal}
          onSave={handleSaveCard}
          onRefetch={() => {
            // Atualizar lista de tarefas após mudanças no card
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
