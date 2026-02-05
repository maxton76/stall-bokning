import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Plus,
  Users,
  Plug,
  Tractor,
  Shield,
  CreditCard,
  Settings2,
  ChevronDown,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DropdownEmptyState,
  DropdownLoadingState,
} from "@/components/ui/dropdown-states";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getUserOrganizations } from "@/services/organizationService";
import type { Organization } from "@equiduty/shared";

export function OrganizationsDropdown() {
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "organizations"]);
  const { user } = useAuth();
  const { currentOrganizationId, setCurrentOrganizationId } =
    useOrganizationContext();

  const organizationsQuery = useApiQuery<Organization[]>(
    queryKeys.organizations.list(user?.uid || ""),
    () => getUserOrganizations(user!.uid),
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
    },
  );
  const organizationsData = organizationsQuery.data;
  const organizationsLoading = organizationsQuery.isLoading;

  // Separate personal and business organizations
  const { personalOrgs, businessOrgs, visibleOrgs } = useMemo(() => {
    if (!organizationsData) {
      return { personalOrgs: [], businessOrgs: [], visibleOrgs: [] };
    }

    const personal = organizationsData.filter(
      (org) => org.organizationType === "personal",
    );
    const business = organizationsData.filter(
      (org) => org.organizationType !== "personal",
    );

    // Filter out personal orgs that should be hidden
    // Hide if: hideWhenEmpty is true AND user has business orgs
    const visiblePersonal = personal.filter((org) => {
      // Always show if it's the currently selected org
      if (org.id === currentOrganizationId) return true;
      // Hide if marked as hideWhenEmpty and user has other orgs
      if (org.hideWhenEmpty && business.length > 0) return false;
      return true;
    });

    return {
      personalOrgs: personal,
      businessOrgs: business,
      visibleOrgs: [...visiblePersonal, ...business],
    };
  }, [organizationsData, currentOrganizationId]);

  // Auto-select organization if user only has one visible org
  useEffect(() => {
    if (visibleOrgs.length === 1 && !currentOrganizationId) {
      setCurrentOrganizationId(visibleOrgs[0]!.id);
    }
  }, [visibleOrgs, currentOrganizationId, setCurrentOrganizationId]);

  // Find current organization for display
  const currentOrganization = organizationsData?.find(
    (org) => org.id === currentOrganizationId,
  );
  // Use displayName if available, otherwise fall back to name
  const displayName =
    currentOrganization?.displayName ||
    currentOrganization?.name ||
    t("common:navigation.organizations");

  // Helper to get organization display name
  const getOrgDisplayName = (org: Organization) => {
    return org.displayName || org.name;
  };

  const handleOrganizationClick = (orgId: string) => {
    setCurrentOrganizationId(orgId);
    // Don't navigate - just set as active so the menu appears
  };

  // Don't show dropdown if user only has one visible organization
  if (visibleOrgs.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{displayName}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="start" side="right">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel>
            {t("organizations:dropdown.title")}
          </DropdownMenuLabel>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/organizations/create")}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("organizations:dropdown.create")}
          </Button>
        </div>

        <DropdownMenuSeparator />

        {organizationsLoading ? (
          <DropdownLoadingState message={t("organizations:dropdown.loading")} />
        ) : (
          <>
            {/* Organizations List */}
            {visibleOrgs.length > 0 ? (
              <>
                {/* Business Organizations */}
                {businessOrgs.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {t("organizations:switcher.businessOrganizations")}
                    </DropdownMenuLabel>
                    {businessOrgs.map((org) => (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleOrganizationClick(org.id)}
                        className={
                          currentOrganizationId === org.id ? "bg-accent" : ""
                        }
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        <span className="flex-1">{getOrgDisplayName(org)}</span>
                        {currentOrganizationId === org.id && (
                          <Badge variant="default" className="ml-2">
                            {t("organizations:switcher.active")}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                )}

                {/* Personal Organizations - only show if visible */}
                {visibleOrgs.some(
                  (org) => org.organizationType === "personal",
                ) && (
                  <DropdownMenuGroup>
                    {businessOrgs.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {t("organizations:switcher.personal")}
                    </DropdownMenuLabel>
                    {visibleOrgs
                      .filter((org) => org.organizationType === "personal")
                      .map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() => handleOrganizationClick(org.id)}
                          className={
                            currentOrganizationId === org.id ? "bg-accent" : ""
                          }
                        >
                          <User className="mr-2 h-4 w-4" />
                          <span className="flex-1">
                            {getOrgDisplayName(org)}
                          </span>
                          {currentOrganizationId === org.id && (
                            <Badge variant="default" className="ml-2">
                              {t("organizations:switcher.active")}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuGroup>
                )}

                {/* Organization Submenu - Only show if an organization is selected */}
                {currentOrganizationId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t("organizations:dropdown.menu")}
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(
                            `/organizations/${currentOrganizationId}/users`,
                          )
                        }
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {t("organizations:menu.members")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(
                            `/organizations/${currentOrganizationId}/integrations`,
                          )
                        }
                      >
                        <Plug className="mr-2 h-4 w-4" />
                        {t("organizations:menu.integrations")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(
                            `/organizations/${currentOrganizationId}/manure`,
                          )
                        }
                      >
                        <Tractor className="mr-2 h-4 w-4" />
                        {t("organizations:menu.manure")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(
                            `/organizations/${currentOrganizationId}/permissions`,
                          )
                        }
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {t("organizations:menu.permissions")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(
                            `/organizations/${currentOrganizationId}/subscription`,
                          )
                        }
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {t("organizations:menu.subscription")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(
                            `/organizations/${currentOrganizationId}/settings`,
                          )
                        }
                      >
                        <Settings2 className="mr-2 h-4 w-4" />
                        {t("organizations:menu.settings")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}

                <DropdownMenuSeparator />
              </>
            ) : (
              <DropdownEmptyState
                icon={Building2}
                message={t("organizations:dropdown.noOrganizations")}
                action={{
                  label: t("organizations:dropdown.createFirst"),
                  icon: Plus,
                  onClick: () => navigate("/organizations/create"),
                }}
              />
            )}
          </>
        )}

        {/* Footer */}
        <DropdownMenuItem onClick={() => navigate("/organizations")}>
          <Building2 className="mr-2 h-4 w-4" />
          {t("organizations:dropdown.viewAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
