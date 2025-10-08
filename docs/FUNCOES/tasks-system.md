# ðŸ“‹ DocumentaÃ§Ã£o: Sistema de Tarefas

## ðŸŽ¯ **VisÃ£o Geral**
O Sistema de Tarefas permite criar, gerenciar e acompanhar tarefas dentro do contexto de fichas do Kanban. As tarefas sÃ£o criadas atravÃ©s de conversas encadeadas e podem ser atribuÃ­das a colaboradores especÃ­ficos.

---

## ðŸ”§ **LocalizaÃ§Ã£o no Frontend**

### **PÃ¡gina Principal**
```
src/pages/Tarefas.tsx
```
- **Rota**: `/tarefas`
- **Sidebar**: Item "Tarefas" acima de "Kanban"
- **Funcionalidades**: VisualizaÃ§Ã£o, filtros e gerenciamento de tarefas

### **Hook Principal**
```
src/hooks/useTasks.ts
```
- **FunÃ§Ã£o**: Gerenciamento completo do estado das tarefas
- **OperaÃ§Ãµes**: Create, Read, Update, Delete (CRUD)
- **Recursos**: Soft delete, atualizaÃ§Ãµes otimistas

### **Componentes**
```
src/components/tasks/
â”œâ”€â”€ AddTaskModal.tsx     # Modal para criar/editar tarefas
â””â”€â”€ TaskItem.tsx         # Componente individual de tarefa
```

### **IntegraÃ§Ã£o com ComentÃ¡rios**
```
src/components/comments/
â”œâ”€â”€ CommentsList.tsx           # Lista de comentÃ¡rios com CTAs
â”œâ”€â”€ CommentContentRenderer.tsx # Renderiza tarefas nos comentÃ¡rios
â””â”€â”€ AttachmentCard.tsx         # Card de anexo com botÃ£o de tarefa
```

### **Tipos TypeScript**
```
src/types/tasks.ts
```
- **Interfaces**: `Task`, `CreateTaskInput`
- **Status**: `'pending'` | `'completed'`

---

## ðŸ—„ï¸ **LocalizaÃ§Ã£o no Backend**

### **Tabela Principal**
```sql
-- Tabela: card_tasks
CREATE TABLE public.card_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id) NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  deadline timestamptz,
  comment_id uuid REFERENCES public.card_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deleted_at timestamptz,  -- Soft delete
  deleted_by uuid REFERENCES public.profiles(id)  -- Soft delete
);
```

### **Arquivo de Setup**
```
supabase/setup-tasks-system.sql
```
- **FunÃ§Ãµes**: `get_card_tasks()`, `update_task_status()`
- **Triggers**: Auto-atualizaÃ§Ã£o de timestamps
- **RLS Policies**: Controle de acesso baseado em roles

---

## âš™ï¸ **Como Funciona**

### **Fluxo de CriaÃ§Ã£o de Tarefa**
1. **UsuÃ¡rio clica** em "Adicionar Tarefa" no campo de comentÃ¡rios
2. **Modal abre** (`AddTaskModal`) com campos:
   - **De**: Auto-preenchido com usuÃ¡rio atual
   - **Para**: Dropdown com colaboradores disponÃ­veis
   - **DescriÃ§Ã£o**: Campo de texto obrigatÃ³rio
   - **Prazo**: Campo opcional de data
3. **Frontend chama** `createTask()` do hook `useTasks`
4. **Backend salva** na tabela `card_tasks`
5. **Tarefa aparece** na conversa encadeada com Ã­cone de checkbox

### **Fluxo de EdiÃ§Ã£o de Tarefa**
1. **UsuÃ¡rio clica** nos 3 pontos da tarefa criada
2. **Modal abre** em modo de ediÃ§Ã£o
3. **Campos prÃ©-preenchidos** com dados atuais
4. **BotÃµes mudam** para "Descartar AlteraÃ§Ãµes" e "Salvar AlteraÃ§Ãµes"
5. **ValidaÃ§Ã£o de mudanÃ§as** ao tentar fechar modal

