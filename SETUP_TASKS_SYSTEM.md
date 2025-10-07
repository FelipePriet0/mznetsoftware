# Sistema de Tarefas - MZNET

## 📋 Visão Geral

O Sistema de Tarefas permite que colaboradores atribuam tarefas uns aos outros relacionadas aos cards do Kanban. Este documento descreve a implementação completa do frontend e as instruções para configurar o backend.

---

## ✅ Funcionalidades Implementadas

### 1. **Adicionar Tarefa (CTA no Card)**

- **Localização**: 
  - Botão "Adicionar Tarefa" na seção de comentários de cada card
  - Botão "Criar Tarefa" dentro do campo de resposta de conversas encadeadas (ao lado do botão Anexo)
  
- **Funcionalidade**: 
  - Abre modal lateral para criar tarefa
  - Campos:
    - **De:** Nome do criador (auto-preenchido, não editável)
    - **Para:** Seleção de colaborador com base em permissões
    - **Descrição da Tarefa:** Campo de texto livre
    - **Prazo:** Data/hora opcional
  - **Cria automaticamente uma conversa encadeada** com a tarefa (igual ao sistema de anexos)
  - A tarefa aparece como uma mensagem especial com ícone de check azul
  - Notificação automática para o colaborador atribuído

### 2. **Página de Tarefas (Minhas Tarefas)**

- **Localização**: `/tarefas` na sidebar (acima do Kanban)
- **Recursos**:
  - Filtros: Hoje | Semana | Todas
  - Contadores: Tarefas A Fazer | Tarefas Concluídas Hoje
  - Listagem com:
    - Checkbox para marcar como concluída
    - Descrição da tarefa
    - Card de origem (clicável)
    - Criado por
    - Status
    - Prazo (com indicador de atraso)
    - Última atualização
  - Tarefas agrupadas por status (A Fazer | Concluídas)
  - Botão de deletar tarefa

---

## 🎨 Componentes Criados

### Frontend

```
src/
├── types/
│   └── tasks.ts                      # Tipos TypeScript para tarefas
├── hooks/
│   └── useTasks.ts                   # Hook para gerenciar tarefas
├── components/
│   └── tasks/
│       ├── AddTaskModal.tsx          # Modal para adicionar tarefa
│       └── TaskItem.tsx              # Item de tarefa na listagem
├── pages/
│   └── Tarefas.tsx                   # Página principal de tarefas
```

### Arquivos Modificados

- `src/components/comments/CommentsList.tsx` - Botão "Adicionar Tarefa"
- `src/App.tsx` - Rota `/tarefas`
- `src/components/app-sidebar.tsx` - Item "Tarefas" na sidebar

---

## 🔧 Configuração do Backend

### Passo 1: Executar o SQL no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `supabase/setup-tasks-system.sql`
4. Copie todo o conteúdo
5. Cole no SQL Editor
6. Clique em **Run** para executar

O script irá:
- ✅ Criar a tabela `card_tasks`
- ✅ Criar índices para performance
- ✅ Configurar triggers automáticos
- ✅ Habilitar RLS (Row Level Security)
- ✅ Criar policies de segurança
- ✅ Criar funções auxiliares

### Passo 2: Verificar a Instalação

Após executar o SQL, você deverá ver as seguintes mensagens:

```
NOTICE:  ✓ Tabela card_tasks criada com sucesso
NOTICE:  ✓ RLS habilitado na tabela card_tasks
NOTICE:  ✓ 4 policies criadas com sucesso
NOTICE:  ===================================
NOTICE:  ✓ SISTEMA DE TAREFAS CONFIGURADO!
NOTICE:  ===================================
```

---

## 💬 Integração com Conversas Encadeadas

O sistema de tarefas está **totalmente integrado** com o sistema de comentários, seguindo exatamente a mesma lógica do sistema de anexos:

### Como Funciona

1. **Ao criar uma tarefa**, o sistema:
   - ✅ Cria automaticamente um **comentário** com os detalhes da tarefa
   - ✅ Vincula a tarefa ao comentário através do `comment_id`
   - ✅ Exibe a tarefa como uma **mensagem especial** com design diferenciado
   - ✅ Permite criar tarefas dentro de conversas já existentes (como respostas)

2. **Visualização da Tarefa no Card**:
   - Aparece como uma mensagem com **ícone de check azul** (CheckCircle)
   - Background azul claro para destaque
   - Mostra: Para quem, Descrição e Prazo (se houver)
   - Mantém a hierarquia da conversa encadeada

