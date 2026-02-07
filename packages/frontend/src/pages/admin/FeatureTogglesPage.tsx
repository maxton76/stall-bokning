import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureToggleCard } from "@/components/admin/FeatureToggleCard";
import type { FeatureToggleMap } from "@equiduty/shared";

/**
 * Admin page for managing global feature toggles and beta access
 * Allows system admins to:
 * - Enable/disable features globally
 * - Manage beta access for specific organizations
 * - View feature rollout status
 */
export function FeatureTogglesPage() {
  const { t } = useTranslation(["admin", "common"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "primary" | "secondary"
  >(() => {
    // Persist tab state in localStorage
    const saved = localStorage.getItem("featureToggles.selectedCategory");
    return (saved as any) || "all";
  });

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem("featureToggles.selectedCategory", selectedCategory);
  }, [selectedCategory]);

  // Fetch feature toggles
  const {
    data: togglesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useApiQuery<{
    success: boolean;
    data: FeatureToggleMap;
  }>(
    ["/admin/feature-toggles"],
    () =>
      apiClient.get<{ success: boolean; data: FeatureToggleMap }>(
        "/admin/feature-toggles",
      ),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  const featureToggles = togglesData?.data || {};
  const togglesArray = Object.values(featureToggles);

  // Optimize search - normalize toggles once for better performance
  const normalizedToggles = useMemo(
    () =>
      togglesArray.map((t) => ({
        ...t,
        _searchable: `${t.name} ${t.key} ${t.description}`.toLowerCase(),
      })),
    [togglesArray],
  );

  // Filter toggles by search and category (memoized)
  const filteredToggles = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return normalizedToggles.filter((toggle) => {
      if (searchQuery && !toggle._searchable.includes(lowerQuery)) {
        return false;
      }
      if (selectedCategory !== "all" && toggle.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [normalizedToggles, searchQuery, selectedCategory]);

  // Group by category (memoized)
  const primaryToggles = useMemo(
    () => filteredToggles.filter((t) => t.category === "primary"),
    [filteredToggles],
  );
  const secondaryToggles = useMemo(
    () => filteredToggles.filter((t) => t.category === "secondary"),
    [filteredToggles],
  );

  // Count enabled/disabled (memoized)
  const { enabledCount, disabledCount } = useMemo(
    () => ({
      enabledCount: togglesArray.filter((t) => t.enabled).length,
      disabledCount: togglesArray.filter((t) => !t.enabled).length,
    }),
    [togglesArray],
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("admin:featureToggles.title", "Feature Toggles")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t(
            "admin:featureToggles.description",
            "Manage global feature availability and beta access",
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">
            {t("admin:featureToggles.totalFeatures", "Total Features")}
          </div>
          <div className="text-2xl font-bold">{togglesArray.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">
            {t("admin:featureToggles.enabled", "Enabled")}
          </div>
          <div className="text-2xl font-bold text-green-600">
            {enabledCount}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">
            {t("admin:featureToggles.disabled", "Disabled")}
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {disabledCount}
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {t(
              "admin:featureToggles.loadError",
              "Failed to load feature toggles",
            )}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {error instanceof Error
                ? error.message
                : t("common:messages.error", "An error occurred")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common:actions.retry", "Retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !isError && togglesArray.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {t("admin:featureToggles.noToggles", "No Feature Toggles Found")}
          </AlertTitle>
          <AlertDescription>
            {t(
              "admin:featureToggles.noTogglesDescription",
              "Feature toggles haven't been initialized yet. Run the initialization script:",
            )}
            <code className="block mt-2 p-2 bg-muted rounded text-sm">
              cd packages/api && npm run init:feature-toggles
            </code>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      {!isError && togglesArray.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <label htmlFor="feature-search" className="sr-only">
              {t("admin:featureToggles.searchLabel", "Search features")}
            </label>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="feature-search"
              placeholder={t(
                "admin:featureToggles.searchPlaceholder",
                "Search features...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label={t(
              "common:actions.refreshAriaLabel",
              "Refresh feature toggles",
            )}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {t("common:actions.refresh", "Refresh")}
          </Button>
        </div>
      )}

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={(v) => setSelectedCategory(v as any)}
      >
        <TabsList>
          <TabsTrigger value="all">
            {t("admin:featureToggles.allFeatures", "All Features")}
            <Badge variant="secondary" className="ml-2">
              {filteredToggles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="primary">
            {t("admin:featureToggles.primaryFeatures", "Primary")}
            <Badge variant="secondary" className="ml-2">
              {primaryToggles.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="secondary">
            {t("admin:featureToggles.secondaryFeatures", "Secondary")}
            <Badge variant="secondary" className="ml-2">
              {secondaryToggles.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {primaryToggles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                {t("admin:featureToggles.primaryFeatures", "Primary Features")}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {primaryToggles.map((toggle) => (
                  <FeatureToggleCard
                    key={toggle.key}
                    toggle={toggle}
                    onUpdate={() => refetch()}
                  />
                ))}
              </div>
            </div>
          )}

          {secondaryToggles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                {t(
                  "admin:featureToggles.secondaryFeatures",
                  "Secondary Features",
                )}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {secondaryToggles.map((toggle) => (
                  <FeatureToggleCard
                    key={toggle.key}
                    toggle={toggle}
                    onUpdate={() => refetch()}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredToggles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t("admin:featureToggles.noResults", "No features found")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="primary" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {primaryToggles.map((toggle) => (
              <FeatureToggleCard
                key={toggle.key}
                toggle={toggle}
                onUpdate={() => refetch()}
              />
            ))}
          </div>
          {primaryToggles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t("admin:featureToggles.noResults", "No features found")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="secondary" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {secondaryToggles.map((toggle) => (
              <FeatureToggleCard
                key={toggle.key}
                toggle={toggle}
                onUpdate={() => refetch()}
              />
            ))}
          </div>
          {secondaryToggles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t("admin:featureToggles.noResults", "No features found")}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FeatureTogglesPage;
