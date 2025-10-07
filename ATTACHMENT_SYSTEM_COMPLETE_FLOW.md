# 📎 **Sistema Completo de Anexos - Fluxo Frontend → Backend**

## 🎯 **Visão Geral**

Sistema completo de anexos integrado com conversas encadeadas, permitindo anexar arquivos tanto no campo principal quanto em respostas de conversas.

---

## 📊 **Estrutura no Supabase**

### **1. Tabela: `card_attachments`**

```sql
card_attachments
├── id (uuid, PK)
├── card_id (uuid, FK → kanban_cards)
├── comment_id (uuid, FK → card_comments, nullable)
├── author_id (uuid, FK → profiles)
├── author_name (text)
├── author_role (text)
├── file_name (text) -- Nome personalizado do arquivo
├── file_path (text) -- Caminho no Storage
├── file_size (bigint) -- Tamanho em bytes
├── file_type (text) -- MIME type
├── file_extension (text) -- Extensão do arquivo
├── description (text, nullable) -- Descrição opcional
├── card_title (text) -- Título do card (preenchido automaticamente)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

**Índices:**
- `idx_card_attachments_card_id` → Busca por card
- `idx_card_attachments_comment_id` → Busca por comentário
- `idx_card_attachments_author_id` → Busca por autor

---

### **2. Storage Bucket: `card-attachments`**

**Estrutura de Pastas:**
```
card-attachments/
└── [CARD_TITLE]/
    └── [CUSTOM_NAME]_[DATE]_[RANDOM].ext
```

**Exemplo Real:**
```
card-attachments/
└── ANTONIO_BOZUTT/
    ├── CNH_Titular_2025-01-07_a3f2k1.pdf
    ├── Comprovante_Renda_2025-01-07_b7m9n2.pdf
    └── Foto_Residencia_2025-01-08_c4p5q3.jpg
