# ðŸ—‘ï¸ SISTEMA DE SOFT DELETE - GUIA COMPLETO

## ðŸ“‹ O QUE Ã‰ SOFT DELETE?

Em vez de **DELETAR permanentemente**, o registro Ã© **MARCADO como deletado**.

---

## ðŸ”„ COMPARAÃ‡ÃƒO:

### âŒ HARD DELETE (Antigo):
```sql
DELETE FROM card_comments WHERE id = 'abc-123';
-- Registro SUMIU para sempre! âŒ
```

### âœ… SOFT DELETE (Novo):
```sql
UPDATE card_comments 
SET deleted_at = NOW(), deleted_by = auth.uid() 
WHERE id = 'abc-123';
-- Registro continua no banco! âœ…
```

---

## ðŸ“Š ESTRUTURA IMPLEMENTADA:

### **Colunas adicionadas:**
```sql
card_comments, card_attachments, card_tasks:
â”œâ”€ deleted_at  â†’ Timestamp da exclusÃ£o (NULL = ativo)
â””â”€ deleted_by  â†’ Quem deletou (FK para profiles)
```

### **Tabela de auditoria:**
```sql
deletion_log:
â”œâ”€ id              â†’ UUID Ãºnico
â”œâ”€ table_name      â†’ Qual tabela foi afetada
â”œâ”€ record_id       â†’ ID do registro deletado
â”œâ”€ deleted_by      â†’ Quem deletou
â”œâ”€ deleted_at      â†’ Quando deletou
â”œâ”€ record_snapshot â†’ CÃ³pia do registro (JSON)
â””â”€ reason          â†’ Motivo (opcional)
```

---

## âš™ï¸ FUNCTIONS CRIADAS:

### **1. Soft Delete:**
```sql
soft_delete_comment(comment_id)    â†’ Marca comentÃ¡rio como deletado
soft_delete_attachment(attach_id)  â†’ Marca anexo como deletado
soft_delete_task(task_id)          â†’ Marca tarefa como deletada
```

### **2. Restaurar:**
```sql
restore_comment(comment_id) â†’ Restaura comentÃ¡rio deletado
```

### **3. Limpeza AutomÃ¡tica:**
```sql
cleanup_old_deleted_records() â†’ Deleta PERMANENTEMENTE registros com mais de 90 dias
```

---

## ðŸŽ¯ COMO USAR:

### **NO FRONTEND:**
```javascript
// ANTES:
await supabase.from('card_comments').delete().eq('id', commentId);

// AGORA:
await supabase.from('card_comments')
  .update({ 
    deleted_at: new Date().toISOString(),
    deleted_by: userId 
  })
  .eq('id', commentId);
```

### **RLS AUTOMÃTICO:**
As policies jÃ¡ filtram registros deletados:
```sql
WHERE deleted_at IS NULL  -- SÃ³ mostra registros ATIVOS
```

---

## ðŸ”’ SEGURANÃ‡A:

### **Triggers automÃ¡ticos:**
Quando um registro Ã© marcado como deletado:
1. âœ… Registra em `deletion_log` (auditoria)
2. âœ… Salva snapshot completo (JSON)
3. âœ… Registra quem deletou e quando

---

## ðŸ§¹ LIMPEZA AUTOMÃTICA:

### **Executar manualmente:**
```sql
SELECT cleanup_old_deleted_records();
```

### **Agendar no Supabase (Cron Job):**
```sql
-- No Supabase Dashboard > Database > Cron Jobs
-- Criar job para rodar todo dia Ã s 3h da manhÃ£:
SELECT cron.schedule(
  'cleanup-deleted-records',
  '0 3 * * *',  -- Todo dia Ã s 3h
  $$ SELECT cleanup_old_deleted_records(); $$
);
```

---

## ðŸ“ˆ VANTAGENS:

1. âœ… **RecuperaÃ§Ã£o de erros** - "Ctrl+Z" atÃ© 90 dias
2. âœ… **Auditoria completa** - Quem deletou, quando, o quÃª
3. âœ… **Conformidade LGPD** - HistÃ³rico de exclusÃµes
4. âœ… **AnÃ¡lise de dados** - EstatÃ­sticas de uso
5. âœ… **Lixeira futura** - PossÃ­vel implementar UI de "Lixeira"

---

## ðŸš€ PRÃ“XIMOS PASSOS:

### **1. Rode o SQL:**
```bash
# Abra: supabase/implement-soft-delete.sql
# Execute no SQL Editor do Supabase
```

### **2. Teste:**
- Exclua um comentÃ¡rio
- Feche "Editar Ficha"
- Abra novamente
- âœ… ComentÃ¡rio NÃƒO aparece mais

### **3. Verifique auditoria:**
```sql
-- Ver Ãºltimas exclusÃµes
SELECT * FROM deletion_log ORDER BY deleted_at DESC LIMIT 10;

-- Ver comentÃ¡rios deletados (ocultos do front)
SELECT id, content, deleted_at, deleted_by 
FROM card_comments 
WHERE deleted_at IS NOT NULL;
```

### **4. (Opcional) Implementar "Lixeira" no futuro:**
- BotÃ£o "Ver Lixeira"
- Lista de comentÃ¡rios deletados
- BotÃ£o "Restaurar" por 90 dias

---

## â° TIMELINE:

```
Dia 0:   UsuÃ¡rio exclui comentÃ¡rio
         â†“
         Soft delete (deleted_at = NOW)
         Registro fica oculto no front
         Mas continua no banco!
         â†“
Dia 1-89: PossÃ­vel restaurar
         â†“
Dia 90:  cleanup_old_deleted_records()
         DELETE permanente do banco
         Registro SUMIU para sempre
```

---

**Data:** 2025-10-08
**Status:** âœ… Pronto para implementaÃ§Ã£o

