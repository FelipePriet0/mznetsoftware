import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, UserPlus, Search, Edit, User } from "lucide-react";
import ModalEditarFicha from "@/components/ui/ModalEditarFicha";
import NovaFichaComercialForm, { ComercialFormValues } from "@/components/NovaFichaComercialForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// New secure ficha creation components
import { ConfirmCreateModal } from "@/components/ficha/ConfirmCreateModal";
import { BasicInfoModal, BasicInfoData } from "@/components/ficha/BasicInfoModal";
import { ExpandedFichaModal } from "@/components/ficha/ExpandedFichaModal";
import { PersonTypeModal } from "@/components/ficha/PersonTypeModal";
import NovaFichaPJForm from "@/components/NovaFichaPJForm";
import { DeleteConfirmDialog } from "@/components/ficha/DeleteConfirmDialog";
import { OptimizedKanbanCard } from "@/components/ficha/OptimizedKanbanCard";
import { AttachmentUploadModal } from "@/components/attachments/AttachmentUploadModal";
import { AttachmentList } from "@/components/attachments/AttachmentDisplay";
import { useAttachments } from "@/hooks/useAttachments";

import { ParecerConfirmModal } from "@/components/ficha/ParecerConfirmModal";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuth } from "@/context/AuthContext";
import { canChangeStatus, isPremium } from "@/lib/access";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { supabase } from "@/integrations/supabase/client";

// Types
export type ColumnId =
  // Análise
  | "recebido"
  | "em_analise"
  | "reanalise"
  | "aprovado"
  | "negado"
  | "finalizado"
  // Comercial
  | "com_entrada"
  | "com_feitas"
  | "com_aguardando"
  | "com_canceladas"
  | "com_concluidas";

export interface CardItem {
  id: string;
  nome: string;
  cpf?: string;
  receivedAt: string; // ISO
  deadline: string; // ISO
  responsavel?: string; // Nome do responsável (assignee)
  responsavelId?: string; // UUID do responsável (assignee_id do banco)
  telefone?: string;
  email?: string;
  naturalidade?: string;
  uf?: string;
  applicantId?: string;
  parecer: string;
  columnId: ColumnId;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lastMovedAt: string; // ISO
  labels: string[];
  // Comercial stage persisted in DB
  commercialStage?: 'entrada' | 'feitas' | 'aguardando' | 'canceladas' | 'concluidas';
  // Área atual do card (comercial ou analise)
  area?: 'comercial' | 'analise';
}


const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "recebido", title: "Recebido" },
  { id: "em_analise", title: "Em Análise" },
  { id: "reanalise", title: "Reanálise" },
  { id: "aprovado", title: "Aprovado" },
  { id: "negado", title: "Negado" },
  { id: "finalizado", title: "Finalizado" },
];

const COMMERCIAL_COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "com_entrada", title: "Entrada" },
  { id: "com_feitas", title: "Feitas / Cadastrar no Mk" },
  { id: "com_aguardando", title: "Aguardando Documento" },
  { id: "com_canceladas", title: "Canceladas" },
  { id: "com_concluidas", title: "Concluídas" },
];

// Utils
// Fast business-hours approximation (no per-hour loop)
function businessHoursBetween(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (!isFinite(start) || !isFinite(end) || end <= start) return 0;
  const hours = Math.floor((end - start) / (1000 * 60 * 60));
  return Math.max(0, hours);
}

function isOverdue(card: CardItem): boolean {
  const now = new Date();
  const nowISO = now.toISOString();
  if (card.columnId === "recebido" || card.columnId === "em_analise") {
    return businessHoursBetween(card.lastMovedAt || card.createdAt, nowISO) > 24;
  }
  if (card.columnId === "reanalise") {
    return businessHoursBetween(card.lastMovedAt || card.createdAt, nowISO) > 48;
  }
  return false;
}

// Clean initial data for CEO presentation
const initialCards: CardItem[] = [];

const RESPONSAVEIS = ["Ana", "Bruno", "Carla", "Diego", "Equipe"];

type PrazoFiltro = "todos" | "hoje" | "atrasados";
type ViewFilter = "all" | "mine" | "company";
type KanbanArea = "analise" | "comercial";
type CommercialStage = Extract<ColumnId, `com_${string}`>;
type CommercialStageDB = 'entrada' | 'feitas' | 'aguardando' | 'canceladas' | 'concluidas';

