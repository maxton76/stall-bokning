import { useMemo, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
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
  const { isFeatureAvailable, addons } = useSubscription();

  // Filter navigation items by module flag and addon flag availability
  const filteredNavigation = useMemo(() => {
    return mainNavigation.filter((item) => {
      if (item.moduleFlag && !isFeatureAvailable(item.moduleFlag)) return false;
      if (item.addonFlag && !addons[item.addonFlag]) return false;
      return true;
    });
  }, [isFeatureAvailable, addons]);

  // Create organization navigation items (filtered by addon/role)
  const orgNavItems = useMemo(() => {
    const items = createOrganizationNavigation(currentOrganizationId);
    return items.filter((item) => {
      if (item.addonFlag && !addons[item.addonFlag]) return false;
      return true;
    });
  }, [currentOrganizationId, addons]);

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
