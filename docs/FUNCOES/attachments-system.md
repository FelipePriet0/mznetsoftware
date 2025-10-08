# ðŸ“Ž DocumentaÃ§Ã£o: Sistema de Anexos

## ðŸŽ¯ **VisÃ£o Geral**
O Sistema de Anexos permite anexar arquivos (PDFs, imagens, documentos) Ã s fichas do Kanban atravÃ©s de conversas encadeadas. Os arquivos sÃ£o armazenados no Supabase Storage e organizados por `card_id` para garantir robustez.

---

## ðŸ”§ **LocalizaÃ§Ã£o no Frontend**

### **Hook Principal**
```
src/hooks/useAttachments.ts
```
- **FunÃ§Ã£o**: Gerenciamento completo de anexos
- **OperaÃ§Ãµes**: Upload, download, delete, listagem
- **Recursos**: Soft delete, validaÃ§Ã£o de arquivos, busca por padrÃµes

### **Componentes**
```
src/components/attachments/
â”œâ”€â”€ AttachmentUploadModal.tsx    # Modal para upload de arquivos
â”œâ”€â”€ AttachmentDisplay.tsx        # ExibiÃ§Ã£o de anexos existentes
â””â”€â”€ DeleteAttachmentDialog.tsx   # ConfirmaÃ§Ã£o de exclusÃ£o
```

### **IntegraÃ§Ã£o com ComentÃ¡rios**
```
src/components/comments/
â”œâ”€â”€ CommentsList.tsx             # CTA "Anexo" nas conversas
â”œâ”€â”€ CommentContentRenderer.tsx   # RenderizaÃ§Ã£o de anexos
â””â”€â”€ AttachmentCard.tsx           # Card individual de anexo
```

### **Interfaces TypeScript**
```typescript
interface CardAttachment {
  id: string;
  card_id: string;
  author_id: string;
  author_name: string;
  author_role?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_extension: string;
  description?: string;
  comment_id?: string;
  created_at: string;
  updated_at: string;
}
```

---

## ðŸ—„ï¸ **LocalizaÃ§Ã£o no Backend**

### **Tabela Principal**
```sql
-- Tabela: card_attachments
CREATE TABLE public.card_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  author_name text NOT NULL,
  author_role text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  file_extension text NOT NULL,
  description text,
  comment_id uuid REFERENCES public.card_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,  -- Soft delete
  deleted_by uuid REFERENCES public.profiles(id)  -- Soft delete
);
```

### **Supabase Storage**
- **Bucket**: `card-attachments`
- **Estrutura**: `{card_id}/{file_name}_{date}_{random}.{ext}`
- **Exemplo**: `uuid-card-123/DOCUMENTO_2025-01-08_abc123.pdf`

### **Arquivos de Setup**
```
supabase/
â”œâ”€â”€ create-card-attachments-complete.sql
â”œâ”€â”€ implement-attachment-access-control.sql
â””â”€â”€ improve-attachments-system.sql
```

---

## âš™ï¸ **Como Funciona**

### **Fluxo de Upload**
1. **UsuÃ¡rio clica** em "Anexo" no campo de comentÃ¡rios
2. **Modal abre** (`AttachmentUploadModal`) com:
   - Drag & drop ou seleÃ§Ã£o de arquivos
   - ValidaÃ§Ã£o de tipo e tamanho
   - Campo para nome personalizado
   - Campo para descriÃ§Ã£o opcional
3. **ValidaÃ§Ãµes**:
   - Tamanho mÃ¡ximo: 10MB
   - Tipos permitidos: imagens, PDF, documentos, planilhas, texto, compactados
   - Nome personalizado obrigatÃ³rio
4. **Upload**:
   - Arquivo salvo no Supabase Storage
   - Metadados salvos na tabela `card_attachments`
   - Anexo aparece na conversa encadeada

### **Fluxo de Download/Preview**
1. **UsuÃ¡rio clica** no anexo na conversa
2. **Sistema busca** URL de download do arquivo
3. **Fallback inteligente**:
   - Tenta path original primeiro
   - Busca por padrÃµes similares
   - Testa caminhos alternativos
   - Lista arquivos conhecidos
4. **Abre** arquivo em nova aba ou download

### **Fluxo de ExclusÃ£o**
1. **UsuÃ¡rio clica** nos 3 pontos do anexo
2. **ConfirmaÃ§Ã£o** aparece (soft delete)
3. **Sistema marca** `deleted_at` e `deleted_by`
4. **Arquivo permanece** no storage por 90 dias
5. **Limpeza automÃ¡tica** remove arquivo apÃ³s perÃ­odo

---

## ðŸ“Š **Estrutura de Dados**