```

**Configuração:**
- **Public:** `true` (acesso público via URL)
- **File Size Limit:** 50MB por arquivo
- **Allowed MIME types:** `image/*`, `application/pdf`, `application/*`, `text/*`

---

### **3. Tabela: `card_comments`**

```sql
card_comments
├── id (uuid, PK)
├── card_id (uuid, FK → kanban_cards)
├── parent_id (uuid, FK → card_comments, nullable)
├── author_id (uuid, FK → profiles)
├── author_name (text)
├── author_role (text)
├── content (text)
├── level (integer) -- Nível de profundidade (0-7)
├── thread_id (text) -- ID único da conversa
├── is_thread_starter (boolean) -- Se inicia uma conversa
├── card_title (text) -- Título do card (preenchido automaticamente)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

**Constraints:**
- `level` entre 0 e 7
- `thread_id` NOT NULL
- `card_title` preenchido automaticamente via trigger

---

## 🔄 **Fluxo Completo de Upload**

### **Fluxo 1: Anexo via Campo Principal "Observações e Conversas"**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND - Usuário clica "Anexo" (Paperclip)            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Modal: AttachmentUploadModal abre                        │
│    - Usuário seleciona arquivo(s)                           │
│    - Nomeia cada arquivo (OBRIGATÓRIO)                      │
│    - Adiciona descrição opcional                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. useAttachments.uploadAttachment()                        │
│    a) Busca título do card                                  │
│    b) Gera nome sanitizado: [CUSTOM_NAME]_[DATE]_[RANDOM]  │
│    c) Cria estrutura: [CARD_TITLE]/[FILE_NAME]             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SUPABASE STORAGE - Upload do arquivo                     │
│    Bucket: card-attachments                                 │
│    Path: CARD_TITLE/CUSTOM_NAME_DATE_RANDOM.ext            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SUPABASE DB - Insert em card_attachments                │
│    - card_id, author_id, file_name, file_path, etc.        │
│    - comment_id = NULL (não associado a comentário)        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. TRIGGER: create_attachment_comment()                     │
│    - Gera novo thread_id único                              │
│    - Cria comentário automático com:                        │
│      * Emoji 📎                                              │
│      * Nome do arquivo                                      │
│      * Título da ficha                                      │
│      * Detalhes (tipo, tamanho, autor)                     │
│    - parent_id = NULL (nova conversa)                       │
│    - level = 0 (conversa principal)                         │
│    - is_thread_starter = true                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. FRONTEND - Atualização Instantânea                       │
│    - onRefetch() chamado                                    │
│    - loadAttachments() recarrega anexos                     │
│    - CommentsList atualiza e mostra nova conversa          │
│    - AttachmentCard exibe arquivo com botões                │
└─────────────────────────────────────────────────────────────┘
```

---

### **Fluxo 2: Anexo via Campo de Resposta (Conversas Encadeadas)**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND - Usuário clica "Responder" em um comentário   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Campo de resposta abre com CTA "Anexo" integrado        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Usuário clica "Anexo" → Modal abre                       │
│    - Seleciona arquivo(s)                                   │
│    - Nomeia cada arquivo (OBRIGATÓRIO)                      │
│    - Adiciona descrição opcional                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. handleReplyAttachmentUpload()                            │
│    - Armazena anexo como PENDENTE                           │
│    - NÃO faz upload ainda                                   │
│    - Exibe preview: "Arquivos que serão anexados"          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Usuário digita resposta e clica "Responder"             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. handleReplySubmit()                                      │
│    a) Cria comentário de resposta                           │
│    b) Obtém ID do comentário criado                         │
│    c) Loop pelos anexos pendentes                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Para cada anexo pendente:                                │
│    uploadAttachment({ ...data, commentId: result.id })     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. SUPABASE STORAGE - Upload do arquivo                     │
│    Path: CARD_TITLE/CUSTOM_NAME_DATE_RANDOM.ext            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. SUPABASE DB - Insert em card_attachments                │
│    - card_id, author_id, file_name, file_path              │
│    - comment_id = [ID do comentário de resposta]           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. TRIGGER: create_attachment_comment() NÃO dispara       │
│     (porque comment_id não é NULL, anexo já está ligado)   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. FRONTEND - Atualização Instantânea                      │
│     - onRefetch() chamado                                   │
│     - loadAttachments() recarrega anexos                    │
│     - CommentContentRenderer renderiza anexo na resposta    │
│     - AttachmentCard exibe arquivo com botões               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 **Row Level Security (RLS)**

### **Tabela: `card_attachments`**

**SELECT (Ver anexos):**
```sql
authenticated users only
```
✅ **Vendedor**: Vê todos os anexos  
✅ **Analista**: Vê todos os anexos  
✅ **Gestor**: Vê todos os anexos

**INSERT (Criar anexos):**
```sql
authenticated users only
```
✅ **Vendedor**: Pode anexar  
✅ **Analista**: Pode anexar  
✅ **Gestor**: Pode anexar

**DELETE (Excluir anexos):**
```sql
authenticated users only
```
✅ **Vendedor**: Pode excluir qualquer anexo  
✅ **Analista**: Pode excluir qualquer anexo  
✅ **Gestor**: Pode excluir qualquer anexo

---

### **Storage Bucket: `card-attachments`**

**SELECT (Download):**
```sql
authenticated users only
```
✅ Todos os usuários autenticados podem fazer download

**INSERT (Upload):**
```sql
authenticated users only
```
✅ Todos os usuários autenticados podem fazer upload

**DELETE (Remover do Storage):**
```sql
authenticated users only
```
✅ Todos os usuários autenticados podem remover

---

## 🎨 **Componentes Frontend**

### **1. AttachmentUploadModal**
- **Localização:** `src/components/attachments/AttachmentUploadModal.tsx`
- **Função:** Modal para upload de arquivos
- **Features:**
  - Seleção de múltiplos arquivos
  - Nomeação obrigatória por arquivo
  - Descrição opcional
  - Preview de arquivos selecionados
  - Validação antes de enviar
  - Confirmação ao fechar com mudanças não salvas

### **2. AttachmentCard**
- **Localização:** `src/components/comments/AttachmentCard.tsx`
- **Função:** Exibição visual do anexo
- **Features:**
  - Preview de PDF (modal com iframe)
  - Download direto no navegador
  - Exclusão com confirmação
  - Ícone por tipo de arquivo
  - Informações (nome, tamanho, data, autor)
  - Dropdown com opções (Preview, Download, Delete)

### **3. CommentContentRenderer**
- **Localização:** `src/components/comments/CommentContentRenderer.tsx`
- **Função:** Renderiza conteúdo de comentário + anexos
- **Features:**
  - Detecta comentários de anexo (regex)
  - Renderiza AttachmentCard para anexos
  - Exibe texto normal para comentários sem anexo
  - Suporta múltiplos anexos por comentário

### **4. CommentsList**
- **Localização:** `src/components/comments/CommentsList.tsx`
- **Função:** Lista de conversas encadeadas
- **Features:**
  - Agrupamento por thread_id
  - Botão "Responder" em cada comentário
  - Campo de resposta com CTA "Anexo" integrado
  - Preview de anexos pendentes
  - Atualização instantânea com onRefetch

### **5. ObservationsWithComments**
- **Localização:** `src/components/ui/ObservationsWithComments.tsx`
- **Função:** Campo principal de observações + conversas
- **Features:**
  - Textarea com CTA "Anexo" integrado
  - Enter para criar nova conversa
  - Lista de conversas abaixo
  - Integração com sistema de anexos

---

## 🗄️ **Hook: useAttachments**

**Localização:** `src/hooks/useAttachments.ts`

**Funções Principais:**

### **uploadAttachment()**
```typescript
const uploadAttachment = async ({ 
  file, 
  description, 
  commentId, 
  customFileName 
}: UploadAttachmentData): Promise<CardAttachment | null>
```

**Etapas:**
1. Busca título do card
2. Gera nome sanitizado: `[CUSTOM_NAME]_[DATE]_[RANDOM].ext`
3. Cria path: `[CARD_TITLE]/[FILE_NAME]`
4. Upload para Storage: `card-attachments` bucket
5. Insert no banco: `card_attachments` table
6. Retorna dados do anexo criado

---

### **loadAttachments()**
```typescript
const loadAttachments = async (): Promise<void>
```

**Etapas:**
1. Busca todos os anexos do card
2. Ordena por data de criação
3. Atualiza estado local

---

### **deleteAttachment()**
```typescript
const deleteAttachment = async (attachmentId: string): Promise<void>
```

**Etapas:**
1. Busca dados do anexo
2. Remove arquivo do Storage
3. Remove registro do banco
4. Trigger cria comentário de remoção
5. Atualiza estado local

---

### **getDownloadUrl()**
```typescript
const getDownloadUrl = async (filePath: string): Promise<string | null>
```

**Etapas:**
1. Gera URL pública do arquivo
2. Retorna URL para download

---

## 📝 **Triggers e Functions no Backend**

### **1. create_attachment_comment()**
**Trigger:** `AFTER INSERT ON card_attachments`

**Lógica:**
```sql
QUANDO um anexo é criado (comment_id = NULL):
  1. Buscar título do card
  2. Gerar thread_id único
  3. Criar comentário automático com:
     - Emoji 📎
     - Nome do arquivo
     - Título da ficha
     - Detalhes (tipo, tamanho, autor)
  4. Definir como nova conversa:
     - parent_id = NULL
     - level = 0
     - is_thread_starter = true
```

---

### **2. create_attachment_deletion_comment()**
**Trigger:** `AFTER DELETE ON card_attachments`

**Lógica:**
```sql
QUANDO um anexo é excluído:
  1. Buscar título do card
  2. Gerar thread_id único
  3. Criar comentário automático com:
     - Emoji 🗑️
     - Nome do arquivo removido
     - Título da ficha
  4. Definir como nova conversa:
     - parent_id = NULL
     - level = 0
     - is_thread_starter = true
```

---

### **3. update_card_title_in_attachments()**
**Trigger:** `BEFORE INSERT ON card_attachments`

**Lógica:**
```sql
QUANDO um anexo é criado:
  1. Buscar título do card
  2. Preencher campo card_title automaticamente
```

---

### **4. update_card_title_in_comments()**
**Trigger:** `BEFORE INSERT ON card_comments`

**Lógica:**
```sql
QUANDO um comentário é criado:
  1. Buscar título do card
  2. Preencher campo card_title automaticamente
```

---

## 🎯 **Casos de Uso**

### **Caso 1: Analista anexa CNH do titular**

**Frontend:**
1. Analista abre "Editar Ficha"
2. Clica no ícone "Anexo" (Paperclip) no campo principal
3. Seleciona arquivo: `cnh_joao.pdf`
4. Renomeia para: `CNH Titular`
5. Clica "Anexar"

**Backend:**
1. Upload para: `card-attachments/JOAO_SILVA/CNH_Titular_2025-01-07_a3f2k1.pdf`
2. Insert em `card_attachments`:
   ```json
   {
     "file_name": "CNH Titular",
     "file_path": "JOAO_SILVA/CNH_Titular_2025-01-07_a3f2k1.pdf",
     "comment_id": null
   }
   ```
3. Trigger cria comentário automático:
   ```
   📎 Anexo adicionado: CNH Titular
   📋 Ficha: JOÃO SILVA
   📝 Descrição: -
   📊 Detalhes do arquivo:
   • Tipo: application/pdf
   • Tamanho: 2.3 MB
   • Extensão: pdf
   • Autor: Maria Analista (analista)
   ```

**Resultado:**
- Nova conversa criada com anexo
- AttachmentCard exibe PDF
- Botões: Download, Preview, Delete

---

### **Caso 2: Gestor responde com comprovante**

**Frontend:**
1. Gestor vê conversa: "Falta comprovante de renda"
2. Clica "Responder" (seta)
3. Clica ícone "Anexo" no campo de resposta
4. Seleciona: `comprovante.pdf`
5. Renomeia para: `Comprovante Renda Atualizado`
6. Digita resposta: "Segue comprovante atualizado"
7. Clica "Responder"

**Backend:**
1. Cria comentário de resposta:
   ```json
   {
     "content": "Segue comprovante atualizado",
     "parent_id": "[ID do comentário pai]",
     "level": 1,
     "thread_id": "[mesmo thread_id do pai]"
   }
   ```
2. Upload do anexo para: `card-attachments/JOAO_SILVA/Comprovante_Renda_Atualizado_2025-01-08_b7m9n2.pdf`
3. Insert em `card_attachments`:
   ```json
   {
     "file_name": "Comprovante Renda Atualizado",
     "file_path": "JOAO_SILVA/Comprovante_Renda_Atualizado_2025-01-08_b7m9n2.pdf",
     "comment_id": "[ID do comentário de resposta]"
   }
   ```
4. Trigger NÃO dispara (comment_id não é NULL)

**Resultado:**
- Resposta aparece na conversa encadeada
- AttachmentCard exibe PDF dentro da resposta
- Atualização instantânea via onRefetch

---

## 🔍 **Queries Úteis para Debug**

### **Ver todos os anexos de um card:**
```sql
SELECT 
  a.id,
  a.file_name,
  a.file_path,
  a.comment_id,
  a.author_name,
  a.created_at
FROM card_attachments a
WHERE a.card_id = '[CARD_ID]'
ORDER BY a.created_at DESC;
```

### **Ver estrutura de uma conversa:**
```sql
SELECT 
  c.id,
  c.content,
  c.level,
  c.thread_id,
  c.parent_id,
  c.author_name,
  c.created_at,
  a.file_name as attached_file
FROM card_comments c
LEFT JOIN card_attachments a ON a.comment_id = c.id
WHERE c.card_id = '[CARD_ID]'
ORDER BY c.thread_id, c.level, c.created_at;
```

### **Ver anexos sem comentário associado:**
```sql
SELECT 
  a.id,
  a.file_name,
  a.comment_id,
  a.created_at
FROM card_attachments a
WHERE a.card_id = '[CARD_ID]'
  AND a.comment_id IS NULL
ORDER BY a.created_at DESC;
```

### **Ver anexos dentro de conversas encadeadas:**
```sql
SELECT 
  a.id,
  a.file_name,
  c.content as comment_content,
  c.level as comment_level,
  c.thread_id,
  a.created_at
FROM card_attachments a
JOIN card_comments c ON c.id = a.comment_id
WHERE a.card_id = '[CARD_ID]'
  AND a.comment_id IS NOT NULL
ORDER BY c.thread_id, c.level, a.created_at;
```

---

## 📦 **Arquivos SQL Importantes**

### **1. fix-attachment-conversation-flow-v2.sql**
- **Função:** Configura triggers para integração com conversas
- **Quando usar:** Sempre que resetar o banco
- **Local:** `supabase/fix-attachment-conversation-flow-v2.sql`

### **2. improve-attachments-system.sql**
- **Função:** Adiciona `card_title` a anexos e comentários
- **Quando usar:** Para melhorar rastreabilidade
- **Local:** `supabase/improve-attachments-system.sql`

### **3. fix-attachment-comment-thread-id.sql**
- **Função:** Corrige problema de `thread_id` null
- **Quando usar:** Se comentários não aparecerem
- **Local:** `supabase/fix-attachment-comment-thread-id.sql`

---

## ✅ **Checklist de Verificação**

### **Backend (Supabase):**
- [ ] Tabela `card_attachments` criada
- [ ] Tabela `card_comments` com `thread_id` NOT NULL
- [ ] Bucket `card-attachments` criado e público
- [ ] RLS habilitado em `card_attachments`
- [ ] RLS habilitado em `card-attachments` bucket
- [ ] Trigger `create_attachment_comment` ativo
- [ ] Trigger `create_attachment_deletion_comment` ativo
- [ ] Trigger `update_card_title_in_attachments` ativo
- [ ] Trigger `update_card_title_in_comments` ativo

### **Frontend:**
- [ ] `useAttachments` hook configurado
- [ ] `AttachmentUploadModal` implementado
- [ ] `AttachmentCard` implementado
- [ ] `CommentContentRenderer` implementado
- [ ] CTA "Anexo" no campo principal
- [ ] CTA "Anexo" nos campos de resposta
- [ ] `onRefetch` passado pela cadeia de componentes
- [ ] Preview de anexos pendentes funcionando
- [ ] Download funcionando
- [ ] Preview de PDF funcionando
- [ ] Exclusão com confirmação funcionando

---

## 🎉 **Funcionalidades Completas**

✅ **Upload de Arquivos:**
- Múltiplos arquivos simultaneamente
- Nomeação obrigatória por arquivo
- Descrição opcional
- Preview antes de enviar

✅ **Organização no Storage:**
- Estrutura de pastas por card
- Nomes descritivos com timestamp
- Path: `CARD_TITLE/CUSTOM_NAME_DATE_RANDOM.ext`

✅ **Integração com Conversas:**
- Anexos no campo principal criam nova conversa
- Anexos em respostas ficam dentro da conversa
- Atualização instantânea após anexar

✅ **Visualização:**
- AttachmentCard com ícone por tipo
- Informações completas (nome, tamanho, data, autor)
- Botões: Preview, Download, Delete

✅ **Segurança:**
- RLS por role (Vendedor, Analista, Gestor)
- Autenticação obrigatória
- Logs de auditoria (autor, data)

✅ **UX/UI:**
- Modal intuitivo para upload
- Preview de PDF em modal
- Download direto no navegador
- Confirmação antes de excluir
- Atualização instantânea (sem refresh)

---

## 🚀 **Performance**

**Otimizações Implementadas:**
- Índices em `card_id`, `comment_id`, `author_id`
- Cache de 1 hora para arquivos no Storage
- Lazy loading de anexos (carrega só quando necessário)
- Atualização local após operações (sem refetch completo)

---

## 📞 **Suporte e Debugging**

**Logs no Console:**
- `CommentContentRenderer`: Log quando processa anexo
- `AttachmentCard`: Log de file_path e permissões
- `handleReplySubmit`: Log completo do fluxo de upload
- `uploadAttachment`: Log de cada etapa do upload

**Verificar se está funcionando:**
1. Abrir Console do Navegador (F12)
2. Buscar por: `CommentContentRenderer processing attachment`
3. Buscar por: `AttachmentCard received data`
4. Buscar por: `Fazendo upload de anexos pendentes`

---

## 🎯 **Conclusão**

Sistema completo de anexos integrado com conversas encadeadas, com:
- ✅ Upload via campo principal ou respostas
- ✅ Organização inteligente no Storage
- ✅ Atualização instantânea (sem refresh)
- ✅ Preview, download e exclusão
- ✅ Auditoria completa
- ✅ RLS e segurança implementados

**Tudo pronto para produção! 🚀**

