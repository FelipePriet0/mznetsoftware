# Sistema de Anexos - Upload, Download e Gerenciamento

## 📋 Visão Geral

Sistema completo para anexar arquivos (PDFs, imagens, documentos) às fichas do Kanban através de conversas encadeadas. Os arquivos são armazenados no Supabase Storage e organizados por `card_id` para garantir robustez e organização.

**🎯 OBJETIVO:** Permitir upload, download, preview e gerenciamento de anexos nas conversas encadeadas com fallback inteligente para busca de arquivos.

**📁 LOCALIZAÇÃO DOS ARQUIVOS:**
- `src/hooks/useAttachments.ts` - Hook principal de gerenciamento
- `src/components/attachments/AttachmentUploadModal.tsx` - Modal de upload
- `src/components/attachments/AttachmentDisplay.tsx` - Exibição de anexos
- `src/components/attachments/DeleteAttachmentDialog.tsx` - Confirmação de exclusão
- `src/components/comments/CommentsList.tsx` - CTA "Anexo" nas conversas
- `src/components/comments/AttachmentCard.tsx` - Card individual de anexo

## 🎯 Problema Resolvido

**Problema Original:**
- Usuários precisavam anexar documentos às fichas
- Falta de sistema organizado para arquivos
- Dificuldade para encontrar arquivos anexados
- Sem controle de permissões para exclusão

**Solução Implementada:**
- Sistema completo de upload com validações
- Organização automática por card_id
- Fallback inteligente para busca de arquivos
- Soft delete com retenção de 90 dias
- Controle de permissões baseado em roles

## 🏗️ Arquitetura da Solução

### Componentes Envolvidos

```
src/
├── hooks/
│   └── useAttachments.ts              # Hook principal
├── components/
│   ├── attachments/
│   │   ├── AttachmentUploadModal.tsx  # Modal de upload
│   │   ├── AttachmentDisplay.tsx     # Exibição de anexos
│   │   └── DeleteAttachmentDialog.tsx # Confirmação de exclusão
│   └── comments/
│       ├── CommentsList.tsx           # CTA "Anexo"
│       └── AttachmentCard.tsx         # Card individual
```

### Fluxo de Dados

```mermaid
graph TD
    A[Usuário clica "Anexo"] --> B[Modal de Upload]
    B --> C[Validação de Arquivo]
    C --> D{Arquivo Válido?}
    D -->|Sim| E[Upload para Storage]
    D -->|Não| F[Mostrar Erro]
    E --> G[Salvar Metadados no Banco]
    G --> H[Aparecer na Conversa]
    H --> I[Usuário pode Download/Preview]
    I --> J[Usuário pode Excluir]
```

## 🔧 Implementação Técnica

### 1. Hook `useAttachments` - Gerenciamento Principal

**Localização:** `src/hooks/useAttachments.ts` (linhas 1-500)

**FUNÇÃO COMPLETA:**
```typescript
export const useAttachments = (cardId: string) => {
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { profile } = useAuth();

  // Carregar anexos do card
  const loadAttachments = async () => {
    if (!cardId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_attachments')
        .select('*')
        .eq('card_id', cardId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de novo arquivo
  const uploadAttachment = async ({ file, description, customFileName }) => {
    if (!cardId) throw new Error('Card ID required');
    if (!customFileName?.trim()) throw new Error('Nome personalizado obrigatório');
    
    setIsUploading(true);
    try {
      // Validações
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) throw new Error('Arquivo muito grande (máximo 10MB)');
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip', 'application/x-rar-compressed'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não permitido');
      }

      // Gerar path único
  const timestamp = new Date().toISOString().split('T')[0];
  const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.split('.').pop().toLowerCase();
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
          author_role: profile.role,
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
  
      // Recarregar lista
      await loadAttachments();
  return data;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Download com fallback inteligente
const getDownloadUrl = async (filePath: string) => {
    try {
  // 1. Tentar path original
  const { data: directUrl } = supabase.storage
    .from('card-attachments')
    .getPublicUrl(filePath);
  
  const response = await fetch(directUrl.publicUrl, { method: 'HEAD' });
  if (response.ok) return directUrl.publicUrl;
  
      // 2. Buscar por padrões similares
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
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  };

  // Soft delete
  const deleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from('card_attachments')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id
        })
        .eq('id', attachmentId);
      
      if (error) throw error;
      await loadAttachments();
      return true;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      return false;
    }
  };

  return {
    attachments,
    isLoading,
    isUploading,
    loadAttachments,
    uploadAttachment,
    deleteAttachment,
    getDownloadUrl,
    formatFileSize,
    getFileIcon
  };
};
```

