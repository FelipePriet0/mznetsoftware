import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ParecerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'aprovar' | 'negar' | 'reanalisar';
  customerName: string;
  parecer?: string;
  isLoading?: boolean;
}

const actionConfig = {
  aprovar: {
    title: 'Confirmar Aprovação',
    icon: Check,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    buttonText: 'Confirmar Aprovação',
    buttonClass: 'bg-green-600 hover:bg-green-700',
  },
  negar: {
    title: 'Confirmar Negação',
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    buttonText: 'Confirmar Negação',
    buttonClass: 'bg-red-600 hover:bg-red-700',
  },
  reanalisar: {
    title: 'Enviar para Reanálise',
    icon: RotateCcw,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    buttonText: 'Enviar para Reanálise',
    buttonClass: 'bg-orange-600 hover:bg-orange-700',
  },
};

export function ParecerConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  customerName,
  parecer,
  isLoading = false,
}: ParecerConfirmModalProps) {
  const config = actionConfig[action];
  const Icon = config.icon;
  
  // Enhanced parecer validation
  const hasParecer = React.useMemo(() => {
    if (!parecer || typeof parecer !== 'string') return false;
    
    // Try to parse as JSON first (new format)
    try {
      const parsed = JSON.parse(parecer);
      if (Array.isArray(parsed)) {
        return parsed.some(p => p.text && p.text.trim().length > 0);
      }
    } catch {
      // Not JSON, treat as plain string (legacy format)
    }
    
    // Check if plain string has meaningful content
    return parecer.trim().length > 0;
  }, [parecer]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor} ${config.borderColor} border`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {config.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Ficha de {customerName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!hasParecer ? (
            <div className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-sm">Parecer não preenchido</span>
              </div>
              <p className="text-sm text-muted-foreground">
                É necessário preencher o parecer antes de confirmar a análise. 
                Por favor, volte e adicione suas observações na ficha.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Parecer da Análise:</Label>
                <Badge variant="outline" className="text-xs">
                  {getParecerDisplayText(parecer).length} caracteres
                </Badge>
              </div>
              
              <ScrollArea className="h-[120px] w-full rounded-md border p-3">
                <div className="text-sm whitespace-pre-wrap">
                  {getParecerDisplayText(parecer)}
                </div>
              </ScrollArea>
              
              <div className={`p-3 rounded-md ${config.bgColor} ${config.borderColor} border`}>
                <p className="text-sm font-medium mb-1">
                  Confirme sua decisão:
                </p>
                <p className="text-sm text-muted-foreground">
                  Ao confirmar, a ficha será movida para o status "{action}" 
                  com o parecer acima registrado.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          
          <Button
            onClick={onConfirm}
            disabled={!hasParecer || isLoading}
            className={config.buttonClass}
          >
            {isLoading ? "Processando..." : config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to extract display text from parecer
function getParecerDisplayText(parecer?: string): string {
  if (!parecer) return '';
  
  try {
    const parsed = JSON.parse(parecer);
    if (Array.isArray(parsed)) {
      // Get the latest parecer or combine all
      const latestParecer = parsed[parsed.length - 1];
      return latestParecer?.text || '';
    }
  } catch {
    // Not JSON, return as-is
  }
  
  return parecer;
}