### **Storage Path Structure**
```
card-attachments/
â”œâ”€â”€ {card_id}/
â”‚   â”œâ”€â”€ DOCUMENTO_2025-01-08_abc123.pdf
â”‚   â”œâ”€â”€ IMAGEM_2025-01-08_def456.jpg
â”‚   â””â”€â”€ PLANILHA_2025-01-08_ghi789.xlsx
â””â”€â”€ {outro_card_id}/
    â””â”€â”€ OUTRO_DOC_2025-01-08_jkl012.pdf
```

### **Metadados no Banco**
```sql
INSERT INTO card_attachments (
  card_id,           -- UUID do card
  author_id,         -- UUID do usuÃ¡rio que fez upload
  author_name,       -- Nome do usuÃ¡rio
  author_role,       -- Role do usuÃ¡rio
  file_name,         -- Nome original do arquivo
  file_path,         -- Caminho no storage
  file_size,         -- Tamanho em bytes
  file_type,         -- MIME type
  file_extension,    -- ExtensÃ£o do arquivo
  description,       -- DescriÃ§Ã£o opcional
  comment_id         -- UUID do comentÃ¡rio (se aplicÃ¡vel)
);
```

---

## ðŸš¨ **Regras de NegÃ³cio**

### **PermissÃµes**
- **Upload**: Qualquer usuÃ¡rio autenticado
- **Download/Preview**: Qualquer usuÃ¡rio autenticado (sem RLS)
- **Delete**: Apenas o autor do anexo ou gestores

### **ValidaÃ§Ãµes de Arquivo**
- **Tamanho mÃ¡ximo**: 10MB
- **Tipos permitidos**:
  - Imagens: JPEG, PNG, GIF
  - Documentos: PDF, DOC, DOCX
  - Planilhas: XLS, XLSX
  - Texto: TXT
  - Compactados: ZIP, RAR
- **Nome personalizado**: ObrigatÃ³rio (nÃ£o pode ser vazio)

### **Soft Delete**
- **ExclusÃ£o**: Marca `deleted_at` e `deleted_by`
- **RetenÃ§Ã£o**: 90 dias no storage
- **Auditoria**: Log em `deletion_log`
- **Limpeza**: FunÃ§Ã£o automÃ¡tica remove arquivos antigos

---

## ðŸ” **FunÃ§Ãµes Principais**

### **useAttachments Hook**
```typescript
const {
  attachments,          // Lista de anexos
  isLoading,           // Estado de carregamento
  isUploading,         // Estado de upload
  loadAttachments,     // Recarregar anexos
  uploadAttachment,    // Upload de novo arquivo
  deleteAttachment,    // Soft delete do anexo
  getDownloadUrl,      // Obter URL de download
  getAttachmentHistory, // HistÃ³rico de anexos
  getCurrentAttachments, // Anexos atuais
  getAttachmentStats,  // EstatÃ­sticas
  formatFileSize,      // Formatar tamanho
  getFileIcon          // Ãcone do arquivo
} = useAttachments(cardId);
```

### **FunÃ§Ãµes de Busca Inteligente**
- **`getDownloadUrl()`**: Busca arquivo com fallbacks
- **`findFileWithAlternativePaths()`**: Testa caminhos alternativos
- **`listAllFiles()`**: Lista todos os arquivos (debug)

---

## ðŸ› **Troubleshooting**

### **Arquivo nÃ£o encontrado (404)**
- **Causa**: Path incorreto no banco de dados
- **SoluÃ§Ã£o**: Sistema tenta automaticamente caminhos alternativos
- **Debug**: Verificar logs do `getDownloadUrl()`

### **Upload falha**
- **Causa**: Arquivo muito grande ou tipo nÃ£o permitido
- **SoluÃ§Ã£o**: Verificar validaÃ§Ãµes no `AttachmentUploadModal`

### **Anexo nÃ£o aparece**
- **Causa**: Tabela `card_attachments` nÃ£o existe
- **SoluÃ§Ã£o**: Executar scripts de setup do sistema

### **Erro de permissÃ£o no storage**
- **Causa**: RLS policy muito restritiva
- **SoluÃ§Ã£o**: Verificar polÃ­ticas do bucket `card-attachments`

---

## ðŸ“ **Exemplo de Uso**

### **Upload de Arquivo**
```typescript
const { uploadAttachment } = useAttachments(cardId);

await uploadAttachment({
  file: selectedFile,
  description: 'Documento de identidade',
  customFileName: 'RG_Cliente_JoÃ£o_Silva'
});
```

### **Download de Arquivo**
```typescript
const { getDownloadUrl } = useAttachments(cardId);

const downloadUrl = await getDownloadUrl(attachment.file_path);
if (downloadUrl) {
  window.open(downloadUrl, '_blank');
}
```

### **ExclusÃ£o de Anexo**
```typescript
const { deleteAttachment } = useAttachments(cardId);

await deleteAttachment(attachmentId);
```

