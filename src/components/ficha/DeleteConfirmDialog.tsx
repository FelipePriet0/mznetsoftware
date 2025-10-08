import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  customerName: string;
  customerCpf: string;
}

export function DeleteConfirmDialog({ 
  open, 
  onClose, 
  onConfirm, 
  customerName,
  customerCpf 
}: DeleteConfirmDialogProps) {
  const [step, setStep] = useState<'first' | 'second'>('first');
  const [reason, setReason] = useState('');

  // Monitorar mudanças no estado
  useEffect(() => {
    console.log('🎭 [DEBUG] Estado mudou:', { step, reason, open });
  }, [step, reason, open]);


  const handleSecondConfirm = () => {
    console.log('✅ [DEBUG] Segunda etapa: clicou "Confirmar Exclusão" - motivo:', reason.trim() || 'SEM MOTIVO');
    onConfirm(reason.trim() || undefined);
    setStep('first');
    setReason('');
  };

  const handleCancel = () => {
    setStep('first');
    setReason('');
    onClose();
  };

  console.log('🎭 [DEBUG] DeleteConfirmDialog renderizando - step:', step, 'open:', open);

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step === 'first' ? 'Deletar Ficha' : 'Confirmação Final'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {step === 'first' ? (
                <>
                  <p>Você deseja deletar esta ficha?</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p><strong>Cliente:</strong> {customerName}</p>
                    <p><strong>CPF:</strong> {customerCpf}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A ficha será movida para o histórico de fichas excluídas.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-destructive font-medium">
                    Tem certeza que deseja apagar esta ficha?
                  </p>
                  <p className="text-sm">
                    Esta ação não pode ser desfeita. A ficha será permanentemente removida do sistema e movida para o histórico de exclusões.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-reason">
                      Motivo da exclusão (opcional)
                    </Label>
                    <Input
                      id="delete-reason"
                      placeholder="Digite o motivo da exclusão..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="placeholder:text-green-600 text-green-600"
                    />
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} className="bg-gray-500 text-white hover:bg-gray-600">
            Cancelar
          </AlertDialogCancel>
          {step === 'first' ? (
            <button 
              onClick={() => {
                console.log('🔄 [DEBUG] Primeira etapa: clicou "Sim, Deletar" - indo para segunda etapa');
                setStep('second');
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-3 font-medium text-base"
              style={{ borderRadius: '30px' }}
            >
              Sim, Deletar
            </button>
          ) : (
            <AlertDialogAction onClick={handleSecondConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}