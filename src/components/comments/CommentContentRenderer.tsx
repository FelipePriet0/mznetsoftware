import React, { useState } from 'react';
import { AttachmentCard } from './AttachmentCard';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Calendar, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/tasks';
import { supabase } from '@/integrations/supabase/client';

interface CommentContentRendererProps {
  content: string;
  attachments: any[];
  onDownloadAttachment: (filePath: string, fileName: string) => void;
  onDeleteAttachment?: (attachmentId: string, filePath: string) => void;
  cardId?: string;
  commentId?: string;
  onEditTask?: (task: any) => void; // Callback para editar tarefa
  tasks?: Task[]; // Tarefas carregadas no componente pai (otimização)
  onUpdateTaskStatus?: (taskId: string, status: 'pending' | 'completed') => Promise<boolean>; // Callback para atualizar status
  // Removido sistema de empresas - todos podem acessar anexos
}

// Regex para detectar comentários de anexo no formato antigo
const ATTACHMENT_COMMENT_REGEX = /📎 Anexo adicionado: (.+?)\n📋 Ficha: (.+?)\n📊 Detalhes do arquivo:\n• Tipo: (.+?)\n• Tamanho: (.+?)\n• Extensão: (.+?)\n• Autor: (.+?) \((.+?)\)/s;

// Regex mais flexível para detectar comentários de anexo (com ou sem emoji)
const FLEXIBLE_ATTACHMENT_REGEX = /(?:📎\s*)?Anexo adicionado:\s*(.+?)(?:\n|$)/i;

// Regex mais flexível para detectar comentários de anexo (backup)
const ATTACHMENT_COMMENT_FLEXIBLE_REGEX = /(?:📎\s*)?Anexo adicionado:\s*(.+?)(?:\n|$)/i;

// Regex para detectar comentários de tarefa
const TASK_COMMENT_REGEX = /📋 \*\*Tarefa criada\*\*\n\n👤 \*\*Para:\*\* @(.+?)\n📝 \*\*Descrição:\*\* (.+?)(?:\n📅 \*\*Prazo:\*\* (.+?))?(?:\n|$)/s;

