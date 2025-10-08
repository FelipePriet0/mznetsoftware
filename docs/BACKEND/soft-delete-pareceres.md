# ðŸ“‹ Soft Delete - Pareceres (Backend)

## ðŸ“– **DescriÃ§Ã£o**
Sistema de exclusÃ£o "soft" para pareceres, onde os pareceres nÃ£o sÃ£o removidos permanentemente do banco de dados, mas marcados como deletados dentro do JSON `reanalysis_notes` para preservaÃ§Ã£o de dados e auditoria.

---

## ðŸ—ï¸ **Arquitetura do Sistema**

### **Estrutura de Dados:**
- **Tabela:** `kanban_cards`
- **Coluna:** `reanalysis_notes` (Tipo: JSONB)
- **LocalizaÃ§Ã£o:** Pareceres ficam dentro do prÃ³prio card (nÃ£o em tabela separada)

### **DiferenÃ§a dos Outros Sistemas:**
| Sistema | Tabela | Estrutura | Soft Delete |
|---------|--------|-----------|-------------|
| **Cards** | `kanban_cards` | Colunas separadas | `deleted_at`, `deleted_by`, `deletion_reason` |
| **ComentÃ¡rios** | `card_comments` | Tabela prÃ³pria | `deleted_at`, `deleted_by` |
| **Anexos** | `card_attachments` | Tabela prÃ³pria | `deleted_at`, `deleted_by` |
| **Pareceres** | `kanban_cards.reanalysis_notes` | JSON dentro do card | `deleted`, `deleted_at`, `deleted_by` (JSON) |

---

## ðŸ”§ **Estrutura JSON dos Pareceres**

### **Parecer Ativo (nÃ£o deletado):**
```json
{
  "id": "parecer-123",
  "author_id": "user-456",
  "author_name": "Felipe",
  "author_role": "gestor",
  "created_at": "2025-01-08T17:07:17.740Z",
  "text": "Parecer ativo",
  "parent_id": null,
  "level": 0,
  "thread_id": "thread-789",
  "is_thread_starter": true
}
```

### **Parecer Deletado (soft delete):**
```json
{
  "id": "parecer-123",
  "author_id": "user-456", 
  "author_name": "Felipe",
  "author_role": "gestor",
  "created_at": "2025-01-08T17:07:17.740Z",
  "text": "Parecer deletado",
  "parent_id": null,
  "level": 0,
  "thread_id": "thread-789",
  "is_thread_starter": true,
  "deleted": true,
  "deleted_at": "2025-01-08T17:12:42.252Z",
  "deleted_by": "8ae20591-f920-417d-94f7-8a39304ffd4d"
}
```

---

## ðŸ“Š **Campos de Soft Delete**

### **Campos Adicionados ao JSON:**
| Campo | Tipo | DescriÃ§Ã£o | ObrigatÃ³rio |
|-------|------|-----------|-------------|
| `deleted` | `boolean` | `true` = parecer deletado | âœ… Sim |
| `deleted_at` | `string` | Data/hora da exclusÃ£o (ISO 8601) | âœ… Sim |
| `deleted_by` | `string` | ID do usuÃ¡rio que deletou | âœ… Sim |

---

## ðŸ” **Queries SQL para AnÃ¡lise**

### **1ï¸âƒ£ Ver todos os pareceres (incluindo deletados):**
```sql
SELECT 
  id,
  title,
  jsonb_pretty(reanalysis_notes::jsonb) as pareceres_formatados
FROM kanban_cards 
WHERE reanalysis_notes IS NOT NULL
ORDER BY created_at DESC;
```

### **2ï¸âƒ£ Contar pareceres deletados vs ativos:**
```sql
SELECT 
  id,
  title,
  (
    SELECT COUNT(*) 
    FROM jsonb_array_elements(reanalysis_notes::jsonb) as parecer
    WHERE (parecer->>'deleted')::boolean = true
  ) as pareceres_deletados,
  (
    SELECT COUNT(*) 
    FROM jsonb_array_elements(reanalysis_notes::jsonb) as parecer
    WHERE (parecer->>'deleted')::boolean IS NULL 
       OR (parecer->>'deleted')::boolean = false
  ) as pareceres_ativos
FROM kanban_cards 
WHERE reanalysis_notes IS NOT NULL
ORDER BY created_at DESC;
```

