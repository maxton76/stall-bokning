import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@/hooks/useNavigation";
import type { CommandItem } from "./types";

/**
 * Builds the full command list from navigation config with bilingual search terms.
 * Items are filtered by module flag availability.
 */
export function useCommandRegistry(): CommandItem[] {
  const { i18n } = useTranslation();
  const { navigation, organizationNavigation } = useNavigation();

  return useMemo(() => {
    const commands: CommandItem[] = [];

    // Build search terms for a label key — both languages
    const buildSearchTerms = (
      labelKey: string,
      parentLabelKey?: string,
    ): string[] => {
      const terms: string[] = [
        i18n.t(labelKey, { lng: "sv" }),
        i18n.t(labelKey, { lng: "en" }),
      ];
      if (parentLabelKey) {
        terms.push(
          `${i18n.t(parentLabelKey, { lng: "sv" })} ${i18n.t(labelKey, { lng: "sv" })}`,
          `${i18n.t(parentLabelKey, { lng: "en" })} ${i18n.t(labelKey, { lng: "en" })}`,
        );
      }
      return terms;
    };

    // Process main navigation
    for (const item of navigation) {
      // Top-level item (only if no sub-items, or as a direct link)
      if (!item.subItems || item.subItems.length === 0) {
        commands.push({
          id: item.id,
          label: item.label,
          searchTerms: buildSearchTerms(item.labelKey),
          icon: item.icon,
          group: "navigation",
          href: item.href,
        });
      }

      // Sub-items
      if (item.subItems) {
        for (const subItem of item.subItems) {
          commands.push({
            id: subItem.id,
            label: `${item.label} — ${subItem.label}`,
            searchTerms: buildSearchTerms(subItem.labelKey, item.labelKey),
            icon: subItem.icon,
            group: "navigation",
            href: subItem.href,
          });
        }
      }
    }

    // Process organization navigation
    for (const orgItem of organizationNavigation) {
      for (const subItem of orgItem.subItems) {
        commands.push({
          id: subItem.id,
          label: `${orgItem.label} — ${subItem.label}`,
          searchTerms: buildSearchTerms(subItem.labelKey, orgItem.labelKey),
          icon: subItem.icon,
          group: "organization",
          href: subItem.href,
        });
      }
    }

    return commands;
  }, [navigation, organizationNavigation, i18n.language]);
}
