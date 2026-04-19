import React from 'react';
import { useFinance } from '../hooks/useFinance';
import { LogOut, User, Shield, Bell, DownloadCloud } from 'lucide-react';

export function SettingsView() {
  const { user, transactions, activeContext, signOut } = useFinance();

  const handleExportCSV = () => {
    // Only exports the currently active context
    const contextTxs = transactions.filter(t => t.context === activeContext);
    if (contextTxs.length === 0) return alert('Nenhuma transação para exportar neste contexto.');

    const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Status', 'Recorrência'];
    const csvContent = contextTxs.map(t => {
      const typeStr = t.type === 'INCOME' ? 'Entrada' : t.type === 'EXPENSE' ? 'Despesa' : 'Cartão';
      const statusStr = t.status === 'PAID' ? 'Pago' : 'Pendente';
      const recStr = t.isFixed ? 'Fixa' : t.installmentInfo ? `Parcela ${t.installmentInfo}` : 'Única';
      
      return `"${t.date}","${typeStr}","${t.title}","${t.amount}","${statusStr}","${recStr}"`;
    });

    const csvData = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financas_${activeContext.toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col max-w-3xl gap-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#e2e8f0] flex items-center gap-4 bg-gray-50/50">
          <div className="w-16 h-16 rounded-full bg-[#e2e8f0] flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow-sm">
             {user?.photoURL ? (
               <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : (
               <User className="w-8 h-8 text-gray-400" />
             )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.displayName || 'Usuário'}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>
        
        <div className="p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Conta e Dados</h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
             <div className="flex items-center gap-3">
               <DownloadCloud className="text-[#3b82f6] w-5 h-5 shrink-0" />
               <div>
                  <p className="font-semibold text-gray-700">Exportar Banco de Dados (CSV)</p>
                  <p className="text-xs text-gray-500">Baixe todo o histórico financeiro do contexto atual ({activeContext === 'PERSONAL' ? 'Pessoal' : 'Empresa'}) para abrir no Excel ou Sheets.</p>
               </div>
             </div>
             <button 
                onClick={handleExportCSV}
                className="text-xs font-bold bg-white border border-[#e2e8f0] text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer shrink-0 shadow-sm"
             >
               Baixar .CSV
             </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
             <div className="flex items-center gap-3">
               <Shield className="text-gray-400 w-5 h-5 shrink-0" />
               <div>
                  <p className="font-semibold text-gray-700">Segurança da Conta</p>
                  <p className="text-xs text-gray-500">Sua conta está autênticada via provedor Google Cloud.</p>
               </div>
             </div>
             <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Seguro</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
             <div className="flex items-center gap-3">
               <Bell className="text-gray-400 w-5 h-5 shrink-0" />
               <div>
                  <p className="font-semibold text-gray-700">Notificações</p>
                  <p className="text-xs text-gray-500">Receber alertas de faturas próximas (Em breve).</p>
               </div>
             </div>
             <button className="text-xs font-bold bg-gray-200 text-gray-600 px-3 py-1.5 rounded border-none cursor-not-allowed">
               Desativado
             </button>
          </div>

          <button 
             onClick={signOut}
             className="mt-6 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 p-3 rounded-lg w-full sm:w-fit transition-colors font-medium border border-red-100 bg-transparent cursor-pointer"
          >
             <LogOut className="w-5 h-5" />
             Sair do Aplicativo
          </button>
        </div>
      </div>
    </div>
  );
}