3. **CTAs Disponíveis**:
   - **"Adicionar Tarefa"** - Cria nova conversa com a tarefa
   - **Ícone de tarefa no campo de resposta** - Cria tarefa dentro da conversa atual
   - Ambos funcionam da mesma forma, apenas mudam o contexto (nova thread vs reply)

---

## 🔐 Regras de Permissão (RLS)

### Criar Tarefas (INSERT)

| Role      | Pode criar para                           |
|-----------|-------------------------------------------|
| Vendedor  | Analistas e Outros Vendedores            |
| Analista  | Vendedores e Outros Analistas            |
| Gestor    | Todos os colaboradores                   |

**Restrições:**
- Não pode criar tarefa para si mesmo
- Deve ter acesso ao card relacionado

### Visualizar Tarefas (SELECT)

Usuários podem ver:
- Tarefas que criaram
- Tarefas atribuídas a eles
- Tarefas relacionadas a cards que têm acesso

### Atualizar Tarefas (UPDATE)

- **Criador**: Pode editar todos os campos
- **Responsável**: Pode apenas marcar como concluída

### Deletar Tarefas (DELETE)

- Apenas quem criou a tarefa pode deletá-la

---

## 📊 Estrutura da Tabela

```sql
card_tasks
├── id                UUID (PK)
├── card_id           UUID (FK → fichas_comerciais)
├── created_by        UUID (FK → profiles)
├── assigned_to       UUID (FK → profiles)
├── description       TEXT
├── status            TEXT ('pending' | 'completed')
├── deadline          TIMESTAMPTZ (opcional)
├── comment_id        UUID (FK → card_comments) - Conversa encadeada
├── created_at        TIMESTAMPTZ
├── updated_at        TIMESTAMPTZ (auto-atualizado)
└── completed_at      TIMESTAMPTZ (auto-atualizado)
```

---

## 🔄 Triggers Automáticos

1. **update_card_tasks_updated_at**
   - Atualiza `updated_at` automaticamente em cada UPDATE

2. **update_task_completed_at_trigger**
   - Define `completed_at` quando status muda para 'completed'
   - Limpa `completed_at` quando status volta para 'pending'

3. **set_task_created_by_trigger**
   - Define `created_by` automaticamente com o usuário autenticado

---

## 🧪 Testando o Sistema

### 1. Criar uma Tarefa

1. Abra um card no Kanban
2. Na seção de comentários, clique em **"Adicionar Tarefa"**
3. Selecione um colaborador no campo **"Para:"**
4. Descreva a tarefa
5. (Opcional) Defina um prazo
6. Clique em **"Criar Tarefa"**

### 2. Visualizar Tarefas

1. Clique em **"Tarefas"** na sidebar
2. Veja suas tarefas pendentes e concluídas
3. Use os filtros para ver tarefas de Hoje, Semana ou Todas

### 3. Marcar como Concluída

1. Na página de Tarefas, clique no checkbox da tarefa
2. A tarefa será movida para a seção "Concluídas"

### 4. Deletar uma Tarefa

1. Passe o mouse sobre uma tarefa
2. Clique no ícone de lixeira
3. Confirme a exclusão

---

## 🛠️ Funções Auxiliares

### get_user_task_stats(user_id UUID)

Retorna estatísticas de tarefas de um usuário:

```json
{
  "total": 10,
  "pending": 5,
  "completed": 5,
  "overdue": 2
}
```

### get_card_tasks(card_id UUID)

Retorna todas as tarefas de um card com informações dos usuários.

---

## 🎯 Próximos Passos

Após configurar o backend:

1. ✅ Execute o SQL no Supabase
2. ✅ Verifique se não há erros
3. ✅ Teste a criação de tarefas
4. ✅ Teste as permissões entre diferentes roles
5. ✅ Verifique as notificações

---

## 🐛 Troubleshooting

### "Table card_tasks does not exist"
- Execute o SQL `supabase/setup-tasks-system.sql`

### "Permission denied"
- Verifique se o RLS está habilitado
- Verifique se as policies foram criadas corretamente
- Confirme que o usuário tem um role válido em `profiles`

### "Cannot create task"
- Verifique as permissões do seu role
- Confirme que você não está tentando criar tarefa para si mesmo
- Verifique se o card existe

---

## 📝 Notas Importantes

- **Usuários não podem criar tarefas para si mesmos**
- **Tarefas são vinculadas a cards** - ao deletar um card, suas tarefas são deletadas (CASCADE)
- **Apenas o criador pode deletar** uma tarefa
- **O responsável só pode marcar como concluída**, não pode editar outros campos
- **Todos os campos de auditoria são automáticos** (created_at, updated_at, completed_at)

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Supabase Dashboard → Logs
3. SQL Editor → Executar queries de teste

