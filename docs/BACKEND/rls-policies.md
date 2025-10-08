# ðŸ”’ DocumentaÃ§Ã£o: RLS Policies (Row Level Security)

## ðŸŽ¯ **VisÃ£o Geral**
RLS (Row Level Security) Ã© o sistema de seguranÃ§a do Supabase/PostgreSQL que controla quem pode acessar quais linhas em cada tabela. Este documento detalha **todas** as policies implementadas no sistema.

---

## ðŸ“‹ **Conceitos Fundamentais**

### **O que Ã© RLS?**
- **SeguranÃ§a em nÃ­vel de linha**: Cada linha de uma tabela pode ter regras de acesso diferentes
- **Aplicado automaticamente**: Supabase aplica as regras antes de retornar dados
- **Baseado em contexto**: Usa funÃ§Ãµes como `auth.uid()` para verificar quem estÃ¡ logado

### **Tipos de OperaÃ§Ãµes**
- **SELECT**: Quem pode **visualizar** dados
- **INSERT**: Quem pode **criar** novos registros
- **UPDATE**: Quem pode **editar** registros existentes
- **DELETE**: Quem pode **excluir** registros

### **FunÃ§Ãµes Helper**
```sql
-- Retorna perfil do usuÃ¡rio atual
current_profile() â†’ profiles

-- Verifica se Ã© gestor/premium
is_premium() â†’ boolean

-- Verifica se pertence Ã  mesma empresa
same_company(target_uuid) â†’ boolean

-- Retorna UUID do usuÃ¡rio logado
auth.uid() â†’ uuid

-- Retorna role do usuÃ¡rio
auth.role() â†’ text
```

---

## ðŸ—‚ï¸ **Policies por Tabela**

### **1. `profiles` (Perfis de UsuÃ¡rio)**

#### **SELECT - Visualizar Perfis**
```sql
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver todos os perfis
- **Por quÃª**: NecessÃ¡rio para @menÃ§Ãµes, atribuiÃ§Ã£o de tarefas, etc.

#### **UPDATE - Editar Perfil**
```sql
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```
- **Quem**: Apenas o prÃ³prio usuÃ¡rio
- **O quÃª**: SÃ³ pode editar seu prÃ³prio perfil
- **Por quÃª**: SeguranÃ§a - ninguÃ©m pode alterar dados de outros

#### **INSERT - Criar Perfil**
```sql
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
```
- **Quem**: Apenas para si mesmo
- **O quÃª**: CriaÃ§Ã£o automÃ¡tica via trigger `on_auth_user_created`
- **Por quÃª**: Evita criaÃ§Ã£o de perfis falsos

---

### **2. `kanban_cards` (Cards do Kanban)**

#### **SELECT - Visualizar Cards**
```sql
CREATE POLICY "kanban_cards_select_all" ON public.kanban_cards
  FOR SELECT
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver todos os cards
- **Por quÃª**: Kanban Ã© colaborativo, todos precisam ver todos os cards

#### **INSERT - Criar Cards**
```sql
CREATE POLICY "kanban_cards_insert_authenticated" ON public.kanban_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem criar novos cards
- **Por quÃª**: Vendedores e Analistas criam fichas

#### **UPDATE - Editar Cards**
```sql
CREATE POLICY "kanban_cards_update_authenticated" ON public.kanban_cards
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem editar qualquer card
- **Por quÃª**: Fluxo colaborativo - Analistas editam pareceres, Vendedores atualizam dados

#### **DELETE - Excluir Cards**
```sql
CREATE POLICY "kanban_cards_delete_authenticated" ON public.kanban_cards
  FOR DELETE
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem excluir cards
- **Por quÃª**: Gestores podem excluir fichas canceladas/duplicadas

---

### **3. `applicants` (Candidatos)**

#### **SELECT - Visualizar Candidatos**
```sql
CREATE POLICY "applicants_select_all" ON public.applicants
  FOR SELECT
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver todos os candidatos
- **Por quÃª**: Dados mestres usados por cards

#### **INSERT - Criar Candidatos**
```sql
CREATE POLICY "applicants_insert_authenticated" ON public.applicants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem criar novos candidatos
- **Por quÃª**: CriaÃ§Ã£o de fichas PF/PJ

#### **UPDATE - Editar Candidatos**
```sql
CREATE POLICY "applicants_update_authenticated" ON public.applicants
  FOR UPDATE
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem editar dados de candidatos
- **Por quÃª**: AtualizaÃ§Ã£o de informaÃ§Ãµes cadastrais

