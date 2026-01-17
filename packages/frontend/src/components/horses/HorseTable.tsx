import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Horse } from "@/types/roles";

interface HorseTableProps {
  data: Horse[];
  columns: ColumnDef<Horse>[];
  onRowClick?: (horse: Horse) => void;
}

export function HorseTable({ data, columns, onRowClick }: HorseTableProps) {
  const { t } = useTranslation(["horses"]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false }, // Default sort by name ascending
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`border-b hover:bg-muted/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={(e) => {
                    // Prevent row click if clicking on interactive elements
                    const target = e.target as HTMLElement;
                    const isInteractive = target.closest(
                      'button, a, [role="button"]',
                    );

                    if (!isInteractive && onRowClick) {
                      onRowClick(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="text-muted-foreground">
                    <p className="text-lg mb-2">{t("horses:table.empty")}</p>
                    <p className="text-sm">
                      {t("horses:table.emptyDescription")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - hidden on desktop */}
      <div className="md:hidden space-y-3">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const horse = row.original;
            return (
              <Card
                key={row.id}
                className={
                  onRowClick
                    ? "cursor-pointer hover:bg-accent/50 transition-colors"
                    : ""
                }
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  const isInteractive = target.closest(
                    'button, a, [role="button"]',
                  );
                  if (!isInteractive && onRowClick) {
                    onRowClick(horse);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{horse.name}</h3>
                      {horse.currentStableName && (
                        <p className="text-sm text-muted-foreground">
                          {horse.currentStableName}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        horse.status === "active" ? "default" : "secondary"
                      }
                    >
                      {horse.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    {horse.gender && (
                      <div>
                        <span className="text-muted-foreground">
                          {t("horses:mobile.gender")}
                        </span>{" "}
                        {t(`horses:genders.${horse.gender}`)}
                      </div>
                    )}
                    {horse.age && (
                      <div>
                        <span className="text-muted-foreground">
                          {t("horses:mobile.age")}
                        </span>{" "}
                        {horse.age}
                      </div>
                    )}
                    {horse.ueln && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          {t("horses:mobile.ueln")}
                        </span>{" "}
                        {horse.ueln}
                      </div>
                    )}
                  </div>

                  {/* Render action buttons from the last column */}
                  <div className="flex justify-end pt-2 border-t">
                    {row.getVisibleCells().map((cell) => {
                      // Only render the actions column
                      if (cell.column.id === "actions") {
                        return (
                          <div key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p className="text-lg mb-2">{t("horses:table.empty")}</p>
              <p className="text-sm">{t("horses:table.emptyDescription")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2">
        <div className="text-xs sm:text-sm text-muted-foreground">
          {t("horses:pagination.showing")}{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{" "}
          {t("horses:pagination.to")}{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length,
          )}{" "}
          {t("horses:pagination.of")} {table.getFilteredRowModel().rows.length}{" "}
          {t("horses:pagination.horses")}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">
              {t("horses:pagination.previous")}
            </span>
          </Button>
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {t("horses:pagination.page")}{" "}
            {table.getState().pagination.pageIndex + 1}{" "}
            {t("horses:pagination.of")} {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="hidden sm:inline">
              {t("horses:pagination.next")}
            </span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
