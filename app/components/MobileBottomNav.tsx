import { useNavigate, useLocation } from "react-router";
import { PieChart, List, Calculator, TrendingUp, Kanban } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "~/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = [
    { path: "/dashboard", label: "Início", icon: PieChart },
    { path: "/transactions", label: "Transações", icon: List },
    { path: "/dre", label: "DRE", icon: Calculator },
    { path: "/budget", label: "Orçamento", icon: TrendingUp },
    { path: "/projects", label: "Projetos", icon: Kanban },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 pb-[env(safe-area-inset-bottom,0.5rem)] pt-1.5">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-0 relative transition-colors duration-200 cursor-pointer border-none bg-transparent",
                isActive
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.5 : 1.75} />
              <span className={cn(
                "text-[0.6rem] font-medium leading-none",
                isActive ? "text-primary" : "text-slate-400"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
