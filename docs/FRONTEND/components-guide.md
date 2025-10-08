# ðŸ§© DocumentaÃ§Ã£o: Guia de Componentes Frontend

## ðŸŽ¯ **VisÃ£o Geral**
Este documento detalha a arquitetura de componentes React do sistema, padrÃµes de design, estrutura de pastas e boas prÃ¡ticas de desenvolvimento.

---

## ðŸ“ **Estrutura de Pastas**

```
src/components/
â”œâ”€â”€ ui/                          # Componentes UI base (Shadcn/Radix)
â”‚   â”œâ”€â”€ button.tsx
â”‚   â”œâ”€â”€ card.tsx
â”‚   â”œâ”€â”€ dialog.tsx
â”‚   â”œâ”€â”€ input.tsx
â”‚   â”œâ”€â”€ select.tsx
â”‚   â”œâ”€â”€ sheet.tsx
â”‚   â”œâ”€â”€ toast.tsx
â”‚   â””â”€â”€ ModalEditarFicha.tsx    # Modal principal de ediÃ§Ã£o
â”‚
â”œâ”€â”€ ficha/                       # Componentes de ficha
â”‚   â”œâ”€â”€ BasicInfoModal.tsx      # Modal de info bÃ¡sica (PF)
â”‚   â”œâ”€â”€ ConfirmCreateModal.tsx  # ConfirmaÃ§Ã£o de criaÃ§Ã£o
â”‚   â”œâ”€â”€ DeleteConfirmDialog.tsx # ConfirmaÃ§Ã£o de exclusÃ£o
â”‚   â”œâ”€â”€ ExpandedFichaModal.tsx  # Modal expandido PF
â”‚   â”œâ”€â”€ ExpandedFichaPJModal.tsx # Modal expandido PJ
â”‚   â”œâ”€â”€ FichaPJForm.tsx         # FormulÃ¡rio PJ
â”‚   â”œâ”€â”€ OptimizedKanbanCard.tsx # Card individual otimizado
â”‚   â”œâ”€â”€ ParecerConfirmModal.tsx # ConfirmaÃ§Ã£o de parecer
â”‚   â””â”€â”€ PersonTypeModal.tsx     # Modal de seleÃ§Ã£o PF/PJ
â”‚
â”œâ”€â”€ comments/                    # Sistema de comentÃ¡rios
â”‚   â”œâ”€â”€ CommentsList.tsx        # Lista de comentÃ¡rios
â”‚   â”œâ”€â”€ CommentItem.tsx         # Item individual
â”‚   â”œâ”€â”€ CommentContentRenderer.tsx # Renderizador de conteÃºdo
â”‚   â””â”€â”€ AttachmentCard.tsx      # Card de anexo
â”‚
â”œâ”€â”€ attachments/                 # Sistema de anexos
â”‚   â”œâ”€â”€ AttachmentDisplay.tsx   # ExibiÃ§Ã£o de anexos
â”‚   â”œâ”€â”€ AttachmentUploadModal.tsx # Modal de upload
â”‚   â””â”€â”€ DeleteAttachmentDialog.tsx # ConfirmaÃ§Ã£o de exclusÃ£o
â”‚
â”œâ”€â”€ tasks/                       # Sistema de tarefas
â”‚   â”œâ”€â”€ AddTaskModal.tsx        # Modal criar/editar tarefa
â”‚   â””â”€â”€ TaskItem.tsx            # Item de tarefa
â”‚
â”œâ”€â”€ agendamento/                 # Sistema de agendamento
â”‚   â”œâ”€â”€ AgendamentoGrid.tsx
â”‚   â”œâ”€â”€ AgendamentoModal.tsx
â”‚   â”œâ”€â”€ ConfiguracaoRotas.tsx
â”‚   â””â”€â”€ GestaoTecnicos.tsx
â”‚
â”œâ”€â”€ history/                     # Sistema de histÃ³rico
â”‚   â”œâ”€â”€ HistoryDetailModal.tsx
â”‚   â”œâ”€â”€ HistoryFileUpload.tsx
â”‚   â””â”€â”€ HistoryInsights.tsx
â”‚
â”œâ”€â”€ KanbanBoard.tsx             # Componente principal Kanban
â”œâ”€â”€ NovaFichaComercialForm.tsx  # Form de ficha comercial
â”œâ”€â”€ NovaFichaPJForm.tsx         # Form de ficha PJ
â”œâ”€â”€ app-sidebar.tsx             # Sidebar de navegaÃ§Ã£o
â””â”€â”€ ErrorBoundary.tsx           # Boundary de erros
```