---

### **4. `card_comments` (ComentÃ¡rios)**

#### **SELECT - Visualizar ComentÃ¡rios**
```sql
CREATE POLICY "card_comments_select_all" ON public.card_comments
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver comentÃ¡rios **nÃ£o deletados**
- **Por quÃª**: Soft delete - comentÃ¡rios deletados ficam ocultos

#### **INSERT - Criar ComentÃ¡rios**
```sql
CREATE POLICY "card_comments_insert_authenticated" ON public.card_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem criar comentÃ¡rios
- **Por quÃª**: Sistema de conversas Ã© aberto a todos

#### **UPDATE - Editar ComentÃ¡rios**
```sql
CREATE POLICY "card_comments_update_authenticated" ON public.card_comments
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem editar/soft-delete comentÃ¡rios
- **Por quÃª**: Soft delete precisa de UPDATE (nÃ£o DELETE)

#### **DELETE - Excluir ComentÃ¡rios** (NUNCA USADO)
```sql
-- NÃƒO EXISTE POLICY DE DELETE
-- Sistema usa SOFT DELETE (UPDATE deleted_at)
```
- **Motivo**: Auditoria e recuperaÃ§Ã£o de dados

---

### **5. `card_attachments` (Anexos)**

#### **SELECT - Visualizar Anexos**
```sql
CREATE POLICY "card_attachments_select_all" ON public.card_attachments
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver anexos **nÃ£o deletados**
- **Por quÃª**: Soft delete + acesso aberto para download

#### **INSERT - Criar Anexos**
```sql
CREATE POLICY "card_attachments_insert_authenticated" ON public.card_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem fazer upload de arquivos
- **Por quÃª**: Sistema de anexos Ã© colaborativo

#### **UPDATE - Editar Anexos**
```sql
CREATE POLICY "card_attachments_update_authenticated" ON public.card_attachments
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem soft-delete anexos
- **Por quÃª**: Soft delete precisa de UPDATE

---

### **6. `card_tasks` (Tarefas)**

#### **SELECT - Visualizar Tarefas**
```sql
CREATE POLICY "card_tasks_select_all" ON public.card_tasks
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver tarefas **nÃ£o deletadas**
- **Por quÃª**: Soft delete + visibilidade colaborativa

#### **INSERT - Criar Tarefas**
```sql
CREATE POLICY "card_tasks_insert_authenticated" ON public.card_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem criar tarefas
- **Por quÃª**: Sistema de tarefas Ã© colaborativo

#### **UPDATE - Editar Tarefas**
```sql
CREATE POLICY "card_tasks_update_authenticated" ON public.card_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem editar/marcar como concluÃ­da/soft-delete tarefas
- **Por quÃª**: Checkbox de conclusÃ£o + soft delete + ediÃ§Ã£o colaborativa

---

### **7. `deletion_log` (Log de Auditoria)**

#### **SELECT - Visualizar Logs**
```sql
CREATE POLICY "deletion_log_select_all" ON public.deletion_log
  FOR SELECT
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver histÃ³rico de exclusÃµes
- **Por quÃª**: Auditoria e transparÃªncia

#### **INSERT - Criar Logs** (AutomÃ¡tico via Trigger)
```sql
CREATE POLICY "deletion_log_insert_system" ON public.deletion_log
  FOR INSERT
  WITH CHECK (true);
```
- **Quem**: Sistema (trigger automÃ¡tico)
- **O quÃª**: Log criado automaticamente ao deletar
- **Por quÃª**: Auditoria completa

---

### **8. `pf_fichas` / `pj_fichas` (Fichas PF/PJ)**

#### **SELECT - Visualizar Fichas**
```sql
CREATE POLICY "pf_fichas_select_all" ON public.pf_fichas
  FOR SELECT
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem ver todas as fichas
- **Por quÃª**: Dados complementares dos applicants

#### **INSERT/UPDATE - Criar/Editar Fichas**
```sql
CREATE POLICY "pf_fichas_insert_authenticated" ON public.pf_fichas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "pf_fichas_update_authenticated" ON public.pf_fichas
  FOR UPDATE
  TO authenticated
  USING (true);
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem criar e editar fichas
- **Por quÃª**: Fluxo de criaÃ§Ã£o e ediÃ§Ã£o de cadastros

---

## ðŸ” **Storage Bucket: `card-attachments`**

