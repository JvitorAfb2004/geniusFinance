import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './hooks/useFinance.tsx';
import { Header } from './components/Header';
import { DashboardCards } from './components/DashboardCards';
import { DashboardAlerts } from './components/DashboardAlerts';
import { DashboardCharts } from './components/DashboardCharts';
import { TransactionTable } from './components/TransactionTable';
import { CreditCardsView } from './components/CreditCardsView';
import { FixedMonthlyView } from './components/FixedMonthlyView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import DREView from './components/DREView';
import BudgetView from './components/BudgetView';
import SalesView from './components/SalesView';
import GoalsView from './components/GoalsView';
import CommercialView from './components/CommercialView';
import ProjectsView from './components/ProjectsView';
import ServiceTypesView from './components/ServiceTypesView';
import { PieChart, List, CreditCard, Calendar, Settings, FileBarChart, X, Calculator, TrendingUp, Target, Users, Kanban, Layers, ShoppingCart, ShieldCheck, Bug } from 'lucide-react';
import { SubscriptionView } from './components/SubscriptionView';
import { AdminPlansView } from './components/AdminPlansView';
import { AdminSubscriptionsView } from './components/AdminSubscriptionsView';
import { AdminReportsView } from './components/AdminReportsView';
import { ReportIssueView } from './components/ReportIssueView';
import LegalModal from './components/LegalModal';
import { LoginEmailForm } from './components/LoginEmailForm';
import { TERMOS_DE_USO } from './lib/termos-de-uso';
import { POLITICA_PRIVACIDADE } from './lib/politica-privacidade';
import { ViewType } from './types';
import { cn } from './lib/utils';

const DASHBOARD_VALUES_KEY = 'dashboard_values_visible';

function ScopeBadge() {
  const { activeScope } = useFinance();
  const label = activeScope.type === 'PERSONAL'
    ? 'Pessoal'
    : activeScope.accountName;
  const roleLabel = activeScope.type === 'ACCOUNT'
    ? (activeScope.role === 'owner' ? 'Dono' : activeScope.role === 'admin' ? 'Admin' : 'Membro')
    : '';

  return (
    <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[0.7rem] font-semibold text-white/90 truncate">{label}</p>
        {roleLabel && (
          <p className="text-[0.55rem] text-white/40 uppercase tracking-wider">{roleLabel}</p>
        )}
      </div>
    </div>
  );
}

