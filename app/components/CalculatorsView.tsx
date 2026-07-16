import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calculator, TrendingUp, CreditCard, Home } from 'lucide-react';

function formatTooltipCurrency(value: unknown) {
  const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
}

type CalcTab = 'INVESTMENT' | 'FINANCING' | 'INSTALLMENT';

export default function CalculatorsView() {
  const [tab, setTab] = useState<CalcTab>('INVESTMENT');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Calculadora Financeira</h2>
        <p className="text-sm text-slate-500">Simule investimentos, financiamentos e parcelamentos.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'INVESTMENT' as const, label: 'Investimento', icon: TrendingUp },
          { id: 'FINANCING' as const, label: 'Financiamento', icon: Home },
          { id: 'INSTALLMENT' as const, label: 'Parcelamento', icon: CreditCard },
        ]).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setTab(opt.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors ${
              tab === opt.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <opt.icon className="w-4 h-4" />
            {opt.label}
          </button>
        ))}
      </div>

      {tab === 'INVESTMENT' && <InvestmentCalc />}
      {tab === 'FINANCING' && <FinancingCalc />}
      {tab === 'INSTALLMENT' && <InstallmentCalc />}
    </div>
  );
}

function InvestmentCalc() {
  const [initial, setInitial] = useState('1000');
  const [monthly, setMonthly] = useState('500');
  const [rate, setRate] = useState('12');
  const [years, setYears] = useState('10');

  const pInitial = parseFloat(initial) || 0;
  const pMonthly = parseFloat(monthly) || 0;
  const pRate = (parseFloat(rate) || 0) / 100;
  const pYears = parseInt(years) || 1;
  const monthlyRate = pRate / 12;
  const months = pYears * 12;

  const result = useMemo(() => {
    let total = pInitial;
    const data = [];
    let totalInvested = pInitial;
    for (let i = 0; i <= months; i++) {
      if (i > 0) {
        total = total * (1 + monthlyRate) + pMonthly;
        totalInvested += pMonthly;
      }
      if (i % Math.max(Math.floor(months / 12), 1) === 0 || i === months) {
        data.push({
          mes: i,
          montante: Math.round(total * 100) / 100,
          investido: Math.round(totalInvested * 100) / 100,
        });
      }
    }
    return { final: total, invested: totalInvested, profit: total - totalInvested, data };
  }, [pInitial, pMonthly, monthlyRate, months]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="clay p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Valor inicial (R$)" value={initial} onChange={setInitial} />
          <InputField label="Aporte mensal (R$)" value={monthly} onChange={setMonthly} />
          <InputField label="Taxa anual (%)" value={rate} onChange={setRate} />
          <InputField label="Prazo (anos)" value={years} onChange={setYears} />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
          <ResultCard label="Total Investido" value={result.invested} color="text-slate-700" />
          <ResultCard label="Rendimento" value={result.profit} color="text-emerald-600" />
          <ResultCard label="Montante Final" value={result.final} color="text-blue-600" />
        </div>
      </div>
      <div className="clay p-5 min-w-0">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Evolucao do Patrimonio</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.floor(v / 12)}a`} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${((v as number) / 1000).toFixed(0)}k`} />
              <Tooltip formatter={formatTooltipCurrency} labelFormatter={(l) => `Mês ${l}`} />
              <Line type="monotone" dataKey="montante" stroke="#5b7def" strokeWidth={2} name="Montante" dot={false} />
              <Line type="monotone" dataKey="investido" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Investido" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function FinancingCalc() {
  const [amount, setAmount] = useState('200000');
  const [rate, setRate] = useState('10');
  const [years, setYears] = useState('30');

  const pAmount = parseFloat(amount) || 0;
  const pRate = (parseFloat(rate) || 0) / 100;
  const pYears = parseInt(years) || 1;
  const months = pYears * 12;
  const monthlyRate = pRate / 12;

  const result = useMemo(() => {
    const payment = pAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPaid = payment * months;
    const totalInterest = totalPaid - pAmount;

    // Amortization table (first 12 months)
    const table = [];
    let balance = pAmount;
    for (let i = 1; i <= Math.min(12, months); i++) {
      const interest = balance * monthlyRate;
      const amort = payment - interest;
      balance -= amort;
      if (balance < 0) balance = 0;
      table.push({ mes: i, parcela: Math.round(payment * 100) / 100, juros: Math.round(interest * 100) / 100, amort: Math.round(amort * 100) / 100, saldo: Math.round(balance * 100) / 100 });
    }

    return { payment, totalPaid, totalInterest, table };
  }, [pAmount, monthlyRate, months]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="clay p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Valor financiado (R$)" value={amount} onChange={setAmount} />
          <InputField label="Taxa anual (%)" value={rate} onChange={setRate} />
          <InputField label="Prazo (anos)" value={years} onChange={setYears} />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
          <ResultCard label="Parcela Mensal" value={result.payment} color="text-blue-600" />
          <ResultCard label="Total de Juros" value={result.totalInterest} color="text-red-500" />
          <ResultCard label="Total Pago" value={result.totalPaid} color="text-slate-700" />
        </div>
      </div>
      <div className="clay p-5 min-w-0">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Tabela Price (12 primeiros meses)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-1.5 text-slate-500">Mês</th>
                <th className="text-right py-1.5 text-slate-500">Parcela</th>
                <th className="text-right py-1.5 text-slate-500">Juros</th>
                <th className="text-right py-1.5 text-slate-500">Amort.</th>
                <th className="text-right py-1.5 text-slate-500">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {result.table.map((r) => (
                <tr key={r.mes} className="border-b border-slate-50">
                  <td className="py-1.5 text-slate-600">{r.mes}</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(r.parcela)}</td>
                  <td className="py-1.5 text-right font-mono text-red-500">{formatCurrency(r.juros)}</td>
                  <td className="py-1.5 text-right font-mono text-emerald-600">{formatCurrency(r.amort)}</td>
                  <td className="py-1.5 text-right font-mono text-slate-500">{formatCurrency(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InstallmentCalc() {
  const [total, setTotal] = useState('3000');
  const [installments, setInstallments] = useState('10');
  const [rate, setRate] = useState('3');

  const pTotal = parseFloat(total) || 0;
  const pInstallments = parseInt(installments) || 1;
  const pRate = (parseFloat(rate) || 0) / 100;

  const result = useMemo(() => {
    if (pRate === 0) {
      const simple = pTotal / pInstallments;
      return { installment: simple, totalPaid: pTotal, interest: 0, withDiscount: pTotal };
    }
    const payment = pTotal * (pRate * Math.pow(1 + pRate, pInstallments)) / (Math.pow(1 + pRate, pInstallments) - 1);
    const totalPaid = payment * pInstallments;
    return { installment: payment, totalPaid, interest: totalPaid - pTotal, withDiscount: pTotal * 0.9 };
  }, [pTotal, pInstallments, pRate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="clay p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Valor total (R$)" value={total} onChange={setTotal} />
          <InputField label="Parcelas" value={installments} onChange={setInstallments} />
          <InputField label="Taxa mensal (%)" value={rate} onChange={setRate} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
          <ResultCard label="Valor da Parcela" value={result.installment} color="text-blue-600" />
          <ResultCard label={`Total em ${pInstallments}x`} value={result.totalPaid} color="text-slate-700" />
        </div>
        {result.interest > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              Voce pagara <strong>{formatCurrency(result.interest)}</strong> em juros no parcelamento.
              A vista com 10% de desconto sairia por <strong>{formatCurrency(result.withDiscount)}</strong>.
            </p>
          </div>
        )}
      </div>
      <div className="clay p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Comparativo</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">A vista (com 10% desc)</span>
            <span className="font-mono font-bold text-emerald-600">{formatCurrency(pTotal * 0.9)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">{pInstallments}x de {formatCurrency(result.installment)}</span>
            <span className="font-mono font-bold text-red-500">{formatCurrency(result.totalPaid)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Diferença</span>
            <span className="font-mono font-bold text-amber-600">{formatCurrency(result.totalPaid - pTotal * 0.9)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`font-mono font-bold text-sm ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