### **SELECT (Download)**
```sql
CREATE POLICY "card_attachments_storage_select" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'card-attachments');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem baixar/visualizar arquivos
- **Por quÃª**: Acesso aberto a documentos

### **INSERT (Upload)**
```sql
CREATE POLICY "card_attachments_storage_insert" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'card-attachments');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem fazer upload de arquivos
- **Por quÃª**: Sistema de anexos colaborativo

### **DELETE (ExclusÃ£o)**
```sql
CREATE POLICY "card_attachments_storage_delete" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'card-attachments');
```
- **Quem**: Todos os usuÃ¡rios autenticados
- **O quÃª**: Podem deletar arquivos
- **Por quÃª**: Soft delete no banco, hard delete no storage apÃ³s 90 dias

---

## ðŸš¨ **Regras Especiais**

### **Soft Delete**
- **ComentÃ¡rios, Anexos, Tarefas**: Usam `deleted_at IS NULL` no SELECT
- **Motivo**: Auditoria e recuperaÃ§Ã£o
- **Tempo**: 90 dias antes de exclusÃ£o permanente

### **Roles e PermissÃµes**
- **Vendedor**: Cria fichas, comenta, anexa
- **Analista**: Edita pareceres, cria tarefas, atribui
- **Gestor**: Acesso total, pode editar qualquer coisa

### **Auth Context**
```sql
-- UsuÃ¡rio atual
auth.uid() â†’ '8ae20591-f920-417d-94f7-8a3930ffd4d'

-- Role atual
auth.role() â†’ 'authenticated'

-- Perfil completo
current_profile() â†’ { id, full_name, role, avatar_url }
```

---

## ðŸ” **Como Testar RLS**

### **Teste 1: Visualizar ComentÃ¡rios**
```sql
-- Como usuÃ¡rio logado
SELECT * FROM card_comments WHERE card_id = 'uuid-123';
-- âœ… Retorna apenas comentÃ¡rios nÃ£o deletados
```

### **Teste 2: Soft Delete**
```sql
-- Soft delete
UPDATE card_comments 
SET deleted_at = NOW(), deleted_by = auth.uid() 
WHERE id = 'comment-uuid';

-- Verificar ocultaÃ§Ã£o
SELECT * FROM card_comments WHERE id = 'comment-uuid';
-- âŒ NÃ£o retorna (deleted_at IS NOT NULL)
```

### **Teste 3: Criar Tarefa**
```sql
-- Como usuÃ¡rio autenticado
INSERT INTO card_tasks (card_id, assigned_to, description) 
VALUES ('card-uuid', 'user-uuid', 'Validar documentaÃ§Ã£o');
-- âœ… Permitido para todos os autenticados
```

---

## ðŸ› **Troubleshooting**

### **Erro: "new row violates row-level security policy"**
- **Causa**: Policy de INSERT/UPDATE bloqueou a operaÃ§Ã£o
- **SoluÃ§Ã£o**: Verificar `WITH CHECK` da policy

### **Dados nÃ£o aparecem**
- **Causa**: Policy de SELECT estÃ¡ bloqueando
- **SoluÃ§Ã£o**: Verificar `USING` da policy (ex: `deleted_at IS NULL`)

### **"permission denied for table X"**
- **Causa**: RLS nÃ£o habilitado ou sem policy
- **SoluÃ§Ã£o**: 
  ```sql
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
  CREATE POLICY ...
  ```

---

## ðŸ“ **Exemplo de Policy Completa**

```sql
-- 1. Habilitar RLS
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;

-- 2. Policy de SELECT (visualizaÃ§Ã£o)
CREATE POLICY "card_comments_select_all" 
ON public.card_comments
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- 3. Policy de INSERT (criaÃ§Ã£o)
CREATE POLICY "card_comments_insert_authenticated" 
ON public.card_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- 4. Policy de UPDATE (ediÃ§Ã£o/soft-delete)
CREATE POLICY "card_comments_update_authenticated" 
ON public.card_comments
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated');
```

---

## ðŸ”® **Melhorias Futuras**

1. **Policies por Role**: Gestores editam tudo, Vendedores sÃ³ suas fichas
2. **Policies por Empresa**: Multi-tenancy com `company_id`
3. **Policies Temporais**: Bloquear ediÃ§Ã£o apÃ³s X dias
4. **Audit Log**: Registrar todas as operaÃ§Ãµes RLS
5. **Rate Limiting**: Limitar nÃºmero de operaÃ§Ãµes por usuÃ¡rio

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Database Schema, Migrations Guide, Soft Delete System
