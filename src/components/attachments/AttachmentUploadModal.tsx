import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, FileIcon } from 'lucide-react';
import { UploadAttachmentData } from '@/hooks/useAttachments';
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

interface AttachmentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (data: UploadAttachmentData) => Promise<void>;
  isUploading: boolean;
  cardId: string;
}

export function AttachmentUploadModal({ 
  open, 
  onClose, 
  onUpload, 
  isUploading,
  cardId 
}: AttachmentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<{[key: string]: string}>({});
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip', 'application/x-rar-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de arquivo não permitido. Tipos aceitos: imagens, PDF, documentos, planilhas, texto e arquivos compactados.');
      return;
    }

    // Check if file already exists
    const fileExists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
    if (fileExists) {
      alert('Este arquivo já foi selecionado.');
      return;
    }

    setSelectedFiles(prev => [...prev, file]);
    
    // NÃO gerar nome padrão - campo deve vir vazio para o usuário preencher
    setFileNames(prev => ({ ...prev, [file.name]: '' }));
    setHasChanges(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => handleFileSelect(file));
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFileSelect(file));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    // Validar se todos os arquivos têm nomes
    const missingNames = selectedFiles.filter(file => !fileNames[file.name]?.trim());
    if (missingNames.length > 0) {
      alert('Por favor, dê um nome para todos os arquivos antes de enviar.');
      return;
    }

    try {
      // Upload each file
      for (const file of selectedFiles) {
        const customFileName = fileNames[file.name]?.trim() || file.name;
        await onUpload({
          file: file,
          description: description.trim() || undefined,
          customFileName: customFileName
        });
      }
      
      // Reset form
      setSelectedFiles([]);
      setFileNames({});
      setDescription('');
      setHasChanges(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Fechar modal após upload bem-sucedido
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
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
      'rar': '📦'
    };
    return iconMap[extension] || '📎';
  };

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Remover também o nome do arquivo
    if (fileToRemove) {
      setFileNames(prev => {
        const newNames = { ...prev };
        delete newNames[fileToRemove.name];
        return newNames;
      });
    }
    
    setHasChanges(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setHasChanges(true);
  };

  const handleFileNameChange = (fileName: string, newName: string) => {
    setFileNames(prev => ({ ...prev, [fileName]: newName }));
    setHasChanges(true);
  };

  const handleCloseRequest = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setDescription('');
    setHasChanges(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    handleClose();
  };

  const handleSaveAndClose = async () => {
    if (selectedFiles.length > 0) {
      await handleUpload();
    }
    setShowConfirmDialog(false);
    handleClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Anexar Arquivo
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseRequest}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div>
            <Label>Selecionar Arquivo / Foto</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFiles.length > 0 ? (
                <div className="space-y-3">
                  {/* Lista de arquivos selecionados */}
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFileIcon(file.name)}</span>
                          <div>
                            <div className="font-medium text-sm">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Campo para nome personalizado */}
                      <div>
                        <Label htmlFor={`fileName-${index}`} className="text-xs text-muted-foreground">
                          Nome do documento (obrigatório):
                        </Label>
                        <Input
                          id={`fileName-${index}`}
                          value={fileNames[file.name] || ''}
                          onChange={(e) => handleFileNameChange(file.name, e.target.value)}
                          placeholder="Ex: CNH do titular, Comprovante de renda, etc."
                          className="text-sm border-[#018942] text-[#018942] placeholder:text-[#018942]/70"
                          required
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Botão para adicionar mais arquivos */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed border-2 border-[#018942] text-[#018942] hover:bg-[#018942]/10"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Outro arquivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    Arraste um arquivo aqui ou{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline"
                    >
                      clique para selecionar
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Máximo: 10MB • Tipos: Imagens, PDF, Documentos, Planilhas
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              className="hidden"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Ex: Enviou CNH consta CPF + Comprovante (Conta Cemig) no nome de XX: confere end Venc XX/XX, consta CPF: 000.000.000-00"
              value={description}
              onChange={handleDescriptionChange}
              rows={3}
              className="border-[#018942] text-[#018942] placeholder:text-[#018942]/70"
            />
          </div>

          {/* Validação de nomes */}
          {selectedFiles.length > 0 && (
            <div className="text-sm">
              {selectedFiles.some(file => !fileNames[file.name]?.trim()) ? (
                <div className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  ⚠️ Por favor, dê um nome para todos os arquivos antes de enviar.
                </div>
              ) : (
                <div className="text-green-600 bg-green-50 p-2 rounded border border-green-200">
                  ✅ Todos os arquivos têm nomes definidos.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleCloseRequest} 
              disabled={isUploading}
              className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0 || isUploading}
              className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Anexar {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            Você fez alterações neste formulário. Se fechar agora, as alterações serão perdidas.
            Deseja salvar antes de fechar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleConfirmClose}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
          >
            Descartar alterações
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSaveAndClose}
            className="bg-[#018942] hover:bg-[#018942]/90 text-white border-[#018942] hover:border-[#018942]/90"
          >
            Salvar e fechar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
