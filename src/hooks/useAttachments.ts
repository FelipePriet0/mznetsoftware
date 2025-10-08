import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';

export interface CardAttachment {
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
  deleted_at?: string;
  deleted_by?: string;
}

export interface UploadAttachmentData {
  file: File;
  description?: string;
  commentId?: string;
  customFileName?: string;
}

export const useAttachments = (cardId: string) => {
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { profile } = useAuth();
  const { name: currentUserName } = useCurrentUser();
  const { toast } = useToast();

  // Load attachments for a card
  const loadAttachments = async () => {
    if (!cardId) return;
    
    console.log('📥 [loadAttachments] Iniciando carregamento de anexos para card:', cardId);
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('card_attachments')
        .select('*')
        .eq('card_id', cardId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      console.log('📥 [loadAttachments] Resposta do Supabase:', { 
        encontrados: data?.length || 0, 
        error: error,
        ids: data?.map((a: any) => a.id) || [],
        dadosCompletos: data?.map((a: any) => ({
          id: a.id,
          file_name: a.file_name,
          deleted_at: a.deleted_at,
          deleted_by: a.deleted_by
        })) || []
      });

      if (error) {
        // Check if it's a table not found error
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn('Card attachments table not found - feature may not be available yet');
          setAttachments([]);
          return;
        }
        throw error;
      }
      
      console.log('📥 [loadAttachments] ✅ Atualizando estado com', data?.length || 0, 'anexos');
      setAttachments(data || []);
    } catch (error: any) {
      console.error('📥 [loadAttachments] ❌ Erro ao carregar anexos:', error);
      // Only show toast for non-table-not-found errors
      if (error.code !== 'PGRST205' && !error.message?.includes('schema cache')) {
        toast({
          title: "Erro ao carregar anexos",
          description: error.message || "Não foi possível carregar os anexos",
          variant: "destructive"
        });
      }
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a new attachment
  const uploadAttachment = async ({ file, description, commentId, customFileName }: UploadAttachmentData): Promise<CardAttachment | null> => {
    // Debug: verificar valores
    console.log('📤 DEBUG uploadAttachment:', {
      fileName: customFileName || file.name,
      fileSize: file.size,
      fileType: file.type,
      commentId,
      description
    });

    if (!profile) {
      console.error('❌ Não foi possível obter ID do usuário');
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário. Por favor, faça login novamente.",
        variant: "destructive"
      });
      return null;
    }

    const authorId = profile.id;
    const authorName = currentUserName || profile.full_name || 'Usuário';
    const authorRole = profile.role || 'user';

    setIsUploading(true);
    try {
      // Generate unique file name
      const timestamp = new Date().toISOString().split('T')[0];
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'file';
      const baseFileName = customFileName || file.name.replace(/\.[^/.]+$/, '');
      const fileName = `${baseFileName}_${timestamp}_${randomSuffix}.${fileExtension}`;
      
      // Create storage path
      const storagePath = `${cardId}/${fileName}`;
      console.log('📤 DEBUG Storage Path:', {
        originalName: file.name,
        newName: fileName,
        storagePath,
        cardId
      });

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(storagePath);

      // Save attachment metadata to database
      const attachmentData = {
        card_id: cardId,
        author_id: authorId,
        author_name: authorName,
        author_role: authorRole,
        file_name: customFileName || file.name,
        file_path: storagePath,
        file_size: file.size,
        file_type: file.type,
        file_extension: fileExtension,
        description: description || null,
        comment_id: commentId || null
      };

      console.log('📤 Saving attachment metadata:', attachmentData);

      const { data: dbData, error: dbError } = await (supabase as any)
        .from('card_attachments')
        .insert(attachmentData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Try to clean up uploaded file
        await supabase.storage.from('attachments').remove([storagePath]);
        throw dbError;
      }

      console.log('📤 Upload successful:', dbData);
      
      toast({
        title: "Arquivo anexado",
        description: `${customFileName || file.name} foi anexado ao card`
      });

      return dbData as CardAttachment;
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Erro ao anexar arquivo",
        description: error.message || "Não foi possível anexar o arquivo",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Delete an attachment
  const deleteAttachment = async (attachmentId: string): Promise<boolean> => {
    console.log('🗑️ [useAttachments] ========================================');
    console.log('🗑️ [useAttachments] Iniciando exclusão de anexo:', attachmentId);
    console.log('🗑️ [useAttachments] Anexos atuais no estado:', attachments.length);
    console.log('🗑️ [useAttachments] IDs dos anexos:', attachments.map(a => a.id));
    
    if (!profile) {
      console.error('🗑️ [useAttachments] Usuário não autenticado');
      return false;
    }

    console.log('🗑️ [useAttachments] Perfil do usuário:', { id: profile.id, role: profile.role });

    try {
      // Get attachment info first
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) {
        console.error('🗑️ [useAttachments] ❌ Anexo não encontrado no estado local');
        console.error('🗑️ [useAttachments] Procurando ID:', attachmentId);
        console.error('🗑️ [useAttachments] IDs disponíveis:', attachments.map(a => a.id));
        throw new Error('Anexo não encontrado no estado local');
      }

      console.log('🗑️ [useAttachments] ✅ Anexo encontrado:', attachment.file_name);
      console.log('🗑️ [useAttachments] Dados completos:', attachment);

      // SOFT DELETE: Marcar como deletado (não remove do storage ainda)
      console.log('🗑️ [useAttachments] 📤 Enviando UPDATE para Supabase...');
      const updateData = {
        deleted_at: new Date().toISOString(),
        deleted_by: (await supabase.auth.getUser()).data.user?.id
      };
      console.log('🗑️ [useAttachments] Dados do UPDATE:', updateData);

      const { data: updateResult, error: dbError } = await (supabase as any)
        .from('card_attachments')
        .update(updateData)
        .eq('id', attachmentId)
        .select();

      console.log('🗑️ [useAttachments] Resultado do UPDATE:', { updateResult, dbError });

      if (dbError) {
        console.error('🗑️ [useAttachments] ❌ Erro no banco de dados:', dbError);
        console.error('🗑️ [useAttachments] Código do erro:', dbError.code);
        console.error('🗑️ [useAttachments] Mensagem:', dbError.message);
        console.error('🗑️ [useAttachments] Detalhes:', dbError.details);
        throw dbError;
      }

      console.log('🗑️ [useAttachments] ✅ Anexo marcado como deletado no banco');
      console.log('🗑️ [useAttachments] Linhas afetadas:', updateResult?.length || 0);

      // Recarregar anexos do banco para garantir sincronização
      console.log('🗑️ [useAttachments] 🔄 Recarregando lista de anexos...');
      await loadAttachments();
      console.log('🗑️ [useAttachments] ✅ Lista de anexos recarregada');
      
      toast({
        title: "Anexo excluído",
        description: `${attachment.file_name} foi excluído permanentemente`
      });

      console.log('🗑️ [useAttachments] ✅✅✅ Exclusão concluída com sucesso');
      console.log('🗑️ [useAttachments] ========================================');
      return true;
    } catch (error: any) {
      console.error('🗑️ [useAttachments] ❌❌❌ Erro na exclusão:', error);
      console.error('🗑️ [useAttachments] Stack:', error.stack);
      toast({
        title: "Erro ao excluir anexo",
        description: error.message || "Não foi possível excluir o anexo",
        variant: "destructive"
      });
      console.log('🗑️ [useAttachments] ========================================');
      return false;
    }
  };

  // Função para listar todos os arquivos no bucket (debug)
  const listAllFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .list('', {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  };

  // Função para obter URL de download
  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 60); // URL válida por 1 minuto

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  };

  // Função standalone para download (exportada)
  const getDownloadUrlStandalone = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 60);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  };

  // Função para formatar tamanho de arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para obter ícone do arquivo
  const getFileIcon = (extension: string) => {
    switch (extension.toLowerCase()) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return '🖼️';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📈';
      case 'zip':
      case 'rar':
      case '7z': return '📦';
      case 'mp4':
      case 'avi':
      case 'mov': return '🎥';
      case 'mp3':
      case 'wav':
      case 'flac': return '🎵';
      default: return '📎';
    }
  };

  // Função para obter histórico de anexos (incluindo soft deleted)
  const getAttachmentHistory = async (cardId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('card_attachments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading attachment history:', error);
      return [];
    }
  };

  // Load attachments when cardId changes
  useEffect(() => {
    if (cardId) {
      loadAttachments();
    }
  }, [cardId]);

  return {
    attachments,
    isLoading,
    isUploading,
    loadAttachments,
    uploadAttachment,
    deleteAttachment,
    getDownloadUrl: getDownloadUrl, // Usar a função standalone exportada
    getAttachmentHistory,
    formatFileSize,
    getFileIcon,
    listAllFiles
  };
};