import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmCreateModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmCreateModal({ open, onClose, onConfirm }: ConfirmCreateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Criar Nova Ficha</DialogTitle>
              <DialogDescription className="mt-1">
                Você está prestes a iniciar o processo de criação de uma nova ficha comercial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>O que acontecerá:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Primeiro, você preencherá os dados pessoais básicos</li>
            <li>Depois, completará todas as demais informações</li>
            <li>Suas informações serão salvas automaticamente</li>
            <li>Se a ficha fechar acidentalmente, ela será preservada no status "Recebido"</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="bg-[#018942] text-white hover:-translate-y-0.5 hover:shadow-[0_10px_18px_rgba(0,0,0,0.25)]">
            Sim, Criar Ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
