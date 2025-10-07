import React from 'react';
import { AttachmentCard } from './AttachmentCard';

interface CommentContentRendererProps {
  content: string;
  attachments: any[];
  onDownloadAttachment: (filePath: string, fileName: string) => void;
  onDeleteAttachment?: (attachmentId: string, filePath: string) => void;
  // Removido sistema de empresas - todos podem acessar anexos
}

// Regex para detectar comentários de anexo no formato antigo
const ATTACHMENT_COMMENT_REGEX = /📎 Anexo adicionado: (.+?)\n📋 Ficha: (.+?)\n📊 Detalhes do arquivo:\n• Tipo: (.+?)\n• Tamanho: (.+?)\n• Extensão: (.+?)\n• Autor: (.+?) \((.+?)\)/s;

// Regex mais flexível para detectar qualquer comentário com emoji de anexo
const FLEXIBLE_ATTACHMENT_REGEX = /📎 Anexo adicionado: (.+?)(?:\n|$)/;

// Regex mais flexível para detectar comentários de anexo
const ATTACHMENT_COMMENT_FLEXIBLE_REGEX = /📎 Anexo adicionado: (.+?)(?:\n|$)/;

export function CommentContentRenderer({ content, attachments, onDownloadAttachment, onDeleteAttachment }: CommentContentRendererProps) {
  // Debug: verificar conteúdo do comentário (apenas se contém anexo)
  if (content.includes('📎')) {
    console.log('CommentContentRenderer processing attachment comment:', { content: content.substring(0, 100) + '...' });
  }
  
  // Verificar se é um comentário de anexo no formato antigo completo
  const attachmentMatch = content.match(ATTACHMENT_COMMENT_REGEX);
  
  if (attachmentMatch) {
    const [, fileName, cardTitle, fileType, fileSize, fileExtension, authorName, authorRole] = attachmentMatch;
    
    // Debug logs reduzidos
    console.log('Processing attachment comment:', { fileName, cardTitle });
    
    // Criar objeto de anexo a partir do comentário
    // Tentar diferentes variações do caminho baseado nos arquivos que vimos no storage
    const possiblePaths = [
      `${cardTitle}/${fileName}`, // CARD_NAME/arquivo.pdf
      `card-attachments/${cardTitle}/${fileName}`, // card-attachments/CARD_NAME/arquivo.pdf
      fileName, // Apenas arquivo.pdf
      `card-attachments/${fileName}` // card-attachments/arquivo.pdf
    ];
    
    const attachmentData = {
      id: `comment-attachment-${Date.now()}`,
      file_name: fileName,
      file_path: possiblePaths[0], // Usar o primeiro como padrão
      possible_paths: possiblePaths, // Adicionar todos os caminhos possíveis
      file_size: parseFileSize(fileSize),
      file_type: fileType,
      file_extension: fileExtension,
      author_name: authorName,
      description: cardTitle,
      created_at: new Date().toISOString()
    };

    // Debug reduzido
    console.log('Created attachment data:', { file_path: attachmentData.file_path });

    // Função para tentar encontrar o arquivo correto baseado no nome
    const findCorrectFilePath = (fileName: string, cardTitle: string) => {
      // Baseado nos arquivos que vimos no storage, tentar encontrar o padrão correto
      const sanitizedCardTitle = cardTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      
      // Tentar diferentes variações baseadas nos arquivos reais
      const variations = [
        `${sanitizedCardTitle}/${sanitizedFileName}`, // ANTONIO_BOZUTT/FICHA_CNPJ___2_.pdf
        `card-attachments/${sanitizedCardTitle}/${sanitizedFileName}`, // card-attachments/ANTONIO_BOZUTT/FICHA_CNPJ___2_.pdf
        sanitizedFileName, // FICHA_CNPJ___2_.pdf
        `card-attachments/${sanitizedFileName}`, // card-attachments/FICHA_CNPJ___2_.pdf
        `${cardTitle}/${fileName}`, // ANTONIO BOZUTT/FICHA CNPJ  (2).pdf
        `card-attachments/${cardTitle}/${fileName}` // card-attachments/ANTONIO BOZUTT/FICHA CNPJ  (2).pdf
      ];
      
      // Debug reduzido
      console.log('Finding file path for:', { fileName, cardTitle });
      
      return variations[1]; // Retornar o segundo (com prefixo card-attachments) como padrão
    };

    // Tentar encontrar o caminho correto
    const correctFilePath = findCorrectFilePath(fileName, cardTitle);
    attachmentData.file_path = correctFilePath;

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Arquivo anexado:
        </div>
        <AttachmentCard 
          attachment={attachmentData}
          onDownload={onDownloadAttachment}
          onDelete={onDeleteAttachment}
        />
      </div>
    );
  }

  // Verificar se é um comentário de anexo mais simples (apenas com emoji)
  const simpleAttachmentMatch = content.match(ATTACHMENT_COMMENT_FLEXIBLE_REGEX);
  if (simpleAttachmentMatch) {
    const fileName = simpleAttachmentMatch[1].trim();
    
    // Tentar extrair informações adicionais do conteúdo
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'file';
    
    // Tentar extrair o título do card do conteúdo
    const cardTitleMatch = content.match(/📋 Ficha: (.+?)(?:\n|$)/);
    const cardTitle = cardTitleMatch ? cardTitleMatch[1].trim() : 'Card';
    
    const attachmentData = {
      id: `comment-attachment-${Date.now()}`,
      file_name: fileName,
      file_path: `${cardTitle}/${fileName}`, // Tentar recriar o caminho
      file_size: 0,
      file_type: `application/${fileExtension}`,
      file_extension: fileExtension,
      author_name: 'Sistema',
      description: cardTitle,
      created_at: new Date().toISOString()
    };

    // Debug reduzido
    console.log('Created simple attachment:', { file_name: attachmentData.file_name });

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Arquivo anexado:
        </div>
        <AttachmentCard 
          attachment={attachmentData}
          onDownload={onDownloadAttachment}
          onDelete={onDeleteAttachment}
        />
      </div>
    );
  }

  // Se não for um comentário de anexo, renderizar como texto normal
  // Mas também verificar se há anexos no array attachments
  const hasAttachments = attachments && attachments.length > 0;
  
  return (
    <div className="space-y-2">
      <div className="text-sm whitespace-pre-wrap">
        {content}
      </div>
      
      {/* Renderizar anexos do array attachments */}
      {hasAttachments && (
        <div className="space-y-2 mt-3">
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onDownload={onDownloadAttachment}
              onDelete={onDeleteAttachment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Função auxiliar para converter tamanho de arquivo
function parseFileSize(sizeString: string): number {
  const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(Bytes|KB|MB|GB)/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'BYTES': return value;
    case 'KB': return value * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    default: return 0;
  }
}