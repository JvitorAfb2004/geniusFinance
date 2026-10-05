import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, useOutletContext } from "react-router";
import { useFinance } from "~/hooks/useFinance";
import { Header } from "~/components/Header";
import { MobileBottomNav } from "~/components/MobileBottomNav";
import { getProtectedLoginPath } from "~/lib/authRedirect";
import {
  PieChart, List, Calendar, Settings, FileBarChart, X,
   Calculator, TrendingUp, Target, Users, Kanban, Layers,
   Bug, Gauge, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { FinanceAIAssistant } from "~/components/FinanceAIAssistant";

const DASHBOARD_VALUES_KEY = "dashboard_values_visible";
const TERMS_KEY = "gh_terms_accepted";

interface MenuItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface AppContext {
  dashboardValuesVisible: boolean;
}

export function useAppContext() {
  return useOutletContext<AppContext>();
}

function SidebarSection({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  if (isCollapsed) return null;
  return <div className="px-6 py-1 text-[0.68rem] font-semibold text-[#b0b6bf] uppercase tracking-[0.08em] mb-1">{label}</div>;
}

function SidebarItem({ item, isCollapsed, isActive, onClick, badge }: {
  item: MenuItem;
  isCollapsed: boolean;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button onClick={onClick}
      title={isCollapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "mx-2 px-4 py-2.5 text-[0.875rem] flex items-center gap-3 cursor-pointer rounded-xl transition-colors duration-150 text-left border-none",
        isCollapsed ? "w-[calc(100%-1rem)] justify-center px-1" : "w-[calc(100%-1rem)]",
        isActive
          ? "text-white bg-primary font-semibold"
          : "text-[#8a919d] hover:text-[#1a1d21] hover:bg-[#f1f2f0]"
      )}>
      <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-white" : "text-[#a7adb8]")} />
      {!isCollapsed && item.label}
      {!isCollapsed && badge != null && badge > 0 && (
          <span className="ml-auto bg-danger text-white text-[0.68rem] font-bold px-2 py-0.5 rounded-full min-w-[1.4rem] text-center leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

function ScopeBadge() {
  const { activeScope } = useFinance();
  const label = activeScope.type === "PERSONAL" ? "Pessoal" : activeScope.accountName;
  const roleLabel = activeScope.type === "ACCOUNT"
    ? (activeScope.role === "owner" ? "Dono" : activeScope.role === "admin" ? "Admin" : "Membro")
    : "";

  return (
    <div className="mt-2.5 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-[#f0f1ee]">
      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[0.8rem] font-semibold text-[#1a1d21] truncate">{label}</p>
        {roleLabel && (
          <p className="text-[0.55rem] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">{roleLabel}</p>
        )}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, loading, signOut, pendingInvites } = useFinance();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch { return false; }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };
  const [dashboardValuesVisible, setDashboardValuesVisible] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_VALUES_KEY);
      return raw ? JSON.parse(raw) !== false : true;
    } catch { return true; }
  });

  useEffect(() => {
    if (!user) {
      navigate(getProtectedLoginPath(location.pathname, location.search), { replace: true });
      return;
    }
  }, [user, navigate, location.pathname, location.search]);

  const handleToggleDashboardValues = () => {
    const next = !dashboardValuesVisible;
    setDashboardValuesVisible(next);
    localStorage.setItem(DASHBOARD_VALUES_KEY, JSON.stringify(next));
  };

  const navigateTo = (path: string) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  const menuItems: MenuItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: PieChart },
    { path: "/transactions", label: "Entradas / Saídas", icon: List },
    { path: "/cash-calendar", label: "Calendário", icon: Calendar },
    { path: "/monthly-closing", label: "Fechamento Mensal", icon: FileBarChart },
    { path: "/fixed-monthly", label: "Fixos Mensais", icon: Calendar },

    { path: "/dre", label: "DRE", icon: Calculator },
    { path: "/budget", label: "Orçamento", icon: TrendingUp },
    { path: "/spending-limits", label: "Limites", icon: Gauge },
    { path: "/sales", label: "Vendas", icon: TrendingUp },
    { path: "/goals", label: "Metas", icon: Target },
    { path: "/reports", label: "Relatórios Anuais", icon: FileBarChart },
    { path: "/report-issue", label: "Reportar Problema", icon: Bug },
    { path: "/commercial", label: "Leads", icon: Users },
    { path: "/projects", label: "Projetos", icon: Kanban },
    { path: "/service-types", label: "Tipos de Serviço", icon: Layers },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] bg-bg overflow-hidden text-text-primary">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#fafaf9] text-text-primary flex flex-col py-6 border-r border-[#f0f1ee] transform transition-all duration-200 ease-out lg:relative lg:translate-x-0 shrink-0",
        isCollapsed ? "w-16" : "w-[240px]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("pb-6 border-b border-[#f0f1ee] mb-5 flex flex-col gap-1", isCollapsed ? "px-3" : "px-5")}>
          <div className="flex items-center justify-between font-bold text-[1.25rem] tracking-tight text-[#1a1d21]">
            {isCollapsed ? (
              <span className="w-8 h-8 rounded-lg bg-primary text-white text-sm font-bold flex items-center justify-center mx-auto">G</span>
            ) : (
              <span className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-primary text-white text-sm font-bold flex items-center justify-center">G</span>Genius.</span>
            )}
            {!isCollapsed && (
              <button aria-label="Fechar menu" className="lg:hidden text-[#9aa1ac] hover:text-[#1a1d21] transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {!isCollapsed && <ScopeBadge />}
        </div>

        <nav className="flex flex-col flex-1 overflow-y-auto gap-4">
          <SidebarSection label="Financeiro" isCollapsed={isCollapsed} />
          <div className="flex flex-col gap-1">
             {menuItems.filter(i => ["/dashboard","/transactions","/cash-calendar","/monthly-closing","/fixed-monthly","/dre","/budget","/spending-limits","/sales","/goals","/reports"].includes(i.path)).map(item => (
              <SidebarItem key={item.path} item={item} isCollapsed={isCollapsed} isActive={isActive(item.path)} onClick={() => navigateTo(item.path)} />
            ))}
          </div>

          <SidebarSection label="Suporte" isCollapsed={isCollapsed} />
          <SidebarItem item={{ path: "/report-issue", label: "Reportar Problema", icon: Bug }} isCollapsed={isCollapsed} isActive={isActive("/report-issue")} onClick={() => navigateTo("/report-issue")} />

          <SidebarSection label="Comercial" isCollapsed={isCollapsed} />
          <SidebarItem item={{ path: "/commercial", label: "Leads", icon: Users }} isCollapsed={isCollapsed} isActive={isActive("/commercial")} onClick={() => navigateTo("/commercial")} />

          <SidebarSection label="Projetos" isCollapsed={isCollapsed} />
          <div className="flex flex-col gap-1">
            <SidebarItem item={{ path: "/projects", label: "Projetos", icon: Kanban }} isCollapsed={isCollapsed} isActive={isActive("/projects")} onClick={() => navigateTo("/projects")} />
            <SidebarItem item={{ path: "/service-types", label: "Tipos de Serviço", icon: Layers }} isCollapsed={isCollapsed} isActive={isActive("/service-types")} onClick={() => navigateTo("/service-types")} />
          </div>

        </nav>

        <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-[#f0f1ee]">
          <SidebarItem item={{ path: "/settings", label: "Configurações", icon: Settings }} isCollapsed={isCollapsed} isActive={isActive("/settings")} onClick={() => navigateTo("/settings")} badge={pendingInvites.length} />
          <button
            onClick={() => { signOut(); setIsSidebarOpen(false); localStorage.removeItem(TERMS_KEY); }}
            title={isCollapsed ? "Sair" : undefined}
            className={cn(
              "mx-2 px-4 py-2.5 text-[0.875rem] flex items-center gap-3 cursor-pointer rounded-xl transition-colors duration-150 text-left border-none text-[#8a919d] hover:bg-[#f1f2f0] hover:text-[#1a1d21]",
              isCollapsed ? "w-[calc(100%-1rem)] justify-center px-1" : "w-[calc(100%-1rem)]"
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            {!isCollapsed && "Sair"}
          </button>
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex mx-2 px-4 py-2 text-[0.85rem] items-center gap-3 cursor-pointer rounded-xl transition-colors duration-150 text-left border-none text-[#b0b6bf] hover:text-[#1a1d21] hover:bg-[#f1f2f0] w-[calc(100%-1rem)] justify-center"
            title={isCollapsed ? "Expandir menu" : "Minimizar menu"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
        <Header
          onOpenMenu={() => setIsSidebarOpen(true)}
          dashboardValuesVisible={dashboardValuesVisible}
          onToggleDashboardValues={handleToggleDashboardValues}
        />
        <main className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 pb-24 lg:pb-8 flex flex-col gap-6 bg-white">
          <Outlet context={{ dashboardValuesVisible }} />
        </main>
      </div>

      <MobileBottomNav />
      <FinanceAIAssistant />
    </div>
  );
}
