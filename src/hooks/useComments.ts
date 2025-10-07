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

  // Extrair @menções do texto
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicatas
  };

  // Enviar notificações
  const sendNotifications = async (content: string, authorId: string, parentComment?: Comment) => {
    try {
      const mentions = extractMentions(content);
      
      // Notificar autor original se for uma resposta
      if (parentComment && parentComment.authorId !== authorId) {
        toast({
          title: "Nova resposta",
          description: `Você recebeu uma resposta em um comentário`,
          variant: "default"
        });
      }

      // Notificar usuários mencionados
      for (const mention of mentions) {
        toast({
          title: "Você foi mencionado",
          description: `Você foi mencionado em um comentário: @${mention}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  // Carregar comentários do card
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
        .order('created_at', { ascending: true });

      // Se erro por thread_id não existir, tentar sem essa coluna
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
        threadId: row.thread_id || row.id // Usar thread_id do banco ou o próprio ID como fallback
      }));

      setComments(mappedComments);
    } catch (err: any) {
      console.error('Error loading comments:', err);
      setError(err.message || 'Erro ao carregar comentários');
      // Em caso de erro, definir comentários vazios para não quebrar a UI
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  // Criar novo comentário
  const createComment = async (data: CreateCommentData): Promise<Comment | null> => {
    console.log('🔍 DEBUG useComments: createComment chamado com:', data);
    try {
      // Preparar dados para inserção (sem thread_id se não existir)
      const insertData: any = {
        card_id: data.cardId,
        author_id: data.authorId,
        author_name: data.authorName,
        author_role: data.authorRole,
        content: data.content,
        parent_id: data.parentId || null,
        level: data.level
      };

      // Incluir thread_id se disponível
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

      console.log('🔍 DEBUG: Tentando inserir no banco (com thread_id):', insertDataWithThreadId);
      console.log('🔍 DEBUG: Tipo de dados sendo inseridos:', {
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
        
      console.log('🔍 DEBUG: Resultado da inserção:', { 
        result, 
        error,
        success: !!result && !error,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        fullError: error
      });

      if (error) {
        console.log('🚨 ERRO no createComment:', error);
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.card_comments" does not exist')) {
          console.warn('Card comments table not found - feature may not be available yet');
          return null;
        }
        
        // Se erro por thread_id não existir, tentar sem thread_id
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
            threadId: result2.id // Usar o próprio ID como thread_id
          };
          
          console.log('🔍 DEBUG useComments: Comentário criado sem thread_id:', newComment);
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
        threadId: result.thread_id || result.id // Usar thread_id do banco ou o próprio ID como fallback
      };

      console.log('🔍 DEBUG useComments: Comentário criado com sucesso:', newComment);
      
      // Verificar se o comentário já existe na lista antes de adicionar
      setComments(prev => {
        const exists = prev.find(c => c.id === newComment.id);
        if (exists) {
          console.log('🔍 DEBUG: Comentário já existe na lista, atualizando...');
          return prev.map(c => c.id === newComment.id ? newComment : c);
        } else {
          console.log('🔍 DEBUG: Adicionando novo comentário à lista...');
          return [...prev, newComment];
        }
      });
      
      console.log('🔍 DEBUG useComments: Estado de comentários atualizado');
      
      // Enviar notificações
      const parentComment = data.parentId ? comments.find(c => c.id === data.parentId) : undefined;
      await sendNotifications(data.content, data.authorId, parentComment);
      
      return newComment;
    } catch (err: any) {
      console.error('Error creating comment:', err);
      setError(err.message || 'Erro ao criar comentário');
      return null;
    }
  };

  // Atualizar comentário
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
      setError(err.message || 'Erro ao atualizar comentário');
      return false;
    }
  };

  // Deletar comentário
  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      // Primeiro, deletar todas as respostas (comentários filhos)
      const childComments = comments.filter(c => c.parentId === commentId);
      for (const child of childComments) {
        await deleteComment(child.id);
      }

      // Depois, deletar o comentário principal
      const { error } = await (supabase as any)
        .from('card_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.card_comments" does not exist')) {
          console.warn('Card comments table not found - feature may not be available yet');
          return false;
        }
        throw error;
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      return true;
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setError(err.message || 'Erro ao deletar comentário');
      return false;
    }
  };

  // Criar resposta a um comentário
  const replyToComment = async (
    parentId: string, 
    content: string, 
    authorId: string, 
    authorName: string, 
    authorRole?: string
  ): Promise<Comment | null> => {
    console.log('🔍 DEBUG replyToComment chamado:', {
      parentId,
      content,
      authorId,
      authorName,
      authorRole
    });

    const parentComment = comments.find(c => c.id === parentId);
    console.log('🔍 DEBUG parentComment encontrado:', parentComment);
    console.log('🔍 DEBUG todos os comentários disponíveis:', comments.map(c => ({
      id: c.id,
      level: c.level,
      threadId: c.threadId,
      parentId: c.parentId,
      authorName: c.authorName
    })));
    
    if (!parentComment) {
      console.error('🚨 ERRO: Comentário pai não encontrado');
      setError('Comentário pai não encontrado');
      return null;
    }

    // Limite de 7 níveis conforme solicitado
    const MAX_LEVEL = 7;
    const newLevel = parentComment.level + 1; // Sem Math.min por enquanto
    const threadId = parentComment.threadId || parentComment.id;
    
    console.log('🔍 DEBUG LEVEL CALCULATION:', {
      parentLevel: parentComment.level,
      newLevel,
      maxLevel: MAX_LEVEL,
      willExceedLimit: newLevel >= MAX_LEVEL
    });
    
    // Verificar se já atingiu o limite
    if (newLevel >= MAX_LEVEL) {
      console.warn('🚨 LIMITE ATINGIDO: Máximo de respostas por conversa');
      setError(`Limite máximo de ${MAX_LEVEL} respostas por conversa atingido`);
      return null;
    }
    
    console.log('🔍 DEBUG dados para createComment:', {
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
    
    console.log('🔍 DEBUG replyToComment resultado:', result);
    return result;
  };

  // Carregar comentários quando o cardId mudar
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