### **Fluxo de ConclusÃ£o**
1. **UsuÃ¡rio clica** no checkbox da tarefa
2. **AtualizaÃ§Ã£o otimista** (UI responde instantaneamente)
3. **Backend atualiza** status para 'completed'
4. **Visual muda** para riscado e verde

---

## ðŸ“Š **Estrutura de Dados**

### **Interface Task**
```typescript
interface Task {
  id: string;
  card_id: string;
  created_by: string;
  assigned_to: string;
  description: string;
  status: 'pending' | 'completed';
  deadline?: string;
  comment_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  created_by_name: string;
  assigned_to_name: string;
}
```

### **Interface CreateTaskInput**
```typescript
interface CreateTaskInput {
  card_id: string;
  assigned_to: string;
  description: string;
  deadline?: string;
}
```

---

## ðŸš¨ **Regras de NegÃ³cio**

### **PermissÃµes de CriaÃ§Ã£o**
- **Vendedores**: Podem criar tarefas para Analistas e Outros Vendedores
- **Analistas**: Podem criar tarefas para Vendedores e Outros Analistas  
- **Gestores**: Podem criar tarefas para todos

### **PermissÃµes de EdiÃ§Ã£o**
- **Vendedores e Analistas**: SÃ³ editam tarefas que criaram
- **Gestores**: Editam qualquer tarefa

### **PermissÃµes de ConclusÃ£o**
- **Qualquer usuÃ¡rio autenticado**: Pode marcar/desmarcar qualquer tarefa
- **Sem RLS**: AÃ§Ã£o de checkbox nÃ£o tem restriÃ§Ãµes de role

### **Soft Delete**
- **Tarefas deletadas**: Marcadas com `deleted_at` e `deleted_by`
- **RetenÃ§Ã£o**: 90 dias antes de exclusÃ£o permanente
- **Auditoria**: Log em tabela `deletion_log`

---

## ðŸ” **FunÃ§Ãµes Principais**

### **useTasks Hook**
```typescript
const {
  tasks,              // Lista de tarefas
  isLoading,          // Estado de carregamento
  error,              // Erros
  loadTasks,          // Recarregar tarefas
  createTask,         // Criar nova tarefa
  updateTaskStatus,   // Marcar como concluÃ­da/pendente
  updateTask,         // Editar tarefa completa
  deleteTask,         // Soft delete da tarefa
} = useTasks(userId?, cardId?);
```

### **Filtros na PÃ¡gina Tarefas**
- **Hoje**: Tarefas com prazo para hoje
- **Semana**: Tarefas com prazo nesta semana
- **Todas**: Todas as tarefas do usuÃ¡rio

---

## ðŸ› **Troubleshooting**

### **Tarefas nÃ£o aparecem**
- **Causa**: Tabela `card_tasks` nÃ£o existe
- **SoluÃ§Ã£o**: Executar `supabase/setup-tasks-system.sql`

### **Erro ao criar tarefa**
- **Causa**: RLS policy bloqueando inserÃ§Ã£o
- **SoluÃ§Ã£o**: Verificar permissÃµes do usuÃ¡rio

### **Checkbox nÃ£o funciona**
- **Causa**: RLS policy muito restritiva
- **SoluÃ§Ã£o**: Verificar polÃ­tica de UPDATE na tabela

### **Modal nÃ£o abre para editar**
- **Causa**: UsuÃ¡rio nÃ£o tem permissÃ£o para editar
- **SoluÃ§Ã£o**: Verificar `canEditTask()` no frontend

---

## ðŸ“ **Exemplo de Uso**

### **Criar Tarefa**
```typescript
const { createTask } = useTasks();

await createTask({
  card_id: 'uuid-do-card',
  assigned_to: 'uuid-do-usuario',
  description: 'Validar documentaÃ§Ã£o do cliente',
  deadline: '2025-01-15T10:00:00Z'
}, commentId);
```

### **Marcar como ConcluÃ­da**
```typescript
const { updateTaskStatus } = useTasks();

await updateTaskStatus(taskId, 'completed');
```

### **Editar Tarefa**
```typescript
const { updateTask } = useTasks();

await updateTask(taskId, {
  description: 'Nova descriÃ§Ã£o',
  assigned_to: 'novo-usuario-id',
  deadline: '2025-01-20T15:00:00Z'
});
```