export function CommentContentRenderer({ 
  content, 
  attachments, 
  onDownloadAttachment, 
  onDeleteAttachment, 
  cardId, 
  commentId, 
  onEditTask,
  tasks = [], // Recebe tarefas como prop (otimização!)
  onUpdateTaskStatus
}: CommentContentRendererProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Debug: verificar conteúdo do comentário (apenas se contém anexo)
  if (content.includes('📎')) {
    console.log('CommentContentRenderer processing attachment comment:', { 
      content: content.substring(0, 100) + '...',
      hasAttachmentsFromDB: attachments.length > 0,
      attachmentsFromDB: attachments
    });
  }

  // VERIFICAÇÃO: Se é comentário de anexo mas não tem anexos no banco, não renderizar
  // Isso significa que o anexo foi soft deleted
  const isAttachmentComment = content.includes('📎') && (
    content.includes('Anexo adicionado:') || 
    content.includes('Arquivo anexado:') ||
    content.includes('📎 **Anexo adicionado**')
  );
  
  if (isAttachmentComment && attachments.length === 0) {
    console.log('🚫 Comentário de anexo deletado - não renderizando');
    return null; // Não renderizar nada
  }
  
  // Verificar se é um comentário de TAREFA primeiro
  const taskMatch = content.match(TASK_COMMENT_REGEX);
  if (taskMatch) {
    const [, assignedToFromComment, descriptionFromComment, deadlineFromComment] = taskMatch;
    
    console.log('🔍 [CommentContentRenderer] ===== DEBUG TAREFA =====');
    console.log('🔍 [CommentContentRenderer] Procurando tarefa para comentário:', {
      commentId,
      cardId,
      assignedToFromComment,
      descriptionFromComment: descriptionFromComment.trim(),
      deadlineFromComment,
      totalTasks: tasks.length,
      allTasksData: tasks.map(t => ({
        id: t.id,
        comment_id: t.comment_id,
        description: t.description,
        status: t.status,
        card_id: t.card_id
      }))
    });
    
    // Encontrar a tarefa relacionada com MÚLTIPLOS critérios de fallback
    let relatedTask = tasks.find(task => task.comment_id === commentId);
    
    console.log('🔍 [CommentContentRenderer] Busca 1 (por comment_id):', relatedTask ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
    
    // Fallback 1: Buscar por descrição exata no mesmo card
    if (!relatedTask) {
      relatedTask = tasks.find(task => 
        task.card_id === cardId && 
        task.description.trim() === descriptionFromComment.trim()
      );
      console.log('🔍 [CommentContentRenderer] Busca 2 (por descrição):', relatedTask ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
    }
    
    // Fallback 2: Buscar por descrição parcial (primeiras 50 chars)
    if (!relatedTask) {
      const descShort = descriptionFromComment.trim().substring(0, 50);
      relatedTask = tasks.find(task => 
        task.card_id === cardId && 
        task.description.trim().startsWith(descShort)
      );
      console.log('🔍 [CommentContentRenderer] Busca 3 (por descrição parcial):', relatedTask ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
    }
    
    console.log('🔍 [CommentContentRenderer] Tarefa final encontrada:', relatedTask ? {
      id: relatedTask.id,
      comment_id: relatedTask.comment_id,
      description: relatedTask.description,
      status: relatedTask.status
    } : 'NENHUMA TAREFA ENCONTRADA');
    console.log('🔍 [CommentContentRenderer] ===========================');
    
    // Usar dados atualizados da tarefa do banco, ou fallback para dados do comentário
    const assignedTo = relatedTask?.assigned_to_name || assignedToFromComment;
    const description = relatedTask?.description || descriptionFromComment;
    const deadline = relatedTask?.deadline || deadlineFromComment;
    
    const isCompleted = relatedTask?.status === 'completed';
    
    // Debug: mostrar dados da tarefa
    console.log('📋 CommentContentRenderer - Dados da tarefa:', {
      commentId,
      relatedTask: relatedTask ? {
        id: relatedTask.id,
        description: relatedTask.description,
        assigned_to_name: relatedTask.assigned_to_name,
        deadline: relatedTask.deadline,
        status: relatedTask.status
      } : null,
      assignedTo,
      description,
      deadline,
      isCompleted
    });
    
    const handleToggleTask = async () => {
      if (isUpdating || !onUpdateTaskStatus) return;
      
      console.log('🔘 [handleToggleTask] Iniciando toggle da tarefa:', {
        hasRelatedTask: !!relatedTask,
        relatedTaskId: relatedTask?.id,
        commentId,
        cardId,
        description: descriptionFromComment
      });
      
      setIsUpdating(true);
      try {
        const newStatus = isCompleted ? 'pending' : 'completed';
        let taskId = relatedTask?.id;
        
        // Se não tem relatedTask, buscar tarefa pelo comment_id ou descrição
        if (!taskId && (commentId || cardId)) {
          console.log('🔍 [handleToggleTask] Tarefa não encontrada no cache, buscando no banco...');
          
          // Tentar buscar por comment_id
          if (commentId) {
            const { data: foundByComment } = await (supabase as any)
              .from('card_tasks')
              .select('id, status')
              .eq('comment_id', commentId)
              .eq('card_id', cardId)
              .is('deleted_at', null)
              .single();
            
            if (foundByComment?.id) {
              console.log('✅ [handleToggleTask] Tarefa encontrada por comment_id:', foundByComment.id);
              taskId = foundByComment.id;
            }
          }
          
          // Se ainda não achou, buscar por descrição + card_id
          if (!taskId && descriptionFromComment && cardId) {
            console.log('🔍 [handleToggleTask] Buscando por descrição...');
            const { data: foundByDescription } = await (supabase as any)
              .from('card_tasks')
              .select('id, status')
              .eq('card_id', cardId)
              .eq('description', descriptionFromComment.trim())
              .is('deleted_at', null)
              .single();
            
            if (foundByDescription?.id) {
              console.log('✅ [handleToggleTask] Tarefa encontrada por descrição:', foundByDescription.id);
              taskId = foundByDescription.id;
            }
          }
        }
        
        if (!taskId) {
          console.error('❌ [handleToggleTask] Nenhuma tarefa encontrada para atualizar');
          toast({
            title: 'Tarefa não encontrada',
            description: 'Não foi possível localizar a tarefa no banco de dados.',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('📤 [handleToggleTask] Atualizando tarefa:', { taskId, newStatus });
        await onUpdateTaskStatus(taskId, newStatus);
        
        toast({
          title: newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reaberta',
          description: newStatus === 'completed' 
            ? 'A tarefa foi marcada como concluída.' 
            : 'A tarefa foi reaberta.',
        });
        
        console.log('✅ [handleToggleTask] Tarefa atualizada com sucesso');
      } catch (error) {
        console.error('❌ [handleToggleTask] Erro ao processar tarefa:', error);
        toast({
          title: 'Erro ao processar tarefa',
          description: 'Não foi possível processar a tarefa.',
          variant: 'destructive',
        });
      } finally {
        setIsUpdating(false);
      }
    };
    
    return (
      <div className="space-y-2">
        <div className={cn(
          "flex items-start gap-3 p-3 border rounded-lg transition-colors",
          isCompleted 
            ? "bg-green-50 border-green-200" 
            : "bg-blue-50 border-blue-200"
        )}>
          <div className="flex-shrink-0 mt-0.5">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleToggleTask}
              disabled={isUpdating}
              className="w-6 h-6 border-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              title={relatedTask ? 'Marcar tarefa' : 'Tarefa será buscada no banco ao clicar'}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Badge className={cn(
                isCompleted 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-blue-500 hover:bg-blue-600"
              )}>
                {isCompleted ? 'Tarefa Concluída' : 'Tarefa'}
              </Badge>
              
              {/* CTA de 3 pontinhos para editar */}
              {relatedTask && onEditTask && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        console.log('🔧 Clicando em "Editar Tarefa" - relatedTask:', relatedTask);
                        onEditTask(relatedTask);
                      }}
                      className="text-sm"
                    >
                      Editar Tarefa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className={cn(
              "space-y-2 text-sm transition-all",
              isCompleted && "opacity-75"
            )}>
              <div className={cn(
                "flex items-center gap-2",
                isCompleted ? "text-green-700 line-through" : "text-gray-700"
              )}>
                <User className={cn("h-4 w-4", isCompleted ? "text-green-600" : "text-blue-600")} />
                <span className="font-medium">Para:</span>
                <span className={cn(isCompleted ? "text-green-700" : "text-blue-700")}>@{assignedTo}</span>
              </div>
              
              <div className={cn(
                "text-gray-900",
                isCompleted && "line-through"
              )}>
                <span className="font-medium">Descrição:</span> {description}
              </div>
              
              {deadline && (
                <div className={cn(
                  "flex items-center gap-2",
                  isCompleted ? "text-green-700 line-through" : "text-gray-700"
                )}>
                  <Calendar className={cn("h-4 w-4", isCompleted ? "text-green-600" : "text-blue-600")} />
                  <span className="font-medium">Prazo:</span>
                  <span>{deadline}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Se há anexos vindos do banco de dados E o comentário menciona anexo,
  // PRIORIZAR os anexos do banco (têm o file_path correto baseado no ID!)
  const hasAttachmentsFromDB = attachments && attachments.length > 0;
  // isAttachmentComment já foi declarado no início da função (linha 62)
  
  console.log('🔍 CommentContentRenderer DEBUG:', {
    content: content?.substring(0, 100) + '...',
    hasAttachmentsFromDB,
    isAttachmentComment,
    attachmentCount: attachments?.length || 0,
    attachments: attachments?.map(a => ({
      id: a.id,
      file_name: a.file_name,
      file_path: a.file_path,
      comment_id: a.comment_id
    }))
  });
  
  if (isAttachmentComment && hasAttachmentsFromDB) {
    console.log('✅ Usando anexos do banco de dados (file_path pelo ID):', {
      attachmentCount: attachments.length,
      attachments: attachments.map(a => ({
        id: a.id,
        file_name: a.file_name,
        file_path: a.file_path
      }))
    });
    
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {content.includes('📎 Anexo enviado') || content.includes('📎 Anexos enviados') 
            ? content 
            : 'Arquivo anexado:'}
        </div>
        <div className="space-y-2">
          {attachments.map((attachment) => {
            console.log('📎 Renderizando anexo do banco:', {
              id: attachment.id,
              file_name: attachment.file_name,
              file_path: attachment.file_path
            });
            
            return (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onDownload={onDownloadAttachment}
                onDelete={onDeleteAttachment}
              />
            );
          })}
        </div>
      </div>
    );
  }
  
  // FALLBACK: Verificar se é um comentário de anexo no formato antigo completo
  // (só usar isso se NÃO houver anexos no banco de dados)
  const attachmentMatch = content.match(ATTACHMENT_COMMENT_REGEX);
  
  if (attachmentMatch && !hasAttachmentsFromDB) {
    const [, fileName, cardTitle, fileType, fileSize, fileExtension, authorName, authorRole] = attachmentMatch;
    
    // Debug logs reduzidos
    console.log('Processing attachment comment:', { fileName, cardTitle });
    
    // Criar objeto de anexo a partir do comentário
    // Tentar diferentes variações do caminho baseado nos arquivos que vimos no storage
    const possiblePaths = [
      `${cardTitle}/${fileName}`, // CARD_NAME/arquivo.pdf
      `card-attachments/${cardTitle}/${fileName}`, // card-attachments/CARD_NAME/arquivo.pdf
      fileName, // Apenas arquivo.pdf
      `card-attachments/${fileName}` // card-attachments/arquivo.pdf
    ];
    
    const attachmentData = {
      id: `comment-attachment-${Date.now()}`,
      file_name: fileName,
      file_path: possiblePaths[0], // Usar o primeiro como padrão
      possible_paths: possiblePaths, // Adicionar todos os caminhos possíveis
      file_size: parseFileSize(fileSize),
      file_type: fileType,
      file_extension: fileExtension,
      author_name: authorName,
      description: cardTitle,
      created_at: new Date().toISOString()
    };

    // Debug reduzido
    console.log('Created attachment data:', { file_path: attachmentData.file_path });

    // Função para tentar encontrar o arquivo correto baseado no nome
    const findCorrectFilePath = (fileName: string, cardTitle: string) => {
      // Baseado nos arquivos que vimos no storage, tentar encontrar o padrão correto
      const sanitizedCardTitle = cardTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      
      // Tentar diferentes variações baseadas nos arquivos reais
      const variations = [
        `${sanitizedCardTitle}/${sanitizedFileName}`, // ANTONIO_BOZUTT/FICHA_CNPJ___2_.pdf
        `card-attachments/${sanitizedCardTitle}/${sanitizedFileName}`, // card-attachments/ANTONIO_BOZUTT/FICHA_CNPJ___2_.pdf
        sanitizedFileName, // FICHA_CNPJ___2_.pdf
        `card-attachments/${sanitizedFileName}`, // card-attachments/FICHA_CNPJ___2_.pdf
        `${cardTitle}/${fileName}`, // ANTONIO BOZUTT/FICHA CNPJ  (2).pdf
        `card-attachments/${cardTitle}/${fileName}` // card-attachments/ANTONIO BOZUTT/FICHA CNPJ  (2).pdf
      ];
      
      // Debug reduzido
      console.log('Finding file path for:', { fileName, cardTitle });
      
      return variations[1]; // Retornar o segundo (com prefixo card-attachments) como padrão
    };

    // Tentar encontrar o caminho correto
    const correctFilePath = findCorrectFilePath(fileName, cardTitle);
    attachmentData.file_path = correctFilePath;

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Arquivo anexado:
        </div>
        <AttachmentCard 
          attachment={attachmentData}
          onDownload={onDownloadAttachment}
          onDelete={onDeleteAttachment}
        />
      </div>
    );
  }

  // REMOVIDO: Fallback que criava anexos fantasma
  // Agora só mostra anexos que realmente existem no banco de dados
  // Se o anexo foi deletado, não mostra nada (comportamento correto)

  // Se não for um comentário de anexo, renderizar como texto normal
  // Mas também verificar se há anexos no array attachments
  const hasAttachments = attachments && attachments.length > 0;
  
  return (
    <div className="space-y-2">
      <div className="text-sm whitespace-pre-wrap">
        {content}
      </div>
      
      {/* Renderizar anexos do array attachments */}
      {hasAttachments && (
        <div className="space-y-2 mt-3">
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onDownload={onDownloadAttachment}
              onDelete={onDeleteAttachment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Função auxiliar para converter tamanho de arquivo
function parseFileSize(sizeString: string): number {
  const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(Bytes|KB|MB|GB)/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'BYTES': return value;
    case 'KB': return value * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    default: return 0;
  }
}
