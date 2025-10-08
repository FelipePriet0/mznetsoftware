# Sistema de Tarefas - MZNET

## ðŸ“‹ VisÃ£o Geral

O Sistema de Tarefas permite que colaboradores atribuam tarefas uns aos outros relacionadas aos cards do Kanban. Este documento descreve a implementaÃ§Ã£o completa do frontend e as instruÃ§Ãµes para configurar o backend.

---

## âœ… Funcionalidades Implementadas

### 1. **Adicionar Tarefa (CTA no Card)**

- **LocalizaÃ§Ã£o**: 
  - BotÃ£o "Adicionar Tarefa" na seÃ§Ã£o de comentÃ¡rios de cada card
  - BotÃ£o "Criar Tarefa" dentro do campo de resposta de conversas encadeadas (ao lado do botÃ£o Anexo)
  
- **Funcionalidade**: 
  - Abre modal lateral para criar tarefa
  - Campos:
    - **De:** Nome do criador (auto-preenchido, nÃ£o editÃ¡vel)
    - **Para:** SeleÃ§Ã£o de colaborador com base em permissÃµes
    - **DescriÃ§Ã£o da Tarefa:** Campo de texto livre
    - **Prazo:** Data/hora opcional
  - **Cria automaticamente uma conversa encadeada** com a tarefa (igual ao sistema de anexos)
  - A tarefa aparece como uma mensagem especial com Ã­cone de check azul
  - NotificaÃ§Ã£o automÃ¡tica para o colaborador atribuÃ­do

### 2. **PÃ¡gina de Tarefas (Minhas Tarefas)**

- **LocalizaÃ§Ã£o**: `/tarefas` na sidebar (acima do Kanban)
- **Recursos**:
  - Filtros: Hoje | Semana | Todas
  - Contadores: Tarefas A Fazer | Tarefas ConcluÃ­das Hoje
  - Listagem com:
    - Checkbox para marcar como concluÃ­da
    - DescriÃ§Ã£o da tarefa
    - Card de origem (clicÃ¡vel)
    - Criado por
    - Status
    - Prazo (com indicador de atraso)
    - Ãšltima atualizaÃ§Ã£o
  - Tarefas agrupadas por status (A Fazer | ConcluÃ­das)
  - BotÃ£o de deletar tarefa

---

## ðŸŽ¨ Componentes Criados

### Frontend

```
src/
â”œâ”€â”€ types/
â”‚   â””â”€â”€ tasks.ts                      # Tipos TypeScript para tarefas
â”œâ”€â”€ hooks/
â”‚   â””â”€â”€ useTasks.ts                   # Hook para gerenciar tarefas
â”œâ”€â”€ components/
â”‚   â””â”€â”€ tasks/
â”‚       â”œâ”€â”€ AddTaskModal.tsx          # Modal para adicionar tarefa
â”‚       â””â”€â”€ TaskItem.tsx              # Item de tarefa na listagem
â”œâ”€â”€ pages/
â”‚   â””â”€â”€ Tarefas.tsx                   # PÃ¡gina principal de tarefas
```

### Arquivos Modificados

- `src/components/comments/CommentsList.tsx` - BotÃ£o "Adicionar Tarefa"
- `src/App.tsx` - Rota `/tarefas`
- `src/components/app-sidebar.tsx` - Item "Tarefas" na sidebar

---

## ðŸ”§ ConfiguraÃ§Ã£o do Backend

### Passo 1: Executar o SQL no Supabase

1. Acesse o **Supabase Dashboard**
2. VÃ¡ em **SQL Editor**
3. Abra o arquivo `supabase/setup-tasks-system.sql`
4. Copie todo o conteÃºdo
5. Cole no SQL Editor
6. Clique em **Run** para executar

O script irÃ¡:
- âœ… Criar a tabela `card_tasks`
- âœ… Criar Ã­ndices para performance
- âœ… Configurar triggers automÃ¡ticos
- âœ… Habilitar RLS (Row Level Security)
- âœ… Criar policies de seguranÃ§a
- âœ… Criar funÃ§Ãµes auxiliares

### Passo 2: Verificar a InstalaÃ§Ã£o

ApÃ³s executar o SQL, vocÃª deverÃ¡ ver as seguintes mensagens:

```
NOTICE:  âœ“ Tabela card_tasks criada com sucesso
NOTICE:  âœ“ RLS habilitado na tabela card_tasks
NOTICE:  âœ“ 4 policies criadas com sucesso
NOTICE:  ===================================
NOTICE:  âœ“ SISTEMA DE TAREFAS CONFIGURADO!
NOTICE:  ===================================
```

---

## ðŸ’¬ IntegraÃ§Ã£o com Conversas Encadeadas

O sistema de tarefas estÃ¡ **totalmente integrado** com o sistema de comentÃ¡rios, seguindo exatamente a mesma lÃ³gica do sistema de anexos:

### Como Funciona

1. **Ao criar uma tarefa**, o sistema:
   - âœ… Cria automaticamente um **comentÃ¡rio** com os detalhes da tarefa
   - âœ… Vincula a tarefa ao comentÃ¡rio atravÃ©s do `comment_id`
   - âœ… Exibe a tarefa como uma **mensagem especial** com design diferenciado
   - âœ… Permite criar tarefas dentro de conversas jÃ¡ existentes (como respostas)

2. **VisualizaÃ§Ã£o da Tarefa no Card**:
   - Aparece como uma mensagem com **Ã­cone de check azul** (CheckCircle)
   - Background azul claro para destaque
   - Mostra: Para quem, DescriÃ§Ã£o e Prazo (se houver)
   - MantÃ©m a hierarquia da conversa encadeada

