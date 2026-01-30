import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { listFeatureRequests } from "@/services/featureRequestService";
import { StatusBadge } from "@/components/feature-requests/StatusBadge";
import { CategoryBadge } from "@/components/feature-requests/CategoryBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Lightbulb,
  Loader2,
  ThumbsUp,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import type { FeatureRequestStatus } from "@equiduty/shared";
import { PRIORITY_COLORS } from "@/components/feature-requests/constants";

const ALL_STATUSES: Array<{ value: string; labelKey: string }> = [
  { value: "all", labelKey: "featureRequests:filters.all" },
  { value: "open", labelKey: "featureRequests:statuses.open" },
  { value: "under_review", labelKey: "featureRequests:statuses.under_review" },
  { value: "planned", labelKey: "featureRequests:statuses.planned" },
  { value: "in_progress", labelKey: "featureRequests:statuses.in_progress" },
  { value: "completed", labelKey: "featureRequests:statuses.completed" },
  { value: "declined", labelKey: "featureRequests:statuses.declined" },
];

export default function AdminFeatureRequestsPage() {
  const { t } = useTranslation(["featureRequests", "common"]);
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-featureRequests", statusFilter],
    queryFn: () =>
      listFeatureRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        sort: "votes",
        limit: 50,
      }),
    staleTime: 30 * 1000,
  });

  const items = data?.items ?? [];

  // Stats
  const statsQuery = useQuery({
    queryKey: ["admin-featureRequests-stats"],
    queryFn: async () => {
      const [open, planned, inProgress, completed] = await Promise.all([
        listFeatureRequests({ status: "open", limit: 1 }),
        listFeatureRequests({ status: "planned", limit: 1 }),
        listFeatureRequests({ status: "in_progress", limit: 1 }),
        listFeatureRequests({ status: "completed", limit: 1 }),
      ]);
      return {
        total: items.length,
        open: open.items.length > 0 ? "1+" : "0",
        planned: planned.items.length > 0 ? "1+" : "0",
        inProgress: inProgress.items.length > 0 ? "1+" : "0",
        completed: completed.items.length > 0 ? "1+" : "0",
      };
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Lightbulb className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">
          {t("featureRequests:admin.pageTitle")}
        </h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("featureRequests:filters.all")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("featureRequests:statuses.open")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statsQuery.data?.open ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("featureRequests:statuses.planned")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {statsQuery.data?.planned ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("featureRequests:statuses.in_progress")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {statsQuery.data?.inProgress ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap">
          {ALL_STATUSES.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t("featureRequests:empty.noRequests")}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">
                  <ThumbsUp className="h-4 w-4" />
                </TableHead>
                <TableHead>{t("featureRequests:form.title")}</TableHead>
                <TableHead>{t("featureRequests:filters.status")}</TableHead>
                <TableHead>{t("featureRequests:filters.category")}</TableHead>
                <TableHead>{t("featureRequests:admin.priority")}</TableHead>
                <TableHead className="w-[60px]">
                  <MessageSquare className="h-4 w-4" />
                </TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((request) => (
                <TableRow
                  key={request.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/feature-requests/${request.id}`)}
                >
                  <TableCell className="font-medium">
                    {request.voteCount}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[300px]">
                        {request.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.authorDisplayName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={request.category} />
                  </TableCell>
                  <TableCell>
                    {request.priority ? (
                      <Badge
                        className={PRIORITY_COLORS[request.priority] ?? ""}
                        variant="secondary"
                      >
                        {t(`featureRequests:priorities.${request.priority}`)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{request.commentCount}</TableCell>
                  <TableCell>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