**COMO USAR ESTE HOOK:**
- Recebe `cardId` como parâmetro
- Retorna estado e funções para gerenciar anexos
- Carrega automaticamente anexos do card
- Inclui validações e fallbacks

### 2. Modal de Upload

**Localização:** `src/components/attachments/AttachmentUploadModal.tsx` (linhas 1-200)

**FUNÇÃO COMPLETA:**
```typescript
export function AttachmentUploadModal({ isOpen, onClose, onUpload, cardId }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    // Validar se todos os arquivos têm nomes
    const missingNames = selectedFiles.filter(file => !fileNames[file.name]?.trim());
    if (missingNames.length > 0) {
      alert('Por favor, dê um nome para todos os arquivos antes de enviar.');
      return;
    }

    try {
      // Upload each file
      for (const file of selectedFiles) {
        const customFileName = fileNames[file.name]?.trim() || file.name;
        await onUpload({
          file: file,
          description: description.trim() || undefined,
          customFileName: customFileName
        });
      }
      
      // Reset form
      setSelectedFiles([]);
      setFileNames({});
      setDescription('');
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Erro ao fazer upload dos arquivos. Tente novamente.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Anexar Arquivos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Drag & Drop Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800"
            >
              Clique aqui ou arraste arquivos
            </button>
          </div>

          {/* File List */}
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Nome personalizado (obrigatório)"
                  value={fileNames[file.name] || ''}
                  onChange={(e) => {
                    setFileNames(prev => ({
                      ...prev,
                      [file.name]: e.target.value
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="text-sm text-gray-500">
                {formatFileSize(file.size)}
              </div>
            </div>
          ))}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setHasChanges(true);
              }}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!hasChanges || selectedFiles.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Anexar Arquivos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**PROBLEMAS COMUNS E SOLUÇÕES:**
- **Erro de validação**: Verificar se nome personalizado foi preenchido
- **Upload falha**: Verificar tamanho e tipo do arquivo
- **Modal não fecha**: Verificar se `onClose` está sendo chamado

### 3. Componente AttachmentCard

**Localização:** `src/components/comments/AttachmentCard.tsx` (linhas 81-417)

**FUNCIONALIDADES PRINCIPAIS:**
- **Lado esquerdo**: Botão de pré-visualização (👁️) com ícone do tipo de arquivo
- **Lado direito**: Botão de download (⬇️)
- **Menu de 3 pontos**: Opção de excluir
- **Modal de preview**: Para PDFs e outros tipos de arquivo
- **Permissões**: Controle de acesso baseado em roles

**PROPS DO COMPONENTE:**
```typescript
interface AttachmentCardProps {
  attachment: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    file_extension: string;
    author_name: string;
    author_id?: string;
    description?: string;
    created_at?: string;
  };
  onDownload: (filePath: string, fileName: string) => void;
  onPreview?: (filePath: string, fileName: string) => void;
  onDelete?: (attachmentId: string, filePath: string) => void;
}
```

**FUNÇÕES PRINCIPAIS:**
- `handlePreview()` - Abre modal de pré-visualização
- `handleDownload()` - Inicia download do arquivo
- `handleDeleteClick()` - Abre dialog de confirmação de exclusão
- `getPdfUrl()` - Busca URL do PDF para preview

**PROBLEMAS COMUNS:**
- **Preview não funciona**: Verificar se `file_path` está correto
- **Download falha**: Verificar permissões do usuário
- **Exclusão não funciona**: Verificar se `onDelete` está sendo passado

## 📊 Estrutura do Banco de Dados

### Tabela `card_attachments`
```sql
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

### Supabase Storage
- **Bucket**: `card-attachments`
- **Estrutura**: `{card_id}/{file_name}_{date}_{random}.{ext}`
- **Exemplo**: `uuid-card-123/DOCUMENTO_2025-01-08_abc123.pdf`