3. **CTAs DisponÃ­veis**:
   - **"Adicionar Tarefa"** - Cria nova conversa com a tarefa
   - **Ãcone de tarefa no campo de resposta** - Cria tarefa dentro da conversa atual
   - Ambos funcionam da mesma forma, apenas mudam o contexto (nova thread vs reply)

---

## ðŸ” Regras de PermissÃ£o (RLS)

### Criar Tarefas (INSERT)

| Role      | Pode criar para                           |
|-----------|-------------------------------------------|
| Vendedor  | Analistas e Outros Vendedores            |
| Analista  | Vendedores e Outros Analistas            |
| Gestor    | Todos os colaboradores                   |

**RestriÃ§Ãµes:**
- NÃ£o pode criar tarefa para si mesmo
- Deve ter acesso ao card relacionado

### Visualizar Tarefas (SELECT)

UsuÃ¡rios podem ver:
- Tarefas que criaram
- Tarefas atribuÃ­das a eles
- Tarefas relacionadas a cards que tÃªm acesso

### Atualizar Tarefas (UPDATE)

- **Criador**: Pode editar todos os campos
- **ResponsÃ¡vel**: Pode apenas marcar como concluÃ­da

### Deletar Tarefas (DELETE)

- Apenas quem criou a tarefa pode deletÃ¡-la

---

## ðŸ“Š Estrutura da Tabela

```sql
card_tasks
â”œâ”€â”€ id                UUID (PK)
â”œâ”€â”€ card_id           UUID (FK â†’ fichas_comerciais)
â”œâ”€â”€ created_by        UUID (FK â†’ profiles)
â”œâ”€â”€ assigned_to       UUID (FK â†’ profiles)
â”œâ”€â”€ description       TEXT
â”œâ”€â”€ status            TEXT ('pending' | 'completed')
â”œâ”€â”€ deadline          TIMESTAMPTZ (opcional)
â”œâ”€â”€ comment_id        UUID (FK â†’ card_comments) - Conversa encadeada
â”œâ”€â”€ created_at        TIMESTAMPTZ
â”œâ”€â”€ updated_at        TIMESTAMPTZ (auto-atualizado)
â””â”€â”€ completed_at      TIMESTAMPTZ (auto-atualizado)
```

---

## ðŸ”„ Triggers AutomÃ¡ticos

1. **update_card_tasks_updated_at**
   - Atualiza `updated_at` automaticamente em cada UPDATE

2. **update_task_completed_at_trigger**
   - Define `completed_at` quando status muda para 'completed'
   - Limpa `completed_at` quando status volta para 'pending'

3. **set_task_created_by_trigger**
   - Define `created_by` automaticamente com o usuÃ¡rio autenticado

---

## ðŸ§ª Testando o Sistema

### 1. Criar uma Tarefa

1. Abra um card no Kanban
2. Na seÃ§Ã£o de comentÃ¡rios, clique em **"Adicionar Tarefa"**
3. Selecione um colaborador no campo **"Para:"**
4. Descreva a tarefa
5. (Opcional) Defina um prazo
6. Clique em **"Criar Tarefa"**

### 2. Visualizar Tarefas

1. Clique em **"Tarefas"** na sidebar
2. Veja suas tarefas pendentes e concluÃ­das
3. Use os filtros para ver tarefas de Hoje, Semana ou Todas

### 3. Marcar como ConcluÃ­da

1. Na pÃ¡gina de Tarefas, clique no checkbox da tarefa
2. A tarefa serÃ¡ movida para a seÃ§Ã£o "ConcluÃ­das"

### 4. Deletar uma Tarefa

1. Passe o mouse sobre uma tarefa
2. Clique no Ã­cone de lixeira
3. Confirme a exclusÃ£o

---

## ðŸ› ï¸ FunÃ§Ãµes Auxiliares

### get_user_task_stats(user_id UUID)

Retorna estatÃ­sticas de tarefas de um usuÃ¡rio:

```json
{
  "total": 10,
  "pending": 5,
  "completed": 5,
  "overdue": 2
}
```

### get_card_tasks(card_id UUID)

Retorna todas as tarefas de um card com informaÃ§Ãµes dos usuÃ¡rios.

---

## ðŸŽ¯ PrÃ³ximos Passos

ApÃ³s configurar o backend:

1. âœ… Execute o SQL no Supabase
2. âœ… Verifique se nÃ£o hÃ¡ erros
3. âœ… Teste a criaÃ§Ã£o de tarefas
4. âœ… Teste as permissÃµes entre diferentes roles
5. âœ… Verifique as notificaÃ§Ãµes

---

## ðŸ› Troubleshooting

### "Table card_tasks does not exist"
- Execute o SQL `supabase/setup-tasks-system.sql`

### "Permission denied"
- Verifique se o RLS estÃ¡ habilitado
- Verifique se as policies foram criadas corretamente
- Confirme que o usuÃ¡rio tem um role vÃ¡lido em `profiles`

### "Cannot create task"
- Verifique as permissÃµes do seu role
- Confirme que vocÃª nÃ£o estÃ¡ tentando criar tarefa para si mesmo
- Verifique se o card existe

---

## ðŸ“ Notas Importantes

- **UsuÃ¡rios nÃ£o podem criar tarefas para si mesmos**
- **Tarefas sÃ£o vinculadas a cards** - ao deletar um card, suas tarefas sÃ£o deletadas (CASCADE)
- **Apenas o criador pode deletar** uma tarefa
- **O responsÃ¡vel sÃ³ pode marcar como concluÃ­da**, nÃ£o pode editar outros campos
- **Todos os campos de auditoria sÃ£o automÃ¡ticos** (created_at, updated_at, completed_at)

---

## ðŸ“ž Suporte

Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Supabase Dashboard â†’ Logs
3. SQL Editor â†’ Executar queries de teste

