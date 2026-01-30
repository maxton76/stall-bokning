import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFeatureRequests,
  toggleVote,
} from "@/services/featureRequestService";
import { FeatureRequestCard } from "@/components/feature-requests/FeatureRequestCard";
import { CreateFeatureRequestDialog } from "@/components/feature-requests/CreateFeatureRequestDialog";
import { StatusBadge } from "@/components/feature-requests/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Lightbulb, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  FeatureRequestStatus,
  FeatureRequestCategory,
  FeatureRequestSortBy,
  FeatureRequest,
} from "@equiduty/shared";

const STATUS_TABS: Array<{ value: string; labelKey: string }> = [
  { value: "all", labelKey: "featureRequests:filters.all" },
  { value: "open", labelKey: "featureRequests:statuses.open" },
  { value: "planned", labelKey: "featureRequests:statuses.planned" },
  { value: "in_progress", labelKey: "featureRequests:statuses.in_progress" },
  { value: "completed", labelKey: "featureRequests:statuses.completed" },
];

export default function FeatureRequestsPage() {
  const { t } = useTranslation(["featureRequests", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<FeatureRequestSortBy>("votes");
  const [mine, setMine] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allItems, setAllItems] = useState<FeatureRequest[]>([]);

  const queryKey = [
    "featureRequests",
    statusFilter,
    categoryFilter,
    sort,
    mine,
    cursor,
  ];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      listFeatureRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        sort,
        mine,
        cursor,
      }),
    staleTime: 30 * 1000,
  });

  // Merge paginated results
  const items =
    cursor && allItems.length > 0
      ? [...allItems, ...(data?.items ?? [])]
      : (data?.items ?? []);

  const voteMutation = useMutation({
    mutationFn: (id: string) => toggleVote(id),
    onMutate: async (id: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: FeatureRequest) =>
            item.id === id
              ? {
                  ...item,
                  hasVoted: !item.hasVoted,
                  voteCount: item.hasVoted
                    ? item.voteCount - 1
                    : item.voteCount + 1,
                }
              : item,
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previousData);
      toast({
        title: t("featureRequests:errors.voteFailed"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["featureRequests"] });
    },
  });

  const handleVote = useCallback(
    (id: string) => {
      voteMutation.mutate(id);
    },
    [voteMutation],
  );

  const handleLoadMore = () => {
    if (data?.nextCursor) {
      setAllItems(items);
      setCursor(data.nextCursor);
    }
  };

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCursor(undefined);
    setAllItems([]);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategoryFilter(newCategory);
    setCursor(undefined);
    setAllItems([]);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort as FeatureRequestSortBy);
    setCursor(undefined);
    setAllItems([]);
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold">
              {t("featureRequests:title.page")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("featureRequests:title.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("featureRequests:form.createButton")}
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={handleFilterChange}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters row */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("featureRequests:filters.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("featureRequests:filters.allCategories")}
            </SelectItem>
            <SelectItem value="improvement">
              {t("featureRequests:categories.improvement")}
            </SelectItem>
            <SelectItem value="new_feature">
              {t("featureRequests:categories.new_feature")}
            </SelectItem>
            <SelectItem value="integration">
              {t("featureRequests:categories.integration")}
            </SelectItem>
            <SelectItem value="bug_fix">
              {t("featureRequests:categories.bug_fix")}
            </SelectItem>
            <SelectItem value="other">
              {t("featureRequests:categories.other")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="votes">
              {t("featureRequests:sort.votes")}
            </SelectItem>
            <SelectItem value="newest">
              {t("featureRequests:sort.newest")}
            </SelectItem>
            <SelectItem value="oldest">
              {t("featureRequests:sort.oldest")}
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="mine-toggle"
            checked={mine}
            onCheckedChange={(checked) => {
              setMine(checked);
              setCursor(undefined);
              setAllItems([]);
            }}
          />
          <Label htmlFor="mine-toggle" className="text-sm">
            {t("featureRequests:filters.myRequests")}
          </Label>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("featureRequests:empty.noRequests")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((request) => (
            <FeatureRequestCard
              key={request.id}
              request={request}
              onVote={handleVote}
            />
          ))}

          {data?.nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isFetching}
              >
                {isFetching && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t("common:buttons.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <CreateFeatureRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["featureRequests"] });
        }}
      />
    </div>
  );
}