### RLS Policies
```sql
-- Política de seleção
CREATE POLICY "card_attachments_select_all" ON public.card_attachments
  FOR SELECT USING (deleted_at IS NULL);

-- Política de inserção
CREATE POLICY "card_attachments_insert_authenticated" ON public.card_attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política de exclusão
CREATE POLICY "card_attachments_delete_author_or_manager" ON public.card_attachments
  FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'gestor'
    )
  );
```

## 🚀 Como Usar

### 1. Upload de Arquivo - Nova Conversa Encadeada

**📍 CTA "ANEXO" do Campo Observações**
```typescript
// ModalEditarFicha.tsx - handleUploadAttachment()
const content = `📎 **Anexo adicionado**\n\n` +
  `📄 **Arquivo:** ${uploaded.file_name}\n` +
  (uploaded.description ? `📝 **Descrição:** ${uploaded.description}\n` : '') +
  `📎 Anexo adicionado: ${uploaded.file_name}`;

// Cria NOVA conversa encadeada (thread principal)
await supabase.from('card_comments').insert({
  card_id: card.id,
  author_id: profile.id,
  content,
  level: 0,                                    // ✅ Comentário raiz
  thread_id: `thread_${card.id}_${Date.now()}`, // ✅ NOVO thread
  is_thread_starter: true                       // ✅ É thread principal
});
```

**🎯 Comportamento:**
- Cria **NOVA conversa encadeada**
- Aparece como **thread principal** na lista
- Campo visual com CTAs de pré-visualização e download
- **Não precisa digitar texto** manualmente

### 2. Upload de Arquivo - Resposta na Conversa

**📍 CTA "ANEXO" da Seta de Resposta**
```typescript
// CommentsList.tsx - handleReplyAttachmentUpload()
const commentContent = `📎 **Anexo adicionado**\n\n` +
  `📄 **Arquivo:** ${data.customFileName || data.file.name}\n` +
  (data.description ? `📝 **Descrição:** ${data.description}\n` : '') +
  `📎 Anexo adicionado: ${data.customFileName || data.file.name}`;

// RESPONDE conversa existente
const result = await onReply(replyingTo, commentContent);
// onReply usa replyToComment() que cria como resposta (level: 1)
```

**🎯 Comportamento:**
- **RESPONDE** a conversa existente
- Aparece como **resposta aninhada** na conversa
- Campo visual com CTAs de pré-visualização e download
- **Não precisa digitar texto** manualmente

### 3. Download de Arquivo

```typescript
const { getDownloadUrl } = useAttachments(cardId);

const downloadUrl = await getDownloadUrl(attachment.file_path);
if (downloadUrl) {
  window.open(downloadUrl, '_blank');
}
```

### 4. Exclusão de Anexo

```typescript
const { deleteAttachment } = useAttachments(cardId);

await deleteAttachment(attachmentId);
```

## 🔍 Debug e Logs

### Logs Implementados

```typescript
// Upload de anexo - Nova conversa encadeada
console.log('📎 [ModalEditarFicha] Iniciando upload de anexo...');
console.log('📎 [ModalEditarFicha] Nenhum comentário automático encontrado. Criando NOVA conversa encadeada...');
console.log('📎 [ModalEditarFicha] Dados do comentário (NOVA CONVERSA):', commentData);

// Upload de anexo - Resposta na conversa
console.log('📎 DEBUG: Iniciando upload de anexo para resposta:', data);
console.log('📎 DEBUG: Criando resposta na conversa:', replyData);
console.log('📎 DEBUG: Anexo vinculado ao comentário com sucesso');

// Sistema de fallback
console.log('🔍 getAttachmentsForComment chamada:', { commentId, content });
console.log('🔍 Anexos por comment_id:', count);
console.log('🔍 Fallback final: Mostrando anexos recentes do card');
console.log('🔍 RESULTADO FINAL:', { commentAttachments });

// Renderização visual
console.log('🔍 CommentContentRenderer DEBUG:', { hasAttachmentsFromDB, isAttachmentComment, attachmentCount });

// Download com fallback
console.log('🔍 [useAttachments] Buscando arquivo:', filePath);
console.log('🔍 [useAttachments] Tentando path original...');
console.log('🔍 [useAttachments] Tentando fallback...');

// Exclusão
console.log('🗑️ [useAttachments] Excluindo anexo:', attachmentId);
```

