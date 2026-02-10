import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Eye, Trash2, PawPrint, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { queryClient, queryKeys } from "@/lib/queryClient";
import {
  getAdminHorses,
  type AdminHorseSummary,
} from "@/services/adminService";
import type { PaginatedResponse } from "@equiduty/shared";
import { DeleteHorseDialog } from "@/components/DeleteHorseDialog";
import type { Horse } from "@/types/roles";

export default function AdminHorsesPage() {
  const { t } = useTranslation(["admin", "horses", "common"]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const deleteDialog = useDialog<Pick<Horse, "id" | "name">>();

  // Fetch horses with search and pagination
  const horsesQuery = useApiQuery<PaginatedResponse<AdminHorseSummary>>(
    queryKeys.admin.horses(debouncedSearch, page),
    () =>
      getAdminHorses({
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      }),
  );

  const handleDeleteClick = (horse: AdminHorseSummary) => {
    // DeleteHorseDialog only uses id and name properties
    deleteDialog.openDialog({
      id: horse.id,
      name: horse.name,
    } as Pick<Horse, "id" | "name">);
  };

  const handleDeleteSuccess = () => {
    // Invalidate all horse-related queries to ensure cache consistency
    queryClient.invalidateQueries({ queryKey: queryKeys.horses.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <PawPrint className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("admin:horses.title")}
          </h1>
        </div>
        <p className="text-muted-foreground">{t("admin:horses.description")}</p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin:horses.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Horses Table */}
      <QueryBoundary query={horsesQuery}>
        {(data) => {
          const horses = data.data || [];
          const totalCount = data.total || 0;

          return (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin:horses.table.horse")}</TableHead>
                      <TableHead>{t("admin:horses.table.owner")}</TableHead>
                      <TableHead>{t("admin:horses.table.stable")}</TableHead>
                      <TableHead>
                        {t("admin:horses.table.organization")}
                      </TableHead>
                      <TableHead>{t("admin:horses.table.type")}</TableHead>
                      <TableHead className="text-right">
                        {t("admin:horses.table.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {horses.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          {t("horses:table.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      horses.map((horse) => (
                        <TableRow key={horse.id}>
                          {/* Horse Name + Details */}
                          <TableCell>
                            <div>
                              <div className="font-medium">{horse.name}</div>
                              {(horse.breed || horse.color) && (
                                <div className="text-sm text-muted-foreground">
                                  {[horse.breed, horse.color]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Owner */}
                          <TableCell>
                            <div>
                              {horse.ownerName && (
                                <div className="font-medium">
                                  {horse.ownerName}
                                </div>
                              )}
                              {horse.ownerEmail && (
                                <div className="text-sm text-muted-foreground">
                                  {horse.ownerEmail}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Stable */}
                          <TableCell>
                            {horse.currentStableName || (
                              <span className="text-muted-foreground">
                                {t("admin:horses.noStable")}
                              </span>
                            )}
                          </TableCell>

                          {/* Organization */}
                          <TableCell>
                            {horse.organizationName || (
                              <span className="text-muted-foreground">
                                {t("admin:horses.noOrganization")}
                              </span>
                            )}
                          </TableCell>

                          {/* Type Badge */}
                          <TableCell>
                            <Badge
                              variant={
                                horse.isExternal ? "secondary" : "default"
                              }
                            >
                              {horse.isExternal
                                ? t("admin:horses.types.external")
                                : t("admin:horses.types.internal")}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title={t("admin:horses.viewDetails")}
                              >
                                <Link to={`/horses/${horse.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(horse)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title={t("horses:actions.deleteHorse")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Info */}
              {totalCount > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {t("admin:horses.showingCount", {
                    count: horses.length,
                    total: totalCount,
                  })}
                </div>
              )}
            </div>
          );
        }}
      </QueryBoundary>

      {/* Delete Horse Dialog */}
      <DeleteHorseDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.closeDialog}
        horse={deleteDialog.data}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
