import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "lucide-react";
import { useCommandRegistry } from "@/components/CommandPalette/useCommandRegistry";
import { useRecentPages } from "@/hooks/useRecentPages";
import { getIconName } from "@/components/CommandPalette/iconMap";
import type { CommandItem } from "@/components/CommandPalette/types";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);
  const commands = useCommandRegistry();
  const { addRecentPage } = useRecentPages();

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const lowerQuery = query.toLowerCase().trim();
  const filtered = lowerQuery
    ? commands.filter((cmd) =>
        cmd.searchTerms.some((term) => term.toLowerCase().includes(lowerQuery)),
      )
    : [];

  const navigationResults = filtered.filter((c) => c.group === "navigation");
  const organizationResults = filtered.filter(
    (c) => c.group === "organization",
  );

  const handleClick = (item: CommandItem) => {
    addRecentPage({
      id: item.id,
      href: item.href,
      label: item.label,
      iconName: getIconName(item.icon),
    });
    navigate(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`, {
        replace: true,
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-ring mb-6">
        <SearchIcon className="size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("common:search.placeholder")}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoFocus
        />
      </div>

      {/* Results header */}
      {lowerQuery && (
        <p className="text-sm text-muted-foreground mb-4">
          {t("common:search.resultsFor")} &ldquo;{query.trim()}&rdquo;
          {" — "}
          {t("common:search.resultsCount", { count: filtered.length })}
        </p>
      )}

      {/* Empty state */}
      {lowerQuery && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t("common:search.noResults")}
        </p>
      )}

      {/* No query state */}
      {!lowerQuery && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t("common:search.placeholder")}
        </p>
      )}

      {/* Navigation results */}
      {navigationResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {t("common:search.navigation")}
          </h2>
          <ul className="space-y-1">
            {navigationResults.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>
                    <HighlightMatch text={item.label} query={query.trim()} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Organization results */}
      {organizationResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {t("common:search.organization")}
          </h2>
          <ul className="space-y-1">
            {organizationResults.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>
                    <HighlightMatch text={item.label} query={query.trim()} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
