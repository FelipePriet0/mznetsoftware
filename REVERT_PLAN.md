# 🔄 Plano de Reversão - Sistema de Tarefas

## 🚨 Problemas Identificados:
1. **Botões de excluir e responder** dos pareceres sumiram
2. **Funcionalidades quebradas** após implementação do sistema de tarefas
3. **Layout desorganizado**

## 📋 Arquivos que Precisam ser Revertidos:

### 1. **src/components/comments/CommentContentRenderer.tsx**
- ❌ **REVERTER**: Remover toda lógica de tarefas
- ✅ **MANTER**: Apenas renderização de anexos
- ✅ **RESTAURAR**: Funcionalidade original

### 2. **src/components/ui/ObservationsWithComments.tsx**
- ❌ **REVERTER**: Remover botão "Adicionar Tarefa"
- ❌ **REVERTER**: Remover AddTaskModal
- ✅ **MANTER**: Apenas botão "Anexo"
- ✅ **RESTAURAR**: Layout original

### 3. **src/components/comments/CommentsList.tsx**
- ❌ **REVERTER**: Remover botão "Criar Tarefa" no campo de resposta
- ❌ **REVERTER**: Remover AddTaskModal
- ✅ **MANTER**: Apenas botão "Anexo" no campo de resposta
- ✅ **RESTAURAR**: Funcionalidade original

### 4. **src/hooks/useTasks.ts**
- ❌ **REVERTER**: Remover completamente (arquivo inteiro)
- ✅ **REVERTER**: Não usar em nenhum lugar

### 5. **src/types/tasks.ts**
- ❌ **REVERTER**: Remover completamente (arquivo inteiro)

### 6. **src/components/tasks/**
- ❌ **REVERTER**: Remover pasta inteira
- ❌ **REVERTER**: AddTaskModal.tsx

### 7. **src/pages/Tarefas.tsx**
- ❌ **REVERTER**: Remover completamente (arquivo inteiro)

### 8. **src/App.tsx**
- ❌ **REVERTER**: Remover rota `/tarefas`

### 9. **src/components/app-sidebar.tsx**
- ❌ **REVERTER**: Remover item "Tarefas" do menu

## 🎯 Estratégia de Reversão:

### **Fase 1: Remover Sistema de Tarefas**
1. Deletar arquivos de tarefas
2. Remover imports e referências
3. Reverter componentes modificados

### **Fase 2: Restaurar Funcionalidades Originais**
1. Verificar se botões de excluir/responder estão funcionando
2. Testar funcionalidade de anexos
3. Verificar layout geral

### **Fase 3: Implementação Futura (Opcional)**
1. Implementar apenas o checkbox simples
2. Sem modificar funcionalidades existentes
3. Apenas adicionar, não modificar

## ⚠️ **ATENÇÃO**: 
- **Fazer backup** antes de reverter
- **Testar** cada etapa
- **Verificar** se nada quebrou
- **Documentar** mudanças feitas

## 🎯 **Objetivo Final**:
- ✅ Botões de excluir/responder funcionando
- ✅ Layout organizado
- ✅ Funcionalidades originais restauradas
- ✅ Apenas checkbox simples para tarefas (se necessário)
