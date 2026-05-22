import { TransactionTable } from "~/components/TransactionTable";

export default function Transactions() {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_16px_rgba(0,0,0,0.02)]">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold font-sans text-gray-900">Entradas / Saídas</h2>
        <p className="text-sm text-gray-500 mt-1">Gerencie todas as transações, filtre e edite informações facilmente.</p>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <TransactionTable hideHeaderTitle />
      </div>
    </div>
  );
}
