# ðŸ’¬ DocumentaÃ§Ã£o: Sistema de ComentÃ¡rios

## ðŸŽ¯ **VisÃ£o Geral**
O Sistema de ComentÃ¡rios permite comunicaÃ§Ã£o hierÃ¡rquica e contextual dentro das fichas do Kanban. Suporta conversas encadeadas, anexos, tarefas e menÃ§Ãµes (@usuario) com notificaÃ§Ãµes automÃ¡ticas.

---

## ðŸ”§ **LocalizaÃ§Ã£o no Frontend**

### **Hook Principal**
```
src/hooks/useComments.ts
```
- **FunÃ§Ã£o**: Gerenciamento completo de comentÃ¡rios
- **OperaÃ§Ãµes**: Create, Read, Update, Delete (CRUD)
- **Recursos**: Hierarquia, thread_id, soft delete, notificaÃ§Ãµes

### **Componentes Principais**
```
src/components/comments/
â”œâ”€â”€ CommentsList.tsx              # Lista principal de comentÃ¡rios
â”œâ”€â”€ CommentItem.tsx               # Item individual de comentÃ¡rio
â”œâ”€â”€ CommentContentRenderer.tsx    # RenderizaÃ§Ã£o de conteÃºdo
â””â”€â”€ AttachmentCard.tsx            # Card de anexo integrado
```

### **Interfaces TypeScript**
```typescript
interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  level: number;
  threadId?: string;
}

interface CreateCommentData {
  cardId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  parentId?: string;
  level: number;
  threadId?: string;
}
```

---

## ðŸ—„ï¸ **LocalizaÃ§Ã£o no Backend**

### **Tabela Principal**
```sql
-- Tabela: card_comments
CREATE TABLE public.card_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  author_name text NOT NULL,
  author_role text,
  content text NOT NULL,
  parent_id uuid REFERENCES public.card_comments(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 0,
  thread_id uuid REFERENCES public.card_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,  -- Soft delete
  deleted_by uuid REFERENCES public.profiles(id)  -- Soft delete
);
```

### **Arquivos de Setup**
```
supabase/
â”œâ”€â”€ enhance-hierarchical-comments.sql
â”œâ”€â”€ fix-card-comments-complete.sql
â””â”€â”€ implement-soft-delete.sql
```

---

## âš™ï¸ **Como Funciona**

### **Fluxo de CriaÃ§Ã£o de ComentÃ¡rio**
1. **UsuÃ¡rio digita** no campo "ObservaÃ§Ãµes e Conversas"
2. **Sistema detecta** se Ã© comentÃ¡rio principal ou resposta
3. **ValidaÃ§Ãµes**:
   - ConteÃºdo nÃ£o pode ser vazio
   - MÃ¡ximo 7 nÃ­veis de hierarquia
   - Thread_id mantÃ©m conversas organizadas
4. **CriaÃ§Ã£o**:
   - ComentÃ¡rio salvo na tabela `card_comments`
   - NotificaÃ§Ãµes enviadas para menÃ§Ãµes (@usuario)
   - UI atualizada em tempo real

### **Fluxo de Resposta (Conversas Encadeadas)**
1. **UsuÃ¡rio clica** em "Responder" em um comentÃ¡rio
2. **Campo de resposta** aparece abaixo do comentÃ¡rio
3. **Sistema calcula**:
   - `level`: nÃ­vel do pai + 1
   - `thread_id`: mantÃ©m mesmo thread do pai
   - `parent_id`: referÃªncia ao comentÃ¡rio pai
4. **Limite**: MÃ¡ximo 7 nÃ­veis de profundidade

### **Fluxo de ExclusÃ£o (Soft Delete)**
1. **UsuÃ¡rio clica** nos 3 pontos â†’ "Excluir"
2. **ConfirmaÃ§Ã£o** aparece
3. **Sistema marca** `deleted_at` e `deleted_by`
4. **Recarregamento** completo do banco (ignora cache local)
5. **ComentÃ¡rio desaparece** da UI

