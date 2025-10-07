import { useState, useEffect, useCallback, useRef } from 'react';
// Lean backend: drafts desativados (no-op)
import { useAuth } from '@/context/AuthContext';

export interface DraftFormData {
  customer_data?: any;
  address_data?: any;
  employment_data?: any;
  household_data?: any;
  spouse_data?: any;
  references_data?: any;
  other_data?: any;
  step?: string;
}

export function useDraftPersistence() {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentApplicationId, setCurrentApplicationId] = useState<string | null>(null);
  const { profile } = useAuth();
  const mountedRef = useRef(true);
  const retryRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; count: number }>({ timer: null, count: 0 });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryRef.current.timer) {
        clearTimeout(retryRef.current.timer);
        retryRef.current.timer = null;
      }
    };
  }, []);

  const checkForExistingSession = useCallback(async () => null, []);

  const saveDraft = useCallback(async (
    _applicationId: string,
    _formData: DraftFormData,
    _step: string = 'full',
    _showToast: boolean = false
  ) => {
    // No-op save, update local status only
    if (!mountedRef.current) return;
    setIsAutoSaving(true);
    setTimeout(() => {
      if (!mountedRef.current) return;
      setLastSaved(new Date());
      setIsAutoSaving(false);
    }, 300);
  }, []);

  const clearEditingSession = useCallback(async () => {
    setCurrentApplicationId(null);
  }, []);

  const deleteDraft = useCallback(async (_applicationId?: string) => {
    // No-op
  }, []);

  return {
    isAutoSaving,
    lastSaved,
    currentApplicationId,
    checkForExistingSession,
    saveDraft,
    clearEditingSession,
    deleteDraft
  };
}
