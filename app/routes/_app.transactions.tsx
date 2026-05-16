import { TransactionTable } from "~/components/TransactionTable";

export default function Transactions() {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-[#e2e8f0]">
      <div className="p-6 border-b border-[#e2e8f0]">
        <h2 className="text-xl font-bold font-sans text-gray-900">Entradas / Saídas</h2>
        <p className="text-sm text-gray-500 mt-1">Gerencie todas as transações, filtre e edite informações facilmente.</p>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <TransactionTable hideHeaderTitle />
      </div>
    </div>
  );
}