---

## ðŸŽ¨ **PadrÃµes de Design**

### **1. Componentes Controlados vs NÃ£o-Controlados**

#### **Controlados (Preferido)**
```typescript
// Estado gerenciado pelo pai
<Input 
  value={value} 
  onChange={(e) => setValue(e.target.value)} 
/>
```

#### **NÃ£o-Controlados (FormulÃ¡rios Simples)**
```typescript
// Estado gerenciado pelo DOM
<Input ref={inputRef} defaultValue="..." />
```

### **2. ComposiÃ§Ã£o vs HeranÃ§a**

#### **âœ… COMPOSIÃ‡ÃƒO (Recomendado)**
```typescript
// Modal base reutilizÃ¡vel
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    {children}
  </DialogContent>
</Dialog>
```

#### **âŒ HERANÃ‡A (Evitar)**
```typescript
// NÃƒO fazer
class CustomModal extends BaseModal { ... }
```

### **3. Props vs Context**

#### **Props (Dados Locais)**
```typescript
interface CardProps {
  id: string;
  title: string;
  onEdit: (id: string) => void;
}

<KanbanCard {...cardProps} />
```

#### **Context (Dados Globais)**
```typescript
// AuthContext para usuÃ¡rio atual
const { profile } = useAuth();

// Dados disponÃ­veis em toda Ã¡rvore
<AuthProvider>
  <App />
</AuthProvider>
```

---

## ðŸ§± **Componentes Principais**

### **1. KanbanBoard.tsx**
**LocalizaÃ§Ã£o**: `src/components/KanbanBoard.tsx`

**Responsabilidades:**
- RenderizaÃ§Ã£o do board completo
- Drag & Drop de cards
- Filtros e busca
- MudanÃ§a de Ã¡rea (AnÃ¡lise/Comercial)
- CriaÃ§Ã£o de fichas
- EdiÃ§Ã£o de cards

**Estado Principal:**
```typescript
const [cards, setCards] = useState<CardItem[]>([]);
const [kanbanArea, setKanbanArea] = useState<'analise' | 'comercial'>('comercial');
const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'company'>('all');
```

**Hooks Utilizados:**
- `useMemo` - Performance de filtros
- `useState` - Estado local
- `useEffect` - Carregamento de dados
- `useSensor` - Drag & Drop (dnd-kit)

**PadrÃ£o:**
- **Container Component**: Gerencia estado e lÃ³gica
- **Presentation Components**: Cards, colunas, modals

---

### **2. ModalEditarFicha.tsx**
**LocalizaÃ§Ã£o**: `src/components/ui/ModalEditarFicha.tsx`

**Responsabilidades:**
- EdiÃ§Ã£o completa de ficha
- GestÃ£o de pareceres
- IntegraÃ§Ã£o com comentÃ¡rios
- IntegraÃ§Ã£o com anexos
- IntegraÃ§Ã£o com tarefas

**Props:**
```typescript
interface ModalEditarFichaProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  onStatusChange?: (cardId: string, newStatus: string) => void;
  onRefetch?: () => void;
}
```

**Features:**
- âœ… Auto-save de pareceres
- âœ… ValidaÃ§Ã£o de mudanÃ§as nÃ£o salvas
- âœ… IntegraÃ§Ã£o com sistema de comentÃ¡rios
- âœ… Upload de anexos
- âœ… CriaÃ§Ã£o de tarefas

---

### **3. CommentsList.tsx**
**LocalizaÃ§Ã£o**: `src/components/comments/CommentsList.tsx`

**Responsabilidades:**
- RenderizaÃ§Ã£o de comentÃ¡rios hierÃ¡rquicos
- Campo de novo comentÃ¡rio
- BotÃµes "Anexo" e "Adicionar Tarefa"
- Resposta a comentÃ¡rios (conversas encadeadas)
- ExibiÃ§Ã£o de anexos e tarefas

