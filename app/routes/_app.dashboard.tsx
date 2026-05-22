import { useAppContext } from "./_app";
import { DashboardCards } from "~/components/DashboardCards";
import { DashboardAlerts } from "~/components/DashboardAlerts";
import { DashboardCharts } from "~/components/DashboardCharts";
import { TransactionTable } from "~/components/TransactionTable";

export default function Dashboard() {
  const { dashboardValuesVisible } = useAppContext();
  return (
    <div className="flex flex-col gap-5">
      <DashboardCards valuesVisible={dashboardValuesVisible} />
      <DashboardAlerts valuesVisible={dashboardValuesVisible} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 flex-1 min-h-[400px]">
        <div className="xl:col-span-2 flex flex-col min-w-0">
          <TransactionTable />
        </div>
        <div className="flex flex-col min-w-0">
          <DashboardCharts />
        </div>
      </div>
    </div>
  );
}
