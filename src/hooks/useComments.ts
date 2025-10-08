import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comment } from '@/components/comments/CommentItem';
import { toast } from '@/hooks/use-toast';

export interface CreateCommentData {
  cardId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  parentId?: string;
  level: number;
  threadId?: string; // ID do thread da conversa
}

export interface UpdateCommentData {
  content: string;
}

export function useComments(cardId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extrair @menÃ§Ãµes do texto
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicatas
  };

  // Enviar notificaÃ§Ãµes
  const sendNotifications = async (content: string, authorId: string, parentComment?: Comment) => {
    try {
      const mentions = extractMentions(content);
      
      // Notificar autor original se for uma resposta
      if (parentComment && parentComment.authorId !== authorId) {
        toast({
          title: "Nova resposta",
          description: `VocÃª recebeu uma resposta em um comentÃ¡rio`,
          variant: "default"
        });
      }

      // Notificar usuÃ¡rios mencionados
      for (const mention of mentions) {
        toast({
          title: "VocÃª foi mencionado",
          description: `VocÃª foi mencionado em um comentÃ¡rio: @${mention}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  // Carregar comentÃ¡rios do card
  const loadComments = useCallback(async () => {
    if (!cardId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Tentar primeiro com thread_id
      let { data, error } = await (supabase as any)
        .from('card_comments')
        .select(`
          id,
          card_id,
          author_id,
          author_name,
          author_role,
          content,
          created_at,
          updated_at,
          parent_id,
          level,
          thread_id
        `)
        .eq('card_id', cardId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      // Se erro por thread_id nÃ£o existir, tentar sem essa coluna
      if (error && error.code === 'PGRST204' && error.message?.includes('thread_id')) {
        console.warn('thread_id column not found - loading without thread_id');
        const result = await (supabase as any)
          .from('card_comments')
          .select(`
            id,
            card_id,
            author_id,
            author_name,
            author_role,
            content,
            created_at,
            updated_at,
            parent_id,
            level
          `)
          .eq('card_id', cardId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        // Check if it's a table not found error
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.card_comments" does not exist')) {
          console.warn('Card comments table not found - feature may not be available yet');
          setComments([]);
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const mappedComments: Comment[] = (data || []).map((row: any) => ({
        id: row.id,
        cardId: row.card_id,
        authorId: row.author_id,
        authorName: row.author_name,
        authorRole: row.author_role,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        parentId: row.parent_id,
        level: row.level || 0,
        threadId: row.thread_id || row.id // Usar thread_id do banco ou o prÃ³prio ID como fallback
      }));

      setComments(mappedComments);
    } catch (err: any) {
      console.error('Error loading comments:', err);
      setError(err.message || 'Erro ao carregar comentÃ¡rios');
      // Em caso de erro, definir comentÃ¡rios vazios para nÃ£o quebrar a UI
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  // Criar novo comentÃ¡rio
  const createComment = async (data: CreateCommentData): Promise<Comment | null> => {
    console.log('ðŸ” DEBUG useComments: createComment chamado com:', data);
    try {
      // Preparar dados para inserÃ§Ã£o (sem thread_id se nÃ£o existir)
      const insertData: any = {
        card_id: data.cardId,
        author_id: data.authorId,
        author_name: data.authorName,
        author_role: data.authorRole,
        content: data.content,
        parent_id: data.parentId || null,
        level: data.level
      };

      // Incluir thread_id se disponÃ­vel
      const insertDataWithThreadId = {
        card_id: data.cardId,
        author_id: data.authorId,
        author_name: data.authorName,
        author_role: data.authorRole,
        content: data.content,
        parent_id: data.parentId || null,
        level: data.level,
        thread_id: data.threadId || null
      };

      console.log('ðŸ” DEBUG: Tentando inserir no banco (com thread_id):', insertDataWithThreadId);
      console.log('ðŸ” DEBUG: Tipo de dados sendo inseridos:', {
        levelType: typeof insertDataWithThreadId.level,
        levelValue: insertDataWithThreadId.level,
        parentIdType: typeof insertDataWithThreadId.parent_id,
        parentIdValue: insertDataWithThreadId.parent_id,
        threadIdType: typeof insertDataWithThreadId.thread_id,
        threadIdValue: insertDataWithThreadId.thread_id
      });
      
      const { data: result, error } = await (supabase as any)
        .from('card_comments')
        .insert(insertDataWithThreadId)
        .select()
        .single();
        
      console.log('ðŸ” DEBUG: Resultado da inserÃ§Ã£o:', { 
        result, 
        error,
        success: !!result && !error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        fullError: error
      });

      if (error) {
        console.log('ðŸš¨ ERRO no createComment:', error);
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.card_comments" does not exist')) {
          console.warn('Card comments table not found - feature may not be available yet');
          return null;
        }
        
        // Se erro por thread_id nÃ£o existir, tentar sem thread_id
        if (error.code === 'PGRST204' && error.message?.includes('thread_id')) {
          console.warn('thread_id column not found - trying without thread_id');
          const insertDataWithoutThreadId = {
            card_id: data.cardId,
            author_id: data.authorId,
            author_name: data.authorName,
            author_role: data.authorRole,
            content: data.content,
            parent_id: data.parentId || null,
            level: data.level
          };
          
          const { data: result2, error: error2 } = await (supabase as any)
            .from('card_comments')
            .insert(insertDataWithoutThreadId)
            .select()
            .single();
            
          if (error2) {
            throw error2;
          }
          
          const newComment: Comment = {
            id: result2.id,
            cardId: result2.card_id,
            authorId: result2.author_id,
            authorName: result2.author_name,
            authorRole: result2.author_role,
            content: result2.content,
            createdAt: result2.created_at,
            updatedAt: result2.updated_at,
            parentId: result2.parent_id,
            level: result2.level,
            threadId: result2.id // Usar o prÃ³prio ID como thread_id
          };
          
          console.log('ðŸ” DEBUG useComments: ComentÃ¡rio criado sem thread_id:', newComment);
          setComments(prev => [...prev, newComment]);
          
          return newComment;
        }
        
        throw error;
      }

      const newComment: Comment = {
        id: result.id,
        cardId: result.card_id,
        authorId: result.author_id,
        authorName: result.author_name,
        authorRole: result.author_role,
        content: result.content,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        parentId: result.parent_id,
        level: result.level,
        threadId: result.thread_id || result.id // Usar thread_id do banco ou o prÃ³prio ID como fallback
      };

      console.log('ðŸ” DEBUG useComments: ComentÃ¡rio criado com sucesso:', newComment);
      
      // Verificar se o comentÃ¡rio jÃ¡ existe na lista antes de adicionar
      setComments(prev => {
        const exists = prev.find(c => c.id === newComment.id);
        if (exists) {
          console.log('ðŸ” DEBUG: ComentÃ¡rio jÃ¡ existe na lista, atualizando...');
          return prev.map(c => c.id === newComment.id ? newComment : c);
        } else {
          console.log('ðŸ” DEBUG: Adicionando novo comentÃ¡rio Ã  lista...');
          return [...prev, newComment];
        }
      });
      
      console.log('ðŸ” DEBUG useComments: Estado de comentÃ¡rios atualizado');
      
      // Enviar notificaÃ§Ãµes
      const parentComment = data.parentId ? comments.find(c => c.id === data.parentId) : undefined;
      await sendNotifications(data.content, data.authorId, parentComment);
      
      return newComment;
    } catch (err: any) {
      console.error('Error creating comment:', err);
      setError(err.message || 'Erro ao criar comentÃ¡rio');
      return null;
    }
  };

  // Atualizar comentÃ¡rio
  const updateComment = async (commentId: string, data: UpdateCommentData): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('card_comments')
        .update({
          content: data.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.card_comments" does not exist')) {
          console.warn('Card comments table not found - feature may not be available yet');
          return false;
        }
        throw error;
      }

      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: data.content, updatedAt: new Date().toISOString() }
            : comment
        )
      );
      
      return true;
    } catch (err: any) {
      console.error('Error updating comment:', err);
      setError(err.message || 'Erro ao atualizar comentÃ¡rio');
      return false;
    }
  };

  // Deletar comentÃ¡rio
  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      console.log('ðŸ—‘ï¸ [useComments] Iniciando exclusÃ£o do comentÃ¡rio:', commentId);
      
      // Primeiro, deletar todas as respostas (comentÃ¡rios filhos)
      const childComments = comments.filter(c => c.parentId === commentId);
      console.log('ðŸ—‘ï¸ [useComments] ComentÃ¡rios filhos encontrados:', childComments.length);
      
      for (const child of childComments) {
        console.log('ðŸ—‘ï¸ [useComments] Deletando filho:', child.id);
        await deleteComment(child.id);
      }

      // Depois, fazer SOFT DELETE do comentÃ¡rio principal (nÃ£o deleta permanentemente!)
      console.log('ðŸ—‘ï¸ [useComments] Soft delete do comentÃ¡rio principal:', commentId);
      const { error } = await (supabase as any)
        .from('card_comments')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', commentId);

      if (error) {
        console.error('ðŸ—‘ï¸ [useComments] Erro ao deletar do banco:', error);
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.card_comments" does not exist')) {
          console.warn('Card comments table not found - feature may not be available yet');
          return false;
        }
        throw error;
      }

      console.log('ðŸ—‘ï¸ [useComments] ComentÃ¡rio deletado do banco com sucesso!');
      
      // FORÃ‡A RECARREGAMENTO DO BANCO (ignorar cache local)
      console.log('ðŸ”„ [useComments] ForÃ§ando recarregamento completo do banco...');
      await loadComments();
      
      console.log('âœ… [useComments] ExclusÃ£o e recarregamento concluÃ­dos com sucesso');
      return true;
    } catch (err: any) {
      console.error('ðŸ—‘ï¸ [useComments] Erro ao deletar comentÃ¡rio:', err);
      setError(err.message || 'Erro ao deletar comentÃ¡rio');
      return false;
    }
  };

  // Criar resposta a um comentÃ¡rio
  const replyToComment = async (
    parentId: string, 
    content: string, 
    authorId: string, 
    authorName: string, 
    authorRole?: string
  ): Promise<Comment | null> => {
    console.log('ðŸ” DEBUG replyToComment chamado:', {
      parentId,
      content,
      authorId,
      authorName,
      authorRole
    });

    const parentComment = comments.find(c => c.id === parentId);
    console.log('ðŸ” DEBUG parentComment encontrado:', parentComment);
    console.log('ðŸ” DEBUG todos os comentÃ¡rios disponÃ­veis:', comments.map(c => ({
      id: c.id,
      level: c.level,
      threadId: c.threadId,
      parentId: c.parentId,
      authorName: c.authorName
    })));
    
    if (!parentComment) {
      console.error('ðŸš¨ ERRO: ComentÃ¡rio pai nÃ£o encontrado');
      setError('ComentÃ¡rio pai nÃ£o encontrado');
      return null;
    }

    // Limite de 7 nÃ­veis conforme solicitado
    const MAX_LEVEL = 7;
    const newLevel = parentComment.level + 1; // Sem Math.min por enquanto
    const threadId = parentComment.threadId || parentComment.id;
    
    console.log('ðŸ” DEBUG LEVEL CALCULATION:', {
      parentLevel: parentComment.level,
      newLevel,
      maxLevel: MAX_LEVEL,
      willExceedLimit: newLevel >= MAX_LEVEL
    });
    
    // Verificar se jÃ¡ atingiu o limite
    if (newLevel >= MAX_LEVEL) {
      console.warn('ðŸš¨ LIMITE ATINGIDO: MÃ¡ximo de respostas por conversa');
      setError(`Limite mÃ¡ximo de ${MAX_LEVEL} respostas por conversa atingido`);
      return null;
    }
    
    console.log('ðŸ” DEBUG dados para createComment:', {
      cardId,
      authorId,
      authorName,
      authorRole,
      content,
      parentId,
      level: newLevel,
      threadId,
      maxLevel: MAX_LEVEL
    });

    const result = await createComment({
      cardId,
      authorId,
      authorName,
      authorRole,
      content,
      parentId,
      level: newLevel,
      threadId: threadId // IMPORTANTE: Passar o thread_id para manter a mesma conversa
    });
    
    console.log('ðŸ” DEBUG replyToComment resultado:', result);
    return result;
  };

  // Carregar comentÃ¡rios quando o cardId mudar
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return {
    comments,
    isLoading,
    error,
    loadComments,
    createComment,
    updateComment,
    deleteComment,
    replyToComment
  };
}
