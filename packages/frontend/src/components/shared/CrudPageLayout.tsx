import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Standard layout wrapper for CRUD pages with table/dialog/filters pattern.
 *
 * Provides consistent structure for MVP2 pages like LineItemsPage,
 * PackagesPage, ChargeableItemsPage, BillingGroupsPage, etc.
 *
 * @example
 * ```tsx
 * <CrudPageLayout
 *   title={t("invoices:lineItems.title")}
 *   description={t("invoices:lineItems.description")}
 *   headerActions={<Button onClick={handleCreate}>Create</Button>}
 *   filters={<SearchInput ... />}
 * >
 *   <Table>...</Table>
 *   <Dialog>...</Dialog>
 * </CrudPageLayout>
 * ```
 */

interface CrudPageLayoutProps {
  /** Page title */
  title: string;
  /** Page description shown below title */
  description?: string;
  /** Action buttons rendered in the header (right side) */
  headerActions?: ReactNode;
  /** Filter controls rendered between header and content */
  filters?: ReactNode;
  /** Main content (table, dialogs, etc.) */
  children: ReactNode;
  /** Fallback shown when no organization is selected */
  noOrganization?: boolean;
}

export function CrudPageLayout({
  title,
  description,
  headerActions,
  filters,
  children,
  noOrganization = false,
}: CrudPageLayoutProps) {
  const { t } = useTranslation(["common"]);

  if (noOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:labels.selectStable", "Valj en organisation")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </div>

      {/* Filters */}
      {filters && (
        <div className="flex flex-wrap items-center gap-4">{filters}</div>
      )}

      {/* Content (table, dialogs, etc.) */}
      {children}
    </div>
  );
}