---

## ðŸ“Š **Estrutura de Dados**

### **Hierarquia de ComentÃ¡rios**
```
ComentÃ¡rio Principal (level: 0, thread_id: prÃ³prio_id)
â”œâ”€â”€ Resposta 1 (level: 1, thread_id: id_principal, parent_id: id_principal)
â”‚   â”œâ”€â”€ Resposta 1.1 (level: 2, thread_id: id_principal, parent_id: id_resposta1)
â”‚   â””â”€â”€ Resposta 1.2 (level: 2, thread_id: id_principal, parent_id: id_resposta1)
â””â”€â”€ Resposta 2 (level: 1, thread_id: id_principal, parent_id: id_principal)
    â””â”€â”€ Resposta 2.1 (level: 2, thread_id: id_principal, parent_id: id_resposta2)
```

### **Thread ID**
- **ComentÃ¡rio Principal**: `thread_id = id` (prÃ³prio ID)
- **Respostas**: `thread_id = thread_id` do comentÃ¡rio pai
- **BenefÃ­cio**: Agrupa toda a conversa para filtros e organizaÃ§Ã£o

### **NÃ­veis MÃ¡ximos**
- **Limite**: 7 nÃ­veis de profundidade
- **ValidaÃ§Ã£o**: Sistema impede criar resposta se `level >= 7`
- **Motivo**: Evitar conversas muito profundas e complexas

---

## ðŸš¨ **Regras de NegÃ³cio**

### **PermissÃµes**
- **Criar**: Qualquer usuÃ¡rio autenticado
- **Editar**: Apenas o autor do comentÃ¡rio
- **Deletar**: Apenas o autor do comentÃ¡rio
- **Visualizar**: Todos os usuÃ¡rios autenticados

### **ValidaÃ§Ãµes**
- **ConteÃºdo**: NÃ£o pode ser vazio
- **NÃ­veis**: MÃ¡ximo 7 nÃ­veis de profundidade
- **Thread**: Deve manter consistÃªncia do thread_id
- **Parent**: Deve referenciar comentÃ¡rio pai vÃ¡lido

### **Soft Delete**
- **ExclusÃ£o**: Marca `deleted_at` e `deleted_by`
- **RetenÃ§Ã£o**: 90 dias antes de exclusÃ£o permanente
- **Auditoria**: Log em `deletion_log`
- **Cascata**: Deleta respostas quando pai Ã© deletado

### **NotificaÃ§Ãµes**
- **MenÃ§Ãµes**: Detecta @usuario no conteÃºdo
- **Respostas**: Notifica autor do comentÃ¡rio pai
- **Sistema**: Toast notifications no frontend

---

## ðŸ” **FunÃ§Ãµes Principais**

### **useComments Hook**
```typescript
const {
  comments,          // Lista de comentÃ¡rios
  isLoading,         // Estado de carregamento
  error,             // Erros
  loadComments,      // Recarregar comentÃ¡rios
  createComment,     // Criar novo comentÃ¡rio
  updateComment,     // Editar comentÃ¡rio
  deleteComment,     // Soft delete do comentÃ¡rio
  replyToComment     // Criar resposta
} = useComments(cardId);
```

### **FunÃ§Ãµes de NotificaÃ§Ã£o**
- **`extractMentions()`**: Extrai @menÃ§Ãµes do texto
- **`sendNotifications()`**: Envia notificaÃ§Ãµes para usuÃ¡rios

### **FunÃ§Ãµes de Hierarquia**
- **`replyToComment()`**: Cria resposta com level correto
- **`thread_id`**: MantÃ©m conversas organizadas
- **ValidaÃ§Ã£o de nÃ­veis**: Impede conversas muito profundas

---

## ðŸ› **Troubleshooting**

