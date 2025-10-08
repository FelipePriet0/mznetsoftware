import React, { useState } from 'react';
import { CardAttachment } from '@/hooks/useAttachments';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Eye, 
  Trash2, 
  FileText, 
  Image, 
  File,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeleteAttachmentDialog } from './DeleteAttachmentDialog';

interface AttachmentDisplayProps {
  attachment: CardAttachment;
  onDownload: (filePath: string, fileName: string) => void;
  onDelete: (attachmentId: string) => void;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (extension: string) => string;
}

export function AttachmentDisplay({ 
  attachment, 
  onDownload, 
  onDelete, 
  formatFileSize,
  getFileIcon 
}: AttachmentDisplayProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(attachment.file_extension.toLowerCase());
  
  const handleDownload = () => {
    onDownload(attachment.file_path, attachment.file_name);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(attachment.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting attachment:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* File Icon and Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-2xl flex-shrink-0">
            {getFileIcon(attachment.file_extension)}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* File Name */}
            <div className="font-medium text-sm truncate" title={attachment.file_name}>
              {attachment.file_name}
            </div>
            
            {/* File Size and Extension */}
            <div className="text-xs text-muted-foreground">
              {formatFileSize(attachment.file_size)} â€¢ {attachment.file_extension.toUpperCase()}
            </div>
            
            {/* Description */}
            {attachment.description && (
              <div className="text-xs text-muted-foreground mt-1">
                {attachment.description}
              </div>
            )}
            
            {/* Author and Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <User className="h-3 w-3" />
              <span>{attachment.author_name}</span>
              <span>â€¢</span>
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(attachment.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isImage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
              title="Visualizar imagem"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
            title="Baixar arquivo"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 text-white hover:text-white"
            title="Remover anexo"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal de confirmaÃ§Ã£o de exclusÃ£o */}
      <DeleteAttachmentDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        attachment={attachment}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

interface AttachmentListProps {
  attachments: CardAttachment[];
  onDownload: (filePath: string, fileName: string) => void;
  onDelete: (attachmentId: string) => void;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (extension: string) => string;
}

export function AttachmentList({ 
  attachments, 
  onDownload, 
  onDelete, 
  formatFileSize,
  getFileIcon 
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nenhum anexo encontrado
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <AttachmentDisplay
          key={attachment.id}
          attachment={attachment}
          onDownload={onDownload}
          onDelete={onDelete}
          formatFileSize={formatFileSize}
          getFileIcon={getFileIcon}
        />
      ))}
    </div>
  );
}
