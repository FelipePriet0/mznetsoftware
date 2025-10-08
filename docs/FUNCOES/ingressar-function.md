# ðŸ“‹ DocumentaÃ§Ã£o: FunÃ§Ã£o "Ingressar" no Sistema Kanban

## ðŸŽ¯ **VisÃ£o Geral**
A funÃ§Ã£o "Ingressar" permite que usuÃ¡rios (Analistas/Gestores) assumam responsabilidade por uma ficha comercial, movendo-a para a Ã¡rea de anÃ¡lise e atribuindo-a a si mesmos como responsÃ¡veis.

---

## ðŸ”§ **LocalizaÃ§Ã£o no Frontend**

### **Arquivo Principal**
```
src/components/KanbanBoard.tsx
```

### **FunÃ§Ã£o Principal**
```typescript
const handleIngressar = async (card: CardItem) => {
  // Linha 978-1009
}
```

### **Componente Visual**
```
src/components/ficha/OptimizedKanbanCard.tsx
```
- **BotÃ£o "Ingressar"**: Aparece nos cards comerciais quando o usuÃ¡rio tem permissÃ£o
- **Ãcone**: `UserPlus` do Lucide React
- **CondiÃ§Ã£o de exibiÃ§Ã£o**: `canIngressar(card, profile)`

### **Controle de PermissÃµes**
```
src/lib/access.ts
```
- **FunÃ§Ã£o**: `canIngressar(profile)`
- **Regra**: Gestores e Analistas podem ingressar

---

## ðŸ—„ï¸ **LocalizaÃ§Ã£o no Backend**

### **FunÃ§Ã£o RPC**
```
supabase/migrations/20250103000000_create_kanban_cards_and_change_stage.sql
```
- **FunÃ§Ã£o**: `public.change_stage()`
- **Linhas**: 89-127

### **Tabelas Envolvidas**
1. **`kanban_cards`** - Armazena o estado da ficha
2. **`profiles`** - ReferÃªncia do usuÃ¡rio responsÃ¡vel

---

## âš™ï¸ **Como Funciona**

### **Fluxo Completo**
1. **UsuÃ¡rio clica** no botÃ£o "Ingressar" no card
2. **Frontend chama** `handleIngressar(card)`
3. **Backend executa** `change_stage()` RPC:
   - Move `area` de `'comercial'` para `'analise'`
   - Move `stage` para `'em_analise'`
4. **Frontend chama** `setResponsavel(card.id, profile.id)`:
   - Salva `assignee_id` na tabela `kanban_cards`
   - Atualiza estado local do React
5. **UI atualiza** automaticamente:
   - Card muda de coluna no Kanban
   - Nome do responsÃ¡vel aparece no card

### **PermissÃµes**
- **Analistas**: Podem ingressar em fichas comerciais
- **Gestores**: Podem ingressar em qualquer ficha
- **Vendedores**: NÃ£o podem ingressar

---

## ðŸ“Š **Estrutura de Dados**

### **Tabela `kanban_cards`**
```sql
-- Campos modificados pela funÃ§Ã£o:
area: 'comercial' â†’ 'analise'
stage: 'entrada' â†’ 'em_analise'  
assignee_id: NULL â†’ [uuid do usuÃ¡rio]
updated_at: timestamp atualizado
```

### **FunÃ§Ã£o RPC `change_stage`**
```sql
change_stage(
  p_card_id: uuid,      -- ID da ficha
  p_to_area: 'analise', -- Nova Ã¡rea
  p_to_stage: 'em_analise', -- Novo stage
  p_comment: 'Ingresso realizado' -- ComentÃ¡rio de auditoria
)
```

---

## ðŸš¨ **Regras de NegÃ³cio**

### **ValidaÃ§Ãµes**
1. **Ãrea vÃ¡lida**: Deve ser `'analise'` ou `'comercial'`
2. **Stage vÃ¡lido**: Para anÃ¡lise: `'recebido', 'em_analise', 'reanalise', 'aprovado', 'negado', 'finalizado'`
3. **Card existe**: Verifica se o card existe antes de atualizar
4. **UsuÃ¡rio autenticado**: RLS garante que apenas usuÃ¡rios logados podem executar

