import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings2,
  Trash2,
  History,
  Phone,
  Search,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { useToast } from "@/hooks/use-toast";
import { useUserStables } from "@/hooks/useUserStables";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getStableInventory,
  getInventorySummary,
  deleteInventoryItem,
} from "@/services/inventoryService";
import { RestockDialog } from "@/components/inventory/RestockDialog";
import { UsageDialog } from "@/components/inventory/UsageDialog";
import { AdjustmentDialog } from "@/components/inventory/AdjustmentDialog";
import { TransactionHistoryDialog } from "@/components/inventory/TransactionHistoryDialog";
import { CreateInventoryDialog } from "@/components/inventory/CreateInventoryDialog";
import { InventoryAlertsCard } from "@/components/inventory/InventoryAlertsCard";
import type {
  FeedInventory,
  InventoryStatus,
  InventorySummary as ISummary,
} from "@stall-bokning/shared";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | InventoryStatus;

function StatusBadge({ status }: { status: InventoryStatus }) {
  const { t } = useTranslation("inventory");

  const variants: Record<
    InventoryStatus,
    { className: string; label: string }
  > = {
    "in-stock": {
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
      label: t("status.inStock"),
    },
    "low-stock": {
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
      label: t("status.lowStock"),
    },
    "out-of-stock": {
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
      label: t("status.outOfStock"),
    },
  };

  const config = variants[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

function InventoryRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8" />
      </TableCell>
    </TableRow>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "warning" | "error" | "success";
}) {
  const variantStyles = {
    default: "text-muted-foreground",
    warning: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
    success: "text-green-600 dark:text-green-400",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div
            className={cn("rounded-lg p-2 bg-muted", variantStyles[variant])}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryPage() {
  const { t } = useTranslation(["inventory", "common"]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // State
  const [selectedStableId, setSelectedStableId] = useState<string | null>(null);

  // Get the selected stable's organizationId
  const selectedStable = stables.find((s) => s.id === selectedStableId);
  const organizationId = selectedStable?.organizationId;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const createDialog = useDialog();
  const restockDialog = useDialog<FeedInventory>();
  const usageDialog = useDialog<FeedInventory>();
  const adjustmentDialog = useDialog<FeedInventory>();
  const historyDialog = useDialog<FeedInventory>();
  const [deleteItem, setDeleteItem] = useState<FeedInventory | null>(null);

  // Data loading with TanStack Query
  const status = statusFilter === "all" ? undefined : statusFilter;
  const inventoryQuery = useApiQuery<FeedInventory[]>(
    queryKeys.inventory.byStable(selectedStableId || "", status),
    () => getStableInventory(selectedStableId!, status),
    {
      enabled: !!selectedStableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const inventoryData = inventoryQuery.data ?? [];
  const inventoryLoading = inventoryQuery.isLoading;

  const summaryQuery = useApiQuery<ISummary>(
    queryKeys.inventory.summary(selectedStableId || ""),
    () => getInventorySummary(selectedStableId!),
    {
      enabled: !!selectedStableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const summaryData = summaryQuery.data ?? null;

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id);
    }
  }, [stables, selectedStableId]);

  // Filter inventory by search
  const filteredInventory = useMemo(
    () =>
      inventoryData.filter((item) => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
          item.feedTypeName.toLowerCase().includes(searchLower) ||
          item.storageLocation?.toLowerCase().includes(searchLower) ||
          item.supplierName?.toLowerCase().includes(searchLower)
        );
      }),
    [inventoryData, searchQuery],
  );

  // Handle delete
  const handleDelete = async (item: FeedInventory) => {
    try {
      await deleteInventoryItem(item.id);
      toast({
        title: t("inventory:messages.deleteSuccess"),
      });
      await cacheInvalidation.inventory.all();
    } catch {
      toast({
        title: t("inventory:errors.deleteFailed"),
        variant: "destructive",
      });
    } finally {
      setDeleteItem(null);
    }
  };

  // Handle successful operations
  const handleOperationSuccess = async () => {
    await cacheInvalidation.inventory.all();
  };

  // Format currency
  const formatCurrency = (amount: number, currency = "SEK") => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("inventory:title")}
        description={t("inventory:description")}
      />

      {/* Stable Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">
              {t("common:labels.stable")}
            </label>
            <Select
              value={selectedStableId || ""}
              onValueChange={setSelectedStableId}
              disabled={stablesLoading}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={t("common:labels.selectStable")} />
              </SelectTrigger>
              <SelectContent>
                {stables.map((stable) => (
                  <SelectItem key={stable.id} value={stable.id}>
                    {stable.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedStableId && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              title={t("inventory:summary.totalItems")}
              value={summaryData?.totalItems ?? "-"}
              icon={Package}
            />
            <SummaryCard
              title={t("inventory:summary.lowStockItems")}
              value={summaryData?.lowStockCount ?? "-"}
              icon={AlertTriangle}
              variant={summaryData?.lowStockCount ? "warning" : "default"}
            />
            <SummaryCard
              title={t("inventory:summary.outOfStockItems")}
              value={summaryData?.outOfStockCount ?? "-"}
              icon={AlertTriangle}
              variant={summaryData?.outOfStockCount ? "error" : "default"}
            />
            <SummaryCard
              title={t("inventory:summary.expiringSoon")}
              value={summaryData?.expiringSoonCount ?? "-"}
              icon={AlertTriangle}
              variant={summaryData?.expiringSoonCount ? "warning" : "default"}
            />
            <SummaryCard
              title={t("inventory:summary.totalValue")}
              value={summaryData ? formatCurrency(summaryData.totalValue) : "-"}
              icon={Package}
              variant="success"
            />
          </div>

          {/* Alerts Card */}
          {summaryData?.alerts && summaryData.alerts.length > 0 && (
            <InventoryAlertsCard
              alerts={summaryData.alerts}
              onAcknowledge={async () => {
                await cacheInvalidation.inventory.all();
              }}
            />
          )}

          {/* Inventory List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("inventory:list.title")}</CardTitle>
                  <CardDescription>
                    {filteredInventory.length} {t("common:labels.items")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await cacheInvalidation.inventory.all();
                    }}
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        inventoryLoading && "animate-spin",
                      )}
                    />
                  </Button>
                  <Button onClick={() => createDialog.openDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("inventory:list.addItem")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("common:search.placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as StatusFilter)
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("inventory:filters.all")}
                    </SelectItem>
                    <SelectItem value="in-stock">
                      {t("inventory:filters.inStock")}
                    </SelectItem>
                    <SelectItem value="low-stock">
                      {t("inventory:filters.lowStock")}
                    </SelectItem>
                    <SelectItem value="out-of-stock">
                      {t("inventory:filters.outOfStock")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("inventory:fields.feedType")}</TableHead>
                      <TableHead className="text-right">
                        {t("inventory:fields.quantity")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("inventory:fields.minimumStockLevel")}
                      </TableHead>
                      <TableHead>{t("common:labels.status")}</TableHead>
                      <TableHead>{t("inventory:fields.supplier")}</TableHead>
                      <TableHead className="text-right">
                        {t("inventory:fields.totalValue")}
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryLoading ? (
                      <>
                        <InventoryRowSkeleton />
                        <InventoryRowSkeleton />
                        <InventoryRowSkeleton />
                      </>
                    ) : filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Package className="h-8 w-8" />
                            <p>
                              {searchQuery
                                ? t("inventory:list.emptyFiltered")
                                : t("inventory:list.empty")}
                            </p>
                            {searchQuery && (
                              <Button
                                variant="link"
                                onClick={() => setSearchQuery("")}
                              >
                                {t("common:actions.clearSearch")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.feedTypeName}</p>
                              {item.storageLocation && (
                                <p className="text-xs text-muted-foreground">
                                  {item.storageLocation}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-medium",
                                item.status === "out-of-stock" &&
                                  "text-red-600",
                                item.status === "low-stock" && "text-amber-600",
                              )}
                            >
                              {item.currentQuantity}
                            </span>
                            <span className="ml-1 text-muted-foreground">
                              {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.minimumStockLevel} {item.unit}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell>
                            {item.supplierName ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {item.supplierName}
                                </span>
                                {item.supplierPhone && (
                                  <a
                                    href={`tel:${item.supplierPhone}`}
                                    className="text-muted-foreground hover:text-primary"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unitCost
                              ? formatCurrency(
                                  item.currentQuantity * item.unitCost,
                                  item.currency,
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => restockDialog.openDialog(item)}
                                >
                                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                                  {t("inventory:actions.restock")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => usageDialog.openDialog(item)}
                                >
                                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                                  {t("inventory:actions.recordUsage")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    adjustmentDialog.openDialog(item)
                                  }
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  {t("inventory:actions.adjust")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => historyDialog.openDialog(item)}
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  {t("inventory:actions.viewTransactions")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setDeleteItem(item)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("inventory:actions.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialogs */}
      {selectedStableId && (
        <>
          <CreateInventoryDialog
            open={createDialog.open}
            onOpenChange={() => createDialog.closeDialog()}
            stableId={selectedStableId}
            organizationId={organizationId || ""}
            onSuccess={handleOperationSuccess}
          />

          <RestockDialog
            open={restockDialog.open}
            onOpenChange={() => restockDialog.closeDialog()}
            item={restockDialog.data}
            onSuccess={handleOperationSuccess}
          />

          <UsageDialog
            open={usageDialog.open}
            onOpenChange={() => usageDialog.closeDialog()}
            item={usageDialog.data}
            onSuccess={handleOperationSuccess}
          />

          <AdjustmentDialog
            open={adjustmentDialog.open}
            onOpenChange={() => adjustmentDialog.closeDialog()}
            item={adjustmentDialog.data}
            onSuccess={handleOperationSuccess}
          />

          <TransactionHistoryDialog
            open={historyDialog.open}
            onOpenChange={() => historyDialog.closeDialog()}
            item={historyDialog.data}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("inventory:dialogs.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory:dialogs.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteItem && handleDelete(deleteItem)}
            >
              {t("inventory:dialogs.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
