import { useState, useCallback } from "react";
import type { RecentPage } from "@/components/CommandPalette/types";

const STORAGE_KEY = "equiduty:recent-pages";
const MAX_RECENT = 5;

function loadRecentPages(): RecentPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: unknown): item is RecentPage =>
          typeof (item as any)?.id === "string" &&
          typeof (item as any)?.href === "string" &&
          typeof (item as any)?.label === "string" &&
          typeof (item as any)?.iconName === "string" &&
          (item as any).href.startsWith("/"),
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecentPages(pages: RecentPage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function useRecentPages() {
  const [recentPages, setRecentPages] = useState<RecentPage[]>(loadRecentPages);

  const addRecentPage = useCallback((page: RecentPage) => {
    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.href !== page.href);
      const next = [page, ...filtered].slice(0, MAX_RECENT);
      saveRecentPages(next);
      return next;
    });
  }, []);

  return { recentPages, addRecentPage } as const;
}
