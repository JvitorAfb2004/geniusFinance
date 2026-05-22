import React, { useState, useEffect, useCallback } from 'react';
import { useFinance } from '../hooks/useFinance';
import { apiFetch } from '../lib/api';
import { calculateSubscriptionPrice, formatPriceFromCents } from '../lib/subscriptionService';
import { PixQRCode } from './PixQRCode';
import { CreditCard, QrCode, Loader2, AlertTriangle, ShieldCheck, Building2, Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface SubData {
  status?: string;
  paymentMethod?: string;
  totalAmount?: number;
  trialExpiresAt?: string;
  currentPeriodEnd?: string;
  pendingPix?: {
    brCode: string;
    brCodeBase64: string;
    expiresAt: string;
  } | null;
}

interface TrialData {
  status?: string;
  expiresAt?: string;
}

export function SubscriptionView() {
  const { accounts } = useFinance();
  const [sub, setSub] = useState<SubData | null>(null);
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pixResult, setPixResult] = useState<any>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/sub/status');
      setSub(res.data?.subscription || null);
      setTrial(res.data?.trial || null);
    } catch {
      // Silencioso: subscription pode não existir ainda
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSubscribe = async (method: 'CARD' | 'PIX') => {
    setError('');
    setActionLoading(true);
    try {
      const prices = calculateSubscriptionPrice(
        ['BUSINESS'],
        accounts.length > 0 ? accounts.length - 1 : 0,
        0
      );

      const res = await apiFetch('/api/sub/create', {
        method: 'POST',
        body: JSON.stringify({ items: prices.items, paymentMethod: method }),
      });

      if (method === 'CARD' && res.data?.url) {
        window.location.href = res.data.url;
      } else if (method === 'PIX') {
        setPixResult(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar assinatura');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Deseja cancelar sua assinatura? O acesso será mantido até o fim do período atual.')) return;
    setActionLoading(true);
    try {
      await apiFetch('/api/sub/cancel', { method: 'POST' });
      setSub(prev => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  const isActive = sub?.status === 'active';
  const isTrial = sub?.status === 'trial' || trial?.status === 'active';
  const isPastDue = sub?.status === 'past_due';
  const isCancelled = sub?.status === 'cancelled';
  const hasPaymentMethod = !!sub?.paymentMethod;

  return (
    <div className="w-full max-w-5xl flex flex-col gap-6">
      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)]">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Sua Assinatura</h2>
        <p className="text-sm text-gray-500 mb-4">Gerencie seu plano GeniusHub</p>

        <div className={cn(
          "p-4 rounded-lg border",
          isActive ? "border-emerald-200 bg-emerald-50" :
          isTrial ? "border-amber-200 bg-amber-50" :
          isPastDue ? "border-red-200 bg-red-50" :
          isCancelled ? "border-gray-200 bg-gray-50" :
          "border-blue-200 bg-blue-50"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {isActive ? 'Plano Ativo' :
                 isTrial ? 'Trial (7 dias grátis)' :
                 isPastDue ? 'Pagamento Pendente' :
                 isCancelled ? 'Cancelada' :
                 'Sem assinatura ativa'}
              </p>
              {sub?.totalAmount ? (
                <p className="text-sm text-gray-600">{formatPriceFromCents(sub.totalAmount)}/mês</p>
              ) : (
                <p className="text-sm text-gray-500">R$29,90/mês (Empresa)</p>
              )}
              {isTrial && trial?.expiresAt && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Expira em {new Date(trial.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              )}
              {isActive && sub?.currentPeriodEnd && (
                <p className="text-xs text-emerald-600 mt-1">
                  Próxima renovação: {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </p>
              )}
              {isPastDue && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Regularize para não perder o acesso
                </p>
              )}
            </div>

            {isActive && hasPaymentMethod && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                {sub.paymentMethod === 'CARD' ? (
                  <><CreditCard className="w-3.5 h-3.5" /> Cartão</>
                ) : (
                  <><QrCode className="w-3.5 h-3.5" /> PIX</>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, text: 'Pessoal incluso grátis' },
            { icon: Building2, text: '1 membro grátis por empresa' },
            { icon: Users, text: '+R$4,90/mês por membro extra' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <item.icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {item.text}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          {(isActive || isTrial) && (
            <button onClick={handleCancel} disabled={actionLoading}
              className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50">
              Cancelar Assinatura
            </button>
          )}
        </div>
      </div>

      {/* Subscribe CTA (if no active plan) */}
      {!isActive && !isTrial && !isPastDue && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)]">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Escolha seu plano</h3>
          <p className="text-sm text-gray-500 mb-4">Plano Empresa R$29,90/mês — inclui Pessoal grátis.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => handleSubscribe('CARD')} disabled={actionLoading}
              className="p-6 border-2 border-slate-100 rounded-2xl hover:border-[#3b82f6] hover:shadow-[0_1px_4px_rgba(59,130,246,0.1)] transition-colors cursor-pointer text-left disabled:opacity-50">
              <CreditCard className="w-8 h-8 text-[#3b82f6] mb-3" />
              <p className="font-semibold text-gray-900">Cartão de Crédito</p>
              <p className="text-xs text-gray-500 mt-1">Assinatura recorrente automática. Cancele quando quiser.</p>
            </button>

            <button onClick={() => handleSubscribe('PIX')} disabled={actionLoading}
              className="p-6 border-2 border-slate-100 rounded-2xl hover:border-[#3b82f6] hover:shadow-[0_1px_4px_rgba(59,130,246,0.1)] transition-colors cursor-pointer text-left disabled:opacity-50">
              <QrCode className="w-8 h-8 text-[#3b82f6] mb-3" />
              <p className="font-semibold text-gray-900">PIX</p>
              <p className="text-xs text-gray-500 mt-1">QR Code gerado a cada vencimento. Pague no app do seu banco.</p>
            </button>
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
      )}

      {/* PIX Result (QR Code) */}
      {pixResult && (
        <PixQRCode
          brCode={pixResult.brCode}
          brCodeBase64={pixResult.brCodeBase64}
          expiresAt={pixResult.expiresAt}
          amount={pixResult.amount}
        />
      )}

      {/* PIX Pending (from existing sub) */}
      {isActive && sub?.pendingPix && !pixResult && (
        <PixQRCode
          brCode={sub.pendingPix.brCode}
          brCodeBase64={sub.pendingPix.brCodeBase64}
          expiresAt={sub.pendingPix.expiresAt}
        />
      )}
    </div>
  );
}
