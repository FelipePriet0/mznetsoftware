# ðŸª DocumentaÃ§Ã£o: Guia de Hooks Customizados

## ðŸŽ¯ **VisÃ£o Geral**
Este documento detalha todos os hooks customizados do sistema, explicando quando usar, como funcionam e exemplos prÃ¡ticos de implementaÃ§Ã£o.

---

## ðŸ“ **Estrutura de Hooks**

```
src/hooks/
â”œâ”€â”€ useAttachments.ts      # Gerenciamento de anexos
â”œâ”€â”€ useComments.ts         # Gerenciamento de comentÃ¡rios
â”œâ”€â”€ useTasks.ts            # Gerenciamento de tarefas
â”œâ”€â”€ use-current-user.ts    # UsuÃ¡rio atual
â”œâ”€â”€ use-toast.ts           # Sistema de notificaÃ§Ãµes
â”œâ”€â”€ use-mobile.tsx         # DetecÃ§Ã£o de mobile
â”œâ”€â”€ useDraftForm.ts        # Rascunhos de formulÃ¡rio (legacy)
â”œâ”€â”€ useDraftPersistence.ts # PersistÃªncia de rascunhos (desativado)
â””â”€â”€ useWeekNavigation.ts   # NavegaÃ§Ã£o de semanas (agendamento)
```

---

## ðŸ”§ **Hooks Principais**

### **1. useComments**
**LocalizaÃ§Ã£o**: `src/hooks/useComments.ts`

**Responsabilidade**: Gerenciar comentÃ¡rios hierÃ¡rquicos com soft delete

**Uso:**
```typescript
import { useComments } from '@/hooks/useComments';

const { 
  comments,        // Lista de comentÃ¡rios
  isLoading,       // Estado de carregamento
  error,           // Erros
  loadComments,    // Recarregar
  createComment,   // Criar novo
  updateComment,   // Editar
  deleteComment,   // Soft delete
  replyToComment   // Criar resposta
} = useComments(cardId);
```

**Interface:**
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
```

**Funcionalidades:**
- âœ… ComentÃ¡rios hierÃ¡rquicos (atÃ© 7 nÃ­veis)
- âœ… Thread ID para conversas organizadas
- âœ… Soft delete com `deleted_at`
- âœ… @menÃ§Ãµes com notificaÃ§Ãµes
- âœ… Recarregamento forÃ§ado do banco

**Exemplo:**
```typescript
// Criar comentÃ¡rio principal
await createComment({
  cardId: 'uuid-123',
  authorId: userId,
  authorName: userName,
  content: 'Preciso validar documentaÃ§Ã£o @maria',
  level: 0
});

// Criar resposta
await replyToComment(
  parentCommentId,
  'DocumentaÃ§Ã£o estÃ¡ OK!',
  userId,
  userName
);
```

---

### **2. useAttachments**
**LocalizaÃ§Ã£o**: `src/hooks/useAttachments.ts`

**Responsabilidade**: Gerenciar upload, download e exclusÃ£o de arquivos

**Uso:**
```typescript
import { useAttachments } from '@/hooks/useAttachments';

const { 
  attachments,       // Lista de anexos
  isLoading,         // Carregando
  isUploading,       // Upload em progresso
  uploadAttachment,  // Upload
  deleteAttachment,  // Soft delete
  getDownloadUrl,    // URL de download
  formatFileSize,    // Formatar tamanho
  getFileIcon        // Ãcone do arquivo
} = useAttachments(cardId);
```

**Interface:**
```typescript
interface CardAttachment {
  id: string;
  card_id: string;
  author_id: string;
  author_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_extension: string;
  description?: string;
  comment_id?: string;
  created_at: string;
}
```

**Funcionalidades:**
- âœ… Upload para Supabase Storage
- âœ… ValidaÃ§Ã£o de tipo e tamanho
- âœ… Path usando `card_id` (nunca muda)
- âœ… Busca inteligente de arquivos
- âœ… Soft delete com auditoria
- âœ… Preview e download

**Exemplo:**
```typescript
// Upload de arquivo
await uploadAttachment({
  file: selectedFile,
  description: 'Documento de identidade',
  customFileName: 'RG_Cliente_JoÃ£o',
  commentId: 'uuid-comment-123'
});

