import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';

interface ObservationsTextareaProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  onAttachmentClick?: () => void;
}

export function ObservationsTextarea({ 
  name, 
  value, 
  onChange, 
  className = "", 
  placeholder = "",
  onAttachmentClick 
}: ObservationsTextareaProps) {
  return (
    <div className="relative">
      <Textarea
        name={name}
        value={value}
        onChange={onChange}
        className={`${className} pl-12`} // Adiciona padding à esquerda para o botão
        placeholder={placeholder}
      />
      
      {/* Botão Anexo integrado dentro do textarea */}
      {onAttachmentClick && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAttachmentClick}
          className="absolute top-2 left-2 h-8 w-8 p-0 bg-[#018942] hover:bg-[#018942]/90 text-white hover:text-white"
          title="Anexar arquivo ou foto"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