---

## ðŸŽ¨ **Interface do UsuÃ¡rio**

### **Modal de Upload**
- **Drag & Drop**: Ãrea para arrastar arquivos
- **SeleÃ§Ã£o**: BotÃ£o para escolher arquivos
- **ValidaÃ§Ã£o**: Feedback em tempo real
- **Campos**:
  - Nome personalizado (obrigatÃ³rio)
  - DescriÃ§Ã£o (opcional)
- **BotÃµes**: Cancelar (cinza) e Anexar (verde)

### **ExibiÃ§Ã£o de Anexos**
- **Ãcone**: Baseado na extensÃ£o do arquivo
- **InformaÃ§Ãµes**: Nome, tamanho, autor, data
- **AÃ§Ãµes**: Download/Preview, Excluir (3 pontos)
- **Status**: Indicador visual para arquivos deletados

### **IntegraÃ§Ã£o com ComentÃ¡rios**
- **CTA "Anexo"**: BotÃ£o verde ao lado de "Adicionar Tarefa"
- **Cards de anexo**: Aparecem na conversa encadeada
- **Preview**: Clique abre arquivo em nova aba

---

## ðŸ”® **Melhorias Futuras**
1. **Preview inline**: VisualizaÃ§Ã£o de imagens sem sair da pÃ¡gina
2. **VersÃµes**: Controle de versÃµes de arquivos
3. **Compartilhamento**: Links pÃºblicos para anexos
4. **CategorizaÃ§Ã£o**: Tags ou categorias para organizar anexos
5. **OCR**: ExtraÃ§Ã£o de texto de PDFs e imagens
6. **Assinatura digital**: IntegraÃ§Ã£o com assinatura eletrÃ´nica
7. **Backup**: Backup automÃ¡tico para storage externo

---

## ðŸ“‹ **CÃ³digo Fonte**

### **Hook useAttachments - Upload**
```typescript
const uploadAttachment = async ({ file, description, customFileName }) => {
  // ValidaÃ§Ãµes
  if (!cardId) throw new Error('Card ID required');
  if (!customFileName?.trim()) throw new Error('Nome personalizado obrigatÃ³rio');
  
  // Gerar path Ãºnico
  const timestamp = new Date().toISOString().split('T')[0];
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitizedName = customFileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${sanitizedName}_${timestamp}_${randomSuffix}.${fileExtension}`;
  const filePath = `${cardId}/${fileName}`;
  
  // Upload para storage
  const { error: uploadError } = await supabase.storage
    .from('card-attachments')
    .upload(filePath, file);
  
  if (uploadError) throw uploadError;
  
  // Salvar metadados
  const { data, error: dbError } = await supabase
    .from('card_attachments')
    .insert({
      card_id: cardId,
      author_id: profile.id,
      author_name: profile.full_name,
      file_name: customFileName,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      file_extension: fileExtension,
      description
    })
    .select()
    .single();
  
  if (dbError) throw dbError;
  
  return data;
};
```

### **Busca Inteligente de Arquivos**
```typescript
const getDownloadUrl = async (filePath: string) => {
  // 1. Tentar path original
  const { data: directUrl } = supabase.storage
    .from('card-attachments')
    .getPublicUrl(filePath);
  
  const response = await fetch(directUrl.publicUrl, { method: 'HEAD' });
  if (response.ok) return directUrl.publicUrl;
  
  // 2. Buscar por padrÃµes similares
  const allFiles = await listAllFiles();
  const fileName = filePath.split('/').pop();
  const cardName = filePath.split('/')[0];
  
  const matchingFiles = allFiles.filter(file => {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '');
    const cleanCardName = cardName.replace(/[^a-zA-Z0-9]/g, '');
    return file.name.toLowerCase().includes(cleanFileName) && 
           file.name.toLowerCase().includes(cleanCardName);
  });
  
  if (matchingFiles.length > 0) {
    const { data } = supabase.storage
      .from('card-attachments')
      .getPublicUrl(matchingFiles[0].name);
    return data.publicUrl;
  }
  
  // 3. Fallback final
  return directUrl.publicUrl;
};
```

### **SQL - Setup da Tabela**
```sql
-- Criar tabela de anexos
CREATE TABLE public.card_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  author_name text NOT NULL,
  author_role text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  file_extension text NOT NULL,
  description text,
  comment_id uuid REFERENCES public.card_comments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id)
);

-- RLS Policies
CREATE POLICY "card_attachments_select_all" ON public.card_attachments
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "card_attachments_insert_authenticated" ON public.card_attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "card_attachments_delete_author_or_manager" ON public.card_attachments
  FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'gestor'
    )
  );
```

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Sistema de ComentÃ¡rios, Sistema de Tarefas, Supabase Storage
