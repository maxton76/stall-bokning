import { useTranslation } from "react-i18next";

const DashboardPage = () => {
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.totalBookings")}
            </h3>
            <p className="text-2xl font-bold mt-2">245</p>
            <p className="text-sm text-green-600 mt-1">
              {t("dashboard.trends.percentFromLastMonth", { percent: 12 })}
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.activeStables")}
            </h3>
            <p className="text-2xl font-bold mt-2">18</p>
            <p className="text-sm text-green-600 mt-1">
              {t("dashboard.trends.newThisMonth", { count: 2 })}
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.revenue")}
            </h3>
            <p className="text-2xl font-bold mt-2">$12,540</p>
            <p className="text-sm text-green-600 mt-1">
              {t("dashboard.trends.percentFromLastMonth", { percent: 18 })}
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("dashboard.stats.occupancyRate")}
            </h3>
            <p className="text-2xl font-bold mt-2">87%</p>
            <p className="text-sm text-green-600 mt-1">
              {t("dashboard.trends.percentFromLastMonth", { percent: 5 })}
            </p>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">
            {t("dashboard.recentActivity.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("dashboard.recentActivity.placeholder")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
