import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, useOutletContext } from "react-router";
import { useFinance } from "~/hooks/useFinance";
import { Header } from "~/components/Header";
import { TrialModal } from "~/components/TrialModal";
import { MobileBottomNav } from "~/components/MobileBottomNav";
import {
  PieChart, List, CreditCard, Calendar, Settings, FileBarChart, X,
  Calculator, TrendingUp, Target, Users, Kanban, Layers, ShoppingCart,
  ShieldCheck, Bug, Clock, Gauge,
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

function ScopeBadge() {
  const { activeScope } = useFinance();
  const label = activeScope.type === "PERSONAL" ? "Pessoal" : activeScope.accountName;
  const roleLabel = activeScope.type === "ACCOUNT"
    ? (activeScope.role === "owner" ? "Dono" : activeScope.role === "admin" ? "Admin" : "Membro")
    : "";

  return (
    <div className="mt-2.5 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 shadow-sm">
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
        "fixed inset-y-0 left-0 z-50 w-60 bg-[#0b0f19] text-surface flex flex-col py-6 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 pb-6 border-b border-white/8 mb-5 flex flex-col gap-1">
          <div className="flex items-center justify-between font-bold text-[1.15rem] tracking-tight text-white">
            <span>Genius Finance<span className="text-[#3b82f6]">.</span></span>
            <button className="lg:hidden text-white/60 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">by geniusweb.online</span>
          <ScopeBadge />
          {isTrial && (
            <div className="mt-2.5 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[0.65rem] font-semibold text-amber-300 leading-tight">
                  Trial · {trialDaysLeft} dia(s) restante(s)
                </p>
              </div>
              <button
                onClick={() => navigateTo("/subscription")}
                className="mt-2 w-full text-[0.62rem] font-bold bg-amber-500 hover:bg-amber-400 text-white py-1.5 rounded-lg transition-colors cursor-pointer border-none"
              >
                Assinar plano
              </button>
            </div>
          )}
        </div>

        <nav className="flex flex-col flex-1 overflow-y-auto gap-3.5">
          <div>
            <div className="px-7 py-1 text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5">Financeiro</div>
            <div className="flex flex-col gap-0.5">
              {menuItems.filter(i => ["/dashboard","/transactions","/fixed-monthly","/credit-cards","/dre","/budget","/spending-limits","/sales","/goals","/reports"].includes(i.path)).map(item => (
                <button key={item.path} onClick={() => navigateTo(item.path)}
                  className={cn(
                    "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
                    isActive(item.path) 
                      ? "text-white bg-white/8 font-medium shadow-sm" 
                      : "text-slate-400 hover:text-white hover:bg-white/4"
                  )}>
                  <item.icon className={cn("w-4 h-4 transition-opacity", isActive(item.path) ? "opacity-100 text-primary" : "opacity-60")} /> 
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="px-7 py-1 text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5">Conta</div>
            <button key="/subscription" onClick={() => navigateTo("/subscription")}
              className={cn(
                "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
                isActive("/subscription") 
                  ? "text-white bg-white/8 font-medium shadow-sm" 
                  : "text-slate-400 hover:text-white hover:bg-white/4"
              )}>
              <ShoppingCart className={cn("w-4 h-4 transition-opacity", isActive("/subscription") ? "opacity-100 text-primary" : "opacity-60")} /> 
              Assinatura
            </button>
          </div>

          <div>
            <div className="px-7 py-1 text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5">Suporte</div>
            <button onClick={() => navigateTo("/report-issue")}
              className={cn(
                "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
                isActive("/report-issue") 
                  ? "text-white bg-white/8 font-medium shadow-sm" 
                  : "text-slate-400 hover:text-white hover:bg-white/4"
              )}>
              <Bug className={cn("w-4 h-4 transition-opacity", isActive("/report-issue") ? "opacity-100 text-primary" : "opacity-60")} /> 
              Reportar Problema
            </button>
          </div>

          <div>
            <div className="px-7 py-1 text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5">Comercial</div>
            <button onClick={() => navigateTo("/commercial")}
              className={cn(
                "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
                isActive("/commercial") 
                  ? "text-white bg-white/8 font-medium shadow-sm" 
                  : "text-slate-400 hover:text-white hover:bg-white/4"
              )}>
              <Users className={cn("w-4 h-4 transition-opacity", isActive("/commercial") ? "opacity-100 text-primary" : "opacity-60")} /> 
              Leads
            </button>
          </div>

          <div>
            <div className="px-7 py-1 text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5">Projetos</div>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => navigateTo("/projects")}
                className={cn(
                  "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
                  isActive("/projects") 
                    ? "text-white bg-white/8 font-medium shadow-sm" 
                    : "text-slate-400 hover:text-white hover:bg-white/4"
                )}>
                <Kanban className={cn("w-4 h-4 transition-opacity", isActive("/projects") ? "opacity-100 text-primary" : "opacity-60")} /> 
                Projetos
              </button>
              <button onClick={() => navigateTo("/service-types")}
                className={cn(
                  "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
                  isActive("/service-types") 
                    ? "text-white bg-white/8 font-medium shadow-sm" 
                    : "text-slate-400 hover:text-white hover:bg-white/4"
                )}>
                <Layers className={cn("w-4 h-4 transition-opacity", isActive("/service-types") ? "opacity-100 text-primary" : "opacity-60")} /> 
                Tipos de Serviço
              </button>
            </div>
          </div>

          {isSuperadmin && (
            <div>
              <div className="px-7 py-1 text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5">Admin</div>
              <div className="flex flex-col gap-0.5">
                {adminItems.map(item => (
                  <button key={item.path} onClick={() => navigateTo(item.path)}
                    className={cn(
                      "mx-3 px-4 py-2 text-[0.82rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
                      isActive(item.path) 
                        ? "text-white bg-white/8 font-medium shadow-sm" 
                        : "text-slate-400 hover:text-white hover:bg-white/4"
                    )}>
                    <item.icon className={cn("w-4 h-4 transition-opacity", isActive(item.path) ? "opacity-100 text-primary" : "opacity-60")} /> 
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-white/6">
          <button onClick={() => navigateTo("/settings")}
            className={cn(
              "mx-3 px-4 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left w-[calc(100%-1.5rem)] border-none",
              isActive("/settings") 
                ? "text-white bg-white/8 font-medium" 
                : "text-slate-400 hover:text-white hover:bg-white/4"
            )}>
            <Settings className={cn("w-4 h-4 transition-opacity", isActive("/settings") ? "opacity-100 text-primary" : "opacity-60")} /> 
            Configurações
            {pendingInvites.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none">
                {pendingInvites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { signOut(); setIsSidebarOpen(false); localStorage.removeItem(TERMS_KEY); }}
            className="mx-3 px-4 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer rounded-xl transition-all duration-200 text-left border-none text-red-400 hover:bg-white/4 hover:text-red-300 w-[calc(100%-1.5rem)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-60"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sair
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
