import React from 'react';
import { Task } from '@/types/tasks';
import { useTasks } from '@/hooks/useTasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TaskItemProps {
  task: Task;
  showCardInfo?: boolean;
  onTaskClick?: (task: Task) => void;
  onUpdateTaskStatus?: (taskId: string, status: 'pending' | 'completed') => Promise<boolean>;
  onDeleteTask?: (taskId: string) => Promise<boolean>;
}

export function TaskItem({ task, showCardInfo = false, onTaskClick, onUpdateTaskStatus, onDeleteTask }: TaskItemProps) {
  // Se os callbacks nÃ£o forem fornecidos, usar o hook padrÃ£o (fallback)
  const { updateTaskStatus: defaultUpdateStatus, deleteTask: defaultDeleteTask } = useTasks(undefined, task.card_id);

  const handleToggleStatus = async (checked: boolean) => {
    console.log('ðŸ”„ [TaskItem] Toggle status:', { taskId: task.id, checked, hasCallback: !!onUpdateTaskStatus });
    
    if (onUpdateTaskStatus) {
      // Usar callback fornecido (preferencial - jÃ¡ estÃ¡ otimizado)
      const success = await onUpdateTaskStatus(task.id, checked ? 'completed' : 'pending');
      console.log('âœ… [TaskItem] Status atualizado via callback:', success);
    } else {
      // Fallback: usar hook padrÃ£o
      console.log('âš ï¸ [TaskItem] Usando fallback - updateTaskStatus padrÃ£o');
      await defaultUpdateStatus(task.id, checked ? 'completed' : 'pending');
    }
  };

  const handleDelete = async () => {
    console.log('ðŸ—‘ï¸ [TaskItem] Delete task:', { taskId: task.id, hasCallback: !!onDeleteTask });
    
    if (onDeleteTask) {
      await onDeleteTask(task.id);
    } else {
      await defaultDeleteTask(task.id);
    }
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status === 'pending';

  const formatDeadline = (deadline: string) => {
    try {
      return format(new Date(deadline), 'dd/MM HH:mm', { locale: ptBR });
    } catch {
      return deadline;
    }
  };

  const formatRelativeTime = (date: string) => {
    try {
      const now = new Date();
      const taskDate = new Date(date);
      const diffMs = now.getTime() - taskDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) {
        return `hÃ¡ ${diffMins}min`;
      } else if (diffHours < 24) {
        return `hÃ¡ ${diffHours}h`;
      } else if (diffDays === 1) {
        return 'ontem';
      } else {
        return `hÃ¡ ${diffDays}d`;
      }
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-lg border transition-all ${
        task.status === 'completed'
          ? 'bg-green-50 border-green-200 opacity-70'
          : 'bg-white border-gray-200 hover:border-gray-300'
      } ${onTaskClick ? 'cursor-pointer' : ''}`}
      onClick={() => onTaskClick && onTaskClick(task)}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={handleToggleStatus}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* ConteÃºdo da tarefa */}
      <div className="flex-1 min-w-0">
        {/* DescriÃ§Ã£o */}
        <p
          className={`text-sm font-medium mb-1 ${
            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
          }`}
        >
          {task.description}
        </p>

        {/* Metadados */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          {/* Card de origem */}
          {showCardInfo && task.card_title && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Card:</span>
              <span className="text-blue-600">#{task.card_title}</span>
            </div>
          )}

          {/* Criado por */}
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{task.created_by_name}</span>
          </div>

          {/* Prazo */}
          {task.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {formatDeadline(task.deadline)}
              </span>
            </div>
          )}

          {/* Ãšltima atualizaÃ§Ã£o */}
          <span className="text-gray-400">{formatRelativeTime(task.updated_at)}</span>
        </div>

        {/* Badge de status */}
        {isOverdue && (
          <Badge variant="destructive" className="mt-2">
            Atrasada
          </Badge>
        )}
      </div>

      {/* BotÃ£o de deletar */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta aÃ§Ã£o nÃ£o pode ser desfeita. A tarefa serÃ¡ permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


