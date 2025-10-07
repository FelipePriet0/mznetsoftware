# 🔧 **Correção da Organização do Storage**

## 🚨 **Problema Identificado**

Analisando a imagem do Supabase Storage, vejo que:

1. **Arquivos na raiz:** Muitos arquivos estão diretamente em `card-attachments/` em vez de estarem em `card-attachments/[CARD_TITLE]/`
2. **Estrutura incorreta:** Alguns arquivos não seguem o padrão `[CARD_TITLE]/[FILE_NAME]`
3. **Pasta duplicada:** Existe uma pasta `card-attachments` dentro do próprio bucket

## 🎯 **Estrutura Desejada**

```
Storage: card-attachments/
│
├── ANTONIO_BOZUTT/
│   ├── CNH_Titular_2025-01-07_a3f2k1.pdf
│   ├── Comprovante_Renda_2025-01-07_b7m9n2.pdf
│   └── Foto_Residencia_2025-01-08_c4p5q3.jpg
│
├── MARIA_SANTOS/
│   ├── RG_Titular_2025-01-07_d8r4s2.pdf
│   └── Contrato_Social_2025-01-08_e9t6u1.pdf
│
└── EMPRESA_XYZ_LTDA/
    ├── CNPJ_Empresa_2025-01-08_f1v7w3.pdf
    └── Balanco_Anual_2025-01-09_g2x8y4.pdf
```

---

## 🔧 **Solução Passo a Passo**

### **Passo 1: Execute o Script de Correção no Supabase**

1. **Abra o Supabase Dashboard**
2. **Vá para SQL Editor**
3. **Execute o script:** `supabase/fix-storage-organization.sql`

Este script irá:
- ✅ Identificar arquivos mal organizados
- ✅ Corrigir `file_path` no banco de dados
- ✅ Criar função de validação
- ✅ Atualizar cards sem título

### **Passo 2: Execute o Script de Limpeza**

1. **Execute o script:** `supabase/cleanup-orphaned-files.sql`
2. **Analise os resultados** para identificar:
   - Arquivos duplicados
   - Paths incorretos
   - Estatísticas de organização

### **Passo 3: Limpeza Manual no Storage (se necessário)**

Se ainda houver arquivos órfãos no Storage:

1. **Abra Storage → card-attachments**
2. **Identifique arquivos na raiz** (fora das pastas dos cards)
3. **Mova manualmente** para a pasta correta do card
4. **Delete a pasta `card-attachments` duplicada** se existir

---

## 🛠️ **Código Frontend Atualizado**

### **Validações Adicionadas no `useAttachments.ts`:**

```typescript
// Ensure card title is properly sanitized and not empty
let cardTitle = cardData?.title ? cardData.title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'CARDS_SEM_TITULO';
if (!cardTitle || cardTitle === 'Card' || cardTitle === '') {
  cardTitle = 'CARDS_SEM_TITULO';
}

// Ensure filePath always follows the pattern: CARD_TITLE/FILE_NAME
const filePath = `${cardTitle}/${fileName}`;

// Debug log to verify path structure
console.log('🔍 DEBUG Storage Path:', {
  cardTitle,
  fileName,
  filePath,
  originalCardTitle: cardData?.title
});
```

### **Melhorias Implementadas:**

1. **✅ Validação de título do card**
2. **✅ Fallback para cards sem título**
3. **✅ Debug logs para monitoramento**
4. **✅ Garantia de estrutura correta**

---

## 📊 **Scripts de Monitoramento**

### **1. Verificar Status da Organização:**

```sql
SELECT * FROM public.storage_organization_status;
```

### **2. Listar Arquivos Mal Organizados:**

```sql
SELECT * FROM public.validate_storage_structure();
```

### **3. Estatísticas por Card:**

```sql
SELECT 
  card_title,
  COUNT(*) as file_count,
  MIN(created_at) as first_file,
  MAX(created_at) as last_file
FROM card_attachments 
GROUP BY card_title
ORDER BY file_count DESC;
```

