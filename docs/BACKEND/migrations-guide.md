# ðŸ“¦ DocumentaÃ§Ã£o: Guia de Migrations

## ðŸŽ¯ **VisÃ£o Geral**
Este documento explica o sistema de migrations do Supabase, como criar, executar e gerenciar mudanÃ§as no banco de dados de forma segura e versionada.

---

## ðŸ“‹ **O que sÃ£o Migrations?**

### **Conceito**
- **Migrations** sÃ£o scripts SQL que modificam a estrutura do banco de dados
- **Versionadas**: Cada migration tem um timestamp Ãºnico
- **Incrementais**: Aplicadas em ordem cronolÃ³gica
- **ReversÃ­veis**: Idealmente devem ter um plano de rollback

### **Por que usar Migrations?**
- âœ… **Controle de VersÃ£o**: HistÃ³rico completo de mudanÃ§as
- âœ… **Trabalho em Equipe**: SincronizaÃ§Ã£o entre desenvolvedores
- âœ… **Ambientes**: Aplicar mesmas mudanÃ§as em dev/staging/prod
- âœ… **Auditoria**: Rastrear quando e por que mudanÃ§as foram feitas

---

## ðŸ“ **Estrutura de Arquivos**

### **LocalizaÃ§Ã£o**
```
supabase/migrations/
â”œâ”€â”€ 20250103000000_create_kanban_cards_and_change_stage.sql
â”œâ”€â”€ 20250104000000_add_soft_delete_columns.sql
â”œâ”€â”€ 20250105000000_create_card_comments.sql
â”œâ”€â”€ 20250106000000_create_card_attachments.sql
â””â”€â”€ 20250107000000_create_card_tasks.sql
```

### **Nomenclatura**
```
[TIMESTAMP]_[DESCRIPTION].sql
```
- **Timestamp**: `YYYYMMDDHHMMSS` (14 dÃ­gitos)
- **Description**: snake_case, descritivo
- **Exemplo**: `20250103120000_add_deleted_at_column.sql`

---

## ðŸ”§ **Migrations Existentes**

### **1. `20250103000000_create_kanban_cards_and_change_stage.sql`**
**O que faz:**
- Cria tabela `kanban_cards`
- Cria tabela `applicants`
- Cria funÃ§Ã£o RPC `change_stage()`
- Cria funÃ§Ã£o RPC `route_application()`
- Define RLS policies bÃ¡sicas

**Comandos principais:**
```sql
CREATE TABLE public.kanban_cards (...);
CREATE TABLE public.applicants (...);
CREATE FUNCTION public.change_stage(...);
CREATE INDEX idx_kanban_cards_applicant ON kanban_cards(applicant_id);
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
```

---

### **2. Soft Delete System**
**Arquivo**: `implement-soft-delete.sql`

**O que faz:**
- Adiciona colunas `deleted_at` e `deleted_by`
- Cria tabela `deletion_log`
- Cria trigger `log_deletion()`
- Atualiza RLS policies para filtrar deletados
- Cria funÃ§Ã£o `cleanup_old_deleted_records()`

**Comandos principais:**
```sql
ALTER TABLE card_comments ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE card_comments ADD COLUMN deleted_by UUID REFERENCES profiles(id);

CREATE TABLE deletion_log (...);

CREATE FUNCTION log_deletion() RETURNS TRIGGER;
CREATE TRIGGER trg_log_deletion_comments AFTER UPDATE ON card_comments;
```

---

### **3. Card Comments System**
**Arquivos**: 
- `enhance-hierarchical-comments.sql`
- `fix-card-comments-complete.sql`

**O que faz:**
- Cria tabela `card_comments`
- Adiciona coluna `thread_id` para conversas encadeadas
- Cria coluna `level` para hierarquia (0-7 nÃ­veis)
- Define RLS policies
- Cria triggers de timestamp

**Comandos principais:**
```sql
CREATE TABLE public.card_comments (
  id uuid PRIMARY KEY,
  card_id uuid REFERENCES kanban_cards(id),
  parent_id uuid REFERENCES card_comments(id),
  thread_id uuid REFERENCES card_comments(id),
  level integer CHECK (level >= 0 AND level <= 7),
  ...
);
```

---

### **4. Card Attachments System**
**Arquivo**: `create-card-attachments-complete.sql`

**O que faz:**
- Cria tabela `card_attachments`
- Cria Storage Bucket `card-attachments`
- Define RLS para storage
- Cria triggers para auto-comentÃ¡rios