export default function KanbanBoard() {
  const [cards, setCards] = useState<CardItem[]>(initialCards);
  const [query, setQuery] = useState("");
  const [responsavelFiltro, setResponsavelFiltro] = useState<string>("todos");
  const [prazoFiltro, setPrazoFiltro] = useState<PrazoFiltro>("todos");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  // Foco inicial no setor comercial (habilitado para DnD)
  const [kanbanArea, setKanbanArea] = useState<KanbanArea>("comercial");
  // Old state - kept for compatibility
  const [openNew, setOpenNew] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<{
    id: string;
    nome: string;
    telefone: string;
    responsavel?: string;
    parecer: string;
    recebido?: Date;
    prazo?: Date;
  } | null>(null);
  const [mockCard, setMockCard] = useState<CardItem | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [autoOpenExpandedNext, setAutoOpenExpandedNext] = useState(false);
  const [reanalysts, setReanalysts] = useState<Array<{id: string; full_name: string; avatar_url?: string; company_id?: string}>>([]);

  // New secure creation flow state
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [showPersonType, setShowPersonType] = useState(false);
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  const [showNovaPj, setShowNovaPj] = useState(false);
  const [showExpandedForm, setShowExpandedForm] = useState(false);
  const [basicInfoData, setBasicInfoData] = useState<BasicInfoData | null>(null);
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CardItem | null>(null);
  
  // Parecer confirmation state
  const [showParecerConfirm, setShowParecerConfirm] = useState(false);
  const [parecerAction, setParecerAction] = useState<{
    action: 'aprovar' | 'negar' | 'reanalisar';
    card: CardItem;
  } | null>(null);
  const [resumeSessionChecked, setResumeSessionChecked] = useState(false);
  
  // Estado para feedback visual do drag and drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [draggedCard, setDraggedCard] = useState<CardItem | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Estados para sistema de anexos
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedCardForAttachment, setSelectedCardForAttachment] = useState<string | null>(null);

  const { name: currentUserName } = useCurrentUser();
  const { profile } = useAuth();
  const { checkForExistingSession } = useDraftPersistence();
  
  // Hook para gerenciar anexos do card selecionado
  const { 
    attachments, 
    isLoading: isLoadingAttachments, 
    isUploading, 
    uploadAttachment, 
    deleteAttachment, 
    getDownloadUrl, 
    formatFileSize, 
    getFileIcon,
    loadAttachments 
  } = useAttachments(selectedCardForAttachment || '');
  // In commercial area, allow all roles to move; in analysis, keep role-gated
  const allowMove = kanbanArea === 'comercial' ? true : canChangeStatus(profile);

  // Load cards from Supabase (kanban_cards + applicants)
  const loadApplications = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("kanban_cards")
        .select(`
          id,
          area,
          stage,
          person_type,
          assignee_id,
          title,
          cpf_cnpj,
          phone,
          email,
          received_at,
          due_at,
          source,
          applicant:applicant_id ( id, primary_name, city, uf, email ),
          assignee:assignee_id ( id, full_name )
        `)
        .is('deleted_at', null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data) return;
      const mapped: CardItem[] = (data as any[]).map((row: any) => {
        const receivedAt = row.received_at ? new Date(row.received_at).toISOString() : new Date().toISOString();
        const deadline = row.due_at ? new Date(row.due_at).toISOString() : receivedAt;
        return {
          id: row.id,
          nome: row.title ?? row.applicant?.primary_name ?? 'Cliente',
          cpf: row.cpf_cnpj ?? '',
          receivedAt,
          deadline,
          responsavel: row.assignee?.full_name ?? undefined,
          responsavelId: row.assignee_id ?? undefined,
          telefone: row.phone ?? undefined,
          email: row.email ?? row.applicant?.email ?? undefined,
          naturalidade: row.applicant?.city ?? undefined,
          uf: row.applicant?.uf ?? undefined,
          applicantId: row.applicant?.id ?? undefined,
          parecer: '',
          columnId: ((): ColumnId => {
            if (row.area === 'comercial') {
              const stageMap: Record<string, ColumnId> = {
                'entrada': 'com_entrada',
                'feitas': 'com_feitas',
                'aguardando_doc': 'com_aguardando',
                'canceladas': 'com_canceladas',
                'concluidas': 'com_concluidas'
              };
              return stageMap[row.stage] || 'com_entrada';
            } else {
              return (row.stage as ColumnId) || 'recebido';
            }
          })(),
          createdAt: receivedAt,
          updatedAt: receivedAt,
          lastMovedAt: receivedAt,
          labels: [],
          commercialStage: row.area === 'comercial' ? ((): any => {
            const m: any = { entrada: 'entrada', feitas: 'feitas', aguardando_doc: 'aguardando', canceladas: 'canceladas', concluidas: 'concluidas' };
            return m[row.stage] ?? 'entrada';
          })() : undefined,
          area: row.area as 'comercial' | 'analise',
        } as CardItem;
      });
      console.log('Loaded cards:', mapped.length);
      console.log('Cards by column:', mapped.map(c => ({ id: c.id, nome: c.nome, columnId: c.columnId })));
      setCards(mapped);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Kanban] Falha ao carregar aplicações", e);
    }
  };

  // Função para atualizar o estado local em tempo real
  const handleStatusChange = (cardId: string, newStatus: string) => {
    setCards(prevCards => 
      prevCards.map(card => 
        card.id === cardId 
          ? { ...card, columnId: newStatus as ColumnId, lastMovedAt: new Date().toISOString() }
          : card
      )
    );
  };

  // Funções para gerenciar anexos
  const handleAttachmentClick = (cardId: string) => {
    setSelectedCardForAttachment(cardId);
    setShowAttachmentModal(true);
  };

  const handleUploadAttachment = async (data: any) => {
    if (!selectedCardForAttachment) return;
    
    try {
      await uploadAttachment(data);
      // Recarregar anexos após upload
      await loadAttachments();
    } catch (error) {
      console.error('Error uploading attachment:', error);
    }
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const url = await getDownloadUrl(filePath);
      if (url) {
        // Criar link temporário para download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment(attachmentId);
      // Recarregar anexos após exclusão
      await loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const canDeleteAttachment = (attachment: any) => {
    return attachment.author_id === profile?.id;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer 8px de movimento antes de iniciar drag
      },
    })
  );

  // Derived lists
  const responsaveisOptions = useMemo(() => {
    const set = new Set(cards.map((c) => c.responsavel).filter(Boolean) as string[]);
    RESPONSAVEIS.forEach((r) => set.add(r));
    return Array.from(set);
  }, [cards]);

  const getCommercialStage = (card: CardItem): CommercialStage => {
    const map: Record<CommercialStageDB, CommercialStage> = {
      entrada: 'com_entrada',
      feitas: 'com_feitas',
      aguardando: 'com_aguardando',
      canceladas: 'com_canceladas',
      concluidas: 'com_concluidas',
    };
    return map[(card.commercialStage || 'entrada') as CommercialStageDB];
  };


  function handleDragStart(event: DragStartEvent) {
    const cardId = event.active.id as string;
    const card = cards.find(c => c.id === cardId);
    console.log('Drag started:', cardId);
    setActiveId(cardId);
    setDraggedCard(card || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    
    if (!over) {
      setOverId(null);
      setDragOverColumn(null);
      return;
    }
    
    setOverId(over.id as string);
    
    // Se está sobre uma coluna, definir a coluna de destino
    if (over.data.current?.type === 'column') {
      setDragOverColumn(over.id as ColumnId);
    } else {
      setDragOverColumn(null);
    }

    // Auto-scroll como o Trello
    handleAutoScroll(event);
  }

  function handleAutoScroll(event: DragOverEvent) {
    const { active } = event;
    
    if (!active.rect.current.translated) return;
    
    const { top, bottom } = active.rect.current.translated;
    const container = document.querySelector('.kanban-container');
    
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const scrollThreshold = 100;
    
    // Scroll para cima se próximo do topo
    if (top < containerRect.top + scrollThreshold) {
      container.scrollBy({ top: -10, behavior: 'smooth' });
      setIsScrolling(true);
    }
    // Scroll para baixo se próximo da parte inferior
    else if (bottom > containerRect.bottom - scrollThreshold) {
      container.scrollBy({ top: 10, behavior: 'smooth' });
      setIsScrolling(true);
    }
    else {
      setIsScrolling(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    // Limpar estados
    setActiveId(null);
    setOverId(null);
    setDragOverColumn(null);
    setDraggedCard(null);
    
    // Verificar se há um destino válido
    if (!over) {
      console.log('No drop target found');
      return;
    }
    
    // Verificar se o usuário pode mover cards
    if (!allowMove) {
      console.log('User not allowed to move cards');
      return;
    }
    
    const cardId = active.id as string;
    const targetColumn = over.id as ColumnId;
    
    // Verificar se o card está sendo movido para a mesma coluna
    const currentCard = cards.find(c => c.id === cardId);
    if (currentCard && currentCard.columnId === targetColumn) {
      console.log('Card is already in this column');
      return;
    }
    
    console.log('Moving card:', cardId, 'to column:', targetColumn);
    moveTo(cardId, targetColumn);
  }

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchesQuery = `${c.nome} ${c.responsavel ?? ""} ${c.parecer}`
        .toLowerCase()
        .includes(query.toLowerCase());

      const matchesResp =
        responsavelFiltro === "todos" || (c.responsavel ?? "") === responsavelFiltro;

      const deadlineDate = new Date(c.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isHoje =
        new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate()).getTime() ===
        today.getTime();
      const isAtrasado = deadlineDate < new Date();

      const matchesPrazo =
        prazoFiltro === "todos" || (prazoFiltro === "hoje" ? isHoje : isAtrasado);

      // View filter
      const matchesView = viewFilter === "all" || 
                         (viewFilter === "mine" && c.responsavelId === profile?.id);

      return matchesQuery && matchesResp && matchesPrazo && matchesView;
    });
  }, [cards, query, responsavelFiltro, prazoFiltro, viewFilter, profile]);

  // Avoid repeated filter computations per column during render
  const analysisByColumn = useMemo(() => {
    const map = new Map<ColumnId, CardItem[]>();
    COLUMNS.forEach((col) => map.set(col.id, []));
    for (const c of filteredCards) {
      // Só mostrar cards que estão realmente no Kanban Análise
      if (c.area === 'analise') {
        if (map.has(c.columnId)) {
          map.get(c.columnId)!.push(c);
        }
      }
    }
    return map;
  }, [filteredCards]);

  const commercialByColumn = useMemo(() => {
    const map = new Map<ColumnId, CardItem[]>();
    COMMERCIAL_COLUMNS.forEach((col) => map.set(col.id, []));
    for (const c of filteredCards) {
      // Só mostrar cards que estão realmente no Kanban Comercial
      if (c.area === 'comercial') {
        const colId = getCommercialStage(c);
        if (map.has(colId)) {
          map.get(colId)!.push(c);
        }
      }
    }
    return map;
  }, [filteredCards]);

  // Função para gerar cards com placeholder fantasma (estilo Trello)
  const getCardsWithPlaceholder = (columnCards: CardItem[], columnId: ColumnId) => {
    if (!activeId || !draggedCard || dragOverColumn !== columnId) {
      return columnCards;
    }

    // Se o card está sendo arrastado para sua própria coluna, não mostrar placeholder
    if (draggedCard.columnId === columnId) {
      return columnCards;
    }

    // Criar placeholder fantasma mais realista
    const placeholder: CardItem = {
      ...draggedCard,
      id: `placeholder-${draggedCard.id}`,
      nome: `[ESPAÇO PARA: ${draggedCard.nome}]`,
    };

    // Adicionar placeholder no final da lista (como Trello)
    return [...columnCards, placeholder];
  };

  // Função para detectar posição de inserção (collision detection)
  const getInsertPosition = (columnCards: CardItem[], mouseY: number) => {
    if (columnCards.length === 0) return 0;
    
    // Simular detecção de posição baseada na posição do mouse
    // Em uma implementação real, isso seria baseado na posição exata do mouse
    const cardHeight = 80; // Altura aproximada de um card
    const insertIndex = Math.floor(mouseY / cardHeight);
    
    return Math.min(insertIndex, columnCards.length);
  };


