export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  card_id: string;
  created_by: string;
  assigned_to: string;
  description: string;
  status: TaskStatus;
  deadline?: string;
  comment_id?: string; // ID do comentÃ¡rio associado (conversa encadeada)
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // Relacionamentos (dados denormalizados para facilitar queries)
  created_by_name?: string;
  assigned_to_name?: string;
}

export interface CreateTaskInput {
  card_id: string;
  assigned_to: string;
  description: string;
  deadline?: string;
}

