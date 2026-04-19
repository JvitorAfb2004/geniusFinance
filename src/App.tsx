import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './hooks/useFinance.tsx';
import { Header } from './components/Header';
import { DashboardCards } from './components/DashboardCards';
import { DashboardCharts } from './components/DashboardCharts';
import { TransactionTable } from './components/TransactionTable';
import { CreditCardsView } from './components/CreditCardsView';
import { FixedMonthlyView } from './components/FixedMonthlyView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { PieChart, List, CreditCard, Calendar, Settings, FileBarChart, Menu, X } from 'lucide-react';
import { ViewType } from './types';
import { cn } from './lib/utils';

function MainApp() {
  const { currentView, setCurrentView, user, loading, signInWithGoogle, signOut } = useFinance();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: PieChart },
    { id: 'TRANSACTIONS', label: 'Entradas / Saídas', icon: List },
    { id: 'CREDIT_CARDS', label: 'Cartões de Crédito', icon: CreditCard },
    { id: 'FIXED_MONTHLY', label: 'Fixos Mensais', icon: Calendar },
    { id: 'REPORTS', label: 'Relatórios Anuais', icon: FileBarChart },
  ];

  const handleNav = (view: ViewType) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#f4f6f8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-[#f4f6f8] px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#e2e8f0] text-center max-w-md w-full">
          <div className="w-16 h-16 bg-[#eff6ff] text-[#3b82f6] rounded-xl flex items-center justify-center mx-auto mb-6">
            <PieChart className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] mb-2 font-sans tracking-tight">FinanceiroCore.</h1>
          <p className="text-[#64748b] mb-8">Faça login para acessar os seus dados financeiros de forma segura na nuvem.</p>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#f4f6f8] overflow-hidden text-[#1e293b]">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-[#1e293b] text-white flex flex-col py-6 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 w-64 shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 pb-6 font-extrabold text-[1.2rem] tracking-tight border-b border-white/10 mb-6 flex items-center justify-between">
          FinanceiroCore.
          <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5"/>
          </button>
        </div>
        <nav className="flex flex-col flex-1 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                "px-6 py-3 text-[0.9rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                currentView === item.id 
                  ? "text-white bg-white/5 border-[#3b82f6]" 
                  : "text-white/70 hover:text-white hover:bg-white/5 border-transparent"
              )}
            >
              <item.icon className="w-4 h-4 opacity-70" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            onClick={() => handleNav('SETTINGS')}
            className={cn(
              "px-6 py-3 text-[0.9rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
              currentView === 'SETTINGS' 
                ? "text-white bg-white/5 border-[#3b82f6]" 
                : "text-white/70 hover:text-white hover:bg-white/5 border-transparent"
            )}
          >
            <Settings className="w-4 h-4 opacity-70" />
            Configurações
          </button>
          <button
            onClick={() => { signOut(); setIsSidebarOpen(false); }}
            className="px-6 py-3 text-[0.9rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 border-transparent text-[#ef4444] hover:bg-white/5 w-full mt-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-70"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header onOpenMenu={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {currentView === 'DASHBOARD' && (
            <>
              <DashboardCards />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 flex-1 min-h-[400px]">
                <div className="xl:col-span-2 flex flex-col min-w-0">
                  <TransactionTable />
                </div>
                <div className="flex flex-col min-w-0">
                  <DashboardCharts />
                </div>
              </div>
            </>
          )}

          {currentView === 'TRANSACTIONS' && (
            <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-[#e2e8f0]">
              <div className="p-6 border-b border-[#e2e8f0]">
                <h2 className="text-xl font-bold font-sans text-gray-900">Entradas / Saídas</h2>
                <p className="text-sm text-gray-500 mt-1">Gerencie todas as transações, filtre e edite informações facilmente.</p>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <TransactionTable hideHeaderTitle />
              </div>
            </div>
          )}

          {currentView === 'CREDIT_CARDS' && <CreditCardsView />}
          {currentView === 'FIXED_MONTHLY' && <FixedMonthlyView />}
          {currentView === 'REPORTS' && <ReportsView />}
          {currentView === 'SETTINGS' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}
