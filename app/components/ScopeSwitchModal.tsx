import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface Props {
  targetLabel: string;
}

export function ScopeSwitchModal({ targetLabel }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", duration: 0.35 }}
        className="clay shadow-xl w-full max-w-xs p-6 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <h3 className="text-[1rem] font-bold text-slate-800 mb-1.5">Alternando perfil</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Buscando suas informações em{" "}
          <span className="font-semibold text-slate-700">{targetLabel}</span>...
        </p>
      </motion.div>
    </motion.div>
  );
}