---

## 🔍 **Verificação Pós-Correção**

### **No Supabase Storage:**
1. **Abra:** Storage → card-attachments
2. **Verifique se:**
   - ✅ Não há arquivos na raiz
   - ✅ Todos os arquivos estão em pastas de cards
   - ✅ Não há pasta `card-attachments` duplicada
   - ✅ Estrutura: `[CARD_TITLE]/[FILE_NAME]`

### **No Console do Navegador:**
1. **Abra F12 → Console**
2. **Faça upload de um novo arquivo**
3. **Verifique o log:**
   ```
   🔍 DEBUG Storage Path: {
     cardTitle: "ANTONIO_BOZUTT",
     fileName: "CNH_Titular_2025-01-07_a3f2k1.pdf",
     filePath: "ANTONIO_BOZUTT/CNH_Titular_2025-01-07_a3f2k1.pdf",
     originalCardTitle: "ANTONIO BOZUTT"
   }
   ```

---

## 🚨 **Problemas Conhecidos e Soluções**

### **Problema 1: Arquivos na Raiz**
**Causa:** Uploads antigos antes da implementação de pastas
**Solução:** Script `fix-storage-organization.sql` corrige automaticamente

### **Problema 2: Cards sem Título**
**Causa:** Cards criados sem título ou com título vazio
**Solução:** Arquivos vão para pasta `CARDS_SEM_TITULO/`

### **Problema 3: Pasta Duplicada**
**Causa:** Bug em versão anterior do código
**Solução:** Remoção manual da pasta `card-attachments` dentro do bucket

### **Problema 4: Paths com Prefixo Duplicado**
**Causa:** `card-attachments/ANTONIO_BOZUTT/` em vez de `ANTONIO_BOZUTT/`
**Solução:** Script corrige automaticamente removendo prefixo

---

## ✅ **Checklist de Verificação**

### **Backend (Supabase):**
- [ ] Script `fix-storage-organization.sql` executado
- [ ] Script `cleanup-orphaned-files.sql` executado
- [ ] View `storage_organization_status` criada
- [ ] Função `validate_storage_structure` criada

### **Frontend:**
- [ ] Código `useAttachments.ts` atualizado
- [ ] Validações de título implementadas
- [ ] Debug logs funcionando
- [ ] Novos uploads seguem estrutura correta

### **Storage:**
- [ ] Não há arquivos na raiz do bucket
- [ ] Todos os arquivos estão em pastas de cards
- [ ] Estrutura: `[CARD_TITLE]/[FILE_NAME]`
- [ ] Não há pastas duplicadas

---

## 🎯 **Resultado Esperado**

Após executar todos os passos:

```
✅ Storage organizado por cards
✅ Novos uploads seguem padrão correto
✅ Arquivos antigos corrigidos
✅ Monitoramento implementado
✅ Debug logs ativos
```

---

## 📞 **Suporte**

### **Se algo não funcionar:**

1. **Verifique os logs do console** para debug
2. **Execute as queries de monitoramento** para diagnóstico
3. **Verifique se os scripts SQL foram executados** corretamente
4. **Confirme que não há erros** no Supabase Dashboard

### **Queries de Diagnóstico:**

```sql
-- Ver organização atual
SELECT * FROM public.storage_organization_status;

-- Ver problemas identificados
SELECT * FROM public.validate_storage_structure();

-- Ver últimos uploads
SELECT 
  file_path,
  file_name,
  card_title,
  created_at
FROM card_attachments 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🚀 **Próximos Passos**

1. **Execute os scripts SQL** no Supabase
2. **Teste upload de novo arquivo** para verificar estrutura
3. **Verifique organização** no Storage Dashboard
4. **Monitore logs** no console do navegador

**Organização do Storage será corrigida e mantida automaticamente! 🎯**