### **3ï¸âƒ£ Ver apenas pareceres deletados:**
```sql
SELECT 
  id,
  title,
  parecer->>'text' as texto_parecer,
  parecer->>'author_name' as autor,
  parecer->>'deleted_at' as data_exclusao,
  parecer->>'deleted_by' as usuario_exclusao
FROM kanban_cards,
     jsonb_array_elements(reanalysis_notes::jsonb) as parecer
WHERE (parecer->>'deleted')::boolean = true
ORDER BY parecer->>'deleted_at' DESC;
```

### **4ï¸âƒ£ Ver apenas pareceres ativos:**
```sql
SELECT 
  id,
  title,
  parecer->>'text' as texto_parecer,
  parecer->>'author_name' as autor,
  parecer->>'created_at' as data_criacao
FROM kanban_cards,
     jsonb_array_elements(reanalysis_notes::jsonb) as parecer
WHERE (parecer->>'deleted')::boolean IS NULL 
   OR (parecer->>'deleted')::boolean = false
ORDER BY parecer->>'created_at' DESC;
```

---

## ðŸš€ **ImplementaÃ§Ã£o TÃ©cnica**

### **1ï¸âƒ£ Processo de Soft Delete:**

#### **Frontend (React/TypeScript):**
```typescript
// Marcar parecer como deletado
const updated = currentNotes.map((p: any) => {
  if (p.id === deletingParecerId) {
    return {
      ...p,
      deleted_at: new Date().toISOString(),
      deleted_by: profile?.id,
      deleted: true
    };
  }
  return p;
});

// Salvar no banco
await supabase
  .from('kanban_cards')
  .update({ reanalysis_notes: JSON.stringify(updated) })
  .eq('id', cardId);
```

#### **Filtro no Frontend:**
```typescript
// Carregar apenas pareceres ativos
const activePareceres = migratedList.filter(parecer => !parecer.deleted);
setPareceres(activePareceres);
```

### **2ï¸âƒ£ Vantagens da ImplementaÃ§Ã£o JSON:**

#### **âœ… BenefÃ­cios:**
- **Simplicidade:** NÃ£o precisa de tabela separada
- **Performance:** Dados ficam no mesmo registro do card
- **ConsistÃªncia:** Pareceres sempre ligados ao card
- **Flexibilidade:** Estrutura JSON permite evoluÃ§Ã£o

#### **âš ï¸ ConsideraÃ§Ãµes:**
- **Limite JSON:** PostgreSQL tem limite de tamanho para JSON
- **Queries complexas:** Algumas consultas podem ser mais complexas
- **IndexaÃ§Ã£o:** Menos otimizada que colunas separadas

---

## ðŸ” **SeguranÃ§a e Auditoria**

### **Auditoria Completa:**
- âœ… **Rastreabilidade:** Quem deletou o parecer
- âœ… **Timestamp:** Quando foi deletado
- âœ… **PreservaÃ§Ã£o:** Dados originais mantidos
- âœ… **Reversibilidade:** Possibilidade de restaurar

### **Controle de Acesso:**
- âœ… **RLS:** Row Level Security aplicada na tabela `kanban_cards`
- âœ… **ValidaÃ§Ã£o:** UsuÃ¡rio deve estar autenticado
- âœ… **AutorizaÃ§Ã£o:** Apenas usuÃ¡rios autorizados podem deletar

---

## ðŸ“ˆ **Monitoramento e MÃ©tricas**

### **Queries de Monitoramento:**

#### **Pareceres deletados por perÃ­odo:**
```sql
SELECT 
  DATE(parecer->>'deleted_at') as data_exclusao,
  COUNT(*) as total_deletados
FROM kanban_cards,
     jsonb_array_elements(reanalysis_notes::jsonb) as parecer
WHERE (parecer->>'deleted')::boolean = true
  AND parecer->>'deleted_at' >= '2025-01-01'
GROUP BY DATE(parecer->>'deleted_at')
ORDER BY data_exclusao DESC;
```

