import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IdCard, Building2, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface PersonTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: "pf" | "pj") => void;
}

export function PersonTypeModal({ open, onClose, onSelect }: PersonTypeModalProps) {
  // atalhos de teclado: P para PF, J para PJ
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') onSelect('pf');
      if (e.key.toLowerCase() === 'j') onSelect('pj');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onSelect]);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden">
        {/* Banner com gradiente */}
        <div className="px-6 py-4" style={{ backgroundImage: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}>
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Qual tipo de ficha deseja criar?</DialogTitle>
          </DialogHeader>
          <p className="mt-1 text-white/90 text-sm">Escolha o tipo de pessoa para iniciarmos a criação da ficha.</p>
        </div>

        {/* Cards de seleção ousados */}
        <div className="p-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect('pf')}
            className="group relative rounded-2xl border-2 border-[#018942] bg-white p-5 text-left transition-all hover:-translate-y-[2px] hover:shadow-[0_16px_32px_rgba(0,0,0,0.20)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(1,137,66,0.25)]"
          >
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-12 w-12 rounded-full border-2 border-[#018942] text-[#018942]">
                <IdCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#018942]">CPF • Pessoa Física</h3>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-[#018942]/70 group-hover:translate-x-0.5 transition-transform" />
            </div>
            
          </button>

          <button
            type="button"
            onClick={() => onSelect('pj')}
            className="group relative rounded-2xl border-2 border-[#018942] bg-white p-5 text-left transition-all hover:-translate-y-[2px] hover:shadow-[0_16px_32px_rgba(0,0,0,0.20)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(1,137,66,0.25)]"
          >
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-12 w-12 rounded-full border-2 border-[#018942] text-[#018942]">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#018942]">CNPJ • Pessoa Jurídica</h3>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-[#018942]/70 group-hover:translate-x-0.5 transition-transform" />
            </div>
            
          </button>
        </div>

        
      </DialogContent>
    </Dialog>
  );
}

export default PersonTypeModal;
