import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedAnalytics } from "@stall-bokning/shared";

// Color palette for charts
const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#ea580c", // orange-600
  "#9333ea", // purple-600
  "#e11d48", // rose-600
  "#0891b2", // cyan-600
  "#c026d3", // fuchsia-600
  "#65a30d", // lime-600
];

interface FeedingCostChartProps {
  analytics: FeedAnalytics;
}

export function FeedingCostChart({ analytics }: FeedingCostChartProps) {
  const { t, i18n } = useTranslation(["feeding", "common"]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Pie chart data for feed type breakdown by cost
  const pieData = useMemo(() => {
    return analytics.feedTypeBreakdown
      .filter((ft) => ft.estimatedCost > 0)
      .map((ft) => ({
        name: ft.feedTypeName,
        value: Math.round(ft.estimatedCost),
        category: ft.feedTypeCategory,
      }));
  }, [analytics.feedTypeBreakdown]);

  // Bar chart data for feed type breakdown by quantity
  const barData = useMemo(() => {
    return analytics.feedTypeBreakdown.map((ft) => ({
      name:
        ft.feedTypeName.length > 12
          ? ft.feedTypeName.substring(0, 12) + "..."
          : ft.feedTypeName,
      fullName: ft.feedTypeName,
      quantity: Math.round(ft.totalQuantity * 10) / 10,
      unit: ft.unit,
      cost: Math.round(ft.estimatedCost),
    }));
  }, [analytics.feedTypeBreakdown]);

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {data.quantity} {data.unit}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.cost)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (analytics.feedTypeBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("feeding:analytics.costBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {t("feeding:analytics.noData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("feeding:analytics.costBreakdown")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cost">
          <TabsList className="mb-4">
            <TabsTrigger value="cost">
              {t("feeding:analytics.byCost")}
            </TabsTrigger>
            <TabsTrigger value="quantity">
              {t("feeding:analytics.byQuantity")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cost">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="quantity">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar
                    dataKey="quantity"
                    fill="#2563eb"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Legend summary */}
        <div className="mt-4 border-t pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
