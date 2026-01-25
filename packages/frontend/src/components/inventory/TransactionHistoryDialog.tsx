import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getInventoryTransactions } from "@/services/inventoryService";
import type {
  FeedInventory,
  InventoryTransaction,
  InventoryTransactionType,
} from "@stall-bokning/shared";
import { cn, toDate } from "@/lib/utils";

interface TransactionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FeedInventory | null;
}

function TransactionIcon({ type }: { type: InventoryTransactionType }) {
  const icons: Record<
    InventoryTransactionType,
    { icon: React.ElementType; className: string }
  > = {
    restock: { icon: ArrowUpCircle, className: "text-green-600" },
    usage: { icon: ArrowDownCircle, className: "text-blue-600" },
    adjustment: { icon: RefreshCw, className: "text-amber-600" },
    waste: { icon: AlertTriangle, className: "text-red-600" },
  };

  const { icon: Icon, className } = icons[type];
  return <Icon className={cn("h-5 w-5", className)} />;
}

function TransactionSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Skeleton className="h-5 w-5 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function TransactionHistoryDialog({
  open,
  onOpenChange,
  item,
}: TransactionHistoryDialogProps) {
  const { t, i18n } = useTranslation(["inventory", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  const transactionsQuery = useApiQuery<InventoryTransaction[]>(
    queryKeys.inventory.transactions(item?.id || ""),
    () => getInventoryTransactions(item!.id, { limit: 50 }),
    {
      enabled: open && !!item?.id,
      staleTime: 5 * 60 * 1000,
    },
  );
  const transactionsData = transactionsQuery.data;
  const transactionsLoading = transactionsQuery.isLoading;

  const formatQuantity = (quantity: number, unit: string) => {
    const sign = quantity > 0 ? "+" : "";
    return `${sign}${quantity} ${unit}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("inventory:transactions.title")}</DialogTitle>
          <DialogDescription>
            {item?.feedTypeName && (
              <span className="font-medium">{item.feedTypeName}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {transactionsLoading ? (
            <div className="divide-y">
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
            </div>
          ) : !transactionsData || transactionsData.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              {t("inventory:transactions.empty")}
            </div>
          ) : (
            <div className="divide-y">
              {transactionsData.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-start gap-3 py-3"
                >
                  <TransactionIcon type={transaction.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {t(`inventory:transactions.type.${transaction.type}`)}
                      </Badge>
                      {transaction.reason && (
                        <span className="text-xs text-muted-foreground truncate">
                          {transaction.reason}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(toDate(transaction.createdAt), "PPp", {
                        locale,
                      })}
                      {transaction.createdByName && (
                        <span> - {transaction.createdByName}</span>
                      )}
                    </div>
                    {transaction.relatedActivityTitle && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("inventory:transactions.relatedActivity")}:{" "}
                        {transaction.relatedActivityTitle}
                      </div>
                    )}
                    {transaction.relatedHorseName && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("inventory:transactions.relatedHorse")}:{" "}
                        {transaction.relatedHorseName}
                      </div>
                    )}
                    {transaction.notes && (
                      <div className="mt-1 text-xs text-muted-foreground italic">
                        {transaction.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "font-medium",
                        transaction.quantity > 0
                          ? "text-green-600"
                          : "text-red-600",
                      )}
                    >
                      {formatQuantity(transaction.quantity, item?.unit || "")}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {transaction.previousQuantity} → {transaction.newQuantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