### **ComentÃ¡rio nÃ£o aparece**
- **Causa**: Tabela `card_comments` nÃ£o existe
- **SoluÃ§Ã£o**: Executar scripts de setup do sistema

### **Erro ao criar resposta**
- **Causa**: Limite de 7 nÃ­veis atingido
- **SoluÃ§Ã£o**: Verificar `level` do comentÃ¡rio pai

### **ComentÃ¡rio deletado reaparece**
- **Causa**: Cache local nÃ£o foi limpo
- **SoluÃ§Ã£o**: `loadComments()` forÃ§a recarregamento do banco

### **Thread_id incorreto**
- **Causa**: Coluna `thread_id` nÃ£o existe no banco
- **SoluÃ§Ã£o**: Sistema usa fallback (prÃ³prio ID)

---

## ðŸ“ **Exemplo de Uso**

### **Criar ComentÃ¡rio Principal**
```typescript
const { createComment } = useComments(cardId);

await createComment({
  cardId: 'uuid-do-card',
  authorId: 'uuid-do-usuario',
  authorName: 'JoÃ£o Silva',
  authorRole: 'analista',
  content: 'Preciso validar documentaÃ§Ã£o do cliente @maria',
  level: 0,
  threadId: undefined // SerÃ¡ definido como o ID do comentÃ¡rio
});
```

### **Criar Resposta**
```typescript
const { replyToComment } = useComments(cardId);

await replyToComment(
  parentCommentId,
  'DocumentaÃ§Ã£o estÃ¡ completa, @joao',
  currentUserId,
  currentUserName,
  currentUserRole
);
```

### **Deletar ComentÃ¡rio**
```typescript
const { deleteComment } = useComments(cardId);

await deleteComment(commentId);
```

---

## ðŸŽ¨ **Interface do UsuÃ¡rio**

### **Campo Principal**
- **Placeholder**: "Use @ menÃ§Ãµes para marcar Colaboradores"
- **Cor**: Verde primÃ¡ria
- **PosiÃ§Ã£o**: PrÃ³ximo Ã  borda esquerda

### **CTAs DisponÃ­veis**
- **"Anexo"**: Upload de arquivos (botÃ£o verde)
- **"Adicionar Tarefa"**: CriaÃ§Ã£o de tarefas (botÃ£o verde)
- **EspaÃ§amento**: Pequeno entre os botÃµes

### **ComentÃ¡rios**
- **Avatar**: Foto do usuÃ¡rio
- **Nome**: Nome do autor
- **Data**: Timestamp formatado
- **ConteÃºdo**: Texto com suporte a quebras de linha
- **AÃ§Ãµes**: Responder, Editar, Excluir (3 pontos)

### **Respostas**
- **IndentaÃ§Ã£o**: Visual hierÃ¡rquico
- **NÃ­veis**: AtÃ© 7 nÃ­veis de profundidade
- **Thread**: Agrupamento visual por conversa

---

## ðŸ”— **IntegraÃ§Ã£o com Outros Sistemas**

### **Sistema de Anexos**
- **CTA "Anexo"**: No campo de comentÃ¡rios
- **Anexos**: Aparecem dentro dos comentÃ¡rios
- **Fallback**: Sistema busca anexos por padrÃ£o

### **Sistema de Tarefas**
- **CTA "Adicionar Tarefa"**: No campo de comentÃ¡rios
- **Tarefas**: Aparecem como cards nos comentÃ¡rios
- **EdiÃ§Ã£o**: 3 pontos para editar tarefa

### **Sistema de NotificaÃ§Ãµes**
- **@menÃ§Ãµes**: Detecta e notifica usuÃ¡rios
- **Respostas**: Notifica autor do comentÃ¡rio pai
- **Toast**: Feedback visual no frontend

---