// Download
const url = await getDownloadUrl(attachment.file_path);
window.open(url, '_blank');

// Excluir (soft delete)
await deleteAttachment(attachmentId);
```

---

### **3. useTasks**
**LocalizaÃ§Ã£o**: `src/hooks/useTasks.ts`

**Responsabilidade**: Gerenciar tarefas com status e atribuiÃ§Ãµes

**Uso:**
```typescript
import { useTasks } from '@/hooks/useTasks';

const { 
  tasks,             // Lista de tarefas
  isLoading,         // Carregando
  error,             // Erros
  loadTasks,         // Recarregar
  createTask,        // Criar tarefa
  updateTaskStatus,  // Marcar como concluÃ­da
  updateTask,        // Editar completa
  deleteTask         // Soft delete
} = useTasks(userId?, cardId?);
```

**Interface:**
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

**Funcionalidades:**
- âœ… CriaÃ§Ã£o com atribuiÃ§Ã£o
- âœ… Checkbox de conclusÃ£o (sem RLS)
- âœ… EdiÃ§Ã£o por criador ou gestor
- âœ… Soft delete com auditoria
- âœ… AtualizaÃ§Ãµes otimistas
- âœ… IntegraÃ§Ã£o com comentÃ¡rios

**Exemplo:**
```typescript
// Criar tarefa
await createTask({
  card_id: cardId,
  assigned_to: userId,
  description: 'Validar contrato',
  deadline: '2025-01-15T10:00:00Z'
}, commentId);

// Marcar como concluÃ­da (qualquer um pode)
await updateTaskStatus(taskId, 'completed');

// Editar tarefa completa
await updateTask(taskId, {
  description: 'Nova descriÃ§Ã£o',
  deadline: '2025-01-20T15:00:00Z'
});
```

---

### **4. useCurrentUser**
**LocalizaÃ§Ã£o**: `src/hooks/use-current-user.ts`

**Responsabilidade**: Obter informaÃ§Ãµes do usuÃ¡rio atual

**Uso:**
```typescript
import { useCurrentUser } from '@/hooks/use-current-user';

const { 
  name,      // Nome do usuÃ¡rio
  profile    // Perfil completo
} = useCurrentUser();
```

**Funcionalidades:**
- âœ… Busca de `AuthContext`
- âœ… Fallback para localStorage
- âœ… SincronizaÃ§Ã£o automÃ¡tica

**Exemplo:**
```typescript
const { name, profile } = useCurrentUser();

console.log('UsuÃ¡rio:', name);
console.log('Role:', profile?.role);
console.log('Avatar:', profile?.avatar_url);
```

---

### **5. useToast**
**LocalizaÃ§Ã£o**: `src/hooks/use-toast.ts`

**Responsabilidade**: Sistema de notificaÃ§Ãµes toast

**Uso:**
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();
```

**Variantes:**
```typescript
// Sucesso (padrÃ£o)
toast({
  title: "Sucesso!",
  description: "OperaÃ§Ã£o concluÃ­da",
});

// Erro
toast({
  title: "Erro",
  description: "Algo deu errado",
  variant: "destructive",
});

// Com aÃ§Ã£o
toast({
  title: "Arquivo deletado",
  description: "VocÃª pode desfazer essa aÃ§Ã£o",
  action: <ToastAction altText="Desfazer">Desfazer</ToastAction>,
});
```

---

### **6. useIsMobile**
**LocalizaÃ§Ã£o**: `src/hooks/use-mobile.tsx`

**Responsabilidade**: Detectar se estÃ¡ em dispositivo mÃ³vel

**Uso:**
```typescript
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();

return (
  <div>
    {isMobile ? <MobileView /> : <DesktopView />}
  </div>
);
```

**Breakpoint**: 768px (Tailwind `md`)

---

### **7. useWeekNavigation**
**LocalizaÃ§Ã£o**: `src/hooks/useWeekNavigation.ts`

**Responsabilidade**: NavegaÃ§Ã£o de semanas (agendamento)

