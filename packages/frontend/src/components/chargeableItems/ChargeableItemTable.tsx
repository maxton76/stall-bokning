import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  MoreHorizontal,
  Package,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { ChargeableItem, ChargeableItemCategory } from "@equiduty/shared";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS: ChargeableItemCategory[] = [
  "activity",
  "booking",
  "service",
  "recurring",
  "package",
];

// ============================================================================
// Props
// ============================================================================

interface ChargeableItemTableProps {
  items: ChargeableItem[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: ChargeableItemCategory | "all";
  onCategoryFilterChange: (value: ChargeableItemCategory | "all") => void;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: ChargeableItem) => void;
  onToggleActive: (item: ChargeableItem) => void;
  onDelete: (item: ChargeableItem) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ChargeableItemTable({
  items,
  isLoading,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  showInactive,
  onShowInactiveChange,
  onOpenCreate,
  onOpenEdit,
  onToggleActive,
  onDelete,
}: ChargeableItemTableProps) {
  const { t } = useTranslation(["invoices", "common"]);

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common:search.placeholder", "Sök...")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(value) =>
            onCategoryFilterChange(value as ChargeableItemCategory | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={t("invoices:chargeableItems.allCategories")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("invoices:chargeableItems.allCategories")}
            </SelectItem>
            {CATEGORY_OPTIONS.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`invoices:chargeableItems.categories.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? "secondary" : "outline"}
          size="sm"
          onClick={() => onShowInactiveChange(!showInactive)}
        >
          {showInactive
            ? t("invoices:chargeableItems.showAll")
            : t("invoices:chargeableItems.showInactive")}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("invoices:chargeableItems.table.name")}
                </TableHead>
                <TableHead>
                  {t("invoices:chargeableItems.table.category")}
                </TableHead>
                <TableHead>
                  {t("invoices:chargeableItems.table.unitType")}
                </TableHead>
                <TableHead className="text-right">
                  {t("invoices:chargeableItems.table.price")}
                </TableHead>
                <TableHead className="text-right">
                  {t("invoices:chargeableItems.table.vat")}
                </TableHead>
                <TableHead>{t("common:labels.status", "Status")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? t("common:messages.noResults", "Inga resultat")
                          : t("invoices:chargeableItems.noItems")}
                      </p>
                      {!searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onOpenCreate}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t("invoices:chargeableItems.addItem")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={!item.isActive ? "opacity-60" : undefined}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {t(
                        `invoices:chargeableItems.categories.${item.category}`,
                      )}
                    </TableCell>
                    <TableCell>
                      {t(`invoices:chargeableItems.unitTypes.${item.unitType}`)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatOre(item.defaultUnitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.vatRate}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive
                          ? t("invoices:chargeableItems.statusLabels.active")
                          : t("invoices:chargeableItems.statusLabels.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("invoices:chargeableItems.actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onToggleActive(item)}
                          >
                            {item.isActive ? (
                              <>
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                {t(
                                  "invoices:chargeableItems.actions.deactivate",
                                )}
                              </>
                            ) : (
                              <>
                                <ToggleRight className="mr-2 h-4 w-4" />
                                {t("invoices:chargeableItems.actions.activate")}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("invoices:chargeableItems.actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