**Comandos principais:**
```sql
CREATE TABLE public.card_attachments (
  id uuid PRIMARY KEY,
  card_id uuid REFERENCES kanban_cards(id),
  file_path text NOT NULL,
  ...
);

-- Storage bucket policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('card-attachments', 'card-attachments', true);
```

---

### **5. Card Tasks System**
**Arquivo**: `setup-tasks-system.sql`

**O que faz:**
- Cria tabela `card_tasks`
- Define RLS policies para tarefas
- Cria Ã­ndices para performance
- Adiciona coluna `comment_id` para integraÃ§Ã£o

**Comandos principais:**
```sql
CREATE TABLE public.card_tasks (
  id uuid PRIMARY KEY,
  card_id uuid REFERENCES kanban_cards(id),
  assigned_to uuid REFERENCES profiles(id),
  status text CHECK (status IN ('pending', 'completed')),
  ...
);
```

---

### **6. Cleanup Migrations**
**Arquivo**: `cleanup-legacy-columns.sql`

**O que faz:**
- Remove colunas nÃ£o utilizadas
- Remove triggers obsoletos
- Remove functions legadas
- Limpa views dependentes

**Comandos principais:**
```sql
-- Remover views primeiro
DROP VIEW IF EXISTS storage_organization_status CASCADE;

-- Remover colunas
ALTER TABLE kanban_cards DROP COLUMN IF EXISTS comments;
ALTER TABLE kanban_cards DROP COLUMN IF EXISTS comments_short;

-- Remover triggers
DROP TRIGGER IF EXISTS trg_update_card_title_attachments;
```

---

## ðŸš€ **Como Criar uma Nova Migration**

### **Passo 1: Planejar a MudanÃ§a**
```markdown
- O que vou mudar? (Adicionar coluna, criar tabela, etc.)
- Impacta dados existentes?
- Precisa de dados de exemplo?
- RLS precisa ser ajustado?
```

### **Passo 2: Criar Arquivo**
```bash
# Nomenclatura
YYYYMMDDHHMMSS_description.sql

# Exemplo
20250108150000_add_priority_to_tasks.sql
```

### **Passo 3: Escrever SQL**
```sql
-- 1. ComentÃ¡rio descritivo
-- Migration: Adicionar coluna de prioridade Ã s tarefas
-- Data: 2025-01-08
-- Autor: Equipe MZ

-- 2. Verificar se jÃ¡ existe (idempotente)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.card_tasks 
    ADD COLUMN priority text DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- 3. Criar Ã­ndice se necessÃ¡rio
CREATE INDEX IF NOT EXISTS idx_card_tasks_priority 
ON card_tasks(priority);

-- 4. Atualizar RLS se necessÃ¡rio
-- (policies jÃ¡ existentes cobrem a nova coluna)
```

### **Passo 4: Testar Localmente**
```sql
-- No SQL Editor do Supabase (ambiente de dev)
-- Cole e execute a migration
-- Verifique se:
-- âœ… Executa sem erros
-- âœ… NÃ£o quebra dados existentes
-- âœ… RLS continua funcionando
```

### **Passo 5: Aplicar em ProduÃ§Ã£o**
```sql
-- No SQL Editor do Supabase (ambiente de produÃ§Ã£o)
-- Cole e execute a migration
-- Verifique logs e erros
```

---

## ðŸ“ **Template de Migration**

### **Migration Simples (Adicionar Coluna)**
```sql
-- =========================================
-- Migration: [DESCRIÃ‡ÃƒO]
-- Data: [DATA]
-- Autor: [NOME]
-- =========================================

-- Adicionar coluna
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '[TABLE]' AND column_name = '[COLUMN]'
  ) THEN
    ALTER TABLE public.[TABLE] 
    ADD COLUMN [COLUMN] [TYPE] [CONSTRAINTS];
  END IF;
END $$;

-- Criar Ã­ndice (se necessÃ¡rio)
CREATE INDEX IF NOT EXISTS idx_[table]_[column] 
ON [table]([column]);
```

### **Migration Complexa (Criar Tabela)**
```sql
-- =========================================
-- Migration: Criar tabela [TABLE_NAME]
-- Data: [DATA]
-- Autor: [NOME]
-- =========================================

-- Criar tabela
CREATE TABLE IF NOT EXISTS public.[table_name] (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Outras colunas...
);

-- Criar Ã­ndices
CREATE INDEX IF NOT EXISTS idx_[table]_[column] 
ON [table]([column]);

-- Habilitar RLS
ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;

-- Criar policies
CREATE POLICY "[table]_select_all" 
ON public.[table_name]
FOR SELECT
TO authenticated
USING (true);

-- Criar trigger de timestamp
CREATE TRIGGER set_timestamp_[table]
BEFORE UPDATE ON public.[table_name]
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## ðŸ› **Troubleshooting**

### **Erro: "column already exists"**
```sql
-- SoluÃ§Ã£o: Usar IF NOT EXISTS
DO $$ 
BEGIN
  IF NOT EXISTS (...) THEN
    ALTER TABLE ...
  END IF;