---

## ðŸŽ¨ **Interface do UsuÃ¡rio**

### **PÃ¡gina Tarefas**
- **Header**: "Minhas Tarefas" com filtros [Hoje] [Semana] [Todas]
- **Contadores**: Tarefas pendentes e concluÃ­das hoje
- **Tabela**: Checkbox, Tarefa, Card Origem, Criado Por, Status, Prazo, Ãšltima AtualizaÃ§Ã£o
- **BotÃ£o "Ir"**: Abre modal "Editar Ficha" do card original

### **Modal Criar Tarefa**
- **Campos com bordas verdes**: De, Para, DescriÃ§Ã£o, Prazo
- **Placeholders verdes**: Texto de ajuda
- **BotÃµes**: Cancelar (cinza) e Criar Tarefa (verde)

### **Modal Editar Tarefa**
- **Campos prÃ©-preenchidos**: Dados atuais da tarefa
- **BotÃµes diferentes**: "Descartar AlteraÃ§Ãµes" e "Salvar AlteraÃ§Ãµes"
- **ValidaÃ§Ã£o de mudanÃ§as**: Dialog ao fechar com alteraÃ§Ãµes

### **Tarefa na Conversa**
- **Ãcone checkbox**: Marcar/desmarcar tarefa
- **Texto riscado**: Quando concluÃ­da
- **Cor verde**: Status concluÃ­do
- **3 pontos**: Menu com opÃ§Ã£o "Editar"

---

## ðŸ”® **Melhorias Futuras**
1. **NotificaÃ§Ãµes**: Avisar quando tarefa Ã© atribuÃ­da/concluÃ­da
2. **Prioridades**: Sistema de prioridades (baixa, mÃ©dia, alta)
3. **Categorias**: Tags ou categorias para organizar tarefas
4. **Templates**: Templates de tarefas comuns
5. **RelatÃ³rios**: MÃ©tricas de produtividade e tempo
6. **IntegraÃ§Ã£o**: SincronizaÃ§Ã£o com calendÃ¡rio externo

---

## ðŸ“‹ **CÃ³digo Fonte**

### **Hook useTasks - FunÃ§Ã£o Principal**
```typescript
export function useTasks(userId?: string, cardId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  // Carregar tarefas com JOIN para nomes
  const loadTasks = async () => {
    const { data } = await supabase
      .from('card_tasks')
      .select(`
        *,
        created_by_profile:profiles!card_tasks_created_by_fkey(full_name),
        assigned_to_profile:profiles!card_tasks_assigned_to_fkey(full_name)
      `)
      .eq('deleted_at', null)
      .order('created_at', { ascending: false });
    
    setTasks(data || []);
  };

  // Criar tarefa com validaÃ§Ã£o
  const createTask = async (input: CreateTaskInput) => {
    const { data, error } = await supabase
      .from('card_tasks')
      .insert({
        ...input,
        created_by: profile.id,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  // AtualizaÃ§Ã£o otimista do status
  const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed') => {
    // 1. AtualizaÃ§Ã£o otimista (UI instantÃ¢nea)
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
    
    // 2. Salvar no banco (sem bloquear UI)
    const { error } = await supabase
      .from('card_tasks')
      .update({ 
        status, 
        completed_at: status === 'completed' ? new Date().toISOString() : null 
      })
      .eq('id', taskId);
    
    if (error) throw error;
  };

  return { tasks, isLoading, error, loadTasks, createTask, updateTaskStatus };
}
```

### **SQL - Setup da Tabela**
```sql
-- Criar tabela de tarefas
CREATE TABLE public.card_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id) NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  deadline timestamptz,
  comment_id uuid REFERENCES public.card_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id)
);

-- RLS Policies
CREATE POLICY "card_tasks_select_all" ON public.card_tasks
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "card_tasks_insert_authenticated" ON public.card_tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "card_tasks_update_authenticated" ON public.card_tasks
  FOR UPDATE USING (auth.role() = 'authenticated');
```

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Sistema de ComentÃ¡rios, Sistema de Anexos, FunÃ§Ã£o Ingressar
