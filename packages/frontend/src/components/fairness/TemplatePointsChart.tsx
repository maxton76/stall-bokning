import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplatePointsBreakdown } from "@equiduty/shared";

// Color palette for template types
const TEMPLATE_COLORS: Record<string, string> = {
  morning: "#ea580c", // orange-600
  midday: "#16a34a", // green-600
  evening: "#2563eb", // blue-600
  custom: "#9333ea", // purple-600
};

interface TemplatePointsChartProps {
  templateBreakdown: TemplatePointsBreakdown[];
  totalPoints: number;
}

export function TemplatePointsChart({
  templateBreakdown,
  totalPoints,
}: TemplatePointsChartProps) {
  const { t } = useTranslation(["common"]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return templateBreakdown.map((template) => ({
      name:
        template.templateName.length > 20
          ? template.templateName.substring(0, 20) + "..."
          : template.templateName,
      fullName: template.templateName,
      points: template.totalPoints,
      instanceCount: template.instanceCount,
      type: template.templateType,
      color:
        template.templateColor ||
        TEMPLATE_COLORS[template.templateType] ||
        TEMPLATE_COLORS.custom,
      percentage:
        totalPoints > 0
          ? Math.round((template.totalPoints / totalPoints) * 100)
          : 0,
    }));
  }, [templateBreakdown, totalPoints]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {data.points} {t("common:labels.points")} ({data.percentage}%)
          </p>
          <p className="text-sm text-muted-foreground">
            {data.instanceCount}{" "}
            {t("common:fairness.templateChart.instances", "tillfällen")}
          </p>
        </div>
      );
    }
    return null;
  };

  if (templateBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t("common:fairness.templateChart.title", "Poäng per rutinmall")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            {t(
              "common:fairness.templateChart.noData",
              "Ingen malldata tillgänglig",
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("common:fairness.templateChart.title", "Poäng per rutinmall")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
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
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="points" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 border-t pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: TEMPLATE_COLORS.morning }}
              />
              <span className="text-muted-foreground">
                {t("common:fairness.templateTypes.morning", "Morgon")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: TEMPLATE_COLORS.midday }}
              />
              <span className="text-muted-foreground">
                {t("common:fairness.templateTypes.midday", "Mitt på dagen")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: TEMPLATE_COLORS.evening }}
              />
              <span className="text-muted-foreground">
                {t("common:fairness.templateTypes.evening", "Kväll")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: TEMPLATE_COLORS.custom }}
              />
              <span className="text-muted-foreground">
                {t("common:fairness.templateTypes.custom", "Anpassad")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