**Hierarquia:**
```
CommentsList
â”œâ”€â”€ Novo ComentÃ¡rio (Campo + CTAs)
â”œâ”€â”€ CommentItem (Level 0)
â”‚   â”œâ”€â”€ CommentContentRenderer
â”‚   â”œâ”€â”€ AttachmentCard (se houver)
â”‚   â””â”€â”€ CommentItem (Level 1) - Resposta
â”‚       â”œâ”€â”€ CommentContentRenderer
â”‚       â””â”€â”€ CommentItem (Level 2) - Sub-resposta
```

**PadrÃ£o:**
- **RecursÃ£o**: ComentÃ¡rios aninhados atÃ© 7 nÃ­veis
- **Thread ID**: MantÃ©m conversas organizadas
- **Soft Delete**: ComentÃ¡rios deletados nÃ£o aparecem

---

### **4. OptimizedKanbanCard.tsx**
**LocalizaÃ§Ã£o**: `src/components/ficha/OptimizedKanbanCard.tsx`

**Responsabilidades:**
- RenderizaÃ§Ã£o individual de card
- ExibiÃ§Ã£o de informaÃ§Ãµes resumidas
- BotÃµes de aÃ§Ã£o (Editar, Ingressar, etc.)
- Status visual (badges, cores)

**OtimizaÃ§Ãµes:**
- `React.memo` - Evita re-renders desnecessÃ¡rios
- Props especÃ­ficas - Apenas dados necessÃ¡rios
- Eventos otimizados - Callbacks memoizados

**Props:**
```typescript
interface CardProps {
  card: CardItem;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  canIngressar?: boolean;
  onIngressar?: (card: CardItem) => void;
}
```

---

### **5. AttachmentUploadModal.tsx**
**LocalizaÃ§Ã£o**: `src/components/attachments/AttachmentUploadModal.tsx`

**Responsabilidades:**
- Upload de mÃºltiplos arquivos
- ValidaÃ§Ã£o de tipo e tamanho
- Drag & Drop de arquivos
- Nome personalizado obrigatÃ³rio
- DescriÃ§Ã£o opcional

**ValidaÃ§Ãµes:**
```typescript
// Tamanho mÃ¡ximo: 10MB
if (file.size > 10 * 1024 * 1024) {
  alert('Arquivo muito grande');
}

// Tipos permitidos
const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  // ...
];
```

**Features:**
- âœ… Drag & Drop
- âœ… SeleÃ§Ã£o mÃºltipla
- âœ… Preview de arquivos
- âœ… ValidaÃ§Ã£o em tempo real
- âœ… Progress bar (futuro)

---

### **6. AddTaskModal.tsx**
**LocalizaÃ§Ã£o**: `src/components/tasks/AddTaskModal.tsx`

**Responsabilidades:**
- Criar nova tarefa
- Editar tarefa existente
- ValidaÃ§Ã£o de alteraÃ§Ãµes nÃ£o salvas
- IntegraÃ§Ã£o com comentÃ¡rios

**Modos:**
```typescript
// Modo criaÃ§Ã£o
<AddTaskModal
  isOpen={true}
  cardId={cardId}
  onClose={() => setOpen(false)}
/>

// Modo ediÃ§Ã£o
<AddTaskModal
  isOpen={true}
  cardId={cardId}
  taskToEdit={task}
  onClose={() => setOpen(false)}
/>
```

**DiferenÃ§as de UI:**
- **Criar**: BotÃµes "Cancelar" e "Criar Tarefa"
- **Editar**: BotÃµes "Descartar AlteraÃ§Ãµes" e "Salvar AlteraÃ§Ãµes"
- **ValidaÃ§Ã£o**: Dialog ao fechar com alteraÃ§Ãµes nÃ£o salvas

---

## ðŸŽ­ **Componentes UI Base (Shadcn)**

### **Button**
```typescript
import { Button } from '@/components/ui/button';

<Button variant="default">PadrÃ£o</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="ghost">Sutil</Button>
```

### **Dialog (Modal)**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>TÃ­tulo</DialogTitle>
    </DialogHeader>
    {children}
  </DialogContent>
</Dialog>
```

### **Sheet (Sidebar/Drawer)**
```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>TÃ­tulo</SheetTitle>
    </SheetHeader>
    {children}
  </SheetContent>
</Sheet>
```

### **Toast (NotificaÃ§Ãµes)**
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: "Sucesso!",
  description: "OperaÃ§Ã£o concluÃ­da",
});

toast({
  title: "Erro",
  description: "Algo deu errado",
  variant: "destructive",
});
```

