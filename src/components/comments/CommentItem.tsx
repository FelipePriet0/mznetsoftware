import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Reply, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { AttachmentList } from '@/components/attachments/AttachmentDisplay';
import { useAttachments } from '@/hooks/useAttachments';
import { CommentContentRenderer } from './CommentContentRenderer';
import { cn } from '@/lib/utils';

export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string; // Para respostas
  level: number; // 0 = principal, 1 = resposta, 2 = sub-resposta
  threadId?: string; // ID do thread da conversa
  isThreadStarter?: boolean; // Se é o início da conversa
  replyCount?: number; // Número de respostas
  attachments?: string[]; // IDs dos anexos
}

export interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: string, content: string, attachments?: string[]) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onDownloadAttachment?: (filePath: string, fileName: string) => void;
  currentUserId: string;
  currentUserName: string;
  canEdit?: boolean;
  canDelete?: boolean;
  showReplyButton?: boolean;
  // Removido sistema de empresas - todos podem acessar anexos
}

export function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  onDownloadAttachment,
  currentUserId,
  currentUserName,
  canEdit = false,
  canDelete = false,
  showReplyButton = true
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // Hook para gerenciar anexos do comentário
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
  } = useAttachments(comment.id);

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
    }
  };


  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      console.log('CommentItem handleDownloadAttachment called with:', { filePath, fileName });
      const url = await getDownloadUrl(filePath);
      if (url) {
        window.open(url, '_blank');
      } else {
        console.error('Failed to get download URL for:', filePath);
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
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


  // Definir cores baseadas no thread_id (cada conversa tem cor única)
  const getConversationStyle = () => {
    // Gerar cor baseada no thread_id para consistência
    const threadColors = [
      'blue', 'purple', 'emerald', 'orange', 'pink', 'indigo', 'teal', 'rose'
    ];
    
    // Usar thread_id ou id como fallback para gerar índice de cor
    const threadId = comment.threadId || comment.id;
    const colorIndex = parseInt(threadId.slice(-1), 16) % threadColors.length;
    const baseColor = threadColors[colorIndex];
    
    // Definir estilos baseados na cor da conversa
    const colorMap = {
      blue: { border: 'border-blue-500', background: 'bg-blue-50/30', dot: 'bg-blue-500' },
      purple: { border: 'border-purple-500', background: 'bg-purple-50/30', dot: 'bg-purple-500' },
      emerald: { border: 'border-emerald-500', background: 'bg-emerald-50/30', dot: 'bg-emerald-500' },
      orange: { border: 'border-orange-500', background: 'bg-orange-50/30', dot: 'bg-orange-500' },
      pink: { border: 'border-pink-500', background: 'bg-pink-50/30', dot: 'bg-pink-500' },
      indigo: { border: 'border-indigo-500', background: 'bg-indigo-50/30', dot: 'bg-indigo-500' },
      teal: { border: 'border-teal-500', background: 'bg-teal-50/30', dot: 'bg-teal-500' },
      rose: { border: 'border-rose-500', background: 'bg-rose-50/30', dot: 'bg-rose-500' }
    };
    
    const colorStyle = colorMap[baseColor] || colorMap.blue;
    
    return {
      border: `border-l-4 ${colorStyle.border}`,
      background: colorStyle.background,
      dotColor: colorStyle.dot
    };
  };

  const style = getConversationStyle();

  return (
    <div className="relative">
      {/* Layout horizontal como no desenho */}
      <div className="flex items-start gap-4">
        
        {/* Mensagem Principal */}
        <div className={cn(
          "flex-1 rounded-lg p-4 relative transition-all duration-200 hover:shadow-sm",
          style.border,
          style.background
        )}>
          {/* Header do Comentário */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={`/avatars/${comment.authorId}.jpg`} />
                <AvatarFallback className="text-xs font-medium">
                  {comment.authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                {comment.authorRole && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {comment.authorRole}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {format(new Date(comment.createdAt), 'dd/MM HH:mm')}
              </span>
              {/* Botão de Resposta (seta de retorno) */}
              {showReplyButton && comment.level < 7 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplying(!isReplying)}
                  className="h-6 w-6 p-0 hover:bg-white/50 rounded-full"
                  title="Responder (↩️)"
                >
                  <ArrowLeft className="h-3 w-3 rotate-180 text-gray-600" />
                </Button>
              )}
            </div>
          </div>

          {/* Conteúdo do Comentário */}
          <div>
            <CommentContentRenderer
              content={comment.content}
              attachments={attachments}
              onDownloadAttachment={onDownloadAttachment || handleDownloadAttachment}
              onDeleteAttachment={handleDeleteAttachment}
            />
          </div>
        </div>

        {/* Seta conectora (apenas para respostas) */}
        {comment.level > 0 && (
          <div className="flex items-center justify-center mt-6">
            <div className="relative">
              {/* Linha horizontal */}
              <div className="w-8 h-0.5 bg-gray-300"></div>
              {/* Seta curva */}
              <div className="absolute -top-2 left-6 w-4 h-4 border-l-2 border-b-2 border-gray-300 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>

      {/* Campo de Resposta Encadeada */}
      {isReplying && (
        <div className="mt-4 ml-8">
          <div className="bg-white/90 rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-2 h-2 rounded-full", style.dotColor)} />
              <span className="text-sm font-medium text-gray-700">
                Respondendo a {comment.authorName}
              </span>
            </div>
            
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Digite sua resposta... Use @menções para colaboradores"
              className="mb-3 min-h-[60px] text-sm resize-none [&::placeholder]:text-[#018942]"
              style={{ color: '#018942' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
            />
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent('');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90 disabled:opacity-50"
              >
                <ArrowLeft className="h-3 w-3 mr-1 rotate-180" />
                Responder
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
