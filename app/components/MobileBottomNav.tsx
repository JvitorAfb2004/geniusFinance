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
    <nav aria-label="Navegação principal" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#f3f4f2] pb-[env(safe-area-inset-bottom,0.5rem)] pt-1.5">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-1.5 px-4 min-w-0 relative transition-colors duration-200 cursor-pointer border-none bg-transparent rounded-xl",
                isActive
                  ? "text-primary"
                  : "text-[#a7adb8] hover:text-[#1a1d21]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className="w-[20px] h-[20px] shrink-0" strokeWidth={isActive ? 2.5 : 1.75} />
              <span className={cn(
                "text-[0.65rem] font-semibold leading-none",
                isActive ? "text-primary" : "text-[#a7adb8]"
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
