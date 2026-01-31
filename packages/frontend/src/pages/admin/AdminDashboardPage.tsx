import {
  Building2,
  Users,
  Heart,
  TrendingUp,
  UserPlus,
  Activity,
  HeadsetIcon,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { AdminDashboardMetrics } from "@equiduty/shared";
import { getDashboardMetrics } from "@/services/adminService";

function DashboardLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardContent({ metrics }: { metrics: AdminDashboardMetrics }) {
  const statCards = [
    {
      title: "Organizations",
      value: metrics.totalOrganizations,
      icon: Building2,
      description: "Total registered organizations",
    },
    {
      title: "Users",
      value: metrics.totalUsers,
      icon: Users,
      description: "Total platform users",
    },
    {
      title: "Horses",
      value: metrics.totalHorses,
      icon: Heart,
      description: "Total horses registered",
    },
    {
      title: "MRR",
      value: `${metrics.mrr.toLocaleString("sv-SE")} SEK`,
      icon: DollarSign,
      description: "Monthly recurring revenue",
    },
    {
      title: "New Signups (30d)",
      value: metrics.newSignups30d,
      icon: UserPlus,
      description: "Last 30 days",
    },
    {
      title: "Active Users (7d)",
      value: metrics.activeUsers7d,
      icon: Activity,
      description: "Last 7 days",
    },
    {
      title: "Support Tickets",
      value: metrics.openSupportTickets,
      icon: HeadsetIcon,
      description: "Open tickets",
    },
    {
      title: "Subscriptions",
      value: Object.values(metrics.activeSubscriptions).reduce(
        (a, b) => a + b,
        0,
      ),
      icon: TrendingUp,
      description: "Active subscriptions",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(metrics.activeSubscriptions).map(
              ([tier, count]) => (
                <div key={tier} className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {tier}
                  </Badge>
                  <span className="text-lg font-semibold">{count}</span>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboardPage() {
  const query = useApiQuery<AdminDashboardMetrics>(
    ["admin-dashboard"],
    getDashboardMetrics,
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platform overview and key metrics"
      />

      <QueryBoundary
        query={query}
        loadingFallback={<DashboardLoadingSkeleton />}
      >
        {(metrics) => <DashboardContent metrics={metrics} />}
      </QueryBoundary>
    </div>
  );
}
