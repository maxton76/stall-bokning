import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Search, X, Plus, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { apiClient } from "@/lib/apiClient";
import type { Organization } from "@equiduty/shared";

interface BetaAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureKey: string;
  featureName: string;
}

/**
 * Dialog for managing which organizations have beta access to a feature
 * Allows adding/removing organizations from the beta features list
 */
export function BetaAccessDialog({
  open,
  onOpenChange,
  featureKey,
  featureName,
}: BetaAccessDialogProps) {
  const { t } = useTranslation(["admin", "common"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch all organizations
  const {
    data: orgsData,
    isLoading,
    refetch,
  } = useApiQuery<{
    success: boolean;
    data: Organization[];
  }>(
    ["/admin/organizations"],
    () =>
      apiClient.get<{ success: boolean; data: Organization[] }>(
        "/admin/organizations",
      ),
    {
      enabled: open,
    },
  );

  const allOrganizations = orgsData?.data || [];

  // Filter organizations with beta access to this feature (memoized)
  const organizationsWithBetaAccess = useMemo(
    () =>
      allOrganizations.filter((org) => org.betaFeatures?.includes(featureKey)),
    [allOrganizations, featureKey],
  );

  // Filter organizations for search (excluding those with beta access) (memoized)
  const searchResults = useMemo(
    () =>
      allOrganizations
        .filter((org) => !org.betaFeatures?.includes(featureKey))
        .filter(
          (org) =>
            !searchQuery ||
            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.id.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .slice(0, 10),
    [allOrganizations, featureKey, searchQuery],
  );

  // Mutation for updating organization beta features
  const updateOrgBetaFeatures = useApiMutation(
    async ({
      orgId,
      betaFeatures,
    }: {
      orgId: string;
      betaFeatures: string[];
    }) => {
      return apiClient.put(
        `/admin/organizations/${encodeURIComponent(orgId)}/beta-features`,
        { betaFeatures },
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/admin/organizations"] });
        queryClient.invalidateQueries({ queryKey: ["/admin/feature-toggles"] });
      },
      onError: (error) => {
        toast({
          title: t("common:messages.error", "Error"),
          description:
            error instanceof Error
              ? error.message
              : t(
                  "admin:betaAccess.updateError",
                  "Failed to update beta access",
                ),
          variant: "destructive",
        });
      },
    },
  );

  const handleAddOrganization = (org: Organization) => {
    const currentBetaFeatures = org.betaFeatures || [];

    // Prevent duplicates
    if (currentBetaFeatures.includes(featureKey)) {
      toast({
        title: t("admin:betaAccess.alreadyAdded", "Already has access"),
        description: t(
          "admin:betaAccess.alreadyAddedDescription",
          "Organization already has beta access",
        ),
      });
      return;
    }

    const updatedBetaFeatures = [...currentBetaFeatures, featureKey];
    updateOrgBetaFeatures.mutate({
      orgId: org.id,
      betaFeatures: updatedBetaFeatures,
    });
    setSearchInput("");
    setSearchQuery("");
  };

  const handleRemoveOrganization = (org: Organization) => {
    const confirmMessage = t(
      "admin:betaAccess.confirmRemove",
      "Remove {{org}} from beta access? This will immediately disable {{feature}} for this organization.",
      { org: org.name, feature: featureName },
    );

    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    const currentBetaFeatures = org.betaFeatures || [];
    const updatedBetaFeatures = currentBetaFeatures.filter(
      (key) => key !== featureKey,
    );

    updateOrgBetaFeatures.mutate({
      orgId: org.id,
      betaFeatures: updatedBetaFeatures,
    });
  };

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setSearchQuery("");
    }
  }, [open]);

  // Cleanup pending queries if component unmounts
  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey: ["/admin/organizations"] });
    };
  }, [queryClient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("admin:betaAccess.title", "Beta Access Management")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "admin:betaAccess.description",
              "Manage which organizations have beta access to {{feature}}",
              { feature: featureName },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                {t("common:loading", "Loading organizations...")}
              </span>
            </div>
          )}

          {/* Current Beta Organizations */}
          {!isLoading && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                {t(
                  "admin:betaAccess.currentBetaOrgs",
                  "Organizations with Beta Access",
                )}{" "}
                <Badge variant="secondary" className="ml-2">
                  {organizationsWithBetaAccess.length}
                </Badge>
              </h3>
              {organizationsWithBetaAccess.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                  {t(
                    "admin:betaAccess.noBetaOrgs",
                    "No organizations have beta access yet",
                  )}
                </div>
              ) : (
                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-2">
                    {organizationsWithBetaAccess.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                      >
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {org.id}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOrganization(org)}
                          disabled={updateOrgBetaFeatures.isPending}
                          aria-label={t(
                            "admin:betaAccess.removeOrgAriaLabel",
                            "Remove {{org}} from beta access",
                            { org: org.name },
                          )}
                        >
                          {updateOrgBetaFeatures.isPending ? (
                            <RefreshCw
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <X className="h-4 w-4" aria-hidden="true" />
                          )}
                          <span className="sr-only">
                            {t("admin:betaAccess.remove", "Remove")}
                          </span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Add Organization Search */}
          {!isLoading && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                {t("admin:betaAccess.addOrganization", "Add Organization")}
              </h3>
              <label htmlFor="org-search" className="sr-only">
                {t("admin:betaAccess.searchLabel", "Search organizations")}
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="org-search"
                  placeholder={t(
                    "admin:betaAccess.searchPlaceholder",
                    "Search organizations...",
                  )}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Live region for search results announcement */}
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {searchQuery && (
                  <>
                    {searchResults.length > 0
                      ? t(
                          "admin:betaAccess.searchResultsAnnounce",
                          "Found {{count}} organizations",
                          { count: searchResults.length },
                        )
                      : t(
                          "admin:betaAccess.noResultsAnnounce",
                          "No organizations found",
                        )}
                  </>
                )}
              </div>

              {/* Search Results */}
              {searchQuery && (
                <ScrollArea className="h-48 border rounded-lg p-2 mt-2">
                  {searchResults.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      {t(
                        "admin:betaAccess.noResults",
                        "No organizations found",
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                        >
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {org.id}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddOrganization(org)}
                            disabled={updateOrgBetaFeatures.isPending}
                            aria-label={t(
                              "admin:betaAccess.addOrgAriaLabel",
                              "Add {{org}} to beta access",
                              { org: org.name },
                            )}
                          >
                            {updateOrgBetaFeatures.isPending ? (
                              <RefreshCw
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {t("admin:betaAccess.add", "Add")}
                            </span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:actions.close", "Close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
