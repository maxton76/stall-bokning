import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  MoreHorizontal,
  Package,
  Pencil,
  ToggleLeft,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatOre } from "@/utils/money";
import type {
  PackageDefinition,
  MemberPackage,
  MemberPackageStatus,
} from "@equiduty/shared";

// ============================================================================
// Constants
// ============================================================================

const STATUS_VARIANT: Record<
  MemberPackageStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  expired: "secondary",
  depleted: "secondary",
  refunded: "outline",
  cancelled: "destructive",
};

// ============================================================================
// Props
// ============================================================================

interface PackageTableProps {
  activeTab: "definitions" | "purchased";
  // Definitions
  filteredDefinitions: PackageDefinition[];
  definitionsLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: PackageDefinition) => void;
  onDeactivate: (item: PackageDefinition) => void;
  // Purchased
  filteredMemberPackages: MemberPackage[];
  memberPackagesLoading: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PackageTable({
  activeTab,
  filteredDefinitions,
  definitionsLoading,
  searchQuery,
  onSearchChange,
  onOpenCreate,
  onOpenEdit,
  onDeactivate,
  filteredMemberPackages,
  memberPackagesLoading,
}: PackageTableProps) {
  const { t } = useTranslation(["invoices", "common"]);

  return (
    <>
      {/* Search (definitions tab only) */}
      {activeTab === "definitions" && (
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
        </div>
      )}

      {/* Definitions Table */}
      {activeTab === "definitions" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoices:packages.table.name")}</TableHead>
                  <TableHead>
                    {t("invoices:packages.table.chargeableItemId")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("invoices:packages.table.units")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("invoices:packages.table.price")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("invoices:packages.table.validityDays")}
                  </TableHead>
                  <TableHead>{t("common:labels.status", "Status")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {definitionsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
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
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : filteredDefinitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchQuery
                            ? t("common:messages.noResults", "Inga resultat")
                            : t("invoices:packages.noDefinitions")}
                        </p>
                        {!searchQuery && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenCreate}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {t("invoices:packages.newDefinition")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDefinitions.map((item) => (
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
                      <TableCell className="font-mono text-xs">
                        {item.chargeableItemId}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.totalUnits}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatOre(item.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.validityDays ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.isActive ? "default" : "secondary"}
                        >
                          {item.isActive
                            ? t("invoices:packages.statusLabels.active")
                            : t("invoices:packages.statusLabels.inactive")}
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
                              {t("invoices:packages.actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeactivate(item)}
                            >
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              {item.isActive
                                ? t("invoices:packages.actions.deactivate")
                                : t("invoices:packages.actions.activate")}
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
      )}

      {/* Purchased Packages Table */}
      {activeTab === "purchased" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoices:packages.table.member")}</TableHead>
                  <TableHead>{t("invoices:packages.table.package")}</TableHead>
                  <TableHead className="text-right">
                    {t("invoices:packages.table.remaining")}
                  </TableHead>
                  <TableHead>{t("invoices:packages.table.expires")}</TableHead>
                  <TableHead>{t("common:labels.status", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberPackagesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredMemberPackages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {t("invoices:packages.noPurchased")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMemberPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>{pkg.memberId}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {pkg.packageDefinitionId}
                      </TableCell>
                      <TableCell className="text-right">
                        {pkg.remainingUnits} / {pkg.totalUnits}
                      </TableCell>
                      <TableCell>
                        {pkg.expiresAt
                          ? new Date(
                              (pkg.expiresAt as unknown as { seconds: number })
                                .seconds * 1000,
                            ).toLocaleDateString("sv-SE")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[pkg.status]}>
                          {t(`invoices:packages.memberStatuses.${pkg.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
