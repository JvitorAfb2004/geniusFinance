import { useAppContext } from "./_app";
import { DashboardCards } from "~/components/DashboardCards";
import { DashboardAlerts } from "~/components/DashboardAlerts";
import { DashboardCharts } from "~/components/DashboardCharts";
import { TransactionTable } from "~/components/TransactionTable";

export default function Dashboard() {
  const { dashboardValuesVisible } = useAppContext();
  return (
    <div className="flex flex-col gap-6 w-full">
      <DashboardCards valuesVisible={dashboardValuesVisible} />
      <DashboardAlerts valuesVisible={dashboardValuesVisible} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col min-w-0 bg-white">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[1.1rem] font-bold text-[#1a1d21] tracking-tight">Transações recentes</h2>
          </div>
          <TransactionTable hideHeaderTitle />
        </div>
        <div className="flex flex-col min-w-0 bg-[#f7f8f7] rounded-2xl p-6 h-fit">
          <DashboardCharts />
        </div>
      </div>
    </div>
  );
}
