# ðŸ”§ Guia de CorreÃ§Ã£o: Checkbox de Tarefas NÃ£o Funciona

## ðŸ” Problema Identificado

VocÃª tem **8 polÃ­ticas RLS** quando deveria ter apenas **4**:
- âœ… 4 polÃ­ticas novas corretas (`card_tasks_*`)
- âŒ 4 polÃ­ticas antigas conflitantes (`tasks_*_policy`)

**Conflito**: As polÃ­ticas antigas podem estar bloqueando as atualizaÃ§Ãµes.

---

## âœ… SoluÃ§Ã£o em 3 Passos

### **PASSO 1: Execute o SQL de Limpeza**

1. Abra **Supabase SQL Editor**
2. Copie **TODO** o conteÃºdo de `cleanup_duplicate_task_policies.sql`
3. Execute
4. VocÃª verÃ¡:
   ```
   âœ… PolÃ­ticas criadas com sucesso!
   total_policies: 4
   ```

### **PASSO 2: Verifique o Resultado**

O SQL vai mostrar uma tabela assim:

| policyname | cmd | descricao | status_permissao |
|------------|-----|-----------|------------------|
| card_tasks_select_all | SELECT | ðŸ‘ï¸ Ver tarefas | âœ… OK |
| card_tasks_insert_all | INSERT | âž• Criar tarefas | âœ… OK |
| card_tasks_update_all | UPDATE | âœï¸ Atualizar/Marcar | ðŸ”“ LIBERADO |
| card_tasks_delete_all | DELETE | ðŸ—‘ï¸ Deletar tarefas | âœ… OK |

**IMPORTANTE**: Devem ser apenas 4 polÃ­ticas!

### **PASSO 3: Teste no Frontend**

1. Acesse `http://localhost:8080/`
2. FaÃ§a login
3. Abra uma ficha com tarefas
4. **Clique no checkbox** de uma tarefa
5. **Abra o Console (F12)** e veja:

**âœ… Sucesso:**
```
ðŸ“¤ [useTasks] Enviando UPDATE para Supabase: {...}
ðŸ“¥ [useTasks] Resposta do Supabase: { success: true }
âœ… [useTasks] Status atualizado no banco com sucesso
âœ… [useTasks] Linhas afetadas: 1
```

**âŒ Erro de RLS (se ainda houver):**
```
âŒ [useTasks] Erro ao atualizar status, revertendo...
ðŸš¨ [useTasks] ERRO DE RLS/PERMISSÃƒO! Execute fix_card_tasks_rls.sql no Supabase
```

---

## ðŸ§ª Teste SQL IncluÃ­do

O script `cleanup_duplicate_task_policies.sql` tambÃ©m executa um teste automÃ¡tico:
- Pega uma tarefa pendente
- Tenta fazer UPDATE
- Mostra: `âœ… Teste de UPDATE bem-sucedido!`

Se o teste passar, o frontend vai funcionar!

---

## ðŸ“Š DiagnÃ³stico se Ainda NÃ£o Funcionar

### Ver tarefas atuais:
```sql
SELECT id, description, status, comment_id
FROM public.card_tasks
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

### Teste manual:
```sql
UPDATE public.card_tasks
SET status = 'completed', completed_at = NOW()
WHERE id = 'COLE_ID_AQUI';
```

Se o UPDATE manual funcionar mas o frontend nÃ£o, Ã© problema de frontend.
Se o UPDATE manual falhar, ainda Ã© RLS.

---

## ðŸŽ¯ Resumo

1. âœ… Execute `cleanup_duplicate_task_policies.sql`
2. âœ… Confirme que hÃ¡ apenas 4 polÃ­ticas
3. âœ… Teste no frontend com console aberto
4. âœ… Me envie os logs do console

**Deve funcionar apÃ³s este SQL!** ðŸš€

