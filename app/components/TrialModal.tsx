import React from 'react';
import { X, Clock, ArrowRight } from 'lucide-react';

interface Props {
  daysLeft: number;
  onClose: () => void;
  onSubscribe: () => void;
}

export function TrialModal({ daysLeft, onClose, onSubscribe }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#f97316] p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold">Período de Teste</h2>
          <p className="text-white/80 text-sm mt-1">
            {daysLeft > 0
              ? `Faltam ${daysLeft} dia(s) para o fim do seu teste gratuito.`
              : 'Seu teste gratuito está acabando!'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="space-y-3 mb-6">
            {[
              'Acesso completo a todos os módulos',
              'Dashboard financeiro ilimitado',
              'Gestão de projetos e leads',
              'Relatórios e DRE',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500 mb-4 text-center">
            Após o período de teste, assine o plano Empresa por <strong>R$29,90/mês</strong> para continuar usando.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onSubscribe}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Assinar Agora
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 cursor-pointer"
            >
              Continuar testando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