function MainApp() {
  const { currentView, setCurrentView, user, loading, signInWithGoogle, signOut, pendingInvites } = useFinance();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsSuperadmin(false); return; }
    user.getIdTokenResult().then((result) => {
      setIsSuperadmin(result.claims.role === 'superadmin');
    }).catch(() => {});
  }, [user]);
  const [dashboardValuesVisible, setDashboardValuesVisible] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_VALUES_KEY);
      return raw ? JSON.parse(raw) !== false : true;
    } catch {
      return true;
    }
  });

  const TERMS_KEY = 'gh_terms_accepted';
  const [termsAccepted, setTermsAccepted] = useState(() => {
    try { return localStorage.getItem(TERMS_KEY) === 'true'; } catch { return false; }
  });
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const menuSections: { label: string; items: { id: ViewType; label: string; icon: React.ElementType }[] }[] = [
    {
      label: 'Financeiro',
      items: [
        { id: 'DASHBOARD', label: 'Dashboard', icon: PieChart },
        { id: 'TRANSACTIONS', label: 'Entradas / Saídas', icon: List },
        { id: 'FIXED_MONTHLY', label: 'Fixos Mensais', icon: Calendar },
        { id: 'CREDIT_CARDS', label: 'Cartões de Crédito', icon: CreditCard },
        { id: 'DRE', label: 'DRE', icon: Calculator },
        { id: 'BUDGET', label: 'Orçamento', icon: TrendingUp },
        { id: 'SALES', label: 'Vendas', icon: TrendingUp },
        { id: 'GOALS', label: 'Metas', icon: Target },
        { id: 'REPORTS', label: 'Relatórios Anuais', icon: FileBarChart },
      ],
    },
    {
      label: 'Conta',
      items: [
        { id: 'SUBSCRIPTION', label: 'Assinatura', icon: ShoppingCart },
      ],
    },
    {
      label: 'Suporte',
      items: [
        { id: 'REPORT_ISSUE' as ViewType, label: 'Reportar Problema', icon: Bug },
      ],
    },
    {
      label: 'Comercial',
      items: [
        { id: 'COMMERCIAL', label: 'Leads', icon: Users },
      ],
    },
    {
      label: 'Projetos',
      items: [
        { id: 'PROJECTS', label: 'Projetos', icon: Kanban },
        { id: 'SERVICE_TYPES', label: 'Tipos de Serviço', icon: Layers },
      ],
    },
    ...(isSuperadmin ? [{
      label: 'Admin',
      items: [
        { id: 'ADMIN_PLANS' as ViewType, label: 'Planos', icon: ShieldCheck },
        { id: 'ADMIN_SUBS' as ViewType, label: 'Assinaturas', icon: Users },
        { id: 'ADMIN_REPORTS' as ViewType, label: 'Reports', icon: Bug },
      ],
    }] : []),
  ];

  const handleNav = (view: ViewType) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const handleToggleDashboardValues = () => {
    const next = !dashboardValuesVisible;
    setDashboardValuesVisible(next);
    localStorage.setItem(DASHBOARD_VALUES_KEY, JSON.stringify(next));
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-gradient-to-br from-bg to-primary/5 px-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
        <div className="bg-surface p-8 rounded-2xl shadow-lg border border-border text-center max-w-md w-full relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-400 text-surface rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
            <PieChart className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary mb-2 font-sans tracking-tight">GeniusHub<span className="text-primary">.</span></h1>
          <p className="text-text-secondary mb-6">Faça login para acessar seus dados de forma segura na nuvem.</p>
          <label className="flex items-start gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={() => setTermsAccepted(!termsAccepted)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer shrink-0"
            />
            <span className="text-xs text-text-secondary leading-relaxed select-none">
              Li e concordo com os{' '}
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="text-[#3b82f6] hover:underline font-medium cursor-pointer"
              >
                Termos de Uso
              </button>
              {' '}e a{' '}
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="text-[#3b82f6] hover:underline font-medium cursor-pointer"
              >
                Política de Privacidade
              </button>
            </span>
          </label>
          <button
            onClick={() => {
              localStorage.setItem(TERMS_KEY, 'true');
              signInWithGoogle();
            }}
            disabled={!termsAccepted}
            className="w-full bg-text-primary hover:bg-[#0f172a] text-surface font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>

          <LoginEmailForm termsAccepted={termsAccepted} />

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-text-muted font-medium tracking-wide">
              Desenvolvido por <a href="https://geniusweb.online" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">geniusweb.online</a>
            </p>
          </div>
        </div>

        {legalModal === 'terms' && (
          <LegalModal
            title="Termos de Uso"
            content={TERMOS_DE_USO}
            onClose={() => setLegalModal(null)}
          />
        )}
        {legalModal === 'privacy' && (
          <LegalModal
            title="Política de Privacidade"
            content={POLITICA_PRIVACIDADE}
            onClose={() => setLegalModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-bg overflow-hidden text-text-primary">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-text-primary text-surface flex flex-col py-6 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 pb-6 border-b border-white/10 mb-6 flex flex-col gap-1">
          <div className="flex items-center justify-between font-extrabold text-[1.2rem] tracking-tight">
            <span>GeniusHub<span className="text-primary">.</span></span>
            <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5"/>
            </button>
          </div>
          <span className="text-[0.65rem] font-bold text-white/40 uppercase tracking-wider">by geniusweb.online</span>
          <ScopeBadge />
        </div>
        <nav className="flex flex-col flex-1 overflow-y-auto">
          {menuSections.map((section) => (
            <div key={section.label} className="mb-2">
              <div className="px-6 py-1.5 text-[0.6rem] font-bold text-white/30 uppercase tracking-widest">
                {section.label}
              </div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    "px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                    currentView === item.id
                      ? "text-surface bg-white/5 border-primary"
                      : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent"
                  )}
                >
                  <item.icon className="w-4 h-4 opacity-70" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            onClick={() => handleNav('SETTINGS')}
            className={cn(
              "px-6 py-3 text-[0.9rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
              currentView === 'SETTINGS' 
                ? "text-surface bg-white/5 border-primary"
                : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent"
            )}
          >
            <Settings className="w-4 h-4 opacity-70" />
            Configurações
            {pendingInvites.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none">
                {pendingInvites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { signOut(); setIsSidebarOpen(false); localStorage.removeItem(TERMS_KEY); setTermsAccepted(false); }}
            className="px-6 py-3 text-[0.9rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 border-transparent text-danger hover:bg-white/5 w-full mt-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-70"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenMenu={() => setIsSidebarOpen(true)}
          dashboardValuesVisible={dashboardValuesVisible}
          onToggleDashboardValues={handleToggleDashboardValues}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {currentView === 'DASHBOARD' && (
            <>
              <DashboardCards valuesVisible={dashboardValuesVisible} />
              <DashboardAlerts valuesVisible={dashboardValuesVisible} />
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

          {currentView === 'DRE' && <DREView />}
          {currentView === 'BUDGET' && <BudgetView />}
          {currentView === 'SALES' && <SalesView />}
          {currentView === 'GOALS' && <GoalsView />}
          {currentView === 'COMMERCIAL' && <CommercialView />}
          {currentView === 'PROJECTS' && <ProjectsView />}
          {currentView === 'SERVICE_TYPES' && <ServiceTypesView />}

          {currentView === 'TRANSACTIONS' && (
            <div className="flex flex-col h-full bg-white rounded-xl border border-[#e2e8f0]">
              <div className="p-6 border-b border-[#e2e8f0]">
                <h2 className="text-xl font-bold font-sans text-gray-900">Entradas / Saídas</h2>
                <p className="text-sm text-gray-500 mt-1">Gerencie todas as transações, filtre e edite informações facilmente.</p>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <TransactionTable hideHeaderTitle />
              </div>
            </div>
          )}

          {currentView === 'SUBSCRIPTION' && <SubscriptionView />}
          {currentView === 'ADMIN_PLANS' && <AdminPlansView />}
          {currentView === 'ADMIN_SUBS' && <AdminSubscriptionsView />}
          {currentView === 'ADMIN_REPORTS' && <AdminReportsView />}
          {currentView === 'REPORT_ISSUE' && <ReportIssueView />}
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
