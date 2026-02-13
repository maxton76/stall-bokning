import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, ExternalLink, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
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
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminOrganizationSummary,
  PaginatedResponse,
} from "@equiduty/shared";
import { getOrganizations, deleteOrganization } from "@/services/adminService";

const tierBadgeVariants: Record<string, string> = {
  free: "bg-gray-100 text-gray-800",
  standard: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  enterprise: "bg-amber-100 text-amber-800",
};

function OrgsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={7}>
            <Skeleton className="h-8 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<AdminOrganizationSummary | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const queryClient = useQueryClient();

  const deleteMutation = useApiMutation(
    (orgId: string) => deleteOrganization(orgId),
    {
      successMessage: "Organization deleted",
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
        setDeleteTarget(null);
      },
    },
  );

  const query = useApiQuery<PaginatedResponse<AdminOrganizationSummary>>(
    ["admin-orgs", debouncedSearch],
    () => getOrganizations({ search: debouncedSearch || undefined }),
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Organizations"
        description="Browse and manage all organizations on the platform"
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Organizations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Horses</TableHead>
                <TableHead className="text-right">Stables</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <QueryBoundary
                query={query}
                loadingFallback={<OrgsTableSkeleton />}
              >
                {(data) =>
                  data.data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No organizations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.data.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {org.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${tierBadgeVariants[org.tier] || tierBadgeVariants.free}`}
                          >
                            {org.tier}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {org.memberCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {org.horseCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {org.stableCount}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {org.ownerEmail}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/organizations/${org.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(org)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                }
              </QueryBoundary>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination info */}
      {query.data && (
        <p className="text-sm text-muted-foreground">
          Showing {query.data.data.length} of {query.data.total} organizations
        </p>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization</AlertDialogTitle>
            <AlertDialogDescription>
              Delete organization <strong>{deleteTarget?.name}</strong>, its
              stables, members, and owner user account? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
