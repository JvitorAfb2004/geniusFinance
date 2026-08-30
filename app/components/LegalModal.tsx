import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Card } from '@astryxdesign/core/Card';

interface Props {
  title: string;
  content: string;
  onClose: () => void;
}

export default function LegalModal({ title, content, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[5vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
           <IconButton label="Fechar" icon={<X className="w-5 h-5" />} variant="ghost" size="sm" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 shrink-0">
           <Button label="Fechar" variant="primary" size="sm" onClick={onClose} />
        </div>
      </Card>
    </div>
  );
}
