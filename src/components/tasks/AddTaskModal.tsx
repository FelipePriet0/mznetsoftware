import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Comment } from '@/components/comments/CommentItem';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  cardId: string;
  onCommentCreate?: (content: string) => Promise<Comment | null>;
  parentCommentId?: string;
}

interface User {
  id: string;
  full_name: string;
  role: string;
}

export function AddTaskModal({ open, onClose, cardId, onCommentCreate, parentCommentId }: AddTaskModalProps) {
  const { profile } = useAuth();
  const { createTask } = useTasks(undefined, cardId);
  const { toast } = useToast();

  const [assignedTo, setAssignedTo] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  // Carregar usuário atual e lista de usuários
  useEffect(() => {
    const loadData = async () => {
      if (!open) {
        return;
      }

      setIsLoadingUsers(true);
      try {
        // Buscar TODOS os usuários (sem filtro de role)
        const { data: usersData, error } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, role')
          .order('full_name');

        if (error) {
          console.error('❌ Erro ao buscar usuários:', error);
          throw error;
        }

        console.log('✅ Usuários carregados:', usersData?.length || 0);
        setUsers(usersData || []);

        // Pegar o nome do usuário atual
        if (profile?.full_name) {
          setCurrentUserName(profile.full_name);
        } else {
          // Fallback: buscar do Supabase Auth
          const { data: { user } } = await (supabase as any).auth.getUser();
          if (user) {
            const currentUser = usersData?.find((u: User) => u.id === user.id);
            setCurrentUserName(currentUser?.full_name || user.email || 'Usuário');
          }
        }
      } catch (err) {
        console.error('❌ Error loading users:', err);
        toast({
          title: 'Erro ao carregar colaboradores',
          description: 'Não foi possível carregar a lista de colaboradores',
          variant: 'destructive',
        });
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadData();
  }, [open, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignedTo || !description.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o colaborador e a descrição da tarefa',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let commentId: string | undefined;

      // Primeiro, criar o comentário (conversa encadeada)
      if (onCommentCreate) {
        const assignedUser = users.find(u => u.id === assignedTo);
        const deadlineText = deadline
          ? `\n📅 Prazo: ${new Date(deadline).toLocaleString('pt-BR')}`
          : '';

        const commentContent = `📋 **Tarefa criada**\n\n` +
          `👤 **Para:** @${assignedUser?.full_name}\n` +
          `📝 **Descrição:** ${description.trim()}` +
          deadlineText;

        const comment = await onCommentCreate(commentContent);
        if (comment) {
          commentId = comment.id;
        }
      }

      // Depois, criar a tarefa vinculada ao comentário
      const task = await createTask({
        card_id: cardId,
        assigned_to: assignedTo,
        description: description.trim(),
        deadline: deadline || undefined,
      }, commentId);

      if (task) {
        toast({
          title: 'Tarefa criada com sucesso!',
          description: `Tarefa atribuída para ${users.find(u => u.id === assignedTo)?.full_name}`,
        });

        // Limpar formulário e fechar
        setAssignedTo('');
        setDescription('');
        setDeadline('');
        onClose();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Erro ao criar tarefa',
        description: 'Não foi possível criar a tarefa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAssignedTo('');
    setDescription('');
    setDeadline('');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Adicionar Tarefa</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Campo: De */}
          <div className="space-y-2">
            <label htmlFor="createdBy" className="text-sm font-medium">
              De:
            </label>
            <div className="flex h-12 w-full items-center rounded-[30px] border-2 border-[#018942] bg-gray-50 px-5 py-3 text-sm text-gray-700">
              {currentUserName || 'Carregando...'}
            </div>
          </div>

          {/* Campo: Para */}
          <div className="space-y-2">
            <label htmlFor="assignedTo" className="text-sm font-medium">
              Para:
            </label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isLoadingUsers}>
              <SelectTrigger 
                id="assignedTo" 
                className="border-2 border-[#018942] [&>span]:text-[#018942] data-[placeholder]:text-[#018942]"
              >
                <SelectValue 
                  placeholder={isLoadingUsers ? "Carregando..." : "Selecione um colaborador"}
                  className="text-[#018942] placeholder:text-[#018942]"
                />
              </SelectTrigger>
              <SelectContent>
                {users.length === 0 && !isLoadingUsers && (
                  <div className="p-2 text-xs text-[#018942]">Nenhum colaborador encontrado</div>
                )}
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#018942]">
              {isLoadingUsers ? '⏳ Carregando colaboradores...' : `📊 ${users.length} colaborador(es) disponível(is)`}
            </p>
          </div>

          {/* Campo: Descrição da Tarefa */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descrição da Tarefa:
            </label>
            <Textarea
              id="description"
              placeholder="Ex.: Reagendar instalação para o dia 12/10 às 14h."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none border-2 border-[#018942] text-[#018942] placeholder:text-[#018942] focus:ring-[#018942]"
            />
          </div>

          {/* Campo: Prazo (Opcional) */}
          <div className="space-y-2">
            <label htmlFor="deadline" className="text-sm font-medium">
              Prazo (Opcional):
            </label>
            <input
              type="datetime-local"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="flex h-12 w-full items-center rounded-[30px] border-2 border-[#018942] bg-white px-5 py-3 text-sm text-[#018942] placeholder:text-[#018942] shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-4 focus:ring-[rgba(1,137,66,0.25)] focus:ring-offset-0"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#018942] hover:bg-[#018942]/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

