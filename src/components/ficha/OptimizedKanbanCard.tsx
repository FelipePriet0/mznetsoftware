import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Phone, 
  MessageCircle, 
  Calendar, 
  Flame, 
  MoreVertical, 
  Trash2, 
  Edit,
  User,
  UserCheck,
  Check,
  X,
  RotateCcw,
  Paperclip
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { canIngressar, canChangeStatus } from "@/lib/access";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CardItem } from "@/components/KanbanBoard";

interface OptimizedKanbanCardProps {
  card: CardItem;
  isOverdue: boolean;
  allowMove: boolean;
  onEdit: (card: CardItem) => void;
  onDelete: (card: CardItem) => void;
  onIngressar?: (card: CardItem) => void;
  onAprovar?: (card: CardItem, parecer: string) => void;
  onNegar?: (card: CardItem, parecer: string) => void;
  onReanalisar?: (card: CardItem, parecer: string) => void;
  onStatusChange?: (cardId: string, newStatus: string) => void;
  isDragging?: boolean;
  onAttachmentClick?: (cardId: string) => void;
  onCardClick?: (card: CardItem) => void;
}

export function OptimizedKanbanCard({ 
  card, 
  isOverdue, 
  allowMove, 
  onEdit,
  onDelete,
  onIngressar,
  onAprovar,
  onNegar,
  onReanalisar,
  onStatusChange,
  isDragging = false,
  onAttachmentClick,
  onCardClick,
}: OptimizedKanbanCardProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mouseDownTime, setMouseDownTime] = useState<number | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const isPlaceholder = card.id.startsWith('placeholder-');
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingHook } = useDraggable({
    id: card.id,
    disabled: !allowMove,
  });

  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(5deg)`,
        zIndex: 1000,
        opacity: 0.8,
        boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
      }
    : undefined;

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleIngressarAction = async () => {
    if (!onIngressar) return;
    
    setActionLoading("Ingressar");
    try {
      await onIngressar(card);
      toast({
        title: "Ficha ingressada",
        description: "Você agora é responsável por esta análise",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao ingressar na ficha",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecisionAction = (action: 'aprovar' | 'negar' | 'reanalisar', actionFn?: (card: CardItem, parecer: string) => void) => {
    if (!actionFn) return;
    
    // Para decisões, precisamos do parecer - será tratado no modal do componente pai
    actionFn(card, card.parecer || '');
  };

  const showIngressarButton = card.columnId === "recebido" && canIngressar(profile);
  const showDecisionButtons = card.columnId === "em_analise" && canChangeStatus(profile);
  const showReanalysisButtons = card.columnId === "reanalise" && canChangeStatus(profile);

  // Se for placeholder, renderizar versão especial (estilo Trello)
  if (isPlaceholder) {
    return (
      <div className="h-20 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <span className="text-blue-600 text-sm font-medium">
            {card.nome}
          </span>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(allowMove ? listeners : {})}
      onClick={(e) => {
        // Prevent card click when clicking on specific CTAs
        const target = e.target as HTMLElement;
        if (target.closest('[data-action-button]') || 
            target.closest('[data-dropdown-trigger]') ||
            target.closest('[role="menuitem"]') ||
            target.closest('.dropdown-menu') ||
            target.closest('[data-radix-collection-item]')) {
          console.log('🚫 [DEBUG] Clicou no dropdown, bloqueando card click');
          return;
        }
        // Prevent click during drag
        if (isDraggingHook) {
          return;
        }
        console.log('✅ [DEBUG] Clicou no card, abrindo edição');
        onCardClick?.(card);
      }}
      className={cn(
        // Cursor logic (like Trello):
        // - Default cursor: Normal cursor for clicking
        // - cursor-grabbing: Only when actively dragging
        isDraggingHook ? "cursor-grabbing" : "",
        "border border-border bg-card hover:shadow-md transition-shadow duration-200",
        isDraggingHook && "opacity-90 shadow-xl rotate-1 z-50",
        isOverdue && "border-destructive/50 bg-destructive/5"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Nome + CPF + Actions */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight truncate">
              {card.nome}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              CPF: {card.cpf || 'Não informado'}
            </p>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {isOverdue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Flame className="h-4 w-4 text-destructive animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Prazo vencido</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#018942] hover:bg-[#018942]/10"
                  data-dropdown-trigger
                >
                  <MoreVertical className="h-3 w-3 text-[#018942]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(card)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(card)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Contact Info */}
        {card.telefone && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span className="truncate">{formatPhone(card.telefone)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>WhatsApp</span>
            </div>
          </div>
        )}

        {/* Schedule Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Prazo: {formatDate(card.deadline)}</span>
          </div>
        </div>

        {/* Company & Vendor */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {card.companyLogoUrl ? (
              <img 
                src={card.companyLogoUrl} 
                alt={card.companyName || 'Empresa'}
                className="h-5 w-5 rounded object-contain"
              />
            ) : (
              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                <span className="text-xs font-medium">
                  {card.companyName ? card.companyName[0].toUpperCase() : 'E'}
                </span>
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate">
              {card.responsavel || 'Sem vendedor'}
            </span>
          </div>
        </div>

        {/* Analyst */}
        {card.analystName && (
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">
              Analista: {card.analystName}
            </span>
          </div>
        )}

        {/* Reanalyst (if applicable) */}
        {(card.columnId === 'reanalise' || card.assignedReanalyst) && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <UserCheck className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary truncate">
              Reanálise: {card.reanalystName || 'Aguardando atribuição'}
            </span>
            {card.reanalystAvatarUrl && (
              <Avatar className="h-4 w-4">
                <AvatarImage src={card.reanalystAvatarUrl} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(card.reanalystName || 'R')}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        {/* Parecer/Observações */}
        {card.parecer && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Observações:</div>
            <div className="text-xs bg-muted/50 rounded p-2 max-h-16 overflow-y-auto">
              {card.parecer}
            </div>
            
            {/* Botão Anexo dentro das Observações */}
            {onAttachmentClick && (
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAttachmentClick(card.id)}
                  className="h-6 text-xs px-2"
                  title="Anexar arquivo ou foto"
                >
                  <Paperclip className="w-3 h-3 mr-1" />
                  Anexo
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.slice(0, 2).map((label, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs px-1 py-0">
                {label}
              </Badge>
            ))}
            {card.labels.length > 2 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{card.labels.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {(showIngressarButton || showDecisionButtons || showReanalysisButtons || onAttachmentClick) && (
          <div className="mt-3 pt-3 border-t border-border/50 flex gap-1 flex-wrap">
            {showIngressarButton && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleIngressarAction}
                  disabled={actionLoading === "Ingressar"}
                  className="h-7 text-xs px-2"
                  data-action-button
                >
                  {actionLoading === "Ingressar" ? "..." : "Ingressar"}
                </Button>
            )}
            
            {showDecisionButtons && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleDecisionAction("aprovar", onAprovar)}
                  disabled={actionLoading === "Aprovar"}
                  className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                  data-action-button
                >
                  <Check className="w-3 h-3 mr-1" />
                  {actionLoading === "Aprovar" ? "..." : "Aprovar"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDecisionAction("negar", onNegar)}
                  disabled={actionLoading === "Negar"}
                  className="h-7 text-xs px-2"
                  data-action-button
                >
                  <X className="w-3 h-3 mr-1" />
                  {actionLoading === "Negar" ? "..." : "Negar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecisionAction("reanalisar", onReanalisar)}
                  disabled={actionLoading === "Reanalisar"}
                  className="h-7 text-xs px-2"
                  data-action-button
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {actionLoading === "Reanalisar" ? "..." : "Reanalisar"}
                </Button>
              </>
            )}
            
            {showReanalysisButtons && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleDecisionAction("aprovar", onAprovar)}
                  disabled={actionLoading === "Aprovar"}
                  className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                  data-action-button
                >
                  <Check className="w-3 h-3 mr-1" />
                  {actionLoading === "Aprovar" ? "..." : "Aprovar"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDecisionAction("negar", onNegar)}
                  disabled={actionLoading === "Negar"}
                  className="h-7 text-xs px-2"
                  data-action-button
                >
                  <X className="w-3 h-3 mr-1" />
                  {actionLoading === "Negar" ? "..." : "Negar"}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
