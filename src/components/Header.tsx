import React from 'react';
import { useFinance } from '../hooks/useFinance.tsx';
import { ContextType } from '../types';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Header({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { activeContext, setActiveContext, selectedMonth, setSelectedMonth } = useFinance();

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-4 sm:py-5 shrink-0 w-full bg-[#f4f6f8] gap-4">
      <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
        <button 
          onClick={onOpenMenu}
          className="lg:hidden p-2 -ml-2 text-[#64748b] hover:text-[#1e293b]"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-[1.3rem] sm:text-[1.8rem] font-bold text-[#1e293b] tracking-tight">Visão Geral</h1>
        
        {/* Month Selector */}
        <div className="flex items-center gap-2 sm:gap-3 text-sm font-medium bg-white/40 px-2 py-1 rounded-lg border border-[#e2e8f0] ml-auto sm:ml-0">
          <button 
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="p-1 text-[#64748b] hover:text-[#1e293b] rounded-md transition-colors border-none bg-transparent cursor-pointer hidden sm:block"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="w-20 sm:w-24 text-center capitalize text-[#1e293b] font-semibold text-[0.85rem]">
            {format(selectedMonth, 'MMM/yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="p-1 text-[#64748b] hover:text-[#1e293b] rounded-md transition-colors border-none bg-transparent cursor-pointer hidden sm:block"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-white border border-[#e2e8f0] rounded-lg w-full sm:w-auto justify-center">
        {(['PERSONAL', 'BUSINESS'] as ContextType[]).map((ctx) => (
          <button
            key={ctx}
            onClick={() => setActiveContext(ctx)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[0.85rem] font-semibold transition-all border-none cursor-pointer ${
              activeContext === ctx 
                ? 'bg-[#3b82f6] text-white shadow-sm' 
                : 'bg-transparent text-[#64748b] hover:bg-[#f4f6f8]'
            }`}
          >
            {ctx === 'PERSONAL' ? 'Pessoal' : 'Empresa'}
          </button>
        ))}
      </div>
    </header>
  );
}