#### **UsuÃ¡rios que mais deletam:**
```sql
SELECT 
  parecer->>'deleted_by' as usuario_id,
  COUNT(*) as total_deletados
FROM kanban_cards,
     jsonb_array_elements(reanalysis_notes::jsonb) as parecer
WHERE (parecer->>'deleted')::boolean = true
GROUP BY parecer->>'deleted_by'
ORDER BY total_deletados DESC;
```

---

## ðŸ”„ **MigraÃ§Ã£o e ManutenÃ§Ã£o**

### **MigraÃ§Ã£o de Pareceres Antigos:**
```sql
-- Verificar pareceres sem estrutura de soft delete
SELECT 
  id,
  title,
  jsonb_array_length(reanalysis_notes::jsonb) as total_pareceres
FROM kanban_cards
WHERE reanalysis_notes IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(reanalysis_notes::jsonb) as parecer
    WHERE parecer ? 'deleted'
  );
```

### **Limpeza de Dados (se necessÃ¡rio):**
```sql
-- ATENÃ‡ÃƒO: Esta query remove pareceres deletados permanentemente
-- Use apenas se realmente necessÃ¡rio!
UPDATE kanban_cards 
SET reanalysis_notes = (
  SELECT jsonb_agg(parecer)
  FROM jsonb_array_elements(reanalysis_notes::jsonb) as parecer
  WHERE (parecer->>'deleted')::boolean IS NULL 
     OR (parecer->>'deleted')::boolean = false
)
WHERE reanalysis_notes IS NOT NULL;
```

---

## ðŸ“ **Exemplo PrÃ¡tico**

### **Estado Inicial:**
```json
[
  {
    "id": "parecer1",
    "text": "Parecer inicial",
    "author_name": "Felipe",
    "created_at": "2025-01-08T10:00:00Z"
  },
  {
    "id": "parecer2", 
    "text": "Segundo parecer",
    "author_name": "JoÃ£o",
    "created_at": "2025-01-08T11:00:00Z"
  }
]
```

### **ApÃ³s Soft Delete do parecer2:**
```json
[
  {
    "id": "parecer1",
    "text": "Parecer inicial",
    "author_name": "Felipe",
    "created_at": "2025-01-08T10:00:00Z"
  },
  {
    "id": "parecer2",
    "text": "Segundo parecer", 
    "author_name": "JoÃ£o",
    "created_at": "2025-01-08T11:00:00Z",
    "deleted": true,
    "deleted_at": "2025-01-08T12:00:00Z",
    "deleted_by": "user-123"
  }
]
```

### **Frontend exibe apenas:**
```json
[
  {
    "id": "parecer1",
    "text": "Parecer inicial",
    "author_name": "Felipe",
    "created_at": "2025-01-08T10:00:00Z"
  }
]
```

---

## ðŸŽ¯ **Status da ImplementaÃ§Ã£o**

| Componente | Status | ObservaÃ§Ãµes |
|------------|--------|-------------|
| **Backend (JSON)** | âœ… **Completo** | Estrutura JSON implementada |
| **Frontend (React)** | âœ… **Completo** | Soft delete e filtros |
| **Auditoria** | âœ… **Completo** | Campos de rastreamento |
| **Queries SQL** | âœ… **Completo** | Consultas de anÃ¡lise |
| **DocumentaÃ§Ã£o** | âœ… **Completo** | Este documento |

---

## ðŸ”— **Arquivos Relacionados**

### **Frontend:**
- `src/components/ui/ModalEditarFicha.tsx`
- `src/components/NovaFichaComercialForm.tsx`
- `src/components/ficha/ExpandedFichaPJModal.tsx`

### **Backend:**
- Tabela: `kanban_cards`
- Coluna: `reanalysis_notes` (JSONB)

### **DocumentaÃ§Ã£o:**
- `docs/BACKEND/soft-delete-pareceres.md` (este arquivo)
- `docs/FUNCOES/soft-delete-kanban-cards.md`

---

## ðŸ“š **ReferÃªncias**

- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [JSONB vs JSON in PostgreSQL](https://www.postgresql.org/docs/current/datatype-json.html)
- [Row Level Security (RLS)](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**ðŸ“… Ãšltima atualizaÃ§Ã£o:** 2025-01-08  
**ðŸ‘¤ Desenvolvido por:** Sistema MZ Software  
**ðŸ”– VersÃ£o:** 1.0.0