### **RLS Policies**
```sql
-- kanban_cards
- SELECT: Todos podem ver
- INSERT/UPDATE/DELETE: Apenas usuÃ¡rios autenticados
```

---

## ðŸ” **FunÃ§Ãµes Relacionadas**

### **Frontend**
- **`setResponsavel()`**: Atribui responsÃ¡vel apÃ³s mudanÃ§a de stage
- **`loadApplications()`**: Recarrega dados do banco
- **`canIngressar()`**: Verifica permissÃµes do usuÃ¡rio

### **Backend**
- **`update_kanban_cards_updated_at()`**: Trigger que atualiza timestamp
- **`route_application()`**: FunÃ§Ã£o para roteamento automÃ¡tico (futuro)

---

## ðŸ› **Troubleshooting**

### **Erro 400 - Bad Request**
- **Causa**: FunÃ§Ã£o RPC `change_stage` nÃ£o encontrada
- **SoluÃ§Ã£o**: Verificar se a migration foi executada

### **assignee_id permanece NULL**
- **Causa**: `setResponsavel()` nÃ£o foi chamado apÃ³s `change_stage()`
- **SoluÃ§Ã£o**: Verificar se `handleIngressar()` chama ambas as funÃ§Ãµes

### **Card nÃ£o muda de coluna**
- **Causa**: Estado local nÃ£o foi atualizado
- **SoluÃ§Ã£o**: Verificar se `loadApplications()` foi chamado

---

## ðŸ“ **Exemplo de Uso**

```typescript
// No frontend - quando usuÃ¡rio clica "Ingressar"
const card = { id: 'uuid-123', area: 'comercial', stage: 'entrada' };
await handleIngressar(card);

// Resultado esperado:
// - card.area = 'analise'
// - card.stage = 'em_analise'  
// - card.assignee_id = [uuid do usuÃ¡rio atual]
```

---

## ðŸ”® **Melhorias Futuras**
1. **NotificaÃ§Ãµes**: Avisar quando ficha Ã© atribuÃ­da
2. **HistÃ³rico**: Log de mudanÃ§as de responsÃ¡vel
3. **Auto-rotaÃ§Ã£o**: DistribuiÃ§Ã£o automÃ¡tica de fichas
4. **MÃ©tricas**: Tempo mÃ©dio de anÃ¡lise por responsÃ¡vel

---

## ðŸ“‹ **CÃ³digo Fonte**

### **handleIngressar (Frontend)**
```typescript
const handleIngressar = async (card: CardItem) => {
  try {
    // 1. Primeiro muda o stage
    const { error } = await (supabase as any).rpc('change_stage', {
      p_card_id: card.id,
      p_to_area: 'analise',
      p_to_stage: 'em_analise',
      p_comment: 'Ingresso realizado',
    });

    if (error) throw error;
    
    // 2. Depois atribui o responsÃ¡vel (usuÃ¡rio atual)
    if (profile?.id) {
      await setResponsavel(card.id, profile.id);
    }
    
    toast({
      title: "Sucesso",
      description: "Ficha movida para Em AnÃ¡lise e atribuÃ­da",
    });
  } catch (error) {
    toast({
      title: "Erro",
      description: "Erro ao ingressar na ficha",
      variant: "destructive",
    });
  }
};
```

### **change_stage (Backend)**
```sql
CREATE OR REPLACE FUNCTION public.change_stage(
  p_card_id uuid,
  p_to_area text,
  p_to_stage text,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate parameters
  IF p_to_area NOT IN ('analise', 'comercial') THEN
    RAISE EXCEPTION 'Invalid area: %', p_to_area;
  END IF;

  -- Update the card
  UPDATE public.kanban_cards
  SET 
    area = p_to_area,
    stage = p_to_stage,
    updated_at = now()
  WHERE id = p_card_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found: %', p_card_id;
  END IF;
END;
$$;
```

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Sistema de Tarefas, Sistema de Anexos, Sistema de ComentÃ¡rios
