import { useMemo, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useFeatureToggle } from "./useFeatureToggle";
import {
  mainNavigation,
  createOrganizationNavigation,
  findActiveNavigationItem,
  isItemActive,
} from "@/config/navigation";
import type {
  NavigationItem,
  NavigationSubItem,
  OrganizationNavigation,
} from "@/config/navigation.types";

export interface TranslatedNavigationSubItem extends Omit<
  NavigationSubItem,
  "labelKey"
> {
  label: string;
  labelKey: string;
}

export interface TranslatedNavigationItem extends Omit<
  NavigationItem,
  "labelKey" | "subItems"
> {
  label: string;
  labelKey: string;
  subItems?: TranslatedNavigationSubItem[];
}

export interface TranslatedOrganizationNavigation extends Omit<
  OrganizationNavigation,
  "labelKey" | "subItems"
> {
  label: string;
  labelKey: string;
  subItems: TranslatedNavigationSubItem[];
}

export interface UseNavigationReturn {
  /** Main navigation items with translated labels */
  navigation: TranslatedNavigationItem[];
  /** Organization navigation items (if organization is selected) */
  organizationNavigation: TranslatedOrganizationNavigation[];
  /** Currently expanded accordion item ID */
  expandedItem: string | null;
  /** Toggle accordion item */
  toggleItem: (itemId: string) => void;
  /** Check if a path is active */
  isActive: (href: string) => boolean;
  /** Current pathname */
  pathname: string;
}

/**
 * Hook for managing navigation state and providing translated navigation items
 */
export function useNavigation(): UseNavigationReturn {
  const location = useLocation();
  const { t } = useTranslation(["common", "organizations"]);
  const { currentOrganizationId } = useOrganizationContext();
  const { isFeatureEnabled } = useFeatureToggle();
  const { addons, organizationType } = useSubscription();

  // Filter navigation items by module flag, addon flag, and organization type
  const filteredNavigation = useMemo(() => {
    return mainNavigation
      .filter((item) => {
        // Filter by module flag using new feature toggle system
        if (item.moduleFlag && !isFeatureEnabled(item.moduleFlag)) return false;
        // Filter by addon flag using new feature toggle system
        if (item.addonFlag && !isFeatureEnabled(item.addonFlag)) return false;
        // Filter by organization type (default: "any")
        if (item.visibleForOrgType && item.visibleForOrgType !== "any") {
          // If org type is not yet loaded, show all items (loading state)
          if (!organizationType) return true;
          if (item.visibleForOrgType !== organizationType) return false;
        }
        return true;
      })
      .map((item) => {
        // Also filter sub-items by module flag and organization type
        if (!item.subItems) return item;
        return {
          ...item,
          subItems: item.subItems.filter((subItem) => {
            // Filter by module flag
            if (subItem.moduleFlag && !isFeatureEnabled(subItem.moduleFlag))
              return false;
            // Filter by addon flag
            if (subItem.addonFlag && !isFeatureEnabled(subItem.addonFlag))
              return false;
            // Filter by organization type
            if (
              subItem.visibleForOrgType &&
              subItem.visibleForOrgType !== "any"
            ) {
              // If org type is not yet loaded, show all items (loading state)
              if (!organizationType) return true;
              if (subItem.visibleForOrgType !== organizationType) return false;
            }
            return true;
          }),
        };
      });
  }, [isFeatureEnabled, organizationType]);

  // Create organization navigation items (filtered by addon/module/role)
  const orgNavItems = useMemo(() => {
    const items = createOrganizationNavigation(currentOrganizationId);
    return items
      .filter((item) => {
        // Filter by module flag
        if (item.moduleFlag && !isFeatureEnabled(item.moduleFlag)) return false;
        // Filter by addon flag
        if (item.addonFlag && !isFeatureEnabled(item.addonFlag)) return false;
        return true;
      })
      .map((item) => {
        // Also filter sub-items
        if (!item.subItems) return item;
        return {
          ...item,
          subItems: item.subItems.filter((subItem) => {
            // Filter by module flag
            if (subItem.moduleFlag && !isFeatureEnabled(subItem.moduleFlag))
              return false;
            // Filter by addon flag
            if (subItem.addonFlag && !isFeatureEnabled(subItem.addonFlag))
              return false;
            return true;
          }),
        };
      });
  }, [currentOrganizationId, isFeatureEnabled]);

  // Initialize expanded state based on current path
  const [expandedItem, setExpandedItem] = useState<string | null>(() => {
    return findActiveNavigationItem(
      location.pathname,
      filteredNavigation,
      orgNavItems,
    );
  });

  // Sync expandedItem with location changes to ensure navigation works correctly
  useEffect(() => {
    const activeItem = findActiveNavigationItem(
      location.pathname,
      filteredNavigation,
      orgNavItems,
    );
    if (activeItem !== null) {
      setExpandedItem(activeItem);
    }
  }, [location.pathname, filteredNavigation, orgNavItems]);

  // Create translated navigation items
  const navigation = useMemo((): TranslatedNavigationItem[] => {
    return filteredNavigation.map((item) => ({
      ...item,
      label: t(item.labelKey),
      subItems: item.subItems?.map((subItem) => ({
        ...subItem,
        label: t(subItem.labelKey),
      })),
    }));
  }, [t, filteredNavigation]);

  // Create translated organization navigation
  const organizationNavigation =
    useMemo((): TranslatedOrganizationNavigation[] => {
      return orgNavItems.map((item) => ({
        ...item,
        label: t(item.labelKey),
        subItems: item.subItems.map((subItem) => ({
          ...subItem,
          label: t(subItem.labelKey),
        })),
      }));
    }, [orgNavItems, t]);

  // Toggle accordion item
  const toggleItem = useCallback((itemId: string) => {
    setExpandedItem((current) => (current === itemId ? null : itemId));
  }, []);

  // Check if path is active
  const isActive = useCallback(
    (href: string) => isItemActive(href, location.pathname),
    [location.pathname],
  );

  return {
    navigation,
    organizationNavigation,
    expandedItem,
    toggleItem,
    isActive,
    pathname: location.pathname,
  };
}
