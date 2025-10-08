import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Download, Eye, ArrowUpRight, Lock, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { canDownloadAttachment, canDeleteAttachment } from '@/lib/access';
import { useToast } from '@/hooks/use-toast';

interface AttachmentCardProps {
  attachment: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    file_extension: string;
    author_name: string;
    author_id?: string; // ID do autor para verificar permissÃµes
    description?: string;
    created_at?: string;
    possible_paths?: string[]; // Caminhos alternativos para tentar
  };
  // Removido sistema de empresas - todos podem acessar anexos
  onDownload: (filePath: string, fileName: string) => void;
  onPreview?: (filePath: string, fileName: string) => void;
  onDelete?: (attachmentId: string, filePath: string) => void;
}

const getFileIcon = (extension: string) => {
  switch (extension.toLowerCase()) {
    case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return <FileText className="h-4 w-4 text-blue-500" />;
    case 'doc':
    case 'docx': return <FileText className="h-4 w-4 text-blue-700" />;
    case 'xls':
    case 'xlsx': return <FileText className="h-4 w-4 text-green-700" />;
    default: return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora mesmo';
  if (diffInMinutes < 60) return `HÃ¡ ${diffInMinutes} minutos`;
  if (diffInMinutes < 1440) return `HÃ¡ ${Math.floor(diffInMinutes / 60)} horas`;
  return `HÃ¡ ${Math.floor(diffInMinutes / 1440)} dias`;
};

export function AttachmentCard({ attachment, onDownload, onPreview, onDelete }: AttachmentCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Verificar permissÃµes (sistema Ãºnico de empresa)
  const canDownload = canDownloadAttachment(
    profile, 
    attachment.author_id, 
    profile?.id
  );

  const canDelete = canDeleteAttachment(
    profile, 
    attachment.author_id, 
    profile?.id
  );

  // Debug: verificar dados do attachment e permissÃµes
  console.log('AttachmentCard received data:', attachment);
  console.log('attachment.file_path:', attachment.file_path);
  console.log('attachment.file_name:', attachment.file_name);
  console.log('Permissions:', { canDownload, canDelete, profile: profile?.role });

  // FunÃ§Ã£o para buscar URL do PDF usando o mesmo sistema de download que funciona
  const getPdfUrl = async (filePath: string) => {
    try {
      setIsLoadingPdf(true);
      console.log('Getting PDF URL for preview:', filePath);

      // Usar a funÃ§Ã£o standalone exportada
      const { getDownloadUrl } = await import('@/hooks/useAttachments');
      
      // Usar a mesma funÃ§Ã£o que funciona para download
      const url = await getDownloadUrl(filePath);
      
      if (url) {
        console.log('âœ… PDF URL found for preview:', url);
        return url;
      } else {
        console.log('âŒ PDF not found for preview');
        return null;
      }
    } catch (error) {
      console.error('Error getting PDF URL for preview:', error);
      return null;
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Buscar URL do PDF quando abrir o preview
  useEffect(() => {
    if (showPreview && attachment.file_extension.toLowerCase() === 'pdf' && !pdfUrl) {
      getPdfUrl(attachment.file_path).then(setPdfUrl);
    }
  }, [showPreview, attachment.file_path, attachment.file_extension, pdfUrl]);

  const handlePreview = () => {
    if (onPreview) {
      onPreview(attachment.file_path, attachment.file_name);
    } else {
      setShowPreview(true);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    // Limpar URL do PDF quando fechar para liberar memÃ³ria
    setPdfUrl(null);
  };

  const handleDownload = () => {
    console.log('=== ATTACHMENT CARD DOWNLOAD ===');
    console.log('Download attempt:', {
      file_path: attachment.file_path,
      file_name: attachment.file_name,
      full_attachment: attachment
    });
    console.log('file_path type:', typeof attachment.file_path);
    console.log('file_path value:', attachment.file_path);
    
    if (!attachment.file_path) {
      console.error('File path not available for download');
      return;
    }
    onDownload(attachment.file_path, attachment.file_name);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) {
      toast({
        title: "Erro",
        description: "FunÃ§Ã£o de exclusÃ£o nÃ£o disponÃ­vel",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(attachment.id, attachment.file_path);
      toast({
        title: "Sucesso",
        description: "Anexo excluÃ­do com sucesso",
      });
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir anexo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow",
        "dark:bg-gray-800 dark:border-gray-600"
      )}>
        {/* Lado esquerdo - BotÃ£o PDF e nome do arquivo */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {canDownload ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              className="h-8 px-3 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-500 dark:text-gray-300 shadow-sm"
            >
              {getFileIcon(attachment.file_extension)}
              <span className="ml-1 font-medium text-xs">{attachment.file_extension.toUpperCase()}</span>
            </Button>
          ) : (
            <div className="h-8 px-3 bg-gray-100 border border-gray-300 rounded-md flex items-center gap-2 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400">
              <Lock className="h-4 w-4" />
              <span className="font-medium text-xs">{attachment.file_extension.toUpperCase()}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {attachment.file_name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Adicionado hÃ¡ {formatTimeAgo(attachment.created_at || new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* Lado direito - BotÃµes de aÃ§Ã£o */}
        <div className="flex items-center gap-2">
          {canDownload ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
              title="Baixar arquivo"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="h-8 w-8 p-0 text-gray-400 dark:text-gray-500 flex items-center justify-center" title="Sem permissÃ£o para baixar">
              <Lock className="h-4 w-4" />
            </div>
          )}
          
          {/* Menu dos 3 pontinhos com opÃ§Ã£o de excluir */}
          {canDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                  title="Mais opÃ§Ãµes"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={handleDeleteClick}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir anexo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="h-8 w-8 p-0 text-gray-300 dark:text-gray-600 flex items-center justify-center" title="Sem permissÃ£o para excluir">
              <MoreVertical className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Modal de Preview */}
      <Dialog open={showPreview} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              PrÃ©-visualizaÃ§Ã£o: {attachment.file_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {attachment.file_extension.toLowerCase() === 'pdf' ? (
              <div className="w-full h-[70vh] border rounded-lg bg-gray-50 dark:bg-gray-800">
                {isLoadingPdf ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p>Carregando PDF...</p>
                    </div>
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full rounded-lg"
                    title={`Preview of ${attachment.file_name}`}
                    onError={() => {
                      console.error('Error loading PDF in iframe');
                      setPdfUrl(null);
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <FileText className="h-16 w-16 mx-auto mb-4" />
                      <p>Erro ao carregar PDF</p>
                      <p className="text-sm">Clique em "Baixar" para abrir o arquivo</p>
                      <Button 
                        onClick={() => getPdfUrl(attachment.file_path).then(setPdfUrl)}
                        className="mt-4"
                        variant="outline"
                        size="sm"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-96 border rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FileText className="h-16 w-16 mx-auto mb-4" />
                  <p>PrÃ©-visualizaÃ§Ã£o nÃ£o disponÃ­vel para este tipo de arquivo</p>
                  <p className="text-sm">Clique em "Baixar" para abrir o arquivo</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClosePreview}>
              Fechar
            </Button>
            {canDownload ? (
              <Button onClick={handleDownload} className="bg-[#018942] hover:bg-[#018942]/90 text-white">
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-sm">
                <Lock className="h-4 w-4" />
                Sem permissÃ£o para baixar
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de ConfirmaÃ§Ã£o Dupla para ExclusÃ£o */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Excluir Anexo
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir o anexo <strong>"{attachment.file_name}"</strong>?</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                âš ï¸ Esta aÃ§Ã£o nÃ£o pode ser desfeita. O arquivo serÃ¡ removido permanentemente.
              </p>
              <p className="text-sm font-medium">
                Clique em "Confirmar ExclusÃ£o" para prosseguir.
              </p>
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
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar ExclusÃ£o
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}