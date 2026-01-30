import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
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
  AdminUserSummary,
  PaginatedResponse,
} from "@stall-bokning/shared";
import { getUsers } from "@/services/adminService";

function UsersTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={6}>
            <Skeleton className="h-8 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useApiQuery<PaginatedResponse<AdminUserSummary>>(
    ["admin-users", debouncedSearch],
    () => getUsers({ search: debouncedSearch || undefined }),
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Users" description="Platform-wide user management" />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Organizations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <QueryBoundary
                query={query}
                loadingFallback={<UsersTableSkeleton />}
              >
                {(data) =>
                  data.data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.data.map((user) => (
                      <TableRow key={user.uid}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.systemRole === "system_admin" && (
                              <Shield className="h-4 w-4 text-red-600" />
                            )}
                            {user.firstName} {user.lastName}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.systemRole === "system_admin"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {user.systemRole}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.organizationCount}
                        </TableCell>
                        <TableCell>
                          {user.disabled ? (
                            <Badge variant="outline" className="text-red-600">
                              Disabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/admin/users/${user.uid}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
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

      {query.data && (
        <p className="text-sm text-muted-foreground">
          Showing {query.data.data.length} of {query.data.total} users
        </p>
      )}
    </div>
  );
}
