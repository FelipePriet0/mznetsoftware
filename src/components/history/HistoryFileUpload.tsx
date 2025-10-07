import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HistoryFileUploadProps {
  onUploadSuccess: () => void;
}

export function HistoryFileUpload({ onUploadSuccess }: HistoryFileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de arquivo
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(selectedFile.type) && 
          !selectedFile.name.endsWith('.csv') && 
          !selectedFile.name.endsWith('.xlsx') && 
          !selectedFile.name.endsWith('.xls')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Apenas arquivos CSV e Excel são aceitos.",
          variant: "destructive",
        });
        return;
      }

      // Validar tamanho (máximo 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione um arquivo antes de fazer o upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `inadimplencia_${timestamp}_${file.name}`;

      // Upload para o bucket imports
      const { error: uploadError } = await supabase.storage
        .from('imports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Registrar o upload (opcional - para auditoria)
      const { error: logError } = await supabase
        .from('payments_imports')
        .insert({
          source: fileName,
          row: {
            original_name: file.name,
            size: file.size,
            type: file.type,
            uploaded_at: new Date().toISOString()
          }
        });

      if (logError) {
        console.warn('Erro ao registrar log do upload:', logError);
        // Não falha a operação se o log der erro
      }

      toast({
        title: "Upload realizado com sucesso",
        description: "O arquivo de inadimplência foi enviado e será processado em breve.",
      });

      setIsOpen(false);
      setFile(null);
      onUploadSuccess();

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Importar Inadimplência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Dados de Inadimplência
          </DialogTitle>
          <DialogDescription>
            Envie uma planilha CSV ou Excel com os dados de inadimplência para gerar insights automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato esperado:</strong> Colunas CPF, Data de Referência, Valor, Status.
              Arquivos até 10MB são aceitos.
            </AlertDescription>
          </Alert>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">Arquivo</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
            >
              {uploading ? "Enviando..." : "Enviar Arquivo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}