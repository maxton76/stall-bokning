import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandRegistry } from "./useCommandRegistry";
import { useRecentPages } from "@/hooks/useRecentPages";
import { getIconByName, getIconName } from "./iconMap";
import type { CommandItem as CommandItemType } from "./types";

interface InlineSearchProps {
  searchQuery: string;
  onSelect: () => void;
}

export function InlineSearch({ searchQuery, onSelect }: InlineSearchProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);
  const commands = useCommandRegistry();
  const { recentPages, addRecentPage } = useRecentPages();

  const handleSelect = (item: CommandItemType) => {
    addRecentPage({
      id: item.id,
      href: item.href,
      label: item.label,
      iconName: getIconName(item.icon),
    });
    onSelect();
    navigate(item.href);
  };

  const navigationCommands = commands.filter((c) => c.group === "navigation");
  const organizationCommands = commands.filter(
    (c) => c.group === "organization",
  );

  return (
    <Command>
      {/* Hidden input syncs the external searchQuery into cmdk's filter */}
      <CommandInput
        value={searchQuery}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <CommandList className="max-h-[50vh]">
        <CommandEmpty>{t("common:search.noResults")}</CommandEmpty>

        {/* Recent group — only when search is empty */}
        {!searchQuery && recentPages.length > 0 && (
          <CommandGroup heading={t("common:search.recent")}>
            {recentPages.map((page) => {
              const Icon = getIconByName(page.iconName);
              return (
                <CommandItem
                  key={`recent-${page.id}`}
                  value={`recent ${page.label} ${page.href}`}
                  onSelect={() => {
                    const cmd = commands.find((c) => c.href === page.href);
                    if (cmd) {
                      handleSelect(cmd);
                    } else {
                      if (!page.href.startsWith("/")) return;
                      onSelect();
                      navigate(page.href);
                    }
                  }}
                >
                  <Clock className="size-4 text-muted-foreground" />
                  <Icon className="size-4" />
                  <span>{page.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Navigation group */}
        {navigationCommands.length > 0 && (
          <CommandGroup heading={t("common:search.navigation")}>
            {navigationCommands.map((item) => (
              <CommandItem
                key={item.id}
                value={item.searchTerms.join(" ")}
                onSelect={() => handleSelect(item)}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Organization group */}
        {organizationCommands.length > 0 && (
          <CommandGroup heading={t("common:search.organization")}>
            {organizationCommands.map((item) => (
              <CommandItem
                key={item.id}
                value={item.searchTerms.join(" ")}
                onSelect={() => handleSelect(item)}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
