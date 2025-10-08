# âœ… SOFT DELETE - IMPLEMENTAÃ‡ÃƒO COMPLETA

## ðŸ“‹ RESUMO:

Sistema de exclusÃ£o "suave" implementado em **3 tabelas principais**:
- `card_comments` (Conversas)
- `card_attachments` (Anexos)
- `card_tasks` (Tarefas)

---

## ðŸ”§ BACKEND (SQL):

**Arquivo:** `supabase/implement-soft-delete.sql`

### Estrutura criada:
1. âœ… Colunas `deleted_at` e `deleted_by` nas 3 tabelas
2. âœ… RLS atualizada (sÃ³ mostra registros com `deleted_at IS NULL`)
3. âœ… Functions: `soft_delete_comment()`, `soft_delete_attachment()`, `soft_delete_task()`
4. âœ… Function de restauraÃ§Ã£o: `restore_comment()`
5. âœ… Function de limpeza: `cleanup_old_deleted_records()` (90 dias)
6. âœ… Tabela de auditoria: `deletion_log`
7. âœ… Triggers automÃ¡ticos para logar exclusÃµes

---

## ðŸ’» FRONTEND (CÃ³digo):

### **1. `src/hooks/useComments.ts`**
```javascript
// ANTES:
await supabase.from('card_comments').delete().eq('id', commentId);

// AGORA:
await supabase.from('card_comments')
  .update({ deleted_at: NOW, deleted_by: userId })
  .eq('id', commentId);
await loadComments(); // Force refresh
```

### **2. `src/hooks/useAttachments.ts`**
```javascript
// ANTES:
1. Delete do storage
2. Delete do banco

// AGORA:
1. Soft delete no banco (mantÃ©m no storage)
2. Recarrega anexos
```

### **3. `src/hooks/useTasks.ts`**
```javascript
// ANTES:
await supabase.from('card_tasks').delete().eq('id', taskId);

// AGORA:
await supabase.from('card_tasks')
  .update({ deleted_at: NOW, deleted_by: userId })
  .eq('id', taskId);
await loadTasks(); // Force refresh
```

### **4. `src/components/KanbanBoard.tsx`**
```javascript
// MANTIDO hard delete (deletar card inteiro Ã© aÃ§Ã£o crÃ­tica)
await supabase.from('kanban_cards').delete().eq('id', cardId);
```

---

## ðŸŽ¯ COMO FUNCIONA:

### **UsuÃ¡rio exclui algo:**
```
1. Frontend chama: deleteComment(id)
2. Backend: UPDATE deleted_at = NOW (nÃ£o DELETE!)
3. Trigger: Salva snapshot em deletion_log
4. RLS: Oculta registro (deleted_at IS NULL)
5. Frontend: Recarrega e nÃ£o mostra mais
```

### **Por 90 dias:**
```
- Registro fica no banco (oculto)
- Snapshot em deletion_log
- PossÃ­vel restaurar via SQL
```

### **ApÃ³s 90 dias:**
```
- cleanup_old_deleted_records() roda
- DELETE permanente do banco
- deletion_log mantÃ©m histÃ³rico
```

---

## ðŸ”’ SEGURANÃ‡A E AUDITORIA:

### **Quem pode deletar:**
- ComentÃ¡rios: SÃ³ o autor
- Anexos: SÃ³ o autor
- Tarefas: SÃ³ quem criou (ou gestor)

### **Log completo:**
```sql
SELECT 
  d.table_name,
  d.record_id,
  p.full_name as deleted_by_name,
  d.deleted_at,
  d.record_snapshot->>'content' as content_preview
FROM deletion_log d
JOIN profiles p ON p.id = d.deleted_by
ORDER BY d.deleted_at DESC;
```

---

## ðŸ“Š QUERIES ÃšTEIS:

### **Ver registros deletados (ocultos do front):**
```sql
-- ComentÃ¡rios deletados
SELECT id, content, deleted_at, deleted_by 
FROM card_comments 
WHERE deleted_at IS NOT NULL;

-- Anexos deletados
SELECT id, file_name, deleted_at, deleted_by 
FROM card_attachments 
WHERE deleted_at IS NOT NULL;

-- Tarefas deletadas
SELECT id, description, deleted_at, deleted_by 
FROM card_tasks 
WHERE deleted_at IS NOT NULL;
```

### **Restaurar manualmente:**
```sql
-- Restaurar comentÃ¡rio
SELECT restore_comment('comment-id-aqui');

-- Ou diretamente:
UPDATE card_comments 
SET deleted_at = NULL, deleted_by = NULL 
WHERE id = 'comment-id-aqui';
```

### **Limpar registros antigos manualmente:**
```sql
SELECT cleanup_old_deleted_records();
```

---

## â° AGENDAR LIMPEZA AUTOMÃTICA:

### **No Supabase Dashboard:**
1. Database > Cron Jobs
2. Create new job:
```sql
SELECT cron.schedule(
  'cleanup-deleted-records',
  '0 3 * * *',  -- Todo dia Ã s 3h da manhÃ£
  $$ SELECT cleanup_old_deleted_records(); $$
);
```

---

## âœ… STATUS:

- âœ… Backend: SQL pronto
- âœ… Frontend: CÃ³digo atualizado
- âœ… Auditoria: Logs automÃ¡ticos
- âœ… Limpeza: Function criada (manual ou automÃ¡tica)
- â³ Pendente: Rodar SQL no Supabase

---

**Data:** 2025-10-08
**PrÃ³ximo passo:** Testar todas as exclusÃµes

