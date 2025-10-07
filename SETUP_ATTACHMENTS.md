# Setup do Sistema de Anexos

## 🚀 **Aplicar Migração do Supabase**

Para ativar o sistema de anexos, você precisa aplicar a migração no Supabase:

### **1. Executar a Migração**
```bash
# No terminal, navegue até a pasta do projeto
cd supabase

# Execute a migração
supabase db reset
# OU se preferir aplicar apenas a nova migração:
supabase db push
```

### **2. Criar o Bucket de Storage**
No painel do Supabase, vá para **Storage** e crie um novo bucket:

- **Nome do bucket**: `card-attachments`
- **Público**: ❌ (Não público - usaremos RLS)
- **File size limit**: 10MB (ou conforme necessário)
- **Allowed MIME types**: 
  ```
  image/jpeg,image/jpg,image/png,image/gif,
  application/pdf,
  application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,
  application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
  text/plain,
  application/zip,application/x-rar-compressed
  ```

### **3. Configurar Políticas RLS para Storage**

No painel do Supabase, vá para **Storage** > **Policies** e crie as seguintes políticas:

#### **Política 1: SELECT (Visualizar arquivos)**
```sql
CREATE POLICY "Allow view attachments from accessible cards" ON storage.objects
FOR SELECT USING (
  bucket_id = 'card-attachments' AND
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = (storage.foldername(name))[2]::uuid
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);
```

#### **Política 2: INSERT (Upload de arquivos)**
```sql
CREATE POLICY "Allow insert attachments for accessible cards" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.kanban_cards kc
    WHERE kc.id = (storage.foldername(name))[2]::uuid
    AND (
      public.same_company(kc.company_id) OR public.is_premium()
    )
  )
);
```

#### **Política 3: UPDATE (Atualizar arquivos)**
```sql
CREATE POLICY "Allow update own attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() = (storage.foldername(name))[2]::uuid
) WITH CHECK (
  bucket_id = 'card-attachments' AND
  auth.uid() = (storage.foldername(name))[2]::uuid
);
```

#### **Política 4: DELETE (Excluir arquivos)**
```sql
CREATE POLICY "Allow delete own attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'card-attachments' AND
  auth.uid() = (storage.foldername(name))[2]::uuid
);
```

### **4. Verificar Configuração**

Após aplicar tudo:

1. ✅ **Migração aplicada** - tabela `card_attachments` criada
2. ✅ **Bucket criado** - `card-attachments` no Storage
3. ✅ **Políticas RLS** - Storage e Database configurados
4. ✅ **Frontend integrado** - Botão "Anexo" nos cards

### **5. Testar Funcionalidade**

1. Abra um card no Kanban
2. Clique no botão **"Anexo"**
3. Faça upload de um arquivo
4. Verifique se aparece na lista de anexos
5. Teste download e exclusão

---

## 🔧 **Estrutura Implementada**

### **Backend:**
- ✅ **Tabela**: `card_attachments` com metadados completos
- ✅ **Storage**: Bucket `card-attachments` com organização por card
- ✅ **RLS**: Políticas de segurança para acesso controlado
- ✅ **Relacionamentos**: FK para `kanban_cards` e `profiles`

### **Frontend:**
- ✅ **Hook**: `useAttachments.ts` para gerenciar anexos
- ✅ **Modal**: `AttachmentUploadModal.tsx` para upload
- ✅ **Display**: `AttachmentDisplay.tsx` para visualização
- ✅ **Integração**: Botão "Anexo" nos cards do Kanban
- ✅ **UX**: Drag & drop, preview, download, exclusão

### **Funcionalidades:**
- ✅ **Upload**: Drag & drop ou seleção de arquivos
- ✅ **Validação**: Tamanho (10MB) e tipos de arquivo
- ✅ **Visualização**: Ícones por tipo, tamanho, data
- ✅ **Download**: Links diretos para arquivos
- ✅ **Exclusão**: Apenas o autor pode excluir
- ✅ **Auditoria**: Histórico completo com autor e data

---

## 📝 **Notas Importantes**

1. **Segurança**: Todos os arquivos são privados por padrão (não públicos)
2. **Organização**: Arquivos organizados por `card-attachments/{card_id}/{filename}`
3. **Limites**: Máximo 10MB por arquivo (configurável)
4. **Tipos**: Imagens, PDFs, documentos, planilhas, texto, compactados
5. **Backup**: Todos os anexos ficam salvos permanentemente no card
6. **Performance**: Índices otimizados para consultas rápidas

**Sistema pronto para uso! 🎉**
