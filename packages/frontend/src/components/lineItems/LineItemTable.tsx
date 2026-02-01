import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, MoreHorizontal, Receipt, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatOre } from "@/utils/money";
import type { LineItem, LineItemStatus } from "@equiduty/shared";
import { toDate } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

const STATUS_BADGE_VARIANT: Record<
  LineItemStatus,
  "default" | "secondary" | "outline"
> = {
  pending: "default",
  invoiced: "secondary",
  credited: "outline",
};

// ============================================================================
// Props
// ============================================================================

interface LineItemTableProps {
  items: LineItem[];
  isLoading: boolean;
  searchQuery: string;
  onOpenCreate: () => void;
  onOpenEdit: (item: LineItem) => void;
  onDelete: (item: LineItem) => void;
}

// ============================================================================
// Component
// ============================================================================

export function LineItemTable({
  items,
  isLoading,
  searchQuery,
  onOpenCreate,
  onOpenEdit,
  onDelete,
}: LineItemTableProps) {
  const { t } = useTranslation(["invoices", "common"]);

  const formatDate = useCallback((date: LineItem["date"]): string => {
    return toDate(date).toLocaleDateString("sv-SE");
  }, []);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoices:lineItems.table.date")}</TableHead>
              <TableHead>{t("invoices:lineItems.table.member")}</TableHead>
              <TableHead>{t("invoices:lineItems.table.description")}</TableHead>
              <TableHead className="text-right">
                {t("invoices:lineItems.table.quantity")}
              </TableHead>
              <TableHead className="text-right">
                {t("invoices:lineItems.table.unitPrice")}
              </TableHead>
              <TableHead className="text-right">
                {t("invoices:lineItems.table.vatPercent")}
              </TableHead>
              <TableHead className="text-right">
                {t("invoices:lineItems.table.total")}
              </TableHead>
              <TableHead>{t("invoices:lineItems.table.source")}</TableHead>
              <TableHead>{t("common:labels.status", "Status")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? t("common:messages.noResults", "Inga resultat")
                        : t("invoices:lineItems.noItems")}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenCreate}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("invoices:lineItems.createItem")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{item.memberId}</span>
                  </TableCell>
                  <TableCell>
                    <span className="line-clamp-1">{item.description}</span>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatOre(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">{item.vatRate}%</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatOre(item.totalInclVat)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t(`invoices:lineItems.sourceTypes.${item.sourceType}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[item.status]}>
                      {t(`invoices:lineItems.statuses.${item.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.status === "pending" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("invoices:lineItems.actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("invoices:lineItems.actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
