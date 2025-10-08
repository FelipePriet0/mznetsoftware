import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FichaPJForm, PJFormValues } from "@/components/ficha/FichaPJForm";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, X, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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

interface ExpandedFichaPJModalProps {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  applicationId?: string;
  onRefetch?: () => void;
}

type Parecer = {
  id: string;
  author_id?: string;
  author_name: string;
  author_role?: string;
  created_at: string;
  text: string;
  updated_by_id?: string;
  updated_by_name?: string;
  updated_at?: string;
  parent_id?: string;
  level?: number;
  thread_id?: string;
  is_thread_starter?: boolean;
};

export function ExpandedFichaPJModal({ open, onClose, applicationId, onRefetch }: ExpandedFichaPJModalProps) {
  const { profile } = useAuth();
  const { name: currentUserName } = useCurrentUser();
  const [pareceres, setPareceres] = useState<Parecer[]>([]);
  const [showNewParecerEditor, setShowNewParecerEditor] = useState(false);
  const [newParecerText, setNewParecerText] = useState("");
  const [editingParecerId, setEditingParecerId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [deletingParecerId, setDeletingParecerId] = useState<string | null>(null);
  const [replyingToParecerId, setReplyingToParecerId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  // PF-like confirmation flow state
  const [formData, setFormData] = useState<PJFormValues | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFirstConfirmDialog, setShowFirstConfirmDialog] = useState(false);
  const [showSecondConfirmDialog, setShowSecondConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'close' | 'save' | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<PJFormValues> | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);

  // Load notes from kanban_cards
  useEffect(() => {
    const fetchNotes = async () => {
      if (!open || !applicationId) return;
      try {
        const { data } = await supabase
          .from('kanban_cards')
          .select('reanalysis_notes')
          .eq('id', applicationId)
          .maybeSingle();
        let notes: any[] = [];
        const raw = (data as any)?.reanalysis_notes;
        if (Array.isArray(raw)) notes = raw as any[];
        else if (typeof raw === 'string') { try { notes = JSON.parse(raw) || []; } catch {}
        }
        
        // Migrar pareceres antigos que não têm estrutura hierárquica
        const migratedNotes = (Array.isArray(notes) ? notes : []).map(parecer => {
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
        
        setPareceres(migratedNotes as Parecer[]);
      } catch {
        // ignore
      }
    };
    fetchNotes();
  }, [open, applicationId]);

  // Load initial basic data from kanban_cards/applicants/pj_fichas (robust with timeout + mount guard)
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const loadInitial = async () => {
      if (!open || !applicationId) return;
      if (!mounted) return;
      setIsLoadingInitial(true);

      // Fallback: if something stalls, stop loading after 3s to avoid lock
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        setIsLoadingInitial(false);
        if (!initialValues) setInitialValues({} as any);
      }, 3000);

      try {
        if (import.meta?.env?.DEV) console.log('[PJ] Loading initial data for applicationId', applicationId);
        const cardPromise = supabase
          .from('kanban_cards')
          .select('id, applicant_id, title, cpf_cnpj, phone, email')
          .eq('id', applicationId)
          .maybeSingle();

        const { data: card } = await cardPromise;

        let tradeName: string | undefined = undefined;
        if ((card as any)?.applicant_id) {
          const { data: pjFicha } = await supabase
            .from('pj_fichas')
            .select('trade_name')
            .eq('applicant_id', (card as any).applicant_id)
            .maybeSingle();
          if (pjFicha && (pjFicha as any).trade_name) tradeName = (pjFicha as any).trade_name as string;
        }

        if (!mounted) return;
        const defaults: Partial<PJFormValues> = {
          empresa: {
            razao: (card as any)?.title || '',
            cnpj: (card as any)?.cpf_cnpj || '',
            fantasia: tradeName || '',
          },
          contatos: {
            tel: (card as any)?.phone || '',
            whats: (card as any)?.phone || '',
            email: (card as any)?.email || '',
          },
        } as any;
        setInitialValues(defaults);
        if (import.meta?.env?.DEV) console.log('[PJ] Initial defaults ready');
        setIsInitialized(false);
        setHasChanges(false);
      } catch (_e) {
        if (import.meta?.env?.DEV) console.error('[PJ] Failed to load initial data', _e);
        if (!mounted) return;
        setInitialValues({} as any);
      } finally {
        if (!mounted) return;
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        setIsLoadingInitial(false);
        if (import.meta?.env?.DEV) console.log('[PJ] Loading done');
      }
    };
    loadInitial();
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open, applicationId]);

  const appendParecer = async () => {
    const text = newParecerText.trim();
    if (!text || !applicationId) return;
    // merge from DB to avoid overwrite
    let base: any[] = [];
    const { data } = await supabase.from('kanban_cards').select('reanalysis_notes').eq('id', applicationId).maybeSingle();
    const raw = (data as any)?.reanalysis_notes;
    if (Array.isArray(raw)) base = raw as any[]; else if (typeof raw === 'string') { try { base = JSON.parse(raw) || []; } catch {} }
    const newP: Parecer = { 
      id: crypto.randomUUID(), 
      author_id: profile?.id || 'current-user-id', 
      author_name: currentUserName, 
      author_role: String(profile?.role || 'colaborador'), 
      created_at: new Date().toISOString(), 
      text,
      parent_id: null,
      level: 0, // Parecer principal
      thread_id: crypto.randomUUID(), // Novo thread para cada parecer principal
      is_thread_starter: true
    };
    const next = [...base, newP];
    setPareceres(next);
    setNewParecerText("");
    setShowNewParecerEditor(false);
    try {
      const serialized = JSON.stringify(next);
      const { error } = await supabase.from('kanban_cards').update({ reanalysis_notes: serialized }).eq('id', applicationId);
      if (error) throw error;
      
      // Chamar onRefetch para atualizar outros componentes
      if (onRefetch) {
        onRefetch();
      }
      
      toast({ title: 'Parecer adicionado' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar parecer', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const canEdit = (p: Parecer) => {
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
  const canReplyToParecer = (p: Parecer) => profile?.role === 'gestor' && (p.level || 0) < 7;

  // Função para organizar pareceres em grupos hierárquicos
  const getGroupedPareceres = () => {
    const threads = new Map<string, Parecer[]>();
    
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
  const startEdit = (id: string, currentText: string) => { setEditingParecerId(id); setEditingText(currentText); };
  const cancelEdit = () => { setEditingParecerId(null); setEditingText(""); };
  const startReplyToParecer = (id: string) => { setReplyingToParecerId(id); setReplyText(""); };
  const cancelReplyToParecer = () => { setReplyingToParecerId(null); setReplyText(""); };
  
  const saveReplyToParecer = async () => {
    if (!replyingToParecerId || !applicationId) return;
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
      const { data } = await supabase.from('kanban_cards').select('reanalysis_notes').eq('id', applicationId).maybeSingle();
      const raw = (data as any)?.reanalysis_notes;
      if (Array.isArray(raw)) base = raw as any[]; 
      else if (typeof raw === 'string') { try { base = JSON.parse(raw) || []; } catch {} }
      
      const updated = [...base, respostaGestor];
      const serialized = JSON.stringify(updated);
      
      const { error } = await supabase
        .from('kanban_cards')
        .update({ reanalysis_notes: serialized })
        .eq('id', applicationId);
        
      if (error) throw error;
      
      // Chamar onRefetch para atualizar outros componentes
      if (onRefetch) {
        onRefetch();
      }
      
      setReplyingToParecerId(null);
      setReplyText("");
      toast({ title: 'Resposta salva', description: 'Sua resposta foi adicionada ao parecer.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar resposta', description: e?.message || String(e), variant: 'destructive' });
    }
  };
  
  const saveEdit = async () => {
    if (!editingParecerId || !applicationId) return;
    const text = editingText.trim(); if (!text) return;
    let base: any[] = [];
    const { data } = await supabase.from('kanban_cards').select('reanalysis_notes').eq('id', applicationId).maybeSingle();
    const raw = (data as any)?.reanalysis_notes;
    if (Array.isArray(raw)) base = raw as any[]; else if (typeof raw === 'string') { try { base = JSON.parse(raw) || []; } catch {} }
    const updated = (base.length ? base : pareceres).map((p: any) => p.id === editingParecerId && canEdit(p)
      ? { ...p, text, updated_by_id: profile?.id || 'current-user-id', updated_by_name: currentUserName, updated_at: new Date().toISOString() }
      : p);
    setPareceres(updated);
    setEditingParecerId(null);
    setEditingText("");
    try {
      const serialized = JSON.stringify(updated);
      const { error } = await supabase.from('kanban_cards').update({ reanalysis_notes: serialized }).eq('id', applicationId);
      if (error) throw error;
      
      // Chamar onRefetch para atualizar outros componentes
      if (onRefetch) {
        onRefetch();
      }
      
      toast({ title: 'Parecer atualizado' });
    } catch (e: any) {
      toast({ title: 'Erro ao editar parecer', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  // Funções para exclusão de pareceres
  const handleDeleteParecer = (parecerId: string) => {
    setDeletingParecerId(parecerId);
  };

  const confirmDeleteParecer = async () => {
    if (!deletingParecerId || !applicationId) return;
    
    try {
      console.log('🗑️ [PJ] Excluindo parecer:', deletingParecerId, 'do card:', applicationId);
      
      // Buscar pareceres atuais do banco
      let currentNotes: any[] = [];
      const { data } = await supabase
        .from('kanban_cards')
        .select('reanalysis_notes')
        .eq('id', applicationId)
        .maybeSingle();
      
      console.log('📋 [PJ] Pareceres atuais do banco:', data);
      
      const raw = (data as any)?.reanalysis_notes;
      if (Array.isArray(raw)) currentNotes = raw as any[];
      else if (typeof raw === 'string') { try { currentNotes = JSON.parse(raw) || []; } catch {} }
      
      console.log('📝 [PJ] Pareceres parseados:', currentNotes);
      
      // Remover o parecer da lista
      const updated = currentNotes.filter((p: any) => p.id !== deletingParecerId);
      const serialized = JSON.stringify(updated);
      
      console.log('✅ [PJ] Pareceres atualizados (sem o excluído):', updated);
      
      // Preparar dados para update
      const updateData: any = { reanalysis_notes: serialized };
      
      
      // Salvar no banco
      const { error } = await supabase
        .from('kanban_cards')
        .update(updateData)
        .eq('id', applicationId);
      
      if (error) {
        console.error('❌ [PJ] Erro ao salvar no banco:', error);
        throw error;
      }
      
      console.log('💾 [PJ] Parecer excluído do banco com sucesso!', updateData);
      
      // Atualizar estado local
      setPareceres(prev => prev.filter(p => p.id !== deletingParecerId));
      setDeletingParecerId(null);
      
      // Chamar onRefetch para atualizar outros componentes
      if (onRefetch) {
        console.log('🔄 [PJ] Chamando onRefetch...');
        onRefetch();
      }
      
      toast({ title: 'Parecer excluído', description: 'O parecer foi removido com sucesso.' });
    } catch (e: any) {
      console.error('❌ [PJ] ERRO ao excluir parecer:', e);
      toast({ title: 'Erro ao excluir parecer', description: e?.message || String(e), variant: 'destructive' });
    }
  };

  const cancelDeleteParecer = () => {
    setDeletingParecerId(null);
  };
  
  // Function to normalize values for comparison
  const normalizeValue = (value: any): any => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && !Array.isArray(value)) {
      const normalized: any = {};
      for (const [key, val] of Object.entries(value)) {
        normalized[key] = normalizeValue(val);
      }
      return normalized;
    }
    if (Array.isArray(value)) {
      return value.map(normalizeValue);
    }
    return value;
  };

  // Track form changes similar to PF flow
  const handleFormChange = (data: PJFormValues) => {
    setFormData(data);
    if (!isInitialized) {
      setIsInitialized(true);
      setHasChanges(false);
      return;
    }
    
    // Compare with initial values to detect changes
    if (initialValues) {
      const normalizedData = normalizeValue(data);
      const normalizedInitial = normalizeValue(initialValues);
      const hasActualChanges = JSON.stringify(normalizedData) !== JSON.stringify(normalizedInitial);
      setHasChanges(hasActualChanges);
    } else {
      setHasChanges(true);
    }
  };

  const handleClose = () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    setPendingAction('close');
    setShowFirstConfirmDialog(true);
  };

  const handleFirstConfirm = () => {
    setShowFirstConfirmDialog(false);
    setShowSecondConfirmDialog(true);
  };

  const handleSecondConfirm = async () => {
    setShowSecondConfirmDialog(false);
    
    if (pendingAction === 'close' || pendingAction === 'save') {
      if (formData && applicationId) {
        // Salvar os dados da ficha PJ no banco
        try {
          // Atualizar kanban_cards com os dados básicos
          const updates: any = {};
          if (formData.empresa?.razao) updates.title = formData.empresa.razao;
          if (formData.empresa?.cnpj) updates.cpf_cnpj = formData.empresa.cnpj;
          if (formData.contatos?.tel) updates.phone = formData.contatos.tel;
          if (formData.contatos?.email) updates.email = formData.contatos.email;
          
          if (Object.keys(updates).length > 0) {
            await supabase.from('kanban_cards').update(updates).eq('id', applicationId);
          }
          
          // Salvar dados específicos da ficha PJ
          const { data: card } = await supabase
            .from('kanban_cards')
            .select('applicant_id')
            .eq('id', applicationId)
            .single();
            
          if (card?.applicant_id) {
            // Atualizar ou criar registro na tabela pj_fichas
            const pjData = {
              applicant_id: card.applicant_id,
              trade_name: formData.empresa?.fantasia || '',
              opening_date: formData.empresa?.abertura || '',
              facade: formData.empresa?.fachada || '',
              area: formData.empresa?.area || '',
              address: formData.endereco?.end || '',
              address_number: formData.endereco?.n || '',
              address_complement: formData.endereco?.compl || '',
              property_type: formData.endereco?.tipo || '',
              property_type_obs: formData.endereco?.obsTipo || '',
              cep: formData.endereco?.cep || '',
              neighborhood: formData.endereco?.bairro || '',
              time_at_address: formData.endereco?.tempo || '',
              establishment_type: formData.endereco?.estab || '',
              establishment_type_obs: formData.endereco?.obsEstab || '',
              personal_address: formData.endereco?.endPs || '',
              phone: formData.contatos?.tel || '',
              whatsapp: formData.contatos?.whats || '',
              other_phones: formData.contatos?.fonesOs || '',
              email: formData.contatos?.email || '',
              proof_status: formData.docs?.comprovante || '',
              proof_type: formData.docs?.tipo || '',
              proof_in_name_of: formData.docs?.emNomeDe || '',
              has_internet: formData.docs?.possuiInternet || '',
              internet_provider: formData.docs?.operadora || '',
              internet_plan: formData.docs?.plano || '',
              internet_value: formData.docs?.valor || '',
              has_contract: formData.docs?.contratoSocial || '',
              contract_obs: formData.docs?.obsContrato || '',
              partners: formData.socios || [],
              request_source: formData.solicitacao?.quem || '',
              request_method: formData.solicitacao?.meio || '',
              request_phone: formData.solicitacao?.tel || '',
              plan_access: formData.solicitacao?.planoAcesso || '',
              sva_individual: formData.solicitacao?.svaAvulso || '',
              due_date: formData.solicitacao?.venc || '',
              relevant_info: formData.info?.relevantes || '',
              spc_status: formData.info?.spc || '',
              other_people: formData.info?.outrasPs || '',
              market_info: formData.info?.mk || '',
              analysis_opinion: formData.info?.parecerAnalise || '',
            };
            
            // Upsert (insert or update) na tabela pj_fichas
            const { error } = await supabase
              .from('pj_fichas')
              .upsert(pjData, { onConflict: 'applicant_id' });
              
            if (error) throw error;
          }
          
          toast({
            title: "Ficha PJ salva com sucesso",
            description: "As alterações foram aplicadas permanentemente."
          });
          
          // Atualizar o frontend chamando onRefetch (igual à ficha PF)
          onRefetch?.();
          
        } catch (error: any) {
          console.error('Erro ao salvar ficha PJ:', error);
          toast({
            title: "Erro ao salvar ficha PJ",
            description: error.message || "Ocorreu um erro inesperado",
            variant: "destructive"
          });
        }
      }
      onClose();
    }
    
    setPendingAction(null);
  };

  const handleDiscardChanges = () => {
    setShowFirstConfirmDialog(false);
    setShowSecondConfirmDialog(false);
    setPendingAction(null);
    onClose();
  };

  const handleSubmitWrapper = async (data: PJFormValues) => {
    if (applicationId) {
      setFormData(data);
      setPendingAction('save');
      setShowFirstConfirmDialog(true);
    } else {
      onClose();
    }
  };
  return (
    <>
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-[1200px] max-h-[95vh] overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">Ficha Comercial — Pessoa Jurídica</DialogTitle>
              {hasChanges && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  Alterações não salvas
                </div>
              )}
            </div>
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
        </DialogHeader>
        <div className="flex-1 overflow-hidden space-y-6">
          {isLoadingInitial && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando dados básicos...
            </div>
          )}
          {!isLoadingInitial && (
            <FichaPJForm
              defaultValues={initialValues || undefined}
              onSubmit={handleSubmitWrapper}
              onCancel={handleClose}
              onFormChange={handleFormChange}
              afterMkSlot={(
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold">Pareceres da Análise</h3>
                  <Button size="sm" className="h-8 px-3 text-xs bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90" onClick={() => setShowNewParecerEditor(true)}>+ Adicionar Parecer</Button>
                </div>
                
                {/* Editor de novo parecer - agora aparece acima dos pareceres existentes */}
                {showNewParecerEditor && (
                  <div className="mt-2">
                    <Textarea rows={3} value={newParecerText} onChange={(e) => setNewParecerText(e.target.value)} className="text-sm text-[#018942]" placeholder="Escreva um novo parecer..." />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" type="button" variant="secondary" onClick={() => { setShowNewParecerEditor(false); setNewParecerText(""); }} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">Cancelar</Button>
                      <Button size="sm" type="button" onClick={appendParecer} className="h-8 px-3 text-xs bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90">Salvar Parecer</Button>
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
                                    {canEdit(p) && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#018942] hover:bg-[#018942]/10">
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => startEdit(p.id, p.text)}>Editar</DropdownMenuItem>
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
                                    <Button size="sm" type="button" variant="secondary" onClick={cancelEdit} className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600">Cancelar</Button>
                                    <Button size="sm" type="button" onClick={saveEdit} className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90">Salvar</Button>
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
                    <div className="text-sm text-muted-foreground">Nenhum parecer adicionado.</div>
                  )}
                </div>
              </section>
              )}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* First confirmation dialog */}
    <AlertDialog open={showFirstConfirmDialog} onOpenChange={setShowFirstConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você deseja alterar as informações dessa ficha?</AlertDialogTitle>
          <AlertDialogDescription>
            As alterações serão aplicadas permanentemente à ficha.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDiscardChanges} className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700">
            Descartar alterações
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleFirstConfirm} className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90">
            Sim, alterar
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

export default ExpandedFichaPJModal;