### Como Debugar

1. **Abra o Console do navegador**

2. **Teste CTA "ANEXO" do Campo Observações:**
   - Anexe um arquivo via CTA "Anexo"
   - Verifique se cria **NOVA conversa encadeada**
   - Confirme se aparece como **thread principal**
   - Verifique logs: `📎 [ModalEditarFicha] Nenhum comentário automático encontrado. Criando NOVA conversa encadeada...`

3. **Teste CTA "ANEXO" da Seta de Resposta:**
   - Clique em "Responder" em qualquer comentário
   - Clique no botão "Anexo" (📎)
   - Verifique se **RESPONDE** a conversa existente
   - Confirme se aparece como **resposta aninhada**
   - Verifique logs: `📎 DEBUG: Criando resposta na conversa:`

4. **Verifique Sistema de Fallback:**
   - Se anexo não aparecer, verifique logs: `🔍 getAttachmentsForComment chamada`
   - Confirme se usa fallback: `🔍 Fallback final: Mostrando anexos recentes do card`

5. **Teste o download** clicando no anexo visual

## 🚨 Troubleshooting - Erros Comuns

### Erro 1: "Upload falha - Arquivo muito grande"

**Sintomas:**
- Upload não inicia
- Console mostra: `Arquivo muito grande (máximo 10MB)`
- Arquivo é rejeitado

**Diagnóstico:**
```javascript
// Verificar no console:
console.log('📎 [useAttachments] Tamanho do arquivo:', file.size);
console.log('📎 [useAttachments] Tamanho máximo:', 10 * 1024 * 1024);
```

**Soluções:**
1. **Reduzir tamanho do arquivo** para menos de 10MB
2. **Comprimir arquivo** antes do upload
3. **Verificar se arquivo não está corrompido**

### Erro 2: "Download não funciona - Arquivo não encontrado"

**Sintomas:**
- Download falha com erro 404
- Console mostra: `Error getting download URL`
- Arquivo não abre

**Diagnóstico:**
```javascript
// Verificar no console:
console.log('🔍 [useAttachments] Buscando arquivo:', filePath);
console.log('🔍 [useAttachments] Path original falhou');
console.log('🔍 [useAttachments] Tentando fallback...');
```

**Soluções:**
1. **Verificar se arquivo existe** no Storage
2. **Verificar se `file_path` está correto** no banco
3. **Usar fallback automático** do sistema

### Erro 3: "Exclusão não funciona - Sem permissão"

**Sintomas:**
- Botão de exclusão não aparece
- Console mostra: `Sem permissão para excluir`
- Usuário não consegue excluir

**Diagnóstico:**
```javascript
// Verificar no console:
console.log('🔍 [AttachmentCard] Permissões:', {
  canDelete: false,
  authorId: attachment.author_id,
  currentUserId: profile.id,
  userRole: profile.role
});
```

**Soluções:**
1. **Verificar se usuário é autor** do anexo
2. **Verificar se usuário é gestor**
3. **Verificar RLS policies** no banco

### Erro 4: "Preview não funciona"

**Sintomas:**
- Botão de preview não abre modal
- Console mostra: `Error getting PDF URL for preview`
- Modal fica em branco

**Diagnóstico:**
```javascript
// Verificar no console:
console.log('🔍 [AttachmentCard] Preview:', {
  filePath: attachment.file_path,
  fileType: attachment.file_type,
  isPdf: attachment.file_extension === 'pdf'
});
```

**Soluções:**
1. **Verificar se arquivo é PDF**
2. **Verificar se `getPdfUrl()` está funcionando**
3. **Verificar permissões de acesso**

### Erro 5: "Anexo não aparece na conversa"

**Sintomas:**
- Upload funciona mas anexo não aparece
- Console mostra: `Anexos carregados: 0`
- Conversa não mostra anexo

