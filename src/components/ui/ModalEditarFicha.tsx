import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/hooks/use-toast";
import { X, MoreVertical, Paperclip, ArrowLeft } from "lucide-react";
import { ExpandedFichaModal } from "@/components/ficha/ExpandedFichaModal";
import { ExpandedFichaPJModal } from "@/components/ficha/ExpandedFichaPJModal";
import { supabase } from "@/integrations/supabase/client";
import { ComercialFormValues } from "@/components/NovaFichaComercialForm";
import { useAuth } from "@/context/AuthContext";
import { canEditReanalysis } from "@/lib/access";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ObservationsWithComments } from "@/components/ui/ObservationsWithComments";
import { AttachmentUploadModal } from "@/components/attachments/AttachmentUploadModal";
import { AttachmentList } from "@/components/attachments/AttachmentDisplay";
import { useAttachments } from "@/hooks/useAttachments";

interface ModalEditarFichaProps {
  card: any;
  responsaveis?: string[];
  onClose: () => void;
  onSave: (updatedCard: any) => void;
  onDesingressar?: (id: string) => void;
  onRefetch?: () => void;
  autoOpenExpanded?: boolean;
}

export default function ModalEditarFicha({ card, onClose, onSave, onDesingressar, responsaveis = [], onRefetch, autoOpenExpanded = false }: ModalEditarFichaProps) {
  const initialForm = {
    nome: card?.nome ?? "",
    telefone: card?.telefone ?? "",
    agendamento: card?.deadline ? new Date(card.deadline).toISOString().slice(0, 10) : "",
    feito_em: card?.receivedAt ? new Date(card.receivedAt).toISOString().slice(0, 10) : "",
    observacoes: card?.observacoes ?? "",
  };
  
  const [form, setForm] = useState(initialForm);
  const [pareceres, setPareceres] = useState<Array<{id:string; author_id?:string; author_name:string; author_role?:string; created_at:string; text:string; updated_by_id?:string; updated_by_name?:string; updated_at?:string; parent_id?:string; level?:number; thread_id?:string; is_thread_starter?:boolean}>>([]);
  const [showNewParecerEditor, setShowNewParecerEditor] = useState(false);
  const [newParecerText, setNewParecerText] = useState("");
  const [editingParecerId, setEditingParecerId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [replyingToParecerId, setReplyingToParecerId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [showFirstConfirmDialog, setShowFirstConfirmDialog] = useState(false);
  const [showSecondConfirmDialog, setShowSecondConfirmDialog] = useState(false);
  const [showDiscardConfirmDialog, setShowDiscardConfirmDialog] = useState(false);
  const [showExpandedModal, setShowExpandedModal] = useState(autoOpenExpanded);
  const [pendingAction, setPendingAction] = useState<'close' | 'save' | null>(null);
  const [deletingParecerId, setDeletingParecerId] = useState<string | null>(null);
  const { profile } = useAuth();
  const { name: currentUserName } = useCurrentUser();
  
  // Estados para sistema de anexos
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  
  // Hook para gerenciar anexos
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
  } = useAttachments(card?.id || '');
  // Forçar remount da área de comentários ao anexar/excluir para recarregar listas
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Funções para gerenciar anexos
  const handleAttachmentClick = () => {
    setShowAttachmentModal(true);
  };

  const handleUploadAttachment = async (data: any) => {
    try {
      console.log('📎 [ModalEditarFicha] Iniciando upload de anexo...');
      const uploaded = await uploadAttachment(data);
      console.log('📎 [ModalEditarFicha] Upload concluído, recarregando anexos...');
      await loadAttachments();
      console.log('📎 [ModalEditarFicha] Anexos recarregados. Verificando comentário automático de anexo...');

      // Fallback: garantir que exista um comentário de "Anexo adicionado" vinculado
      try {
        if (uploaded && uploaded.file_name && card?.id && profile?.id) {
          // Esperar um pouco para o trigger do banco criar o comentário (se existir)
          await new Promise(r => setTimeout(r, 250));

          // Tentar encontrar comentário criado automaticamente pelo trigger
          const { data: recentComments } = await (supabase as any)
            .from('card_comments')
            .select('id, content, created_at')
            .eq('card_id', card.id)
            .order('created_at', { ascending: false })
            .limit(5);

          const match = (recentComments || []).find((c: any) =>
            typeof c.content === 'string' &&
            /anexo/i.test(c.content) &&
            c.content.toLowerCase().includes(uploaded.file_name.toLowerCase())
          );

          if (match) {
            console.log('📎 [ModalEditarFicha] Comentário automático detectado. Vinculando attachment ao comentário:', match.id);
            // Vincular attachment ao comentário encontrado (se ainda não vinculado)
            try {
              await (supabase as any)
                .from('card_attachments')
                .update({ comment_id: match.id })
                .eq('id', uploaded.id);
            } catch {}
          } else {
            console.log('📎 [ModalEditarFicha] Nenhum comentário automático encontrado. Criando NOVA conversa encadeada...');
            const content = `📎 **Anexo adicionado**\n\n` +
              `📄 **Arquivo:** ${uploaded.file_name}\n` +
              (uploaded.description ? `📝 **Descrição:** ${uploaded.description}\n` : '') +
              `📎 Anexo adicionado: ${uploaded.file_name}`;
            
            const newThreadId = `thread_${card.id}_${Date.now()}`;
            console.log('📎 [ModalEditarFicha] ===== CRIANDO NOVA THREAD =====');
            console.log('📎 [ModalEditarFicha] Dados do comentário (NOVA CONVERSA):', {
              card_id: card.id,
              author_id: profile.id,
              author_name: currentUserName || profile.full_name || 'Usuário',
              author_role: profile.role,
              content: content.substring(0, 100) + '...',
              level: 0,
              thread_id: newThreadId,
              is_thread_starter: true
            });
            
            const { data: manualComment, error: ccErr } = await (supabase as any)
              .from('card_comments')
              .insert({
                card_id: card.id,
                author_id: profile.id,
                author_name: currentUserName || profile.full_name || 'Usuário',
                author_role: profile.role,
                content,
                level: 0,
                thread_id: newThreadId,
                is_thread_starter: true
              })
              .select('id')
              .single();
              
            console.log('📎 [ModalEditarFicha] ===== RESULTADO DA CRIAÇÃO =====');
            console.log('📎 [ModalEditarFicha] Resultado da criação do comentário:', {
              success: !ccErr,
              error: ccErr,
              commentId: manualComment?.id,
              threadId: newThreadId,
              isThreadStarter: true
            });
            if (!ccErr && manualComment?.id) {
              try {
                await (supabase as any)
                  .from('card_attachments')
                  .update({ comment_id: manualComment.id })
                  .eq('id', uploaded.id);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.log('ℹ️ [ModalEditarFicha] Fallback de comentário ignorado:', err);
      }

      console.log('📎 [ModalEditarFicha] Chamando onRefetch...');
      // Recarregar a página para mostrar o comentário automático
      if (onRefetch) {
        onRefetch();
      }
      // Forçar remount de CommentsList para recarregar comentários e anexos
      setCommentsRefreshKey((k) => k + 1);
      console.log('📎 [ModalEditarFicha] Processo de upload completo!');
    } catch (error) {
      console.error('Error uploading attachment:', error);
    }
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const url = await getDownloadUrl(filePath);
      if (url) {
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
      console.log('🗑️ [ModalEditarFicha] Iniciando exclusão de anexo:', attachmentId);
      const success = await deleteAttachment(attachmentId);
      console.log('🗑️ [ModalEditarFicha] Exclusão resultado:', success);
      if (success) {
        console.log('🗑️ [ModalEditarFicha] Recarregando anexos...');
        await loadAttachments();
        console.log('🗑️ [ModalEditarFicha] Anexos recarregados com sucesso');
        // Recarregar comentários também
        if (onRefetch) {
          console.log('🗑️ [ModalEditarFicha] Chamando onRefetch...');
          onRefetch();
        }
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const canDeleteAttachment = (attachment: any) => {
    return attachment.author_id === profile?.id;
  };

  // Autosave (debounced) for Nome, Telefone, Prazo (due_at) e Observações (comments)
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        // Update kanban_cards (title, phone, due_at)
        const updates: any = {};
        if (form.nome !== initialForm.nome) updates.title = form.nome;
        if (form.telefone !== initialForm.telefone) updates.phone = form.telefone;
        if (form.agendamento) updates.due_at = new Date(form.agendamento).toISOString();
        if (form.observacoes !== initialForm.observacoes) updates.comments = form.observacoes;
        if (Object.keys(updates).length > 0) {
          await (supabase as any).from('kanban_cards').update(updates).eq('id', card.id);
        }
        // Update applicants (primary_name, phone) se disponível
        if ((card as any).applicantId) {
          const appUpdates: any = {};
          if (form.nome !== initialForm.nome) appUpdates.primary_name = form.nome;
          if (form.telefone !== initialForm.telefone) appUpdates.phone = form.telefone;
          if (Object.keys(appUpdates).length > 0) {
            await (supabase as any).from('applicants').update(appUpdates).eq('id', (card as any).applicantId);
          }
        }
      } catch (e) {
        // silencioso; evita travar UI
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [form.nome, form.telefone, form.agendamento, form.observacoes]);

  // Load pareceres (read-only) from backend for this ficha/card
  useEffect(() => {
    const loadPareceres = async () => {
      try {
        // Try kanban_cards first
        const { data: kc } = await (supabase as any)
          .from('kanban_cards')
          .select('reanalysis_notes')
          .eq('id', card.id)
          .maybeSingle();
        let list: any[] = [];
        if (kc && (kc as any).reanalysis_notes) {
          const notes = (kc as any).reanalysis_notes;
          if (Array.isArray(notes)) {
            list = notes;
          } else if (typeof notes === 'string') {
            try { list = JSON.parse(notes) || []; } catch {}
          }
        }
        // Migrar pareceres antigos que não têm estrutura hierárquica
        const migratedList = (Array.isArray(list) ? list : []).map(parecer => {
          // Se não tem estrutura hierárquica, adicionar
          if (!parecer.thread_id || parecer.level === undefined) {
            return {
              ...parecer,
              parent_id: parecer.parent_id || null,
              level: parecer.level || 0,
              thread_id: parecer.thread_id || crypto.randomUUID(),
              is_thread_starter: parecer.is_thread_starter !== undefined ? parecer.is_thread_starter : true
            };
          }
          return parecer;
        });
        
        // Filtrar pareceres deletados (soft delete)
        const activePareceres = migratedList.filter(parecer => !parecer.deleted);
        console.log('📊 Pareceres carregados:', migratedList.length, 'Ativos:', activePareceres.length);
        setPareceres(activePareceres);
      } catch (e) {
        setPareceres([]);
      }
    };
    loadPareceres();
  }, [card?.id]);

  // Create new parecer and persist
  const handleCreateParecer = async () => {
    const text = newParecerText.trim();
    if (!text) return;
    const roleLabel = profile?.role ? String(profile.role) : 'colaborador';
    const newP = {
      id: crypto.randomUUID(),
      author_id: profile?.id || 'current-user-id',
      author_name: currentUserName,
      author_role: roleLabel,
      created_at: new Date().toISOString(),
      text,
      parent_id: null,
      level: 0, // Parecer principal
      thread_id: crypto.randomUUID(), // Novo thread para cada parecer principal
      is_thread_starter: true
    };
    // Merge with current DB notes to prevent overwriting
    let currentNotes: any[] = [];
    {
      const { data } = await (supabase as any)
        .from('kanban_cards')
        .select('reanalysis_notes')
        .eq('id', card.id)
        .maybeSingle();
      const raw = (data as any)?.reanalysis_notes;
      if (Array.isArray(raw)) currentNotes = raw as any[];
      else if (typeof raw === 'string') { try { currentNotes = JSON.parse(raw) || []; } catch {}
      }
    }
    const next = [...currentNotes, newP];
    setPareceres(next);
    setNewParecerText("");
    setShowNewParecerEditor(false);
    const serialized = JSON.stringify(next);
    try {
      const { error } = await (supabase as any)
        .from('kanban_cards')
        .update({ reanalysis_notes: serialized })
        .eq('id', card.id);
      if (error) throw error;
      toast({ title: 'Parecer adicionado', description: 'Seu parecer foi salvo na ficha.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar parecer', description: e?.message || String(e), variant: 'destructive' });
    }
  };
  const canEditParecer = (p: {author_id?: string}) => {
    // Autor pode editar/excluir seu próprio parecer
    if ((p.author_id ?? '') === (profile?.id ?? '')) {
      return true;
    }
    // Gestor pode editar/excluir qualquer parecer
    if (profile?.role === 'gestor') {
      return true;
    }
    return false;
  };
  const canReplyToParecer = (p: {author_role?: string, level?: number}) => {
    const canReply = profile?.role === 'gestor' && (p.level || 0) < 7;
    console.log('🔍 DEBUG canReplyToParecer:', {
      profileRole: profile?.role,
      parecerLevel: p.level || 0,
      canReply,
      parecerAuthorRole: p.author_role
    });
    return canReply;
  };

  // Função para organizar pareceres em grupos hierárquicos
  const getGroupedPareceres = () => {
    const threads = new Map<string, any[]>();
    
    // Agrupar por thread_id
    pareceres.forEach(parecer => {
      const threadId = parecer.thread_id || parecer.id;
      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(parecer);
    });
    
    // Ordenar cada thread por created_at
    threads.forEach((threadPareceres) => {
      threadPareceres.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
    
    return Array.from(threads.values());
  };

  // Função para obter cor do thread
  const getThreadColor = (threadId: string) => {
    const colors = [
      'border-blue-500 bg-blue-50',
      'border-green-500 bg-green-50', 
      'border-purple-500 bg-purple-50',
      'border-orange-500 bg-orange-50',
      'border-pink-500 bg-pink-50',
      'border-indigo-500 bg-indigo-50',
      'border-teal-500 bg-teal-50',
      'border-cyan-500 bg-cyan-50'
    ];
    const hash = threadId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  const startEditParecer = (id: string, currentText: string) => { setEditingParecerId(id); setEditingText(currentText); };
  const cancelEditParecer = () => { setEditingParecerId(null); setEditingText(""); };
  const startReplyToParecer = (id: string) => { setReplyingToParecerId(id); setReplyText(""); };
  const cancelReplyToParecer = () => { setReplyingToParecerId(null); setReplyText(""); };
  
  const saveReplyToParecer = async () => {
    if (!replyingToParecerId || !card?.id) return;
    const text = replyText.trim();
    if (!text) return;
    
    try {
      // Buscar o parecer original
      const parecerOriginal = pareceres.find(p => p.id === replyingToParecerId);
      if (!parecerOriginal) return;
      
      // Criar resposta do gestor
      const respostaGestor = {
        id: crypto.randomUUID(),
        author_id: profile?.id || 'gestor-id',
        author_name: profile?.full_name || 'Gestor',
        author_role: 'gestor',
        created_at: new Date().toISOString(),
        text: text, // Remover prefixo, será tratado na interface
        parent_id: replyingToParecerId,
        level: (parecerOriginal.level || 0) + 1, // Incrementar nível baseado no parecer pai
        thread_id: parecerOriginal.thread_id || parecerOriginal.id,
        is_thread_starter: false
      };
      
      // Adicionar resposta aos pareceres
      setPareceres(prev => [...prev, respostaGestor]);
      
      // Salvar no banco de dados
      let base: any[] = [];
      const { data } = await (supabase as any).from('kanban_cards').select('reanalysis_notes').eq('id', card.id).maybeSingle();
      const raw = (data as any)?.reanalysis_notes;
      if (Array.isArray(raw)) base = raw as any[]; 
      else if (typeof raw === 'string') { try { base = JSON.parse(raw) || []; } catch {} }
      
      const updated = [...base, respostaGestor];
      const serialized = JSON.stringify(updated);
      
      const { error } = await (supabase as any)
        .from('kanban_cards')
        .update({ reanalysis_notes: serialized })
        .eq('id', card.id);
        
      if (error) throw error;
      
      setReplyingToParecerId(null);
      setReplyText("");
      toast({ title: 'Resposta salva', description: 'Sua resposta foi adicionada ao parecer.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar resposta', description: e?.message || String(e), variant: 'destructive' });
    }
  };
  
  const saveEditParecer = async () => {
    if (!editingParecerId) return;
    const text = editingText.trim();
    if (!text) return;
    let base: any[] = [];
    const { data } = await (supabase as any)
      .from('kanban_cards')
      .select('reanalysis_notes')
      .eq('id', card.id)
      .maybeSingle();
    const raw = (data as any)?.reanalysis_notes;
    if (Array.isArray(raw)) base = raw as any[]; else if (typeof raw === 'string') { try { base = JSON.parse(raw) || []; } catch {} }
    const updated = (base.length ? base : pareceres).map((p: any) => p.id === editingParecerId && canEditParecer(p)
      ? { ...p, text, updated_by_id: profile?.id || 'current-user-id', updated_by_name: currentUserName, updated_at: new Date().toISOString() }
      : p);
    setPareceres(updated);
    setEditingParecerId(null);
    setEditingText("");
    try {
      const serialized = JSON.stringify(updated);
      const { error } = await (supabase as any).from('kanban_cards').update({ reanalysis_notes: serialized }).eq('id', card.id);
      if (error) throw error;
      toast({ title: 'Parecer atualizado', description: 'Alteração aplicada com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro ao editar parecer', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  // Funções para exclusão de pareceres
  const handleDeleteParecer = (parecerId: string) => {
    setDeletingParecerId(parecerId);
  };

  const confirmDeleteParecer = async () => {
    if (!deletingParecerId || !card?.id) return;
    
    try {
      console.log('🗑️ Excluindo parecer:', deletingParecerId, 'do card:', card.id);
      
      // Buscar pareceres atuais do banco
      let currentNotes: any[] = [];
      const { data } = await (supabase as any)
        .from('kanban_cards')
        .select('reanalysis_notes')
        .eq('id', card.id)
        .maybeSingle();
      
      console.log('📋 Pareceres atuais do banco:', data);
      
      const raw = (data as any)?.reanalysis_notes;
      if (Array.isArray(raw)) currentNotes = raw as any[];
      else if (typeof raw === 'string') { try { currentNotes = JSON.parse(raw) || []; } catch {} }
      
      console.log('📝 Pareceres parseados:', currentNotes);
      
      // Marcar o parecer como deletado (soft delete)
      const updated = currentNotes.map((p: any) => {
        if (p.id === deletingParecerId) {
          return {
            ...p,
            deleted_at: new Date().toISOString(),
            deleted_by: profile?.id,
            deleted: true
          };
        }
        return p;
      });
      const serialized = JSON.stringify(updated);
      
      console.log('✅ Parecer marcado como deletado (soft delete):', deletingParecerId);
      
      // Preparar dados para update
      const updateData: any = { reanalysis_notes: serialized };
      
      // Verificar se restaram pareceres ativos (não deletados)
      const activePareceres = updated.filter((p: any) => !p.deleted);
      console.log('📊 Pareceres ativos restantes:', activePareceres.length);
      
      // Salvar no banco
      const { error } = await (supabase as any)
        .from('kanban_cards')
        .update(updateData)
        .eq('id', card.id);
      
      if (error) {
        console.error('❌ Erro ao salvar no banco:', error);
        throw error;
      }
      
      console.log('💾 Parecer marcado como deletado (soft delete) no banco!', updateData);
      
      // Atualizar estado local - remover da lista (já foi filtrado como deletado)
      setPareceres(prev => prev.filter(p => p.id !== deletingParecerId));
      setDeletingParecerId(null);
      
      // Chamar onRefetch se disponível para forçar recarregamento
      if (onRefetch) {
        console.log('🔄 Chamando onRefetch...');
        onRefetch();
      }
      
      toast({ title: 'Parecer excluído', description: 'O parecer foi removido com sucesso.' });
    } catch (e: any) {
      console.error('❌ ERRO ao excluir parecer:', e);
      toast({ title: 'Erro ao excluir parecer', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const cancelDeleteParecer = () => {
    setDeletingParecerId(null);
  };

  // Check if form has changes
  const hasChanges = () => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  };

  const handleClose = () => {
    if (!hasChanges()) {
      onClose();
      return;
    }
    setPendingAction('close');
    setShowFirstConfirmDialog(true);
  };

  const handleSave = () => {
    if (!hasChanges()) {
      onSave(form);
      return;
    }
    setPendingAction('save');
    setShowFirstConfirmDialog(true);
  };

  const handleFirstConfirm = () => {
    setShowFirstConfirmDialog(false);
    setShowSecondConfirmDialog(true);
  };

  const handleSecondConfirm = () => {
    setShowSecondConfirmDialog(false);
    onSave(form);
    // Defer closing parent modal to allow nested portals to unmount cleanly
    if (pendingAction === 'close') {
      setTimeout(() => onClose(), 0);
    }
    setPendingAction(null);
  };

  const handleDiscardChanges = () => {
    setShowFirstConfirmDialog(false);
    setShowSecondConfirmDialog(false);
    setShowDiscardConfirmDialog(false);
    setPendingAction(null);
    // Defer closing parent modal to avoid removeChild errors from nested portals
    setTimeout(() => onClose(), 0);
  };

  const handleExpandedSubmit = async (data: ComercialFormValues) => {
    // Handle the full form submission
    console.log('Full form submitted:', data);
    setShowExpandedModal(false);
    onRefetch?.();
  };

  const basicInfo = {
    nome: card?.nome || '',
    cpf: card?.cpf || '',
    telefone: card?.telefone || '',
    whatsapp: card?.whatsapp || card?.telefone || '',
    nascimento: card?.nascimento ? new Date(card.nascimento).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    naturalidade: card?.naturalidade || '',
    uf: card?.uf || '',
    email: card?.email || ''
  };

  const feitoEm = initialForm.feito_em;
  const vendedorNome = (card?.vendedorNome) || (card?.analystName) || (card?.responsavel) || '';
  const analistaNome = vendedorNome; // por ora, mesmo criador
  const isPJ = (card?.cpf || '').replace(/\D+/g, '').length > 11;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => e.preventDefault()}>
        <div
          className="bg-background text-foreground p-8 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Editar Ficha</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand)/0.08)]"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              className="rounded-[12px] text-[#018942] placeholder-[#018942]/0.7"
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              name="telefone"
              inputMode="tel"
              type="tel"
              value={form.telefone}
              onChange={handleChange}
              className="rounded-[12px] text-[#018942] placeholder-[#018942]/0.7"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Feito em</Label>
              <Input
                name="feito_em"
                type="date"
                value={feitoEm}
                disabled
                className="rounded-[12px] text-[#018942] placeholder-[#018942]/0.7"
              />
            </div>
            <div className="space-y-2">
              <Label>Instalação agendada para</Label>
              <Input
                name="agendamento"
                type="date"
                value={form.agendamento}
                onChange={handleChange}
                className="rounded-[12px] text-[#018942] placeholder-[#018942]/0.7"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Vendedor</Label>
              <Input
                value={vendedorNome || "—"}
                disabled
                className="rounded-[12px] text-[#018942] placeholder-[#018942]/0.7"
              />
            </div>
            <div className="space-y-1">
              <Label>Analista</Label>
              <Input
                value={analistaNome || "—"}
                disabled
                className="rounded-[12px] text-[#018942] placeholder-[#018942]/0.7"
              />
            </div>
          </div>

          {/* Pareceres */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pareceres</Label>
              <Button
                size="sm"
                type="button"
                onClick={() => setShowNewParecerEditor(true)}
                className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90"
              >
                + Adicionar Parecer
              </Button>
            </div>
            
            {/* Editor de novo parecer - agora aparece acima dos pareceres existentes */}
            {showNewParecerEditor && (
              <div className="mt-2">
                <Textarea
                  rows={3}
                  value={newParecerText}
                  onChange={(e) => setNewParecerText(e.target.value)}
                  placeholder="Escreva um novo parecer..."
                  className="rounded-[12px] text-[#018942] placeholder-[#018942]/0.7"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" type="button" variant="secondary" onClick={() => { setShowNewParecerEditor(false); setNewParecerText(""); }} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">Cancelar</Button>
                  <Button size="sm" type="button" onClick={handleCreateParecer} className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90">Salvar Parecer</Button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {getGroupedPareceres().map((threadPareceres, threadIndex) => {
                const threadId = threadPareceres[0]?.thread_id || threadPareceres[0]?.id;
                const threadColor = getThreadColor(threadId);
                const mainParecer = threadPareceres[0]; // Primeiro parecer é sempre o principal
                
                return (
                  <div key={threadId} className={`rounded-lg border-2 ${threadColor} p-3`}>
                    <div className="space-y-3">
                      {threadPareceres.map((p, index) => {
                        const level = p.level || 0;
                        const indentClass = level > 0 ? `ml-${Math.min(level * 4, 16)} border-l-2 border-gray-300 pl-3` : '';
                        
                        return (
                          <div key={p.id} className={indentClass}>
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(p.created_at).toLocaleString()}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{p.author_name}</span>
                                {p.author_role && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                                    {p.author_role}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Botão de Resposta (seta de retorno) - sempre visível para Gestor */}
                                {canReplyToParecer(p) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startReplyToParecer(p.id)}
                                    className="h-6 w-6 p-0 hover:bg-[#018942]/10 rounded-full"
                                    title="Responder ao parecer (apenas Gestor)"
                                  >
                                    <ArrowLeft className="h-3 w-3 rotate-180 text-[#018942]" />
                                  </Button>
                                )}
                                {/* Botão de Edição (3 pontinhos) - sempre visível para o autor */}
                                {canEditParecer(p) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#018942] hover:bg-[#018942]/10">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => startEditParecer(p.id, p.text)}>
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteParecer(p.id)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          
                          {editingParecerId === p.id ? (
                            <div>
                              <Textarea rows={3} value={editingText} onChange={(e) => setEditingText(e.target.value)} className="text-sm text-[#018942]" />
                              <div className="flex justify-end mt-2 gap-2">
                                <Button size="sm" type="button" variant="secondary" onClick={cancelEditParecer} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">Cancelar</Button>
                                <Button size="sm" type="button" onClick={saveEditParecer} className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90">Salvar</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[13px] whitespace-pre-wrap">{p.text}</div>
                          )}
                          
                          {/* Interface de Resposta */}
                          {replyingToParecerId === p.id && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-[#018942]">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-[#018942] rounded-full"></div>
                                <span className="text-sm font-medium text-gray-700">
                                  Respondendo a {p.author_name} ({p.author_role})
                                </span>
                              </div>
                              <Textarea 
                                rows={3} 
                                value={replyText} 
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Digite sua resposta como Gestor..."
                                className="text-sm resize-none [&::placeholder]:text-[#018942]"
                                style={{ color: '#018942' }}
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelReplyToParecer}
                                  className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={saveReplyToParecer}
                                  disabled={!replyText.trim()}
                                  className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90 disabled:opacity-50"
                                >
                                  <ArrowLeft className="h-3 w-3 mr-1 rotate-180" />
                                  Responder
                                </Button>
                              </div>
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {pareceres.length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhum parecer registrado.</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações e Conversas</Label>
            <ObservationsWithComments
              key={commentsRefreshKey}
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              className="rounded-[12px] min-h-[120px] text-[#018942] placeholder-[#018942]/0.7]"
              placeholder="Use @mencoes para colaboradores..."
              cardId={card?.id || ''}
              onAttachmentClick={handleAttachmentClick}
              onRefetch={onRefetch}
            />
          </div>
        </div>

          <div className="flex items-center justify-between mt-8">
            <Button
              size="sm"
              onClick={() => setShowExpandedModal(true)}
              className="hover-scale !bg-[hsl(var(--brand))] !text-white hover:!bg-[hsl(var(--brand))/0.9] border border-transparent"
            >
              Analisar
            </Button>
            <div className="flex gap-2">
              {card?.columnId === "em_analise" && (
                <Button size="sm" variant="secondary" onClick={() => { onDesingressar?.(card.id); toast({ title: "Card retornado para Recebidos" }); onClose(); }}>
                  Desingressar
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* First confirmation dialog */}
      <AlertDialog open={showFirstConfirmDialog} onOpenChange={setShowFirstConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você deseja alterar as informações dessa ficha?</AlertDialogTitle>
            <AlertDialogDescription>
              As informações serão atualizadas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => { setShowFirstConfirmDialog(false); setShowDiscardConfirmDialog(true); }}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              Descartar alterações
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFirstConfirm}
              className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90"
            >
              Sim, alterar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard confirmation dialog */}
      <AlertDialog open={showDiscardConfirmDialog} onOpenChange={setShowDiscardConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja descartar as alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação descartará todas as alterações não salvas nesta ficha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardConfirmDialog(false)} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              Sim, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second confirmation dialog */}
      <AlertDialog open={showSecondConfirmDialog} onOpenChange={setShowSecondConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja alterar as informações?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowSecondConfirmDialog(false);
              setPendingAction(null);
            }} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSecondConfirm} className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90">
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isPJ ? (
        <ExpandedFichaPJModal
          open={showExpandedModal}
          onClose={() => setShowExpandedModal(false)}
          applicationId={card?.id}
          onRefetch={onRefetch}
        />
      ) : (
        <ExpandedFichaModal
          open={showExpandedModal}
          onClose={() => setShowExpandedModal(false)}
          onSubmit={handleExpandedSubmit}
          basicInfo={basicInfo}
          applicationId={card?.id}
        />
      )}

      {/* Modal de Upload de Anexos */}
      <AttachmentUploadModal
        open={showAttachmentModal}
        onClose={() => {
          setShowAttachmentModal(false);
          // Recarregar comentários quando fechar o modal
          if (onRefetch) {
            onRefetch();
          }
        }}
        onUpload={handleUploadAttachment}
        isUploading={isUploading}
        cardId={card?.id || ''}
      />

      {/* Confirmação de exclusão de parecer */}
      <AlertDialog open={deletingParecerId !== null} onOpenChange={() => setDeletingParecerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Parecer</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este parecer? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteParecer} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteParecer} className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
