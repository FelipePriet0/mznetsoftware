# Setup: Sistema de Conversas Co-Relacionadas (Comentários)

## 📋 Pré-requisitos
- Sistema de anexos já configurado e funcionando
- Tabelas `kanban_cards` e `profiles` existentes
- RLS configurado para `kanban_cards`

## 🗄️ Backend Setup

### 1. Aplicar Migração SQL
Execute a migração SQL para criar a tabela de comentários:

```bash
# No Supabase Dashboard > SQL Editor, execute:
supabase/migrations/20250103020000_add_card_comments.sql
```

### 2. Verificar RLS Policies
As políticas RLS são criadas automaticamente pela migração:
- ✅ `card_comments_select_all` - SELECT para todos os usuários autenticados
- ✅ `card_comments_insert_authenticated` - INSERT para usuários autenticados  
- ✅ `card_comments_update_author` - UPDATE apenas pelo autor
- ✅ `card_comments_delete_author` - DELETE apenas pelo autor

### 3. Testar Functions
Verifique se as funções foram criadas:
```sql
-- Testar função de hierarquia
SELECT * FROM get_card_comments_with_hierarchy('card-uuid-here');

-- Testar função de thread
SELECT * FROM get_comment_thread('comment-uuid-here');
```

## 🎨 Frontend Integration

### 1. Componentes Criados
- ✅ `src/components/comments/CommentItem.tsx` - Componente individual de comentário
- ✅ `src/components/comments/CommentsList.tsx` - Lista organizada de comentários
- ✅ `src/hooks/useComments.ts` - Hook para gerenciar comentários
- ✅ `src/components/ui/ObservationsWithComments.tsx` - Integração no modal

### 2. Arquivos Atualizados
- ✅ `src/components/ui/ModalEditarFicha.tsx` - Integrado novo sistema
- ✅ `BACKEND.md` - Documentação atualizada

### 3. Estrutura Visual Implementada
- 🔵 **Comentário Principal** (nível 0) - Borda azul
- 🔴 **Resposta Nível 1** (nível 1) - Borda vermelha  
- 🟢 **Sub-resposta Nível 2** (nível 2) - Borda verde

## 🚀 Funcionalidades

### ✅ Implementadas
1. **Sistema Hierárquico**: Comentários organizados em árvore
2. **Botão Responder**: Ícone ↩️ em cada comentário
3. **Visual Distinto**: Cores diferentes por nível
4. **Integração de Anexos**: Cada comentário pode ter anexos
5. **Persistência**: Dados salvos no Supabase
6. **RLS Seguro**: Acesso controlado por usuário

### 🔄 Fluxo de Uso
1. Usuário abre modal "Editar Ficha"
2. Na seção "Observações e Conversas":
   - Campo original mantido para compatibilidade
   - Botão "Ver Conversas" mostra sistema de comentários
   - Botão "Nova Conversa" inicia nova thread
3. Em cada comentário:
   - Botão "Anexo" para arquivos
   - Botão "Adicionar Tarefa" (placeholder)
   - Botão "Responder" (↩️) para respostas
4. Sistema organiza visualmente por cores e indentação

## 🔧 Configurações Adicionais

### Notificações (Pendente)
Para implementar notificações automáticas:
1. Criar função RPC `notify_comment_mention`
2. Trigger na tabela `card_comments` para detectar @menções
3. Integrar com sistema de notificações existente

### Permissões Avançadas
Para ajustar quem pode responder:
- Modificar RLS policies conforme necessário
- Adicionar validação de nível máximo no frontend
- Implementar moderação de comentários se necessário

## 🧪 Testes

### Teste Básico
1. Abrir modal de edição de qualquer card
2. Clicar em "Nova Conversa"
3. Digitar comentário e salvar
4. Verificar se aparece com borda azul
5. Clicar no botão ↩️ para responder
6. Verificar se resposta aparece com borda vermelha
7. Testar anexos em comentários

### Teste de Hierarquia
1. Criar comentário principal
2. Responder ao comentário (nível 1)
3. Responder à resposta (nível 2)
4. Verificar cores: azul → vermelho → verde
5. Verificar indentação visual

## 📝 Notas Técnicas

### Limitações Atuais
- Máximo 3 níveis de profundidade (0, 1, 2)
- Sem sistema de notificações automáticas
- Sem edição de comentários existentes
- Sem moderação ou aprovação

### Extensões Futuras
- Sistema de notificações com @menções
- Edição de comentários (com histórico)
- Moderação e aprovação
- Busca dentro de comentários
- Exportação de conversas

## 🆘 Troubleshooting

### Erro: "card_comments table doesn't exist"
- Verificar se a migração foi executada
- Confirmar permissões no Supabase

### Erro: "RLS policy violation"
- Verificar se usuário está autenticado
- Confirmar policies RLS estão ativas

### Comentários não aparecem
- Verificar se `cardId` está correto
- Confirmar se dados estão sendo carregados no hook `useComments`

### Anexos não funcionam em comentários
- Verificar se `useAttachments` está usando ID do comentário
- Confirmar se Storage bucket está configurado