**Diagnóstico:**
```javascript
// Verificar no console:
console.log('🔍 [useAttachments] Anexos carregados:', attachments.length);
console.log('🔍 [useAttachments] Card ID:', cardId);
```

**Soluções:**
1. **Verificar se `cardId` está correto**
2. **Verificar se tabela `card_attachments` existe**
3. **Verificar se RLS policies estão corretas**

## 🛠️ Comandos de Debug

### 1. Verificar Anexos no Banco
```sql
-- Verificar anexos do card
SELECT id, file_name, file_path, file_size, created_at 
FROM card_attachments 
WHERE card_id = 'SEU_CARD_ID' 
AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Verificar anexos deletados
SELECT id, file_name, deleted_at, deleted_by 
FROM card_attachments 
WHERE card_id = 'SEU_CARD_ID' 
AND deleted_at IS NOT NULL;
```

### 2. Verificar Storage
```sql
-- Listar arquivos no bucket
SELECT name, size, created_at 
FROM storage.objects 
WHERE bucket_id = 'card-attachments' 
AND name LIKE 'SEU_CARD_ID/%';
```

### 3. Verificar Logs no Console
```javascript
// Filtrar logs de anexos
console.log('=== DEBUG ANEXOS ===');
// Procurar por: 📎, 🔍, 🗑️, useAttachments
```

### 4. Testar Upload Manualmente
```javascript
// No console do navegador:
const testUpload = async () => {
  const { useAttachments } = await import('./src/hooks/useAttachments');
  console.log('Testando upload...');
};
```

## ✅ Resultado Final

### Antes da Correção
- ❌ Sem sistema de anexos
- ❌ Arquivos desorganizados
- ❌ Sem controle de permissões
- ❌ Dificuldade para encontrar arquivos

### Após a Correção
- ✅ Sistema completo de upload/download
- ✅ Organização automática por card_id
- ✅ Fallback inteligente para busca
- ✅ Soft delete com retenção
- ✅ Controle de permissões
- ✅ Interface intuitiva

## 🛠️ Manutenção

### Monitoramento
- Verificar logs de upload/download
- Acompanhar uso do storage
- Validar se anexos estão sendo organizados corretamente

### Melhorias Futuras
- Preview inline para imagens
- Controle de versões
- Compartilhamento público
- Categorização por tags
- OCR para PDFs
- Assinatura digital

## 📝 Notas Importantes

1. **Tamanho máximo**: 10MB por arquivo
2. **Tipos permitidos**: Imagens, PDFs, documentos, planilhas, texto, compactados
3. **Soft delete**: Arquivos ficam 90 dias no storage
4. **Fallback**: Sistema tenta automaticamente caminhos alternativos
5. **Permissões**: Apenas autor ou gestores podem excluir

## 🎯 Resumo para Correção de Erros

**QUANDO HOUVER PROBLEMA, SEGUIR ESTA SEQUÊNCIA:**

1. **Identificar o erro** pelos logs no console
2. **Localizar o arquivo** usando a tabela de localizações
3. **Verificar a função** específica mencionada
4. **Aplicar a solução** do troubleshooting
5. **Testar** se o anexo funciona corretamente

**COMANDO RÁPIDO PARA DEBUG:**
```bash
# No console do navegador, filtrar logs:
console.log('=== DEBUG ANEXOS ===');
# Procurar por: 📎, 🔍, 🗑️, useAttachments
```

**ARQUIVOS PRINCIPAIS PARA CORREÇÃO:**
- `src/hooks/useAttachments.ts` - Hook principal
- `src/components/attachments/AttachmentUploadModal.tsx` - Modal de upload
- `src/components/comments/AttachmentCard.tsx` - Card de anexo
- `src/components/attachments/DeleteAttachmentDialog.tsx` - Confirmação de exclusão
- `src/components/ui/ModalEditarFicha.tsx` - **CTA "ANEXO" do Campo Observações** (Nova conversa)
- `src/components/comments/CommentsList.tsx` - **CTA "ANEXO" da Seta de Resposta** (Resposta na conversa)

---

**Última atualização:** Dezembro 2024  
**Versão:** 2.0 - **Segmentação Inteligente dos CTAs**  
**Status:** ✅ Funcional com segmentação perfeita entre CTAs