## ðŸ”® **Melhorias Futuras**
1. **NotificaÃ§Ãµes push**: IntegraÃ§Ã£o com service workers
2. **Mencionar por email**: NotificaÃ§Ãµes por email
3. **ReaÃ§Ãµes**: Emojis para comentÃ¡rios
4. **Busca**: Buscar em comentÃ¡rios
5. **FormataÃ§Ã£o**: Markdown ou rich text
6. **Anexos inline**: Preview de imagens
7. **TÃ³picos**: OrganizaÃ§Ã£o por tÃ³picos
8. **ModeraÃ§Ã£o**: Sistema de moderaÃ§Ã£o automÃ¡tica

---

## ðŸ“‹ **CÃ³digo Fonte**

### **Hook useComments - Criar ComentÃ¡rio**
```typescript
const createComment = async (data: CreateCommentData) => {
  try {
    // Preparar dados para inserÃ§Ã£o
    const insertData = {
      card_id: data.cardId,
      author_id: data.authorId,
      author_name: data.authorName,
      author_role: data.authorRole,
      content: data.content,
      parent_id: data.parentId || null,
      level: data.level,
      thread_id: data.threadId || null
    };
    
    // Inserir no banco
    const { data: result, error } = await supabase
      .from('card_comments')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Mapear resultado
    const newComment: Comment = {
      id: result.id,
      cardId: result.card_id,
      authorId: result.author_id,
      authorName: result.author_name,
      authorRole: result.author_role,
      content: result.content,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      parentId: result.parent_id,
      level: result.level,
      threadId: result.thread_id || result.id
    };
    
    // Atualizar estado local
    setComments(prev => [...prev, newComment]);
    
    // Enviar notificaÃ§Ãµes
    await sendNotifications(data.content, data.authorId);
    
    return newComment;
  } catch (error) {
    console.error('Error creating comment:', error);
    return null;
  }
};
```

### **Criar Resposta com ValidaÃ§Ã£o de NÃ­veis**
```typescript
const replyToComment = async (parentId: string, content: string, authorId: string, authorName: string, authorRole?: string) => {
  const parentComment = comments.find(c => c.id === parentId);
  if (!parentComment) throw new Error('ComentÃ¡rio pai nÃ£o encontrado');
  
  // Verificar limite de nÃ­veis
  const MAX_LEVEL = 7;
  const newLevel = parentComment.level + 1;
  
  if (newLevel >= MAX_LEVEL) {
    throw new Error(`Limite mÃ¡ximo de ${MAX_LEVEL} respostas por conversa atingido`);
  }
  
  const threadId = parentComment.threadId || parentComment.id;
  
  return await createComment({
    cardId,
    authorId,
    authorName,
    authorRole,
    content,
    parentId,
    level: newLevel,
    threadId
  });
};
```

### **Soft Delete com Recarregamento**
```typescript
const deleteComment = async (commentId: string) => {
  try {
    // Deletar respostas primeiro (cascata)
    const childComments = comments.filter(c => c.parentId === commentId);
    for (const child of childComments) {
      await deleteComment(child.id);
    }
    
    // Soft delete do comentÃ¡rio principal
    const { error } = await supabase
      .from('card_comments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', commentId);
    
    if (error) throw error;
    
    // ForÃ§ar recarregamento do banco (ignorar cache)
    await loadComments();
    
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
};
```

### **SQL - Setup da Tabela**
```sql
-- Criar tabela de comentÃ¡rios
CREATE TABLE public.card_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  author_name text NOT NULL,
  author_role text,
  content text NOT NULL,
  parent_id uuid REFERENCES public.card_comments(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 0,
  thread_id uuid REFERENCES public.card_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id)
);

-- RLS Policies
CREATE POLICY "card_comments_select_all" ON public.card_comments
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "card_comments_insert_authenticated" ON public.card_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "card_comments_update_author" ON public.card_comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "card_comments_delete_author" ON public.card_comments
  FOR DELETE USING (auth.uid() = author_id);
```

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Sistema de Anexos, Sistema de Tarefas, Sistema de NotificaÃ§Ãµes
