import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, useOutletContext } from "react-router";
import { useFinance } from "~/hooks/useFinance";
import { Header } from "~/components/Header";
import { TrialModal } from "~/components/TrialModal";
import { MobileBottomNav } from "~/components/MobileBottomNav";
import ChatBot from "~/components/ChatBot";
import {
  PieChart, List, CreditCard, Calendar, Settings, FileBarChart, X,
  Calculator, TrendingUp, Target, Users, Kanban, Layers, ShoppingCart,
  ShieldCheck, Bug, Clock, Gauge, PanelLeftClose, PanelLeftOpen, Sparkles,
} from "lucide-react";
import { cn } from "~/lib/utils";

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
  return <div className="px-7 py-1 text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5">{label}</div>;
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
      className={cn(
        "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left border-none",
        isCollapsed ? "w-[calc(100%-1.5rem)] justify-center px-1" : "w-[calc(100%-1.5rem)]",
        isActive
          ? "text-white bg-white/10 font-medium shadow-[inset_2px_-2px_4px_rgba(0,0,0,0.15),inset_-2px_2px_4px_rgba(255,255,255,0.05)]"
          : "text-slate-400 hover:text-white hover:bg-white/6"
      )}>
      <item.icon className={cn("w-4 h-4 transition-opacity shrink-0", isActive ? "opacity-100 text-primary" : "opacity-60")} />
      {!isCollapsed && item.label}
      {!isCollapsed && badge != null && badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none">
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
    <div className="mt-2.5 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/6 border border-white/10">
      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
      <div className="min-w-0">
        <p className="text-[0.72rem] font-medium text-slate-200 truncate">{label}</p>
        {roleLabel && (
          <p className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{roleLabel}</p>
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
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [isTrial, setIsTrial] = useState(false);
  const [dashboardValuesVisible, setDashboardValuesVisible] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_VALUES_KEY);
      return raw ? JSON.parse(raw) !== false : true;
    } catch { return true; }
  });

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    user.getIdTokenResult().then((result) => {
      setIsSuperadmin(result.claims.role === "superadmin");
    }).catch(() => {});
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    import("~/lib/api").then(({ apiFetch }) => {
      apiFetch("/api/sub/status").then((res) => {
        const trial = res.data?.trial;
        const sub = res.data?.subscription;
        if (trial && trial.status === "active" && (!sub || sub.status === "trial")) {
          const expiresAt = trial.expiresAt ? new Date(trial.expiresAt) : null;
          const days = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : 0;
          if (days > 0) {
            setTrialDaysLeft(days);
            setIsTrial(true);
            const seen = sessionStorage.getItem("trial_modal_seen");
            if (!seen) {
              setShowTrialModal(true);
              sessionStorage.setItem("trial_modal_seen", "1");
            }
          }
        }
      }).catch(() => {});
    });
  }, [user]);

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
    { path: "/credit-cards", label: "Cartões de Crédito", icon: CreditCard },
    { path: "/dre", label: "DRE", icon: Calculator },
    { path: "/budget", label: "Orçamento", icon: TrendingUp },
    { path: "/spending-limits", label: "Limites", icon: Gauge },
    { path: "/sales", label: "Vendas", icon: TrendingUp },
    { path: "/goals", label: "Metas", icon: Target },
    { path: "/reports", label: "Relatórios Anuais", icon: FileBarChart },
    { path: "/subscription", label: "Assinatura", icon: ShoppingCart },
    { path: "/report-issue", label: "Reportar Problema", icon: Bug },
    { path: "/commercial", label: "Leads", icon: Users },
    { path: "/projects", label: "Projetos", icon: Kanban },
    { path: "/service-types", label: "Tipos de Serviço", icon: Layers },
    { path: "/ai-chat", label: "Analista IA", icon: Sparkles },
  ];

  const adminItems: MenuItem[] = [
    { path: "/admin/plans", label: "Planos", icon: ShieldCheck },
    { path: "/admin/subscriptions", label: "Assinaturas", icon: Users },
    { path: "/admin/reports", label: "Reports", icon: Bug },
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
        "fixed inset-y-0 left-0 z-50 bg-[#0b0f19] text-surface flex flex-col py-6 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0",
        isCollapsed ? "w-16" : "w-60",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("pb-6 border-b border-white/8 mb-5 flex flex-col gap-1", isCollapsed ? "px-3" : "px-6")}>
          <div className="flex items-center justify-between font-bold text-[1.15rem] tracking-tight text-white">
            {isCollapsed ? (
              <span className="text-[#5b7def] text-lg mx-auto">GF</span>
            ) : (
              <span>Genius Finance<span className="text-[#5b7def]">.</span></span>
            )}
            {!isCollapsed && (
              <button className="lg:hidden text-white/60 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {!isCollapsed && <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">by geniusweb.online</span>}
          {!isCollapsed && <ScopeBadge />}
          {!isCollapsed && isTrial && (
            <div className="mt-2.5 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15 shadow-[inset_1px_-1px_3px_rgba(0,0,0,0.08),inset_-1px_1px_3px_rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[0.65rem] font-semibold text-amber-300 leading-tight">
                  Trial · {trialDaysLeft} dia(s) restante(s)
                </p>
              </div>
              <button
                onClick={() => navigateTo("/subscription")}
                className="mt-2 w-full text-[0.62rem] font-bold bg-amber-500 hover:bg-amber-400 text-white py-1.5 rounded-xl shadow-[inset_1px_-1px_2px_rgba(0,0,0,0.1),inset_-1px_1px_2px_rgba(255,255,255,0.1)] transition-colors cursor-pointer border-none"
              >
                Assinar plano
              </button>
            </div>
          )}
        </div>

        <nav className="flex flex-col flex-1 overflow-y-auto gap-3.5">
          <SidebarSection label="Financeiro" isCollapsed={isCollapsed} />
          <div className="flex flex-col gap-0.5">
            {menuItems.filter(i => ["/dashboard","/cash-calendar","/monthly-closing","/fixed-monthly","/credit-cards","/dre","/budget","/spending-limits","/sales","/goals","/reports","/ai-chat"].includes(i.path)).map(item => (
              <SidebarItem key={item.path} item={item} isCollapsed={isCollapsed} isActive={isActive(item.path)} onClick={() => navigateTo(item.path)} />
            ))}
          </div>

          <SidebarSection label="Conta" isCollapsed={isCollapsed} />
          <SidebarItem item={{ path: "/subscription", label: "Assinatura", icon: ShoppingCart }} isCollapsed={isCollapsed} isActive={isActive("/subscription")} onClick={() => navigateTo("/subscription")} />

          <SidebarSection label="Suporte" isCollapsed={isCollapsed} />
          <SidebarItem item={{ path: "/report-issue", label: "Reportar Problema", icon: Bug }} isCollapsed={isCollapsed} isActive={isActive("/report-issue")} onClick={() => navigateTo("/report-issue")} />

          <SidebarSection label="Comercial" isCollapsed={isCollapsed} />
          <SidebarItem item={{ path: "/commercial", label: "Leads", icon: Users }} isCollapsed={isCollapsed} isActive={isActive("/commercial")} onClick={() => navigateTo("/commercial")} />

          <SidebarSection label="Projetos" isCollapsed={isCollapsed} />
          <div className="flex flex-col gap-0.5">
            <SidebarItem item={{ path: "/projects", label: "Projetos", icon: Kanban }} isCollapsed={isCollapsed} isActive={isActive("/projects")} onClick={() => navigateTo("/projects")} />
            <SidebarItem item={{ path: "/service-types", label: "Tipos de Serviço", icon: Layers }} isCollapsed={isCollapsed} isActive={isActive("/service-types")} onClick={() => navigateTo("/service-types")} />
          </div>

          {isSuperadmin && (
            <>
              <SidebarSection label="Admin" isCollapsed={isCollapsed} />
              <div className="flex flex-col gap-0.5">
                {adminItems.map(item => (
                  <SidebarItem key={item.path} item={item} isCollapsed={isCollapsed} isActive={isActive(item.path)} onClick={() => navigateTo(item.path)} />
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-white/6">
          <SidebarItem item={{ path: "/settings", label: "Configurações", icon: Settings }} isCollapsed={isCollapsed} isActive={isActive("/settings")} onClick={() => navigateTo("/settings")} badge={pendingInvites.length} />
          <button
            onClick={() => { signOut(); setIsSidebarOpen(false); localStorage.removeItem(TERMS_KEY); }}
            title={isCollapsed ? "Sair" : undefined}
            className={cn(
              "mx-3 px-4 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left border-none text-red-400 shadow-[inset_1px_-1px_2px_rgba(0,0,0,0.06)] hover:bg-white/4 hover:text-red-300",
              isCollapsed ? "w-[calc(100%-1.5rem)] justify-center px-1" : "w-[calc(100%-1.5rem)]"
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-60 shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            {!isCollapsed && "Sair"}
          </button>
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex mx-3 px-4 py-2 text-[0.85rem] items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left border-none text-slate-500 hover:text-white hover:bg-white/6 w-[calc(100%-1.5rem)] justify-center"
            title={isCollapsed ? "Expandir menu" : "Minimizar menu"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenMenu={() => setIsSidebarOpen(true)}
          dashboardValuesVisible={dashboardValuesVisible}
          onToggleDashboardValues={handleToggleDashboardValues}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6 flex flex-col gap-5">
          <Outlet context={{ dashboardValuesVisible }} />
        </main>
      </div>

      <MobileBottomNav />

      {showTrialModal && (
        <TrialModal
          daysLeft={trialDaysLeft}
          onClose={() => setShowTrialModal(false)}
          onSubscribe={() => {
            setShowTrialModal(false);
            navigate("/subscription");
          }}
        />
      )}
    </div>
  );
}
