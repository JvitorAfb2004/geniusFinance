import React, { useState } from 'react';
import { Copy, Check, Clock } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';

interface Props {
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  amount?: number;
}

export function PixQRCode({ brCode, brCodeBase64, expiresAt, amount }: Props) {
  const [copied, setCopied] = useState(false);
  const expiresDate = new Date(expiresAt);
  const isExpired = expiresDate < new Date();

  const handleCopy = () => {
    navigator.clipboard.writeText(brCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (isExpired) {
    return (
      <Card className="flex flex-col items-center gap-3 p-6">
        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
        <p className="text-red-500 font-medium text-sm">QR Code expirado</p>
        <p className="text-xs text-gray-500">Um novo QR code será gerado no próximo ciclo de cobrança.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-4 p-6">
      <h3 className="text-lg font-bold text-gray-900">Pague com PIX</h3>

      {amount && (
        <p className="text-2xl font-extrabold text-gray-900">
          {(amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
      )}

      <img
        src={brCodeBase64}
        alt="QR Code PIX"
        className="w-48 h-48 rounded-lg border border-gray-100"
      />

      <p className="text-xs text-gray-500">
        Expira em {expiresDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="flex items-center gap-2 w-full max-w-sm">
        <input
          type="text"
          readOnly
          value={brCode}
          className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none select-all font-mono"
        />
        <Button
          label={copied ? 'Copiado' : 'Copiar'}
          variant="primary"
          onClick={handleCopy}
          icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer shrink-0 transition-colors"
        />
      </div>
    </Card>
  );
}
