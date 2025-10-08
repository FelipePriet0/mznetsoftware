import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CardAttachment } from '@/hooks/useAttachments';

interface DeleteAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: CardAttachment | null;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteAttachmentDialog({ 
  open, 
  onOpenChange, 
  attachment, 
  onConfirm,
  isDeleting = false 
}: DeleteAttachmentDialogProps) {
  if (!attachment) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Anexo</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o anexo <strong>"{attachment.file_name}"</strong>?
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
            </span>
            <br />
            <span className="text-sm text-muted-foreground">
              Clique em "Confirmar exclusão" para prosseguir.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isDeleting}
            className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
          >
            {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