END $$;
```

### **Erro: "cannot drop column because other objects depend on it"**
```sql
-- SoluÃ§Ã£o: Dropar dependÃªncias primeiro
DROP VIEW IF EXISTS [view_name] CASCADE;
DROP TRIGGER IF EXISTS [trigger_name] ON [table];
ALTER TABLE [table] DROP COLUMN [column];
```

### **Erro: "permission denied"**
```sql
-- SoluÃ§Ã£o: Usar SECURITY DEFINER em functions
CREATE OR REPLACE FUNCTION func()
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER  -- <-- Importante!
SET search_path = public
AS $$ ... $$;
```

### **Dados desapareceram apÃ³s migration**
```sql
-- Causa: Policy de SELECT muito restritiva
-- SoluÃ§Ã£o: Verificar USING clause
CREATE POLICY "table_select_all" 
ON public.table
FOR SELECT
USING (true);  -- <-- Ou condiÃ§Ã£o correta
```

---

## âš ï¸ **Boas PrÃ¡ticas**

### **âœ… FAZER**
1. **Sempre use `IF NOT EXISTS` / `IF EXISTS`**
   - Migrations devem ser idempotentes
   - Podem ser executadas mÃºltiplas vezes sem erro

2. **Comente seu cÃ³digo**
   - Explique o **porquÃª** da mudanÃ§a
   - Documente impactos conhecidos

3. **Teste em ambiente de dev primeiro**
   - Nunca aplique direto em produÃ§Ã£o
   - Verifique dados existentes

4. **Crie Ã­ndices para foreign keys**
   - Melhora performance de JOINs
   - Essencial para RLS policies

5. **Sempre atualize RLS apÃ³s mudanÃ§as**
   - Novas tabelas precisam de policies
   - Novas colunas podem precisar de filtros

### **âŒ NÃƒO FAZER**
1. **Nunca delete dados sem backup**
   - Use soft delete sempre que possÃ­vel
   - FaÃ§a snapshot antes de migrations destrutivas

2. **NÃ£o use `CASCADE` sem cuidado**
   - Pode deletar dados relacionados
   - Sempre verifique dependÃªncias primeiro

3. **NÃ£o modifique migrations jÃ¡ aplicadas**
   - Crie uma nova migration para correÃ§Ãµes
   - Migrations sÃ£o imutÃ¡veis

4. **NÃ£o esqueÃ§a de atualizar o frontend**
   - MudanÃ§as no schema podem quebrar queries
   - Sincronize com equipe de frontend

---

## ðŸ“Š **Checklist de Migration**

```markdown
Antes de criar:
- [ ] Planejei a mudanÃ§a?
- [ ] Identifiquei impactos?
- [ ] Tenho plano de rollback?

Durante criaÃ§Ã£o:
- [ ] Usei IF NOT EXISTS / IF EXISTS?
- [ ] Comentei o cÃ³digo?
- [ ] Criei Ã­ndices necessÃ¡rios?
- [ ] Atualizei RLS policies?

Antes de aplicar:
- [ ] Testei em ambiente de dev?
- [ ] Fiz backup dos dados?
- [ ] Avisei a equipe?

Depois de aplicar:
- [ ] Verifiquei logs de erro?
- [ ] Testei funcionalidades afetadas?
- [ ] Atualizei documentaÃ§Ã£o?
```

---

## ðŸ”® **Migrations Planejadas**

### **Futuras Melhorias**
1. **Sistema de NotificaÃ§Ãµes**
   ```sql
   CREATE TABLE notifications (
     id uuid PRIMARY KEY,
     user_id uuid REFERENCES profiles(id),
     type text,
     message text,
     read_at timestamptz
   );
   ```

2. **HistÃ³rico de MudanÃ§as**
   ```sql
   CREATE TABLE audit_log (
     id uuid PRIMARY KEY,
     table_name text,
     record_id uuid,
     action text,
     changed_by uuid,
     changes jsonb
   );
   ```

3. **Tags/Labels para Cards**
   ```sql
   CREATE TABLE card_labels (
     id uuid PRIMARY KEY,
     card_id uuid REFERENCES kanban_cards(id),
     label text,
     color text
   );
   ```

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Database Schema, RLS Policies, Soft Delete System
