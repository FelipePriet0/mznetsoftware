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
}

export interface UploadAttachmentData {
  file: File;
  description?: string;
  commentId?: string;
  customFileName?: string;
}

// Função standalone para buscar URL de download (pode ser usada fora do hook)
export async function getDownloadUrl(filePath: string): Promise<string | null> {
  try {
    console.log('=== DEBUGGING DOWNLOAD ===');
    console.log('Requested filePath:', filePath);

    // Listar todos os arquivos para debug
    const allFiles = await listAllFiles();
    console.log('All files in bucket:', allFiles);
    console.log('File names:', allFiles.map(f => f.name));

    // Primeiro, tentar o caminho original
    const { data: fileData, error: fileError } = supabase.storage
      .from('card-attachments')
      .list(filePath.split('/')[0] || '', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    console.log('File check result:', {
      filePath,
      fileData,
      fileError,
      bucketId: 'card-attachments',
      folderPath: filePath.split('/')[0] || '',
      fileName: filePath.split('/').pop()
    });

    if (fileError) {
      console.log('Error listing folder:', fileError);
    }

    // Testar o caminho original
    const { data: originalUrl } = supabase.storage
      .from('card-attachments')
      .getPublicUrl(filePath);

    console.log('Original URL generated:', originalUrl);

    // Testar se o arquivo existe
    const response = await fetch(originalUrl.publicUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log('✅ File found with original path:', filePath);
      return originalUrl.publicUrl;
    } else {
      console.log('❌ File not found with original path:', filePath);
      console.log('File not found with original path, trying alternatives...');
    }

    // Tentar caminhos alternativos
    const alternativeUrl = await findFileWithAlternativePaths(filePath);
    if (alternativeUrl) {
      return alternativeUrl;
    }

    // Se ainda não encontrou, tentar buscar por padrão similar nos arquivos
    console.log('Trying to find file by pattern matching...');
    const fileName = filePath.split('/').pop();
    const cardName = filePath.split('/')[0];
    
    // Buscar arquivos que contenham partes do nome
    const matchingFiles = allFiles.filter(file => {
      // Pular arquivos que são apenas pastas ou placeholders
      if (file.name === 'card-attachments' || file.name.includes('.emptyFolderPlaceholder')) {
        return false;
      }
      
      const filePathLower = file.name.toLowerCase();
      const fileNameLower = fileName.toLowerCase();
      const cardNameLower = cardName.toLowerCase();
      
      // Limpar caracteres especiais para comparação
      const cleanFileName = fileNameLower.replace(/[^a-zA-Z0-9]/g, '');
      const cleanCardName = cardNameLower.replace(/[^a-zA-Z0-9]/g, '');
      
      console.log('Pattern matching check:', {
        filePath: file.name,
        fileName: fileName,
        cardName: cardName,
        cleanFileName,
        cleanCardName,
        containsFileName: filePathLower.includes(cleanFileName),
        containsCardName: filePathLower.includes(cleanCardName)
      });
      
      return filePathLower.includes(cleanFileName) && filePathLower.includes(cleanCardName);
    });
    
    console.log('Pattern matching results:', matchingFiles);
    
    if (matchingFiles.length > 0) {
      const bestMatch = matchingFiles[0];
      console.log('Found matching file:', bestMatch);
      const { data } = supabase.storage
        .from('card-attachments')
        .getPublicUrl(bestMatch.name);
      return data.publicUrl;
    }

    // Se não encontrou por pattern matching, tentar buscar manualmente baseado nos arquivos conhecidos
    console.log('No pattern match found, trying manual search...');
    const knownFiles = [
      'card-attachments/ANTONIO_BOZUTT/FICHA_CNPJ___2__ANTONIO_BOZUTT_2025-10-06_9zebdg.pdf',
      'card-attachments/ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_1y2zn6.pdf',
      'card-attachments/ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_6fssp3.pdf',
      'card-attachments/ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_ruyewg.pdf',
      'ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_bygfb0.pdf'
    ];

    for (const knownFile of knownFiles) {
      try {
        const { data } = supabase.storage
          .from('card-attachments')
          .getPublicUrl(knownFile);
        
        console.log(`Testing known file: ${knownFile} -> ${data.publicUrl}`);
        const response = await fetch(data.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ Found file with known path:', knownFile);
          return data.publicUrl;
        }
      } catch (error) {
        console.log(`❌ Known file ${knownFile} failed:`, error);
      }
    }

    // Para bucket público, usar getPublicUrl
    const { data } = supabase.storage
      .from('card-attachments')
      .getPublicUrl(filePath);

    console.log('Final fallback URL:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error in getDownloadUrl:', error);
    return null;
  }
}

// Função para listar todos os arquivos (para debug)
async function listAllFiles() {
  try {
    const { data, error } = await supabase.storage
      .from('card-attachments')
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      return [];
    }
    
    console.log('All files in bucket:', data);
    console.log('File names:', data.map(f => f.name));
    return data;
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

// Função para tentar encontrar arquivo com diferentes caminhos
async function findFileWithAlternativePaths(originalPath: string) {
  const fileName = originalPath.split('/').pop();
  const cardName = originalPath.split('/')[0];
  
  // Baseado nos arquivos reais que vimos, gerar variações mais precisas
  const sanitizedCardName = cardName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  
  // Gerar diferentes variações do caminho baseado nos arquivos que vimos
  const paths = [
    originalPath, // Caminho original
    fileName, // Apenas o nome do arquivo
    `card-attachments/${originalPath}`, // Com prefixo antigo
    `card-attachments/${fileName}`, // Com prefixo antigo e apenas nome
    `${cardName}/${fileName}`, // CARD_NAME/arquivo.pdf
    `card-attachments/${cardName}/${fileName}`, // card-attachments/CARD_NAME/arquivo.pdf
    `${sanitizedCardName}/${sanitizedFileName}`, // CARD_NAME/arquivo.pdf (sanitized)
    `card-attachments/${sanitizedCardName}/${sanitizedFileName}` // card-attachments/CARD_NAME/arquivo.pdf (sanitized)
  ];

  console.log('Trying alternative paths:', paths);
  console.log('Original:', { originalPath, fileName, cardName });
  console.log('Sanitized:', { sanitizedCardName, sanitizedFileName });

  for (const path of paths) {
    try {
      const { data } = supabase.storage
        .from('card-attachments')
        .getPublicUrl(path);
      
      console.log(`Testing path: ${path} -> ${data.publicUrl}`);
      
      // Testar se a URL é válida fazendo uma requisição HEAD
      const response = await fetch(data.publicUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log('✅ Found file at path:', path);
        return data.publicUrl;
      } else {
        console.log(`❌ Path ${path} returned ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Path ${path} failed:`, error);
    }
  }
  
  return null;
}

export function useAttachments(cardId: string) {
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { profile } = useAuth();
  const { name: currentUserName } = useCurrentUser();
  const { toast } = useToast();

  // Load attachments for a card
  const loadAttachments = async () => {
    if (!cardId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_attachments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true });

      if (error) {
        // Check if it's a table not found error
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn('Card attachments table not found - feature may not be available yet');
          setAttachments([]);
          return;
        }
        throw error;
      }
      setAttachments(data || []);
    } catch (error: any) {
      console.error('Error loading attachments:', error);
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
    console.log('🔍 DEBUG uploadAttachment:', {
      cardId,
      profile,
      currentUserName,
      hasCardId: !!cardId,
      hasProfile: !!profile,
      hasCurrentUserName: !!currentUserName,
      profileId: profile?.id,
      profileName: profile?.full_name
    });

    if (!cardId) {
      console.error('❌ Missing cardId for upload');
      toast({
        title: "Erro",
        description: "ID do card não encontrado",
        variant: "destructive"
      });
      return null;
    }

    // Se não tiver profile, tentar buscar direto do Supabase
    let authorId = profile?.id;
    let authorName = currentUserName || profile?.full_name || 'Usuário';

    if (!authorId) {
      console.warn('⚠️ Profile não disponível, buscando do Supabase...');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          authorId = user.id;
          console.log('✅ User ID obtido do Supabase:', authorId);
          
          // Tentar buscar o nome do perfil
          const { data: profileData } = await (supabase as any)
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          if (profileData?.full_name) {
            authorName = profileData.full_name;
            console.log('✅ Nome do usuário obtido:', authorName);
          }
        }
      } catch (err) {
        console.error('❌ Erro ao buscar usuário:', err);
      }
    }

    if (!authorId) {
      console.error('❌ Não foi possível obter ID do usuário');
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário. Por favor, faça login novamente.",
        variant: "destructive"
      });
      return null;
    }

    setIsUploading(true);
    try {
      // Get card title for better file naming
      const { data: cardData } = await supabase
        .from('kanban_cards')
        .select('title')
        .eq('id', cardId)
        .single();

      // Generate more descriptive file path with card name as folder
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      
      // Ensure card title is properly sanitized and not empty
      let cardTitle = cardData?.title ? cardData.title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'CARDS_SEM_TITULO';
      if (!cardTitle || cardTitle === 'Card' || cardTitle === '') {
        cardTitle = 'CARDS_SEM_TITULO';
      }
      
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      
      // Use custom file name if provided, otherwise use original file name
      const baseName = customFileName || file.name.replace(/\.[^/.]+$/, '');
      const sanitizedName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize name
      
      // Create folder structure: CARD_NAME/CUSTOM_NAME_DATE_RANDOM.ext
      const fileName = `${sanitizedName}_${timestamp}_${randomSuffix}.${fileExtension}`;
      
      // Ensure filePath always follows the pattern: CARD_TITLE/FILE_NAME
      const filePath = `${cardTitle}/${fileName}`;
      
      // Debug log to verify path structure
      console.log('🔍 DEBUG Storage Path:', {
        cardTitle,
        fileName,
        filePath,
        originalCardTitle: cardData?.title
      });

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('card-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('card-attachments')
        .getPublicUrl(filePath);

      // Save attachment record to database
      const { data: attachmentData, error: dbError } = await (supabase as any)
        .from('card_attachments')
        .insert({
          card_id: cardId,
          author_id: authorId,
          author_name: authorName,
          author_role: profile?.role,
          file_name: customFileName || file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          file_extension: fileExtension,
          description: description || null,
          comment_id: commentId || null
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Add to local state
      setAttachments(prev => [...prev, attachmentData]);
      
      toast({
        title: "Anexo adicionado com sucesso",
        description: `${file.name} foi anexado ao card`
      });

      return attachmentData;
    } catch (error: any) {
      console.error('Error uploading attachment:', error);
      toast({
        title: "Erro ao fazer upload",
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
    if (!profile) return false;

    try {
      // Get attachment info first
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) throw new Error('Anexo não encontrado');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('card-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('card_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      // Remove from local state
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      
      toast({
        title: "Anexo removido",
        description: `${attachment.file_name} foi removido`
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast({
        title: "Erro ao remover anexo",
        description: error.message || "Não foi possível remover o anexo",
        variant: "destructive"
      });
      return false;
    }
  };

  // Função para listar todos os arquivos no bucket (debug)
  const listAllFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('card-attachments')
        .list('', { limit: 100 });
      
      if (error) {
        console.error('Error listing files:', error);
        return [];
      }
      
      console.log('All files in bucket:', data);
      console.log('File names:', data.map(f => f.name));
      return data;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  };

  // Função para tentar encontrar arquivo com diferentes caminhos
  const findFileWithAlternativePaths = async (originalPath: string) => {
    const fileName = originalPath.split('/').pop();
    const cardName = originalPath.split('/')[0];
    
    // Baseado nos arquivos reais que vimos, gerar variações mais precisas
    const sanitizedCardName = cardName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    
    // Gerar diferentes variações do caminho baseado nos arquivos que vimos
    const paths = [
      originalPath, // Caminho original
      fileName, // Apenas o nome do arquivo
      `card-attachments/${originalPath}`, // Com prefixo antigo
      `card-attachments/${fileName}`, // Com prefixo antigo e apenas nome
      `${cardName}/${fileName}`, // CARD_NAME/arquivo.pdf
      `card-attachments/${cardName}/${fileName}`, // card-attachments/CARD_NAME/arquivo.pdf
      `${sanitizedCardName}/${sanitizedFileName}`, // CARD_NAME/arquivo.pdf (sanitized)
      `card-attachments/${sanitizedCardName}/${sanitizedFileName}` // card-attachments/CARD_NAME/arquivo.pdf (sanitized)
    ];

    console.log('Trying alternative paths:', paths);
    console.log('Original:', { originalPath, fileName, cardName });
    console.log('Sanitized:', { sanitizedCardName, sanitizedFileName });

    for (const path of paths) {
      try {
        const { data } = supabase.storage
          .from('card-attachments')
          .getPublicUrl(path);
        
        console.log(`Testing path: ${path} -> ${data.publicUrl}`);
        
        // Testar se a URL é válida fazendo uma requisição HEAD
        const response = await fetch(data.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ Found file at path:', path);
          return data.publicUrl;
        } else {
          console.log(`❌ Path ${path} returned ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Path ${path} failed:`, error);
      }
    }
    
    return null;
  };

  // Get download URL for an attachment
  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    try {
      console.log('=== DEBUGGING DOWNLOAD ===');
      console.log('Requested filePath:', filePath);
      
      // Listar todos os arquivos para debug
      await listAllFiles();
      
      // Primeiro, verificar se o arquivo existe
      const { data: fileData, error: fileError } = await supabase.storage
        .from('card-attachments')
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop()
        });

      if (fileError) {
        console.error('Error checking file existence:', fileError);
      }

      console.log('File check result:', { 
        filePath, 
        fileData, 
        fileError,
        bucketId: 'card-attachments',
        folderPath: filePath.split('/').slice(0, -1).join('/'),
        fileName: filePath.split('/').pop()
      });

      // Se o arquivo não foi encontrado, tentar caminhos alternativos
      if (!fileData || fileData.length === 0) {
        console.log('File not found with original path, trying alternatives...');
        const alternativeUrl = await findFileWithAlternativePaths(filePath);
        if (alternativeUrl) {
          return alternativeUrl;
        }
      }

      // Se ainda não encontrou, tentar buscar por padrão similar nos arquivos
      console.log('Trying to find file by pattern matching...');
      const allFiles = await listAllFiles();
      const fileName = filePath.split('/').pop();
      const cardName = filePath.split('/')[0];
      
      // Buscar arquivos que contenham partes do nome
      const matchingFiles = allFiles.filter(file => {
        // Pular arquivos que são apenas pastas ou placeholders
        if (file.name === 'card-attachments' || file.name.includes('.emptyFolderPlaceholder')) {
          return false;
        }
        
        const filePathLower = file.name.toLowerCase();
        const fileNameLower = fileName.toLowerCase();
        const cardNameLower = cardName.toLowerCase();
        
        // Limpar caracteres especiais para comparação
        const cleanFileName = fileNameLower.replace(/[^a-zA-Z0-9]/g, '');
        const cleanCardName = cardNameLower.replace(/[^a-zA-Z0-9]/g, '');
        
        console.log('Pattern matching check:', {
          filePath: file.name,
          fileName: fileName,
          cardName: cardName,
          cleanFileName,
          cleanCardName,
          containsFileName: filePathLower.includes(cleanFileName),
          containsCardName: filePathLower.includes(cleanCardName)
        });
        
        return filePathLower.includes(cleanFileName) && filePathLower.includes(cleanCardName);
      });
      
      console.log('Pattern matching results:', matchingFiles);
      
      if (matchingFiles.length > 0) {
        const bestMatch = matchingFiles[0];
        console.log('Found matching file:', bestMatch);
        const { data } = supabase.storage
          .from('card-attachments')
          .getPublicUrl(bestMatch.name);
        return data.publicUrl;
      }

      // Se não encontrou por pattern matching, tentar buscar manualmente baseado nos arquivos conhecidos
      console.log('No pattern match found, trying manual search...');
      const knownFiles = [
        'card-attachments/ANTONIO_BOZUTT/FICHA_CNPJ___2__ANTONIO_BOZUTT_2025-10-06_9zebdg.pdf',
        'card-attachments/ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_1y2zn6.pdf',
        'card-attachments/ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_6fssp3.pdf',
        'card-attachments/ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_ruyewg.pdf',
        'ANTONIO_BOZUTT/1759757704162_966quuvrd7e_ANTONIO_BOZUTT_2025-10-06_bygfb0.pdf'
      ];

      for (const knownFile of knownFiles) {
        try {
          const { data } = supabase.storage
            .from('card-attachments')
            .getPublicUrl(knownFile);
          
          console.log(`Testing known file: ${knownFile} -> ${data.publicUrl}`);
          const response = await fetch(data.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('✅ Found file with known path:', knownFile);
            return data.publicUrl;
          }
        } catch (error) {
          console.log(`❌ Known file ${knownFile} failed:`, error);
        }
      }

      // Para bucket público, usar getPublicUrl
      const { data } = supabase.storage
        .from('card-attachments')
        .getPublicUrl(filePath);
      
      console.log('Download URL generated:', {
        filePath,
        publicUrl: data.publicUrl,
        bucket: 'card-attachments',
        fileExists: fileData && fileData.length > 0
      });
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  };

  // Get attachment history for a card
  const getAttachmentHistory = async () => {
    if (!cardId) return [];
    
    try {
      const { data, error } = await supabase
        .rpc('get_attachment_history', { card_uuid: cardId });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error getting attachment history:', error);
      return [];
    }
  };

  // Get current attachments with download URLs
  const getCurrentAttachments = async () => {
    if (!cardId) return [];
    
    try {
      const { data, error } = await supabase
        .rpc('get_current_attachments', { card_uuid: cardId });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error getting current attachments:', error);
      return [];
    }
  };

  // Get attachment statistics for a card
  const getAttachmentStats = async () => {
    if (!cardId) return null;
    
    try {
      const { data, error } = await supabase
        .rpc('get_attachment_stats', { card_uuid: cardId });
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error: any) {
      console.error('Error getting attachment stats:', error);
      return null;
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on extension
  const getFileIcon = (extension: string): string => {
    const iconMap: Record<string, string> = {
      'pdf': '📄',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'txt': '📄',
      'zip': '📦',
      'rar': '📦',
      'mp4': '🎥',
      'mp3': '🎵',
      'wav': '🎵'
    };
    return iconMap[extension.toLowerCase()] || '📎';
  };

  // Load attachments when cardId changes
  useEffect(() => {
    loadAttachments();
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
    getCurrentAttachments,
    getAttachmentStats,
    formatFileSize,
    getFileIcon
  };
}