---

## ðŸ”§ **PadrÃµes de Props**

### **Props BÃ¡sicas**
```typescript
interface ComponentProps {
  // Dados
  id: string;
  title: string;
  
  // Estados
  isOpen: boolean;
  isLoading?: boolean;
  
  // Callbacks
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  
  // Opcionais
  className?: string;
  children?: React.ReactNode;
}
```

### **Props de FormulÃ¡rio**
```typescript
interface FormProps {
  initialValues?: FormValues;
  onSubmit: (values: FormValues) => void | Promise<void>;
  onCancel?: () => void;
  onFormChange?: (isDirty: boolean) => void;
}
```

### **Props de Modal**
```typescript
interface ModalProps {
  open: boolean;  // ou isOpen
  onOpenChange: (open: boolean) => void;  // ou onClose
  title?: string;
  description?: string;
  children: React.ReactNode;
}
```

---

## ðŸŽ¯ **Boas PrÃ¡ticas**

### **âœ… FAZER**

1. **TypeScript para Props**
```typescript
interface Props {
  id: string;  // Sempre tipar!
  onSubmit: (data: FormData) => void;
}
```

2. **Desestruturar Props**
```typescript
function Component({ id, title, onSubmit }: Props) {
  // NÃ£o: props.id, props.title
  // Sim: id, title
}
```

3. **MemoizaÃ§Ã£o Inteligente**
```typescript
const memoizedValue = useMemo(() => 
  expensiveCalculation(data), 
  [data]
);

const memoizedCallback = useCallback(() => 
  doSomething(id), 
  [id]
);
```

4. **Componentes Pequenos**
```typescript
// Dividir componentes grandes
<Card>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>
```

5. **Error Boundaries**
```typescript
<ErrorBoundary>
  <ComponentQuePodeFalhar />
</ErrorBoundary>
```

### **âŒ NÃƒO FAZER**

1. **NÃ£o usar `any`**
```typescript
// âŒ Ruim
const data: any = fetchData();

// âœ… Bom
const data: UserData = fetchData();
```

2. **NÃ£o passar todos os props**
```typescript
// âŒ Ruim
<Child {...allProps} />

// âœ… Bom
<Child id={id} name={name} />
```

3. **NÃ£o criar refs desnecessÃ¡rias**
```typescript
// âŒ Ruim
const inputRef = useRef<HTMLInputElement>(null);
<Input ref={inputRef} />

// âœ… Bom (se nÃ£o precisa acessar DOM)
<Input value={value} onChange={handleChange} />
```

4. **NÃ£o usar index como key**
```typescript
// âŒ Ruim
{items.map((item, index) => <Item key={index} />)}

// âœ… Bom
{items.map((item) => <Item key={item.id} />)}
```

---

## ðŸ” **Debugging de Componentes**

### **React DevTools**
```typescript
// Adicionar display name
Component.displayName = 'MyComponent';

// Logs condicionais
if (import.meta.env.DEV) {
  console.log('ðŸ” Debug:', data);
}
```

### **Error Boundaries**
```typescript
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error, errorInfo) => {
    logErrorToService(error, errorInfo);
  }}
>
  <App />
</ErrorBoundary>
```

---

## ðŸ“¦ **Bibliotecas Utilizadas**

### **UI/Design**
- **Shadcn UI**: Componentes base (Button, Dialog, etc.)
- **Radix UI**: Primitivos acessÃ­veis
- **Tailwind CSS**: EstilizaÃ§Ã£o utilitÃ¡ria
- **Lucide React**: Ãcones

### **FormulÃ¡rios**
- **React Hook Form**: Gerenciamento de formulÃ¡rios
- **Zod**: ValidaÃ§Ã£o de schemas

### **Drag & Drop**
- **@dnd-kit/core**: Sistema de drag & drop

### **Utilidades**
- **date-fns**: ManipulaÃ§Ã£o de datas
- **clsx / cn**: Classes condicionais

---

**ðŸ“… Ãšltima AtualizaÃ§Ã£o**: Janeiro 2025  
**ðŸ‘¨â€ðŸ’» Desenvolvido por**: Equipe MZ Software  
**ðŸ”— Relacionado**: Hooks Guide, Routing Guide, UI Design Guide
