import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Task, CreateTaskInput } from '@/types/tasks';

export function useTasks(userId?: string, cardId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  // Carregar tarefas
  const loadTasks = async () => {
    if (!userId && !cardId) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = (supabase as any)
        .from('card_tasks')
        .select(`
          id,
          card_id,
          created_by,
          assigned_to,
          description,
          status,
          deadline,
          comment_id,
          created_at,
          updated_at,
          completed_at,
          created_by_profile:profiles!card_tasks_created_by_fkey(full_name),
          assigned_to_profile:profiles!card_tasks_assigned_to_fkey(full_name)
        `);

      // Filtrar por usuário OU por card
      if (userId && !cardId) {
        // Se só tem userId (sem cardId), filtrar por usuário atribuído
        query = query.eq('assigned_to', userId);
      } else if (cardId) {
        // Se tem cardId, carregar TODAS as tarefas do card (independente do usuário)
        query = query.eq('card_id', cardId);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === 'PGRST205' || fetchError.message?.includes('relation "public.card_tasks" does not exist')) {
          console.warn('Card tasks table not found - feature may not be available yet');
          setTasks([]);
          return;
        }
        throw fetchError;
      }

      // Mapear dados com nomes dos perfis
      const mappedTasks: Task[] = (data || []).map((task: any) => ({
        id: task.id,
        card_id: task.card_id,
        created_by: task.created_by,
        assigned_to: task.assigned_to,
        description: task.description,
        status: task.status,
        deadline: task.deadline,
        comment_id: task.comment_id,
        created_at: task.created_at,
        updated_at: task.updated_at,
        completed_at: task.completed_at,
        created_by_name: task.created_by_profile?.full_name || 'Usuário',
        assigned_to_name: task.assigned_to_profile?.full_name || 'Usuário',
      }));

      console.log('📋 Tarefas carregadas do banco:', mappedTasks.length, 'tarefas');
      console.log('📋 Dados das tarefas:', mappedTasks);
      setTasks(mappedTasks);
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Erro ao carregar tarefas');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Criar tarefa
  const createTask = async (input: CreateTaskInput, commentId?: string): Promise<Task | null> => {
    if (!profile) {
      setError('Usuário não autenticado');
      return null;
    }

    try {
      const { data: result, error: createError } = await (supabase as any)
        .from('card_tasks')
        .insert({
          card_id: input.card_id,
          assigned_to: input.assigned_to,
          description: input.description,
          deadline: input.deadline,
          comment_id: commentId, // Vincular ao comentário
          status: 'pending'
        })
        .select(`
          id,
          card_id,
          created_by,
          assigned_to,
          description,
          status,
          deadline,
          comment_id,
          created_at,
          updated_at,
          completed_at,
          created_by_profile:profiles!card_tasks_created_by_fkey(full_name),
          assigned_to_profile:profiles!card_tasks_assigned_to_fkey(full_name)
        `)
        .single();

      if (createError) throw createError;

      const newTask: Task = {
        id: result.id,
        card_id: result.card_id,
        created_by: result.created_by,
        assigned_to: result.assigned_to,
        description: result.description,
        status: result.status,
        deadline: result.deadline,
        comment_id: result.comment_id,
        created_at: result.created_at,
        updated_at: result.updated_at,
        completed_at: result.completed_at,
        created_by_name: result.created_by_profile?.full_name || 'Usuário',
        assigned_to_name: result.assigned_to_profile?.full_name || 'Usuário',
      };

      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Erro ao criar tarefa');
      return null;
    }
  };

  // Atualizar status da tarefa
  const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed'): Promise<boolean> => {
    try {
      console.log('✅ [useTasks] Atualizando status da tarefa:', { taskId, status });
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      // 1. Atualização otimista imediata (UI instantânea)
      console.log('⚡ [useTasks] Atualizando checkbox otimisticamente...');
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? {
                ...task,
                status,
                completed_at: updateData.completed_at,
                updated_at: updateData.updated_at,
              }
            : task
        )
      );

      // 2. Salvar no banco de dados (sem bloquear a UI)
      const { error: updateError } = await (supabase as any)
        .from('card_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (updateError) {
        console.error('❌ [useTasks] Erro ao atualizar status, revertendo...');
        // Reverter mudança otimista em caso de erro
        await loadTasks();
        
        if (updateError.code === 'PGRST205' || updateError.message?.includes('relation "public.card_tasks" does not exist')) {
          console.warn('Card tasks table not found - feature may not be available yet');
          return false;
        }
        throw updateError;
      }

      console.log('✅ [useTasks] Status atualizado no banco com sucesso');
      return true;
    } catch (err: any) {
      console.error('❌ [useTasks] Erro ao atualizar status da tarefa:', err);
      setError(err.message || 'Erro ao atualizar status da tarefa');
      return false;
    }
  };

  // Atualizar tarefa completa
  const updateTask = async (taskId: string, updates: Partial<CreateTaskInput>): Promise<boolean> => {
    try {
      console.log('📝 [useTasks] Atualizando tarefa no banco...', { taskId, updates });
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // 1. Atualização otimista no estado local (UI instantânea)
      console.log('⚡ [useTasks] Atualizando UI otimisticamente...');
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === taskId) {
            // Se mudou o assigned_to, buscar o nome do novo usuário
            let updatedTask = { ...task, ...updateData };
            
            // Se mudou o assigned_to, precisamos atualizar o nome também
            if (updates.assigned_to && updates.assigned_to !== task.assigned_to) {
              // O nome será atualizado quando recarregar do banco
              updatedTask.assigned_to_name = 'Carregando...';
            }
            
            console.log('✨ [useTasks] Tarefa atualizada otimisticamente:', updatedTask);
            return updatedTask;
          }
          return task;
        })
      );

      // 2. Salvar no banco de dados
      const { data: updatedData, error: updateError } = await (supabase as any)
        .from('card_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select(`
          id,
          card_id,
          created_by,
          assigned_to,
          description,
          status,
          deadline,
          comment_id,
          created_at,
          updated_at,
          completed_at,
          created_by_profile:profiles!card_tasks_created_by_fkey(full_name),
          assigned_to_profile:profiles!card_tasks_assigned_to_fkey(full_name)
        `)
        .single();

      if (updateError) {
        console.error('❌ [useTasks] Erro ao atualizar tarefa:', updateError);
        // Reverter atualização otimista em caso de erro
        await loadTasks();
        
        if (updateError.code === 'PGRST205' || updateError.message?.includes('relation "public.card_tasks" does not exist')) {
          console.warn('Card tasks table not found - feature may not be available yet');
          return false;
        }
        throw updateError;
      }

      // 3. Sincronizar com dados reais do banco (incluindo nomes atualizados)
      console.log('✅ [useTasks] Tarefa salva no banco, sincronizando dados completos...');
      if (updatedData) {
        const syncedTask: Task = {
          id: updatedData.id,
          card_id: updatedData.card_id,
          created_by: updatedData.created_by,
          assigned_to: updatedData.assigned_to,
          description: updatedData.description,
          status: updatedData.status,
          deadline: updatedData.deadline,
          comment_id: updatedData.comment_id,
          created_at: updatedData.created_at,
          updated_at: updatedData.updated_at,
          completed_at: updatedData.completed_at,
          created_by_name: updatedData.created_by_profile?.full_name || 'Usuário',
          assigned_to_name: updatedData.assigned_to_profile?.full_name || 'Usuário',
        };

        setTasks(prevTasks => 
          prevTasks.map(task => task.id === taskId ? syncedTask : task)
        );
        
        console.log('✅ [useTasks] Tarefa sincronizada com dados do banco:', syncedTask);
      }

      return true;
    } catch (err: any) {
      console.error('❌ [useTasks] Erro ao atualizar tarefa:', err);
      setError(err.message || 'Erro ao atualizar tarefa');
      return false;
    }
  };

  // Deletar tarefa (SOFT DELETE)
  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [useTasks] Soft delete da tarefa:', taskId);
      
      const { error: deleteError } = await (supabase as any)
        .from('card_tasks')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', taskId);

      if (deleteError) throw deleteError;

      // Recarregar tarefas do banco para garantir sincronização
      console.log('🔄 [useTasks] Recarregando tarefas após exclusão...');
      await loadTasks();
      
      console.log('✅ [useTasks] Tarefa deletada com sucesso');
      return true;
    } catch (err: any) {
      console.error('❌ [useTasks] Erro ao deletar tarefa:', err);
      setError(err.message || 'Erro ao deletar tarefa');
      return false;
    }
  };

  // Carregar tarefas quando userId ou cardId mudar
  useEffect(() => {
    if (userId || cardId) {
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cardId]);

  return {
    tasks,
    isLoading,
    error,
    loadTasks,
    createTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
  };
}