// New card creation handled by NovaFichaComercialForm component
useEffect(() => {
  let mounted = true;
  const load = async () => {
    if (!mounted) return;
    await loadApplications();
  };
  
  const loadReanalysts = async () => {
    try {
      // Loading reanalysts disabled on lean backend (no reanalista role)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, company_id")
        .limit(0);

      if (error) throw error;
      setReanalysts(data || []);
    } catch (error) {
      console.error("Error loading reanalysts:", error);
    }
  };

  // Check for resume session after profile is loaded
  const checkResumeSession = async () => {
    // Disabled on lean backend (no drafts/applications)
    if (!profile?.id || resumeSessionChecked) return;
    setResumeSessionChecked(true);
  };

  load();
  // Resume session and reanalysts disabled in new backend flow
  if (profile?.id && !resumeSessionChecked) setResumeSessionChecked(true);
  
  return () => {
    mounted = false;
  };
}, [profile?.id, resumeSessionChecked]);

  // Removed periodic re-render to avoid perceived "reloads" during navigation

  // Actions for Kanban move - simplified and robust
  async function moveTo(cardId: string, target: ColumnId, label?: string) {
    try {
      const card = cards.find(c => c.id === cardId);
      if (!card) {
        console.log('Card not found:', cardId);
        return;
      }
      
      console.log('Moving card:', cardId, 'from', card.columnId, 'to', target);
      
      // Determinar área e stage baseado na coluna de destino
      let toArea: 'comercial' | 'analise';
      let toStage: string;
      
      if (target.startsWith('com_')) {
        toArea = 'comercial';
        const map: Record<string,string> = {
          com_entrada: 'entrada',
          com_feitas: 'feitas',
          com_aguardando: 'aguardando_doc',
          com_canceladas: 'canceladas',
          com_concluidas: 'concluidas',
        };
        toStage = map[target] || 'entrada';
      } else {
        toArea = 'analise';
        toStage = target as any;
      }

      // LÓGICA ESPECIAL: Transição entre Kanbans
      // Se está indo para "concluidas" no comercial, deve ir para "recebido" no analise
      if (target === 'com_concluidas') {
        toArea = 'analise';
        toStage = 'recebido';
        console.log('Card concluído no comercial -> movendo para recebido no analise');
      }
      
      // LÓGICA ESPECIAL: Transição Automática para Finalizado
      // Se está indo para "aprovado" ou "negado" no analise, deve ir para "finalizado"
      if (target === 'aprovado' || target === 'negado') {
        toArea = 'analise';
        toStage = 'finalizado';
        console.log('Card aprovado/negado -> movendo automaticamente para finalizado');
      }
      
      // VALIDAÇÃO: Impedir que cards voltem para "entrada" no comercial
      // Se o card já passou pelo comercial (tem commercialStage definido), não pode voltar para entrada
      if (target === 'com_entrada' && card.commercialStage && card.commercialStage !== 'entrada') {
        console.log('Card já processado no comercial - impedindo volta para entrada');
        toast({
          title: "Movimento não permitido",
          description: "Cards já processados não podem voltar para 'Entrada'",
          variant: "destructive"
        });
        return;
      }
      
      // VALIDAÇÃO: Impedir que cards do analise voltem para comercial (fluxo unidirecional)
      if (card.area === 'analise' && toArea === 'comercial') {
        console.log('Card do analise não pode voltar para comercial - fluxo unidirecional');
        toast({
          title: "Movimento não permitido", 
          description: "Cards em análise seguem fluxo unidirecional: Análise → Finalizado",
          variant: "destructive"
        });
        return;
      }

      // Salvar estado anterior para rollback
      const prevState = { 
        id: cardId, 
        columnId: card.columnId, 
        commercialStage: card.commercialStage,
        lastMovedAt: card.lastMovedAt
      };
      
      // Atualização otimista imediata da UI
      console.log('Updating UI optimistically...');
      setCards(prev => {
        const updated = prev.map(c => {
          if (c.id !== cardId) return c;
          
          console.log('Updating card:', c.id, 'from', c.columnId, 'to', target);
          
          // Determinar a coluna correta baseada na lógica especial
          let finalColumnId = target;
          
          // Se está indo para "concluidas", deve ir para "recebido" no analise
          if (target === 'com_concluidas') {
            finalColumnId = 'recebido';
          }
          
          // Se está indo para "aprovado" ou "negado", deve ir para "finalizado"
          if (target === 'aprovado' || target === 'negado') {
            finalColumnId = 'finalizado';
          }
          
          const updatedCard = {
            ...c,
            columnId: finalColumnId,
            lastMovedAt: new Date().toISOString(),
            area: toArea, // Atualizar área atual
          };
          
          // Atualizar commercialStage se necessário
          if (toArea === 'comercial') {
            const stageMap: Record<string, string> = {
              'entrada': 'entrada',
              'feitas': 'feitas', 
              'aguardando_doc': 'aguardando',
              'canceladas': 'canceladas',
              'concluidas': 'concluidas'
            };
            updatedCard.commercialStage = stageMap[toStage] as any;
          }
          
          return updatedCard;
        });
        
        console.log('Cards updated:', updated.length);
        return updated;
      });

      // Tentar atualizar no banco de dados
      try {
        const { error } = await (supabase as any).rpc('change_stage', {
          p_card_id: cardId,
          p_to_area: toArea,
          p_to_stage: toStage,
          p_comment: label || `Movido para ${target}`,
        });

        if (error) {
          console.error('Database update failed:', error);
          console.log('Using fallback: saving to localStorage');
          
          // Fallback: salvar no localStorage para persistência local
          try {
            const savedCards = JSON.parse(localStorage.getItem('kanban_cards_fallback') || '[]');
            const updatedCards = savedCards.map((c: any) => 
              c.id === cardId ? { ...c, columnId: target, commercialStage: toStage === 'aguardando_doc' ? 'aguardando' : toStage } : c
            );
            localStorage.setItem('kanban_cards_fallback', JSON.stringify(updatedCards));
            console.log('Card position saved to localStorage');
          } catch (localError) {
            console.error('localStorage save failed:', localError);
          }
          
          // Manter a atualização da UI (não fazer rollback)
          console.log('Card moved successfully to', target, '(local fallback)');
          // Recarregar dados mesmo no fallback
          setTimeout(() => {
            loadApplications();
          }, 100);
        } else {
          console.log('Card moved successfully to', target);
          // Recarregar dados para garantir sincronização
          setTimeout(() => {
            loadApplications();
          }, 100);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        console.log('Using fallback: saving to localStorage');
        
        // Fallback: salvar no localStorage
        try {
          const savedCards = JSON.parse(localStorage.getItem('kanban_cards_fallback') || '[]');
          const updatedCards = savedCards.map((c: any) => 
            c.id === cardId ? { ...c, columnId: target, commercialStage: toStage === 'aguardando_doc' ? 'aguardando' : toStage } : c
          );
          localStorage.setItem('kanban_cards_fallback', JSON.stringify(updatedCards));
          console.log('Card position saved to localStorage');
        } catch (localError) {
          console.error('localStorage save failed:', localError);
          // Rollback da UI apenas se localStorage também falhar
          setCards(prev => prev.map(c => c.id === cardId ? { 
            ...c, 
            columnId: prevState.columnId, 
            commercialStage: prevState.commercialStage,
            lastMovedAt: prevState.lastMovedAt
          } : c));
          toast({ 
            title: 'Erro ao mover', 
            description: 'Erro de conexão com o banco de dados', 
            variant: 'destructive' 
          });
          return;
        }
        
        console.log('Card moved successfully to', target, '(local fallback)');
        // Recarregar dados mesmo no fallback
        setTimeout(() => {
          loadApplications();
        }, 100);
      }

    } catch (error) {
      console.error("Error moving card:", error);
      toast({
        title: "Erro",
        description: "Erro ao mover ficha",
        variant: "destructive",
      });
    }
  }

  async function setResponsavel(cardId: string, resp: string) {
    try {
      // Determinar assigneeId a partir do argumento recebido
      // Caso resp já seja um UUID, usar direto; caso contrário, tentar resolver pelo nome
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let assigneeId: string | null = null;

      if (uuidRegex.test(resp)) {
        assigneeId = resp;
      } else {
        // Tentar buscar por nome completo
        const { data: byName } = await (supabase as any)
          .from('profiles')
          .select('id')
          .eq('full_name', resp)
          .maybeSingle();
        assigneeId = byName?.id || null;

        // Fallback: se não achou pelo nome, usar o próprio usuário autenticado (caso "Ingressar")
        if (!assigneeId && profile?.id) {
          assigneeId = profile.id;
        }
      }
      
      // Salvar no banco
      const { error: updateError } = await (supabase as any)
        .from('kanban_cards')
        .update({ assignee_id: assigneeId })
        .eq('id', cardId);
      if (updateError) {
        console.error('Erro ao atualizar assignee_id:', updateError);
        throw updateError;
      }
      
      // Atualizar estado local
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId) return c;
          const nextLabels = new Set(c.labels);
          if (resp) nextLabels.add("Em Análise");
          const isInRecebido = c.columnId === "recebido";
          return {
            ...c,
            // Se resp era um UUID, manter nome antigo; caso contrário, usar resp como nome
            responsavel: uuidRegex.test(resp) ? c.responsavel : resp,
            responsavelId: assigneeId || undefined,
            labels: Array.from(nextLabels),
            columnId: allowMove && isInRecebido ? "em_analise" : c.columnId,
            lastMovedAt: allowMove && isInRecebido ? new Date().toISOString() : c.lastMovedAt,
          };
        })
      );

      // Recarregar para refletir o nome correto a partir do banco
      setTimeout(() => loadApplications(), 100);
    } catch (error) {
      console.error('Erro ao atribuir responsável:', error);
      toast({ 
        title: 'Erro ao atribuir responsável', 
        variant: 'destructive' 
      });
    }
  }
  
  async function unassignAndReturn(cardId: string) {
    if (import.meta?.env?.DEV) console.log("unassignAndReturn called", cardId);
    
    try {
      // Remover assignee no banco
      await (supabase as any)
        .from('kanban_cards')
        .update({ assignee_id: null })
        .eq('id', cardId);
      
      // Atualizar estado local
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId) return c;
          return {
            ...c,
            responsavel: undefined,
            responsavelId: undefined,
            columnId: "recebido",
            labels: c.labels.filter((l) => l !== "Em Análise"),
            lastMovedAt: new Date().toISOString(),
          };
        })
      );
    } catch (error) {
      console.error('Erro ao desingressar:', error);
      toast({ 
        title: 'Erro ao desingressar', 
        variant: 'destructive' 
      });
    }
  }

  async function openEdit(card: CardItem) {
    console.log('🔍 Abrindo card:', card.id);
    
    try {
      // Buscar dados frescos do banco SEMPRE que abrir o modal
      const { data: freshCard, error } = await (supabase as any)
        .from('kanban_cards')
        .select('*')
        .eq('id', card.id)
        .is('deleted_at', null)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar card do banco:', error);
        // Se houver erro, usar card do cache local
        setMockCard(card);
        return;
      }
      
      console.log('✅ Dados frescos do banco carregados:', freshCard);
      
      // Usar os dados frescos do banco
      const updatedCard: CardItem = {
        ...card,
        parecer: freshCard.reanalysis_notes || freshCard.comments || freshCard.comments_short || '',
        // Atualizar outros campos que podem ter mudado
        nome: freshCard.title || card.nome,
        telefone: freshCard.phone || card.telefone,
        email: freshCard.email || card.email,
      };
      
      setMockCard(updatedCard);
    } catch (error) {
      console.error('❌ Erro ao abrir card:', error);
      // Fallback para dados do cache
      setMockCard(card);
    }
  }

  const handleCardClick = (card: CardItem) => {
    openEdit(card);
  };

  const handleIngressar = async (card: CardItem) => {
    try {
      if (import.meta?.env?.DEV) console.log('Ingressando na ficha:', card.id, 'alterando para: analise/em_analise');
      
      // 1. Primeiro muda o stage
      const { error } = await (supabase as any).rpc('change_stage', {
        p_card_id: card.id,
        p_to_area: 'analise',
        p_to_stage: 'em_analise',
        p_comment: 'Ingresso realizado',
      });

      if (error) throw error;
      
      // 2. Depois atribui o responsável (usuário atual)
      if (profile?.id) {
        await setResponsavel(card.id, profile.id);
      }
      
      toast({
        title: "Sucesso",
        description: "Ficha movida para Em Análise e atribuída",
      });
    } catch (error) {
      if (import.meta?.env?.DEV) console.error('Erro ao ingressar:', error);
      toast({
        title: "Erro",
        description: "Erro ao ingressar na ficha",
        variant: "destructive",
      });
    }
  };

  const handleAprovar = async (card: CardItem, parecer: string) => {
    if (import.meta?.env?.DEV) console.log("Aprovando card:", card.id, "parecer:", parecer);
    if (!parecer.trim()) {
      setParecerAction({ action: 'aprovar', card });
      setShowParecerConfirm(true);
      return;
    }
    
    try {
      const { error } = await (supabase as any).rpc('change_stage', {
        p_card_id: card.id,
        p_to_area: 'analise',
        p_to_stage: 'aprovado',
        p_comment: parecer,
      });

      if (error) {
        if (import.meta?.env?.DEV) console.error('RPC error on approve:', error);
        throw error;
      }
      
      if (import.meta?.env?.DEV) console.log('Status change successful, reloading applications...');
      // Reload applications instead of whole page
      await loadApplications();

      toast({
        title: "Ficha aprovada",
        description: "Decisão registrada com sucesso",
      });
    } catch (error: any) {
      if (import.meta?.env?.DEV) console.error('Erro ao aprovar:', error);
      toast({
        title: "Erro",
        description: `Erro ao aprovar ficha: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleNegar = async (card: CardItem, parecer: string) => {
    if (import.meta?.env?.DEV) console.log("Negando card:", card.id, "parecer:", parecer);
    if (!parecer.trim()) {
      setParecerAction({ action: 'negar', card });
      setShowParecerConfirm(true);
      return;
    }
    
    try {
      const { error } = await (supabase as any).rpc('change_stage', {
        p_card_id: card.id,
        p_to_area: 'analise',
        p_to_stage: 'negado',
        p_comment: parecer,
      });

      if (error) {
        if (import.meta?.env?.DEV) console.error('RPC error on deny:', error);
        throw error;
      }
      
      if (import.meta?.env?.DEV) console.log('Status change successful, reloading applications...');
      // Reload applications instead of whole page
      await loadApplications();

      toast({
        title: "Ficha negada",
        description: "Decisão registrada com sucesso",
      });
    } catch (error: any) {
      if (import.meta?.env?.DEV) console.error('Erro ao negar:', error);
      toast({
        title: "Erro",
        description: `Erro ao negar ficha: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleReanalisar = async (card: CardItem, parecer: string) => {
    if (import.meta?.env?.DEV) console.log("Reanalysando card:", card.id, "parecer:", parecer);
    if (!parecer.trim()) {
      setParecerAction({ action: 'reanalisar', card });
      setShowParecerConfirm(true);
      return;
    }
    
    try {
      const { error } = await (supabase as any).rpc('change_stage', {
        p_card_id: card.id,
        p_to_area: 'analise',
        p_to_stage: 'reanalise',
        p_comment: parecer,
      });

      if (error) {
        if (import.meta?.env?.DEV) console.error('RPC error on reanalyze:', error);
        throw error;
      }
      
      if (import.meta?.env?.DEV) console.log('Status change successful, reloading applications...');
      // Reload applications instead of whole page
      await loadApplications();

      toast({
        title: "Enviado para reanálise",
        description: "Decisão registrada com sucesso",
      });
    } catch (error: any) {
      if (import.meta?.env?.DEV) console.error('Erro ao reanalisar:', error);
      toast({
        title: "Erro",
        description: `Erro ao enviar para reanálise: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const confirmParecerAction = async () => {
    if (!parecerAction) return;
    
    const { action, card } = parecerAction;
    const parecer = card.parecer;
    
    setShowParecerConfirm(false);
    setParecerAction(null);
    
    // Executar a ação confirmada
    switch (action) {
      case 'aprovar':
        await handleAprovar(card, parecer);
        break;
      case 'negar':
        await handleNegar(card, parecer);
        break;
      case 'reanalisar':
        await handleReanalisar(card, parecer);
        break;
    }
  };

  function saveEdits() {
    if (!editing || !editing.parecer.trim()) {
      toast({ title: "Parecer do analista é obrigatório." });
      return;
    }
    setCards((prev) =>
      prev.map((c) =>
        c.id === editing.id
          ? {
              ...c,
              nome: editing.nome.trim(),
              telefone: editing.telefone || undefined,
              responsavel: editing.responsavel || undefined,
              parecer: editing.parecer.trim(),
              receivedAt: editing.recebido ? editing.recebido.toISOString() : c.receivedAt,
              deadline: editing.prazo ? editing.prazo.toISOString() : c.deadline,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
    setEditOpen(false);
    setEditing(null);
    toast({ title: "Alterações salvas" });
  }

  return (
    <section className="space-y-6 animate-fade-in kanban-container">
      <Card className="shadow-md bg-white text-[#018942]" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardHeader />
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[#018942]" />
              <Input
                placeholder="Busca global (nome, parecer, responsável)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-white text-[#018942] placeholder-[#018942]/70 border-[#018942]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="min-w-24">Área</Label>
              <Select value={kanbanArea} onValueChange={(v: KanbanArea) => setKanbanArea(v)}>
                <SelectTrigger className="bg-white text-[#018942] border-[#018942]">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="analise">Análise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="min-w-24">Responsável</Label>
              <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
                <SelectTrigger className="bg-white text-[#018942] border-[#018942]">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="todos">Todos</SelectItem>
                  {responsaveisOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="min-w-24">Prazo</Label>
              <Select value={prazoFiltro} onValueChange={(v: PrazoFiltro) => setPrazoFiltro(v)}>
                <SelectTrigger className="bg-white text-[#018942] border-[#018942]">
                  <SelectValue placeholder="Prazo" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="hoje">Vence hoje</SelectItem>
                  <SelectItem value="atrasados">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(profile?.role === "analista" || profile?.role === "gestor") && (
              <div className="flex items-center gap-2">
                <Label className="min-w-24">Visualização</Label>
                <Select value={viewFilter} onValueChange={(v: ViewFilter) => setViewFilter(v)}>
                  <SelectTrigger className="bg-white text-[#018942] border-[#018942]">
                    <SelectValue placeholder="Visualização" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">Todas (empresa)</SelectItem>
                    <SelectItem value="mine">Minhas tarefas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">Em Análise</Badge>
              <Badge className="bg-[hsl(var(--success))] text-white">Aprovado</Badge>
              <Badge className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]">Atrasado</Badge>
            </div>
            <Button 
              variant="pill" 
              size="xl" 
              className="hover-scale bg-[hsl(var(--brand))] text-white hover:bg-[hsl(var(--brand))/0.9] border border-transparent" 
              onClick={() => setShowConfirmCreate(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Nova ficha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legacy dialog removido para backend enxuto */}

      {mockCard && (
        <ModalEditarFicha
          card={mockCard}
          responsaveis={responsaveisOptions}
          onDesingressar={unassignAndReturn}
          onClose={() => { setMockCard(null); setAutoOpenExpandedNext(false); }}
          onRefetch={loadApplications}
          autoOpenExpanded={autoOpenExpandedNext}
          onSave={(form: any) => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === (mockCard as CardItem).id
                  ? {
                      ...c,
                      nome: form.nome ?? c.nome,
                      telefone: form.telefone || undefined,
                      // Atualiza apenas a data de instalação agendada
                      deadline: form.agendamento ? new Date(form.agendamento).toISOString() : c.deadline,
                      // "Feito em" é imutável (data de criação/recebimento)
                      updatedAt: new Date().toISOString(),
                    }
                  : c
              )
            );
            setMockCard(null);
          }}
        />
      )}

      <DndContext 
        collisionDetection={closestCenter} 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(kanbanArea === 'comercial' ? COMMERCIAL_COLUMNS : COLUMNS).map((col) => (
            <ColumnDropArea 
              key={col.id} 
              columnId={col.id}
              isDragOver={dragOverColumn === col.id}
              activeId={activeId}
            >
              <div className="rounded-xl border bg-card">
                <div
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ backgroundImage: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}
                >
                  <h2 className="font-semibold">{col.title}</h2>
                  <Badge variant="secondary" className="bg-white text-[#018942]">
                    {getCardsWithPlaceholder(
                      kanbanArea === 'comercial'
                        ? (commercialByColumn.get(col.id) || [])
                        : (analysisByColumn.get(col.id) || []),
                      col.id
                    ).length}
                  </Badge>
                </div>
                <div className="p-3">
                  <SortableContext
                    items={getCardsWithPlaceholder(
                      kanbanArea === 'comercial'
                        ? (commercialByColumn.get(col.id) || [])
                        : (analysisByColumn.get(col.id) || []),
                      col.id
                    ).map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="min-h-[120px] space-y-3">
                      {getCardsWithPlaceholder(
                        kanbanArea === 'comercial'
                          ? (commercialByColumn.get(col.id) || [])
                          : (analysisByColumn.get(col.id) || []),
                        col.id
                      )
                         .map((card) => (
                             <OptimizedKanbanCard
                               key={card.id}
                               card={card}
                               isOverdue={isOverdue(card)}
                               allowMove={allowMove}
                               onEdit={openEdit}
                               onDelete={(card) => {
                                 setCardToDelete(card);
                                 setShowDeleteConfirm(true);
                               }}
                               onIngressar={handleIngressar}
                               onAprovar={handleAprovar}
                               onNegar={handleNegar}
                               onReanalisar={handleReanalisar}
                               onStatusChange={handleStatusChange}
                               isDragging={activeId === card.id}
                               onAttachmentClick={handleAttachmentClick}
                               onCardClick={handleCardClick}
                             />
                         ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            </ColumnDropArea>
          ))}
        </div>
      </DndContext>

      {/* New secure creation flow modals */}
  <ConfirmCreateModal
    open={showConfirmCreate}
    onClose={() => setShowConfirmCreate(false)}
    onConfirm={() => {
      setShowConfirmCreate(false);
      setShowPersonType(true);
    }}
  />

  <PersonTypeModal
    open={showPersonType}
    onClose={() => setShowPersonType(false)}
    onSelect={(type) => {
      setShowPersonType(false);
      if (type === 'pf') setShowBasicInfo(true);
      else setShowNovaPj(true);
    }}
  />

  <BasicInfoModal
    open={showBasicInfo}
    onClose={() => setShowBasicInfo(false)}
    onBack={() => {
      setShowBasicInfo(false);
      setShowPersonType(true);
    }}
    onSubmit={async (data) => {
      try {
        // 1) Cria applicant PF
        const { data: applicant, error: aErr } = await (supabase as any)
          .from('applicants')
          .insert({
            person_type: 'PF',
            primary_name: data.nome,
            cpf_cnpj: data.cpf.replace(/\D+/g, ''),
            phone: data.telefone,
            email: data.email || null,
            city: data.naturalidade,
            uf: data.uf,
          })
          .select('id')
          .single();
        if (aErr) throw aErr;

        // 2) Card no Kanban (Comercial/entrada)
        const now = new Date();
        const { data: created, error: cErr } = await (supabase as any)
          .from('kanban_cards')
          .insert({
            applicant_id: applicant.id,
            person_type: 'PF',
            area: 'comercial',
            stage: 'entrada',
            title: data.nome,
            cpf_cnpj: data.cpf.replace(/\D+/g, ''),
            phone: data.telefone,
            email: data.email || null,
            received_at: now.toISOString(),
            source: 'software_pf',
          })
          .select('id, title, phone, email, cpf_cnpj, received_at, stage')
          .single();
        if (cErr) throw cErr;
        // Abrir modal de edição (ficha) com o card criado (busca completa após reload)
        setShowBasicInfo(false);
        setAutoOpenExpandedNext(true);
        toast({ title: 'Ficha criada com sucesso!' });
        await loadApplications();
        // Seleciona card recém-criado para editar
        const nc = (prevCards => prevCards.find(c => c.id === created.id))(cards) || (
          (await (supabase as any).from('kanban_cards').select('id, title, cpf_cnpj, phone, email, received_at, stage').eq('id', created.id).single()).data
            ? {
                id: created.id,
                nome: created.title,
                cpf: created.cpf_cnpj || '',
                receivedAt: created.received_at,
                deadline: created.received_at,
                responsavel: undefined,
                responsavelId: undefined,
                telefone: created.phone || undefined,
                email: created.email || undefined,
                naturalidade: data.naturalidade,
                uf: data.uf,
                applicantId: applicant.id,
                parecer: '',
                columnId: 'recebido',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastMovedAt: new Date().toISOString(),
                labels: [],
                analystName: currentUserName,
              } as any : null);
        if (nc) setMockCard(nc as any);
      } catch (e: any) {
        if (import.meta?.env?.DEV) console.error('Erro ao criar PF:', e);
        toast({ title: 'Erro ao criar ficha', description: e.message || String(e), variant: 'destructive' });
      }
    }}
  />

{/* Expanded form removido no MVP do novo backend; criação direta acima */}

  <NovaFichaPJForm
    open={showNovaPj}
    onClose={() => setShowNovaPj(false)}
    onBack={() => {
      setShowNovaPj(false);
      setShowPersonType(true);
    }}
    onCreated={async (created) => {
      setShowNovaPj(false);
      setAutoOpenExpandedNext(true);
      await loadApplications();
      // Build minimal card object to open editor immediately
      const newCard: CardItem = {
        id: created.id,
        nome: created.title,
        cpf: created.cpf_cnpj || '',
        receivedAt: created.received_at || new Date().toISOString(),
        deadline: created.received_at || new Date().toISOString(),
        responsavel: undefined,
        responsavelId: undefined,
        telefone: created.phone || undefined,
        email: created.email || undefined,
        naturalidade: undefined,
        uf: undefined,
        applicantId: created.applicant_id,
        parecer: '',
        columnId: 'recebido',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMovedAt: new Date().toISOString(),
        labels: [],
        analystName: currentUserName,
      } as any;
      setMockCard(newCard);
    }}
  />

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCardToDelete(null);
        }}
        onConfirm={async (reason) => {
          if (!cardToDelete) return;
          
          try {
            console.log('🗑️ [DEBUG] Soft delete de card:', cardToDelete.id, 'motivo:', reason);
            
            // SOFT DELETE (não deleta permanentemente!)
            console.log('🔍 [DEBUG] Profile ID:', profile?.id);
            console.log('🔍 [DEBUG] Fazendo UPDATE no banco...');
            
            const { error } = await (supabase as any)
              .from('kanban_cards')
              .update({
                deleted_at: new Date().toISOString(),
                deleted_by: profile?.id,
                deletion_reason: reason
              })
              .eq('id', cardToDelete.id);
              
            console.log('🔍 [DEBUG] Resultado do UPDATE:', { error });

            if (error) {
              console.error('🚨 [DEBUG] Erro ao fazer soft delete:', error);
              throw error;
            }
            
            console.log('✅ [DEBUG] Soft delete bem-sucedido! Removendo do front...');
            // Remover do estado local (UI) - card continua no banco marcado como deletado
            setCards(prev => prev.filter(c => c.id !== cardToDelete.id));
            toast({ title: "Ficha deletada com sucesso" });
          } catch (error: any) {
            console.error('🚨 [DEBUG] Error deleting application:', error);
            toast({
              title: "Erro ao deletar ficha",
              variant: "destructive",
            });
          }
          
          setShowDeleteConfirm(false);
          setCardToDelete(null);
        }}
        customerName={cardToDelete?.nome || ''}
        customerCpf={cardToDelete?.cpf || ''}
      />


      <ParecerConfirmModal
        isOpen={showParecerConfirm}
        onClose={() => {
          setShowParecerConfirm(false);
          setParecerAction(null);
        }}
        onConfirm={confirmParecerAction}
        action={parecerAction?.action || 'aprovar'}
        customerName={parecerAction?.card.nome || ''}
        parecer={parecerAction?.card.parecer}
      />

      {/* Modal de Upload de Anexos */}
      <AttachmentUploadModal
        open={showAttachmentModal}
        onClose={() => {
          setShowAttachmentModal(false);
          setSelectedCardForAttachment(null);
        }}
        onUpload={handleUploadAttachment}
        isUploading={isUploading}
        cardId={selectedCardForAttachment || ''}
      />
    </section>
  );
}

// Drop area - estilo Trello com feedback visual
function ColumnDropArea({ 
  columnId, 
  children, 
  isDragOver, 
  activeId 
}: { 
  columnId: ColumnId; 
  children: React.ReactNode;
  isDragOver: boolean;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: columnId,
    data: {
      type: 'column',
      columnId: columnId
    }
  });
  
  const isDragActive = activeId && activeId !== columnId;
  const showDropIndicator = isOver && isDragActive;
  
  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "min-h-[200px] transition-all duration-200 rounded-lg relative",
        showDropIndicator && "bg-blue-50 border-blue-300 border-2 border-dashed shadow-lg"
      )}
      data-droppable="true"
      data-column-id={columnId}
    >
      {children}
      
      {/* Indicador visual de drop - estilo Trello */}
      {showDropIndicator && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-1 bg-blue-500 rounded-full mx-2 shadow-lg animate-pulse"></div>
        </div>
      )}
    </div>
  );
}

// Card component
function KanbanCard({
  card,
  responsaveis,
  currentUserName,
  onSetResponsavel,
  onMove,
  onOpen,
  onDesingressar,
  reanalysts,
  onReload,
}: {
  card: CardItem;
  responsaveis: string[];
  currentUserName: string;
  onSetResponsavel: (id: string, resp: string) => void;
  onMove: (id: string, col: ColumnId, label?: string) => void;
  onOpen: (card: CardItem) => void;
  onDesingressar: (id: string) => void;
  reanalysts: Array<{id: string; full_name: string; avatar_url?: string; company_id?: string}>;
  onReload: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const allowDecide = canChangeStatus(profile);
  const premium = isPremium(profile);
  const overDue = isOverdue(card);
  const fireColumns = new Set<ColumnId>(["recebido", "em_analise", "reanalise", "aprovado"]);
  const msUntil = new Date(card.deadline).getTime() - Date.now();
  const onFire = fireColumns.has(card.columnId) && msUntil >= 0 && msUntil <= 24 * 60 * 60 * 1000;

  // Sistema de empresas removido (não usado)

  const handleReassign = async (reanalystId: string) => {
    try {
      const { error } = await supabase.rpc('reassign_application', {
        p_app_id: card.id,
        p_reanalyst: reanalystId
      });

      if (error) throw error;

      const reanalyst = reanalysts.find(r => r.id === reanalystId);
      toast({
        title: "Reatribuição realizada",
        description: `Ficha atribuída para ${reanalyst?.full_name}`,
      });

      // Reload applications instead of full page reload
      await onReload();
    } catch (error) {
      if (import.meta?.env?.DEV) console.error("Error reassigning application:", error);
      toast({
        title: "Erro",
        description: "Erro ao reatribuir ficha",
        variant: "destructive",
      });
    }
  };

  const displayLabels = premium ? card.labels.filter((l) => l !== "Em Análise") : card.labels;

  const headerBadges = (
    <div className="flex gap-2 flex-wrap">
      {displayLabels.map((l) => (
        <Badge key={l} variant="secondary">
          {l}
        </Badge>
      ))}
      {overDue && (
        <Badge className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] animate-alert-pulse">
          Atrasado
        </Badge>
      )}
    </div>
  );

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, disabled: !allowDecide });
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  function handleCardClick(e: React.MouseEvent) {
    if (isDragging) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-ignore-card-click],button,select,input,textarea,[role="menuitem"]')) return;
    onOpen(card);
  }

  return (
    <div
      ref={setNodeRef}
      id={card.id}
      {...listeners}
      {...attributes}
      onClick={handleCardClick}
      className={cn(
        "kanban-card rounded-xl border bg-card shadow-sm hover-scale",
        allowDecide ? "cursor-grab active:cursor-grabbing" : "cursor-default select-none",
        overDue ? "ring-2 ring-[hsl(var(--destructive))]" : "",
        onFire ? "card-on-fire animate-fire-flicker" : "",
        isDragging ? "dragging opacity-80" : ""
      )}
      style={{ transition: "var(--transition-smooth)", ...dragStyle }}
    >
      {onFire && (
        <>
          <div className="fire-overlay" aria-hidden />
          <div className="corner-flame" aria-hidden />
        </>
      )}

<div className="p-3 border-b flex items-center justify-between">
  <div className="flex items-center gap-2">
    <div className="font-medium">{card.nome}</div>
  </div>
  <div className="flex items-center gap-1">
    {headerBadges}
  </div>
</div>
      <div className="p-3 relative flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Recebido: </span>
            {format(new Date(card.receivedAt), "dd/MM/yyyy")}
          </div>
          <div>
            <span className="font-medium text-foreground">Prazo: </span>
            {format(new Date(card.deadline), "dd/MM/yyyy")}
          </div>
          <div>
            <span className="font-medium text-foreground">Resp.: </span>
            {card.responsavel ?? "—"}
          </div>
        </div>


        <div className="text-sm">
          <span className="font-medium">Parecer: </span>
          <span className="text-muted-foreground">{card.parecer || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm" data-ignore-card-click>Responsável</Label>
          <Select value={card.responsavel} onValueChange={(v) => onSetResponsavel(card.id, v)}>
            <SelectTrigger className="h-8" data-ignore-card-click disabled={!allowDecide}>
              <SelectValue placeholder="Atribuir" />
            </SelectTrigger>
            <SelectContent className="z-50">
              {responsaveis.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {card.columnId === "em_analise" && allowDecide && (
          <>
            <div className="pt-2 flex gap-2">
              <Button size="sm" onClick={() => onMove(card.id, "aprovado")} data-ignore-card-click>
                Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onMove(card.id, "negado")} data-ignore-card-click>
                Negar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onMove(card.id, "reanalise")} data-ignore-card-click>
                Reanalisar
              </Button>
            </div>
          </>
        )}
        {card.columnId === "recebido" && (
          <div className="sticky bottom-0 -mx-3 px-3 pt-2 border-t bg-gradient-to-t from-background/90 to-background/0">
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!allowDecide}
                onClick={() => {
                  onSetResponsavel(card.id, currentUserName);
                  toast({ title: "Ingresso efetuado" });
                }}
                data-ignore-card-click
              >
                Ingressar
              </Button>
            </div>
          </div>
        )}
        {card.columnId === "reanalise" && allowDecide && (
          <div className="sticky bottom-0 -mx-3 px-3 pt-2 border-t bg-gradient-to-t from-background/90 to-background/0">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!card.parecer || !card.parecer.trim()) {
                    toast({
                      title: "Preencha o Parecer antes de decidir.",
                      action: (
                        <ToastAction altText="Abrir card" onClick={() => onOpen(card)}>
                          Abrir card
                        </ToastAction>
                      ),
                    });
                    return;
                  }
                  onMove(card.id, "aprovado", "Aprovado");
                }}
                data-ignore-card-click
              >
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (!card.parecer || !card.parecer.trim()) {
                    toast({
                      title: "Preencha o Parecer antes de decidir.",
                      action: (
                        <ToastAction altText="Abrir card" onClick={() => onOpen(card)}>
                          Abrir card
                        </ToastAction>
                      ),
                    });
                    return;
                  }
                  onMove(card.id, "negado", "Negado");
                }}
                data-ignore-card-click
              >
                Negar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
