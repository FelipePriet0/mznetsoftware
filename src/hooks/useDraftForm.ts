import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DraftData {
  customer_data?: any;
  address_data?: any;
  employment_data?: any;
  household_data?: any;
  spouse_data?: any;
  references_data?: any;
  other_data?: any;
  step?: string;
}

export function useDraftForm() {
  const [currentDraft, setCurrentDraft] = useState<{ id: string; data: DraftData; applicationId?: string; step?: string } | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const retryRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; count: number }>({ timer: null, count: 0 });

  // Load existing draft on mount
  useEffect(() => {
    mountedRef.current = true;
    loadExistingDraft();
    return () => {
      mountedRef.current = false;
      if (retryRef.current.timer) {
        clearTimeout(retryRef.current.timer);
        retryRef.current.timer = null;
      }
    };
  }, []);

  const loadExistingDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('applications_drafts')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setCurrentDraft({
          id: data.id,
          data: {
            customer_data: data.customer_data,
            address_data: data.address_data,
            employment_data: data.employment_data,
            household_data: data.household_data,
            spouse_data: data.spouse_data,
            references_data: data.references_data,
            other_data: data.other_data,
          }
        });
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = useCallback(async (data: DraftData, applicationId?: string, step?: string, showToast = true) => {
    if (isAutoSaving) return;
    setIsAutoSaving(true);
    try {
      if (currentDraft?.id) {
        // Update existing draft
        const { error } = await supabase
          .from('applications_drafts')
          .update({
            customer_data: data.customer_data,
            address_data: data.address_data,
            employment_data: data.employment_data,
            household_data: data.household_data,
            spouse_data: data.spouse_data,
            references_data: data.references_data,
            other_data: data.other_data,
            step: step || data.step || 'basic',
            application_id: applicationId || currentDraft.applicationId,
          })
          .eq('id', currentDraft.id);

        if (error) throw error;
        
        // Update local state
        if (mountedRef.current) {
          setCurrentDraft(prev => prev ? {
            ...prev,
            data,
            applicationId: applicationId || prev.applicationId,
            step: step || data.step || prev.step
          } : null);
        }
      } else {
        // Create new draft
        const { data: newDraft, error } = await supabase
          .from('applications_drafts')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            customer_data: data.customer_data,
            address_data: data.address_data,
            employment_data: data.employment_data,
            household_data: data.household_data,
            spouse_data: data.spouse_data,
            references_data: data.references_data,
            other_data: data.other_data,
            step: step || data.step || 'basic',
            application_id: applicationId,
          })
          .select()
          .single();

        if (error) throw error;
        if (mountedRef.current) {
          setCurrentDraft({ 
            id: newDraft.id, 
            data, 
            applicationId: applicationId,
            step: step || data.step || 'basic'
          });
        }
      }

      // Update current_edit_application_id in profile if applicationId provided
      if (applicationId) {
        await supabase
          .from('profiles')
          .update({ current_edit_application_id: applicationId })
          .eq('id', (await supabase.auth.getUser()).data.user?.id);
      }

      if (mountedRef.current) setLastSaved(new Date());
      if (showToast) {
        toast({
          title: "Rascunho salvo",
          description: "Suas informações foram salvas automaticamente",
        });
      }
      // Reset retry counter on success
      retryRef.current.count = 0;
      if (retryRef.current.timer) {
        clearTimeout(retryRef.current.timer);
        retryRef.current.timer = null;
      }
    } catch (error) {
      if (import.meta?.env?.DEV) console.error('Error saving draft:', error);
      if (showToast) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar o rascunho. Tentando novamente em alguns segundos...",
          variant: "destructive",
        });
      }
      // Capped exponential backoff retry
      const nextCount = Math.min(retryRef.current.count + 1, 5);
      const delay = Math.min(30000, 2000 * Math.pow(2, retryRef.current.count));
      retryRef.current.count = nextCount;
      if (mountedRef.current) {
        if (retryRef.current.timer) clearTimeout(retryRef.current.timer);
        retryRef.current.timer = setTimeout(() => {
          retryRef.current.timer = null;
          if (mountedRef.current) {
            saveDraft(data, applicationId, step, false);
          }
        }, delay);
      }
    } finally {
      if (mountedRef.current) setIsAutoSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDraft?.id, isAutoSaving]);

  const deleteDraft = async () => {
    if (!currentDraft?.id) return;

    try {
      const { error } = await supabase
        .from('applications_drafts')
        .delete()
        .eq('id', currentDraft.id);

      if (error) throw error;
      setCurrentDraft(null);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const clearEditingSession = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ current_edit_application_id: null })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);
    } catch (error) {
      console.error('Error clearing editing session:', error);
    }
  };

  const checkForResumeSession = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_edit_application_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile?.current_edit_application_id) {
        // Load draft for this application
        const { data: draft } = await supabase
          .from('applications_drafts')
          .select('*')
          .eq('application_id', profile.current_edit_application_id)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        if (draft) {
          setCurrentDraft({
            id: draft.id,
            data: {
              customer_data: draft.customer_data,
              address_data: draft.address_data,
              employment_data: draft.employment_data,
              household_data: draft.household_data,
              spouse_data: draft.spouse_data,
              references_data: draft.references_data,
              other_data: draft.other_data,
              step: draft.step,
            },
            applicationId: draft.application_id,
            step: draft.step || 'basic'
          });
          
          return {
            applicationId: profile.current_edit_application_id,
            step: draft.step || 'basic'
          };
        }
      }
    } catch (error) {
      console.error('Error checking for resume session:', error);
    }
    return null;
  }, []);

  return {
    currentDraft,
    isAutoSaving,
    lastSaved,
    saveDraft,
    deleteDraft,
    loadExistingDraft,
    clearEditingSession,
    checkForResumeSession,
  };
}
