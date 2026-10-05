import { Link } from "react-router";
import { CheckCircle2 } from "lucide-react";

export function SubscriptionView() {
  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      <div className="bg-[#f7f8f7] rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-[#1a1d21]">Plataforma gratuita</h2>
        <p className="text-sm text-[#5f6672] mt-2 leading-relaxed">
          O Genius Finance está liberado para todos os usuários, sem planos,
          mensalidades ou período de teste. Todos os módulos já estão incluídos.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex mt-6 bg-primary hover:opacity-90 text-white font-semibold px-6 py-3 rounded-xl transition-opacity text-sm"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
