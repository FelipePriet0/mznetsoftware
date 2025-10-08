import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Paperclip, ArrowLeft, Trash2, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { CommentItem, Comment } from './CommentItem';
import { AttachmentList } from '@/components/attachments/AttachmentDisplay';
import { AttachmentUploadModal } from '@/components/attachments/AttachmentUploadModal';
import { useAttachments } from '@/hooks/useAttachments';
import { cn } from '@/lib/utils';
import { CommentContentRenderer } from './CommentContentRenderer';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';
import { useTasks } from '@/hooks/useTasks';

export interface CommentsListProps {
  cardId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
  comments: Comment[];
  onAddComment: (content: string, attachments?: string[]) => Promise<Comment | null> | void;
  onReply: (parentId: string, content: string, attachments?: string[]) => Promise<Comment | null> | void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onEditTask?: (task: any) => void; // Callback para editar tarefa
  onRefetch?: () => void;
  // Removido sistema de empresas - todos podem acessar anexos
}

export function CommentsList({
  cardId,
  currentUserId,
  currentUserName,
  currentUserRole,
  comments,
  onAddComment,
  onReply,
  onEdit,
  onDelete,
  onEditTask,
  onRefetch
}: CommentsListProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [showReplyAttachmentModal, setShowReplyAttachmentModal] = useState(false);
  const [pendingReplyAttachments, setPendingReplyAttachments] = useState<any[]>([]);
  const [showReplyTaskModal, setShowReplyTaskModal] = useState(false);
  const [taskParentCommentId, setTaskParentCommentId] = useState<string | null>(null);
  const [hasPendingTask, setHasPendingTask] = useState(false);
  
  // Estados para edição de tarefa
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // Carregar tarefas UMA VEZ para TODOS os comentários (otimização crítica!)
  const { tasks, updateTaskStatus, loadTasks } = useTasks(undefined, cardId);
  console.log('📋 [CommentsList] Tarefas carregadas centralizadamente:', tasks.length);
  
  // Debug: Mostrar quando as tarefas mudam
  useEffect(() => {
    console.log('🔄 [CommentsList] Lista de tarefas atualizada:', tasks);
  }, [tasks]);

  // Função para lidar com edição de tarefa
  const handleEditTask = (task: any) => {
    console.log('✏️ handleEditTask - Dados da tarefa recebidos:', task);
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  // Função para fechar modal de edição
  const handleCloseEditTaskModal = () => {
    setShowEditTaskModal(false);
    setEditingTask(null);
    // Não precisa recarregar aqui - o onTaskUpdate já faz isso
  };

  // Hook para gerenciar anexos do comentário principal
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
  } = useAttachments(cardId);

  // Função para obter anexos de um comentário específico
  const getAttachmentsForComment = (commentId: string, commentCardId: string, content?: string) => {
    // Primeiro, tentar filtrar por comment_id (anexos novos)
    let commentAttachments = attachments.filter(attachment => 
      attachment.comment_id === commentId
    );
    
    // Se não encontrar e o comentário tiver emoji de anexo, tentar match por nome de arquivo + card_id
    if (commentAttachments.length === 0 && content && content.includes('📎')) {
      // Extrair nome do arquivo do texto do comentário
      const fileNameMatch = content.match(/📎 Anexo adicionado: (.+?)(?:\n|$)/);
      // Extrair nome do card do texto do comentário (para fallback de anexos antigos)
      const cardNameMatch = content.match(/📋 Ficha: (.+?)(?:\n|$)/);
      
      if (fileNameMatch) {
        const fileName = fileNameMatch[1].trim();
        const cardName = cardNameMatch ? cardNameMatch[1].trim() : null;
        
        // Buscar anexos que NÃO têm comment_id
        const attachmentsWithoutComment = attachments.filter(a => !a.comment_id);
        
        console.log('🔍 DEBUG Match:', {
          fileName,
          cardName,
          commentCardId,
          totalAttachments: attachments.length,
          attachmentsWithoutComment: attachmentsWithoutComment.length
        });
        
        // Filtrar por nome de arquivo
        let candidateAttachments = attachmentsWithoutComment.filter(attachment => 
          attachment.file_name === fileName || 
          attachment.file_name?.toLowerCase() === fileName.toLowerCase()
        );
        
        console.log('🔍 Candidatos por nome de arquivo:', {
          fileName,
          candidates: candidateAttachments.length,
          candidatesList: candidateAttachments.map(a => ({ 
            id: a.id, 
            file_name: a.file_name, 
            file_path: a.file_path,
            card_id: a.card_id
          }))
        });
        
        // Se tem múltiplos matches, filtrar por card_id (muito mais confiável!)
        if (candidateAttachments.length > 1) {
          // Priorizar anexos que pertencem ao card atual (card_id)
          // ✅ Usar commentCardId em vez de cardId (card do comentário pode ser diferente do card atual)
          const filteredByCardId = candidateAttachments.filter(attachment => 
            attachment.card_id === commentCardId
          );
          
          if (filteredByCardId.length > 0) {
            console.log('🔍 Filtrando por card_id:', {
              cardId,
              beforeFilter: candidateAttachments.length,
              afterFilter: filteredByCardId.length,
              selected: filteredByCardId.map(a => ({ file_name: a.file_name, file_path: a.file_path }))
            });
            candidateAttachments = filteredByCardId;
          } else if (cardName) {
            // FALLBACK: Se não encontrou por card_id, tentar por nome no file_path (para anexos antigos)
            const filteredByCard = candidateAttachments.filter(attachment => 
              attachment.file_path?.includes(cardName) ||
              attachment.file_path?.toLowerCase().includes(cardName.toLowerCase())
            );
            
            if (filteredByCard.length > 0) {
              console.log('🔍 Filtrando por nome do card no file_path (fallback):', {
                cardName,
                beforeFilter: candidateAttachments.length,
                afterFilter: filteredByCard.length,
                selected: filteredByCard.map(a => ({ file_name: a.file_name, file_path: a.file_path }))
              });
              candidateAttachments = filteredByCard;
            }
          }
        }
        
        // Pegar o mais recente se ainda tiver múltiplos
        if (candidateAttachments.length > 0) {
          // Ordenar por created_at DESC e pegar o primeiro (mais recente)
          commentAttachments = [candidateAttachments.sort((a, b) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )[0]];
          
          console.log('✅ Anexo selecionado:', {
            fileName,
            selected: commentAttachments.map(a => ({ 
              id: a.id, 
              file_name: a.file_name, 
              file_path: a.file_path,
              created_at: a.created_at
            }))
          });
        } else {
          console.log('❌ Nenhum anexo encontrado para:', fileName);
        }
      }
    }
    
    console.log('🔍 getAttachmentsForComment:', {
      commentId,
      totalAttachments: attachments.length,
      commentAttachments: commentAttachments.length,
      allAttachments: attachments.map(a => ({ id: a.id, comment_id: a.comment_id, file_name: a.file_name, file_path: a.file_path }))
    });
    
    return commentAttachments;
  };

  // Organizar comentários em árvore hierárquica
  const organizeComments = (comments: Comment[]): Comment[] => {
    interface CommentWithReplies extends Comment {
      replies: CommentWithReplies[];
    }

    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    // Primeiro, criar mapa de todos os comentários
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Depois, organizar hierarquia
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    // Ordenar por data de criação
    const sortComments = (comments: CommentWithReplies[]): Comment[] => {
      return comments
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .flatMap(comment => [
          comment,
          ...sortComments(comment.replies)
        ]);
    };

    return sortComments(rootComments);
  };

  const organizedComments = organizeComments(comments);

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };


  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      console.log('📥 [CommentsList] handleDownloadAttachment called with:', { 
        filePath, 
        fileName,
        filePathType: typeof filePath,
        fileNameType: typeof fileName
      });
      
      const url = await getDownloadUrl(filePath);
      
      console.log('📥 [CommentsList] Download URL obtained:', { 
        url, 
        urlType: typeof url,
        success: !!url 
      });
      
      if (url) {
        console.log('✅ [CommentsList] Abrindo URL para download:', url);
        const newTab = window.open(url, '_blank');
        
        if (!newTab) {
          console.error('❌ [CommentsList] Pop-up bloqueado! Tentando download direto...');
          // Fallback: criar link e clicar
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('✅ [CommentsList] Download via link direto iniciado');
        } else {
          console.log('✅ [CommentsList] Nova aba aberta com sucesso');
        }
      } else {
        console.error('❌ [CommentsList] Failed to get download URL for:', filePath);
      }
    } catch (error) {
      console.error('❌ [CommentsList] Error downloading attachment:', error);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment(attachmentId);
      await loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const canDeleteAttachment = () => true; // Qualquer um pode deletar conforme solicitado

  // Funções para gerenciar resposta
  const handleReplyClick = (commentId: string) => {
    console.log('🔍 DEBUG handleReplyClick:', {
      commentId,
      allComments: comments.map(c => ({ id: c.id, level: c.level, threadId: c.threadId })),
      targetComment: comments.find(c => c.id === commentId)
    });
    setReplyingTo(commentId);
    setReplyContent('');
  };

  const handleReplySubmit = async () => {
    console.log('🔍 DEBUG handleReplySubmit INICIADO:', {
      replyContent: replyContent.trim(),
      replyingTo,
      hasOnReply: !!onReply,
      contentLength: replyContent.trim().length,
      hasPendingAttachments: pendingReplyAttachments.length > 0,
      pendingAttachments: pendingReplyAttachments,
      targetComment: comments.find(c => c.id === replyingTo),
      allComments: comments.map(c => ({ id: c.id, level: c.level, threadId: c.threadId, parentId: c.parentId }))
    });
    
    // Permitir resposta apenas com anexos, tarefa OU com texto
    const hasContent = replyContent.trim().length > 0;
    const hasAttachments = pendingReplyAttachments.length > 0;
    // Note: tarefas já criam comentário automaticamente via onCommentCreate
    
    console.log('🔍 DEBUG Validação:', {
      hasContent,
      hasAttachments,
      canSubmit: (hasContent || hasAttachments) && replyingTo && !!onReply
    });
    
    if ((hasContent || hasAttachments) && replyingTo && onReply) {
      try {
        console.log('🔍 DEBUG: Chamando onReply...');
        const startTime = Date.now();
        
        // Se não houver texto mas houver anexos, criar um comentário indicando o anexo
        const contentToSend = hasContent 
          ? replyContent.trim() 
          : `📎 Anexo${pendingReplyAttachments.length > 1 ? 's' : ''} enviado${pendingReplyAttachments.length > 1 ? 's' : ''}`;
        
        const result = await onReply(replyingTo, contentToSend);
        
        const endTime = Date.now();
        console.log('🔍 DEBUG: onReply executado:', {
          result,
          executionTime: `${endTime - startTime}ms`,
          success: !!result
        });
        
        if (result) {
          console.log('🔍 DEBUG: Resposta criada com sucesso:', result);
          
          // Fazer upload dos anexos pendentes após criar o comentário
          if (pendingReplyAttachments.length > 0) {
            console.log('🔍 DEBUG: Fazendo upload de anexos pendentes...');
            for (const pendingAttachment of pendingReplyAttachments) {
              try {
                // Criar anexo associado ao comentário de resposta
                const attachmentData = {
                  ...pendingAttachment,
                  commentId: result.id // Associar ao comentário recém-criado
                };
                await uploadAttachment(attachmentData);
              } catch (error) {
                console.error('🚨 ERRO ao fazer upload de anexo pendente:', error);
              }
            }
            await loadAttachments(); // Recarregar anexos
            
            // Chamar onRefetch para atualizar comentários instantaneamente
            if (onRefetch) {
              console.log('🔍 DEBUG: Chamando onRefetch para atualização instantânea...');
              onRefetch();
            }
          }
          
          console.log('🔍 DEBUG: Limpando estado...');
          setReplyingTo(null);
          setReplyContent('');
          setPendingReplyAttachments([]); // Limpar anexos pendentes
          setReplyAttachments([]); // Limpar anexos de resposta
          console.log('🔍 DEBUG: Estado limpo com sucesso');
        } else {
          console.error('🚨 ERRO: onReply retornou null/undefined');
        }
      } catch (error) {
        console.error('🚨 ERRO em handleReplySubmit:', error);
        console.error('🚨 Stack trace:', error.stack);
      }
    } else {
      console.log('🔍 DEBUG: Condições não atendidas para submit:', {
        hasContent: !!replyContent.trim(),
        hasReplyingTo: !!replyingTo,
        hasOnReply: !!onReply
      });
    }
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
    setReplyContent('');
    setPendingReplyAttachments([]); // Limpar anexos pendentes
    setReplyAttachments([]); // Limpar anexos de resposta
  };

  // Funções para gerenciar exclusão de comentários
  const handleDeleteClick = (commentId: string) => {
    setDeletingComment(commentId);
  };

  const handleDeleteConfirm = async () => {
    if (deletingComment && onDelete) {
      try {
        console.log('🔍 DEBUG: Excluindo comentário:', deletingComment);
        const success = await onDelete(deletingComment);
        console.log('🔍 DEBUG: Resultado da exclusão:', success);
        
        if (success) {
          setDeletingComment(null);
          
          // IMPORTANTE: Recarregar comentários após exclusão
          // para garantir sincronização com o banco de dados
          if (onRefetch) {
            console.log('🔍 DEBUG: Chamando onRefetch após exclusão...');
            setTimeout(() => {
              onRefetch();
            }, 100);
          }
        }
      } catch (error) {
        console.error('🚨 ERRO ao excluir comentário:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeletingComment(null);
  };

  // Funções para anexos nas respostas
  const handleReplyAttachmentClick = () => {
    setShowReplyAttachmentModal(true);
  };

  const handleReplyAttachmentUpload = async (data: any) => {
    try {
      // Armazenar anexo como pendente (não fazer upload ainda)
      const pendingAttachment = {
        ...data,
        id: `pending-${Date.now()}`,
        pending: true
      };
      
      console.log('📎 DEBUG: Anexo adicionado aos pendentes:', {
        pendingAttachment,
        totalPending: pendingReplyAttachments.length + 1
      });
      
      setPendingReplyAttachments(prev => {
        const newPending = [...prev, pendingAttachment];
        console.log('📎 DEBUG: Estado atualizado, pendentes:', newPending.length);
        return newPending;
      });
      setReplyAttachments(prev => [...prev, data.file]);
      setShowReplyAttachmentModal(false);
    } catch (error) {
      console.error('Error preparing attachment for reply:', error);
    }
  };

  // Função para obter cor do thread
  const getThreadColor = (threadId: string): string => {
    if (!threadId) return 'bg-gray-500'; // Fallback para threadId vazio
    
    const threadColors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-orange-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    try {
      const colorIndex = parseInt(threadId.slice(-1), 16) % threadColors.length;
      return threadColors[colorIndex] || 'bg-gray-500';
    } catch (error) {
      console.warn('Error parsing threadId:', threadId, error);
      return 'bg-gray-500';
    }
  };

  // Função para obter índice do thread
  const getThreadIndex = (threadId: string) => {
    const uniqueThreads = [...new Set(comments.map(c => c.threadId || c.id))];
    const index = uniqueThreads.indexOf(threadId) + 1;
    return index;
  };

  // Função para agrupar comentários por thread
  const getGroupedComments = () => {
    const threadMap = new Map<string, Comment[]>();
    
    comments.forEach(comment => {
      const threadId = comment.threadId || comment.id;
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, []);
      }
      threadMap.get(threadId)!.push(comment);
    });
    
    // Converter para array e ordenar por data do primeiro comentário
    return Array.from(threadMap.entries())
      .map(([threadId, threadComments]) => ({
        threadId,
        comments: threadComments.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      }))
      .sort((a, b) => 
        new Date(a.comments[0].createdAt).getTime() - new Date(b.comments[0].createdAt).getTime()
      );
  };

  // Função para verificar se pode responder (limite de 7 níveis)
  const canReplyToComment = (comment: Comment) => {
    const MAX_LEVEL = 7;
    const canReply = comment.level < MAX_LEVEL;
    console.log('🔍 DEBUG canReplyToComment:', {
      commentId: comment.id,
      level: comment.level,
      maxLevel: MAX_LEVEL,
      canReply,
      threadId: comment.threadId
    });
    return canReply;
  };

  return (
    <div className="space-y-4">
      {/* Título da Seção */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        <h3 className="text-lg font-semibold text-gray-900">Conversas Correlacionadas</h3>
        <Badge variant="outline" className="text-xs">
          {new Set(comments.map(c => c.threadId || c.id)).size} thread{new Set(comments.map(c => c.threadId || c.id)).size !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {organizedComments.length} comentário{organizedComments.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Lista de Conversas Agrupadas por Thread */}
      <div className="space-y-6">
        {getGroupedComments().map((threadGroup, index) => (
          <div key={threadGroup.threadId} className="space-y-2">
            {/* Título da Conversa Encadeada */}
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-3 h-3 rounded-full", getThreadColor(threadGroup.threadId))}></div>
              <h4 className="text-sm font-medium text-gray-700">
                {index + 1} Conversa Encadeada
              </h4>
              <Badge variant="outline" className="text-xs">
                {threadGroup.comments.length} mensagem{threadGroup.comments.length !== 1 ? 's' : ''}
              </Badge>
              {/* Indicador de limite */}
              {threadGroup.comments.length >= 7 && (
                <Badge variant="destructive" className="text-xs">
                  🔒 Limite atingido
                </Badge>
              )}
              {threadGroup.comments.length >= 5 && threadGroup.comments.length < 7 && (
                <Badge variant="secondary" className="text-xs">
                  ⚠️ {8 - threadGroup.comments.length} restantes
                </Badge>
              )}
            </div>
            
            {/* Campo Colorido que Engloba Toda a Conversa */}
            <div className={cn(
              "rounded-lg border-l-4 p-4 space-y-3",
              getThreadColor(threadGroup.threadId)?.replace('bg-', 'border-') || 'border-gray-300',
              getThreadColor(threadGroup.threadId)?.replace('bg-', 'bg-').replace('-500', '-50/30') || 'bg-gray-50/30'
            )}>
              {threadGroup.comments.map((comment, commentIndex) => (
                <div key={comment.id} className="relative">
                  {/* Mensagem Individual */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {comment.authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header da Mensagem */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), 'dd/MM HH:mm')}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                          {comment.authorRole && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              {comment.authorRole}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Botão de Resposta (seta de retorno) - movido mais à esquerda */}
                          {canReplyToComment(comment) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReplyClick(comment.id)}
                              className="h-5 w-5 p-0 hover:bg-white/50 rounded-full"
                              title="Responder (↩️)"
                            >
                              <ArrowLeft className="h-3 w-3 rotate-180 text-gray-600" />
                            </Button>
                          ) : (
                            <div className="h-5 w-5 flex items-center justify-center">
                              <span className="text-xs text-gray-400" title="Limite de 7 respostas atingido">
                                🔒
                              </span>
                            </div>
                          )}
                          {/* Botão de Exclusão (lixeira vermelha) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(comment.id)}
                            className="h-5 w-5 p-0 hover:bg-red-50 rounded-full"
                            title="Excluir comentário"
                          >
                            <Trash2 className="h-3 w-3 text-red-500 hover:text-red-700" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Conteúdo da Mensagem */}
                      <div className="text-sm text-gray-700">
                        <CommentContentRenderer
                          content={comment.content}
                          attachments={getAttachmentsForComment(comment.id, comment.cardId, comment.content)}
                          onDownloadAttachment={handleDownloadAttachment}
                          onDeleteAttachment={handleDeleteAttachment}
                          cardId={cardId}
                          commentId={comment.id}
                          onEditTask={handleEditTask}
                          tasks={tasks}
                          onUpdateTaskStatus={updateTaskStatus}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Campo de Resposta */}
                  {replyingTo === comment.id && (
                    <div className="mt-4 ml-9">
                      <div className="bg-white/90 rounded-lg border border-gray-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn("w-2 h-2 rounded-full", getThreadColor(threadGroup.threadId)?.replace('bg-', 'bg-').replace('-500', '-500') || 'bg-gray-500')} />
                          <span className="text-sm font-medium text-gray-700">
                            Respondendo a {comment.authorName}
                          </span>
                        </div>
                        
                        <div className="relative">
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Digite sua resposta... Use @menções para colaboradores"
                            className="mb-3 min-h-[60px] text-sm resize-none pt-12 pl-20 [&::placeholder]:text-[#018942]"
                            style={{ color: '#018942' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReplySubmit();
                              }
                            }}
                            autoFocus
                          />
                          
                          {/* CTA Anexo integrado */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleReplyAttachmentClick}
                            className="absolute top-2 left-2 h-8 w-8 p-0 text-[#018942] hover:bg-[#018942]/10"
                            title="Anexar arquivo à resposta"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>

                          {/* CTA Criar Tarefa integrado */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTaskParentCommentId(comment.id);
                              setShowReplyTaskModal(true);
                            }}
                            className="absolute top-2 left-11 h-8 w-8 p-0 text-[#018942] hover:bg-[#018942]/10"
                            title="Criar tarefa na conversa"
                          >
                            <ListTodo className="h-4 w-4" />
                          </Button>
                          
                        </div>
                        
                        {/* Mostrar anexos pendentes */}
                        {pendingReplyAttachments.length > 0 && (
                          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="text-xs text-blue-600 mb-2">Arquivos que serão anexados:</div>
                            <div className="space-y-1">
                              {pendingReplyAttachments.map((attachment, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs text-blue-700">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{attachment.customFileName || attachment.file.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReplyCancel}
                            className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleReplySubmit}
                            disabled={!replyContent.trim() && pendingReplyAttachments.length === 0}
                            className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90 disabled:opacity-50"
                          >
                            <ArrowLeft className="h-3 w-3 mr-1 rotate-180" />
                            Responder
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conector Visual entre Mensagens */}
                  {commentIndex < threadGroup.comments.length - 1 && (
                    <div className="flex items-center mt-3">
                      <div className="w-6 h-0.5 bg-gray-200 ml-3"></div>
                      <div className="w-2 h-2 border-l border-b border-gray-300 transform rotate-45 ml-1"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Mensagem quando não há conversas */}
        {getGroupedComments().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm">Nenhuma conversa ainda</p>
            <p className="text-xs text-gray-400 mt-1">
              Use o campo acima para iniciar uma conversa
            </p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deletingComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Excluir Comentário</h3>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Tem certeza que deseja excluir este comentário? Apenas este comentário será removido, 
                não a conversa inteira.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de anexo para respostas */}
      {showReplyAttachmentModal && (
        <AttachmentUploadModal
          open={showReplyAttachmentModal}
          onClose={() => setShowReplyAttachmentModal(false)}
          onUpload={handleReplyAttachmentUpload}
          isUploading={isUploading}
          cardId={cardId}
        />
      )}

      {/* Modal de Adicionar Tarefa (para conversas encadeadas) */}
      <AddTaskModal
        open={showReplyTaskModal}
        onClose={() => {
          setShowReplyTaskModal(false);
          setTaskParentCommentId(null);
          setHasPendingTask(false);
        }}
        cardId={cardId}
        parentCommentId={taskParentCommentId || undefined}
        onCommentCreate={async (content: string) => {
          // Criar resposta na conversa encadeada
          if (taskParentCommentId && onReply) {
            const result = await onReply(taskParentCommentId, content);
            
            // Resetar estado após criar a tarefa
            if (result) {
              setShowReplyTaskModal(false);
              setTaskParentCommentId(null);
              setHasPendingTask(false);
              setReplyingTo(null); // Fechar campo de resposta
              
              // Atualizar comentários
              if (onRefetch) {
                onRefetch();
              }
            }
            
            return result || null;
          }
          return null;
        }}
      />

      {/* Modal de Editar Tarefa */}
      <AddTaskModal
        open={showEditTaskModal}
        onClose={handleCloseEditTaskModal}
        cardId={cardId}
        editingTask={editingTask}
        onTaskUpdate={async (taskId: string, updates: any) => {
          // Recarregar tarefas E comentários para refletir mudanças
          console.log('🔄 [CommentsList] Recarregando tarefas e comentários após atualização...');
          
          // 1. Recarregar tarefas (para atualizar os cards de tarefa)
          await loadTasks();
          console.log('✅ [CommentsList] Tarefas recarregadas');
          
          // 2. Recarregar comentários (para atualizar conversas)
          if (onRefetch) {
            onRefetch();
          }
          console.log('✅ [CommentsList] Comentários recarregados - PROCESSO COMPLETO! 🎉');
          return true;
        }}
      />
    </div>
  );
}
