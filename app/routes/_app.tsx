import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, useOutletContext } from "react-router";
import { useFinance } from "~/hooks/useFinance";
import { Header } from "~/components/Header";
import { TrialModal } from "~/components/TrialModal";
import {
  PieChart, List, CreditCard, Calendar, Settings, FileBarChart, X,
  Calculator, TrendingUp, Target, Users, Kanban, Layers, ShoppingCart,
  ShieldCheck, Bug, Clock,
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
      navigate("/", { replace: true });
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
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-text-primary text-surface flex flex-col py-6 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 pb-6 border-b border-white/10 mb-6 flex flex-col gap-1">
          <div className="flex items-center justify-between font-extrabold text-[1.2rem] tracking-tight">
            <span>GeniusHub<span className="text-primary">.</span></span>
            <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <span className="text-[0.65rem] font-bold text-white/40 uppercase tracking-wider">by geniusweb.online</span>
          <ScopeBadge />
          {isTrial && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <p className="text-[0.65rem] font-semibold text-amber-300 leading-tight">
                  Trial · {trialDaysLeft} dia(s) restante(s)
                </p>
              </div>
              <button
                onClick={() => navigateTo("/subscription")}
                className="mt-1.5 w-full text-[0.6rem] font-bold bg-amber-500 text-white py-1 rounded-md hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Assinar plano
              </button>
            </div>
          )}
        </div>

        <nav className="flex flex-col flex-1 overflow-y-auto">
          <div className="mb-2">
            <div className="px-6 py-1.5 text-[0.6rem] font-bold text-white/30 uppercase tracking-widest">Financeiro</div>
            {menuItems.filter(i => ["/dashboard","/transactions","/fixed-monthly","/credit-cards","/dre","/budget","/sales","/goals","/reports"].includes(i.path)).map(item => (
              <button key={item.path} onClick={() => navigateTo(item.path)}
                className={cn(
                  "px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                  isActive(item.path) ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent"
                )}>
                <item.icon className="w-4 h-4 opacity-70" /> {item.label}
              </button>
            ))}
          </div>

          <div className="mb-2">
            <div className="px-6 py-1.5 text-[0.6rem] font-bold text-white/30 uppercase tracking-widest">Conta</div>
            <button key="/subscription" onClick={() => navigateTo("/subscription")}
              className={cn("px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                isActive("/subscription") ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
              <ShoppingCart className="w-4 h-4 opacity-70" /> Assinatura
            </button>
          </div>

          <div className="mb-2">
            <div className="px-6 py-1.5 text-[0.6rem] font-bold text-white/30 uppercase tracking-widest">Suporte</div>
            <button onClick={() => navigateTo("/report-issue")}
              className={cn("px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                isActive("/report-issue") ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
              <Bug className="w-4 h-4 opacity-70" /> Reportar Problema
            </button>
          </div>

          <div className="mb-2">
            <div className="px-6 py-1.5 text-[0.6rem] font-bold text-white/30 uppercase tracking-widest">Comercial</div>
            <button onClick={() => navigateTo("/commercial")}
              className={cn("px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                isActive("/commercial") ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
              <Users className="w-4 h-4 opacity-70" /> Leads
            </button>
          </div>

          <div className="mb-2">
            <div className="px-6 py-1.5 text-[0.6rem] font-bold text-white/30 uppercase tracking-widest">Projetos</div>
            <button onClick={() => navigateTo("/projects")}
              className={cn("px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                isActive("/projects") ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
              <Kanban className="w-4 h-4 opacity-70" /> Projetos
            </button>
            <button onClick={() => navigateTo("/service-types")}
              className={cn("px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                isActive("/service-types") ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
              <Layers className="w-4 h-4 opacity-70" /> Tipos de Serviço
            </button>
          </div>

          {isSuperadmin && (
            <div className="mb-2">
              <div className="px-6 py-1.5 text-[0.6rem] font-bold text-white/30 uppercase tracking-widest">Admin</div>
              {adminItems.map(item => (
                <button key={item.path} onClick={() => navigateTo(item.path)}
                  className={cn("px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
                    isActive(item.path) ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
                  <item.icon className="w-4 h-4 opacity-70" /> {item.label}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="mt-auto">
          <button onClick={() => navigateTo("/settings")}
            className={cn("px-6 py-3 text-[0.9rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
              isActive("/settings") ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
            <Settings className="w-4 h-4 opacity-70" /> Configurações
            {pendingInvites.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center leading-none">
                {pendingInvites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { signOut(); setIsSidebarOpen(false); localStorage.removeItem(TERMS_KEY); }}
            className="px-6 py-3 text-[0.9rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 border-transparent text-danger hover:bg-white/5 w-full mt-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-70"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          <Outlet context={{ dashboardValuesVisible }} />
        </main>
      </div>

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