**Uso:**
```typescript
import { useWeekNavigation } from '@/hooks/useWeekNavigation';

const { 
  currentWeekStart,  // Data inÃ­cio da semana
  goToNextWeek,      // PrÃ³xima semana
  goToPreviousWeek,  // Semana anterior
  goToCurrentWeek    // Voltar para hoje
} = useWeekNavigation();
```

---

## ðŸŽ¯ **PadrÃµes de ImplementaÃ§Ã£o**

### **Estrutura BÃ¡sica de Hook**
```typescript
import { useState, useEffect } from 'react';

export function useCustomHook(param: string) {
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchData(param);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [param]);

  return { data, isLoading, error, reload: loadData };
}
```

### **Hook com MutaÃ§Ãµes**
```typescript
export function useDataMutations(id: string) {
  const [data, setData] = useState<Data[]>([]);

  const create = async (input: CreateInput) => {
    const { data: newItem, error } = await supabase
      .from('table')
      .insert(input)
      .select()
      .single();
    
    if (error) throw error;
    
    setData(prev => [...prev, newItem]);
    return newItem;
  };

  const update = async (itemId: string, updates: Partial<Data>) => {
    // AtualizaÃ§Ã£o otimista
    setData(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));

    const { error } = await supabase
      .from('table')
      .update(updates)
      .eq('id', itemId);
    
    if (error) {
      // Reverter em caso de erro
      await loadData();
      throw error;
    }
  };

  const remove = async (itemId: string) => {
    await supabase
      .from('table')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', itemId);
    
    await loadData(); // Recarregar do banco
  };

  return { data, create, update, remove };
}
```

---

## ðŸš€ **Boas PrÃ¡ticas**

### **âœ… FAZER**

1. **Sempre retornar estado de loading**
```typescript
return { data, isLoading, error };
```

2. **Usar `useCallback` para funÃ§Ãµes**
```typescript
const loadData = useCallback(async () => {
  // ...
}, [dependencies]);
```

3. **Cleanup em `useEffect`**
```typescript
useEffect(() => {
  let isMounted = true;
  
  loadData().then(result => {
    if (isMounted) setData(result);
  });
  
  return () => { isMounted = false; };
}, []);
```

4. **Tipar retornos**
```typescript
export function useCustomHook(): {
  data: Data | null;
  isLoading: boolean;
  error: string | null;
} {
  // ...
}
```

### **âŒ NÃƒO FAZER**

1. **NÃ£o usar hooks dentro de condicionais**
```typescript
// âŒ Errado
if (condition) {
  const data = useData();
}

// âœ… Correto
const data = useData();
if (condition && data) { ... }
```

2. **NÃ£o esquecer dependÃªncias**
```typescript
// âŒ Ruim
useEffect(() => {
  loadData(id);
}, []); // Missing 'id'!

// âœ… Bom
useEffect(() => {
  loadData(id);
}, [id]);
```

3. **NÃ£o fazer fetch desnecessÃ¡rios**
```typescript
// âŒ Ruim
useEffect(() => {
  loadData();
}, [data]); // Loop infinito!

// âœ… Bom
useEffect(() => {
  loadData();
}, [id]); // Apenas quando ID mudar
```

---

## ðŸ› **Debugging de Hooks**

### **React DevTools**
```typescript
// Adicionar debug name
useDebugValue(data ? 'Loaded' : 'Loading');
```

### **Console Logs**
```typescript
useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('ðŸ” Hook state:', { data, isLoading, error });
  }
}, [data, isLoading, error]);
```

### **Strict Mode**
```typescript
// StrictMode executa efeitos duas vezes
<React.StrictMode>
  <App />
</React.StrictMode>
```

---

## ðŸ“š **Recursos Adicionais**

### **Hooks do React**
- `useState` - Estado local
- `useEffect` - Side effects
- `useCallback` - MemoizaÃ§Ã£o de funÃ§Ãµes
- `useMemo` - MemoizaÃ§Ã£o de valores
- `useRef` - ReferÃªncias mutÃ¡veis
- `useContext` - Contexto global

### **Custom Hooks Comuns**
- `useDebounce` - Debounce de valores
- `useLocalStorage` - PersistÃªncia local
- `useMediaQuery` - Media queries
- `useClickOutside` - Detectar clique fora

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Components Guide, Context API, State Management
