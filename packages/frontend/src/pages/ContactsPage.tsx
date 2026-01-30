import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Filter,
  ChevronRight,
  Lock,
  Users,
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import {
  getOrganizationContacts,
  getUserPersonalContacts,
} from "@/services/contactService";
import { getOrganization } from "@/services/organizationService";
import type { Contact, ContactBadge, Organization } from "@equiduty/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ContactFilterType = "all" | "Personal" | "Business";
type BadgeFilterType = "all" | ContactBadge;
type AccessLevelFilter = "all" | "user" | "organization";

interface ContactsFilters {
  type: ContactFilterType;
  badge: BadgeFilterType;
  hasLoginAccess: boolean | null;
  accessLevel: AccessLevelFilter;
}

function ContactBadgeComponent({ badge }: { badge?: ContactBadge }) {
  const { t } = useTranslation("contacts");

  if (!badge) return null;

  const variants: Record<ContactBadge, { variant: string; label: string }> = {
    primary: {
      variant: "bg-amber-100 text-amber-800",
      label: t("badge.primary"),
    },
    stable: { variant: "bg-blue-100 text-blue-800", label: t("badge.stable") },
    member: {
      variant: "bg-green-100 text-green-800",
      label: t("badge.member"),
    },
    external: {
      variant: "bg-gray-100 text-gray-800",
      label: t("badge.external"),
    },
  };

  const config = variants[badge];
  return <Badge className={`${config.variant} text-xs`}>{config.label}</Badge>;
}

function ContactTypeIcon({ type }: { type: "Personal" | "Business" }) {
  if (type === "Business") {
    return <Building2 className="h-4 w-4 text-muted-foreground" />;
  }
  return <User className="h-4 w-4 text-muted-foreground" />;
}

function ContactRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8" />
      </TableCell>
    </TableRow>
  );
}

export default function ContactsPage() {
  const { t } = useTranslation(["contacts", "common"]);
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const createDialog = useDialog();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ContactsFilters>({
    type: "all",
    badge: "all",
    hasLoginAccess: null,
    accessLevel: "all",
  });

  // Fetch organization data to check type
  const organizationQuery = useApiQuery<Organization | null>(
    queryKeys.organizations.detail(currentOrganization || ""),
    () => getOrganization(currentOrganization!),
    {
      enabled: !!currentOrganization,
      staleTime: 5 * 60 * 1000,
    },
  );
  const organizationData = organizationQuery.data ?? null;

  // Check if organization is personal (cannot create org-level contacts)
  const isPersonalOrg = organizationData?.organizationType === "personal";

  // Contacts data - fetch both user-level and organization-level
  const contactsQuery = useApiQuery<Contact[]>(
    queryKeys.contacts.list({
      organizationId: currentOrganization,
      userId: user?.uid,
      isPersonalOrg,
    }),
    async () => {
      if (!user) return [];

      const results: Contact[] = [];

      // Always fetch user's personal contacts
      const personalContacts = await getUserPersonalContacts(user.uid);
      results.push(...personalContacts);

      // Fetch organization contacts only if we have an org and it's not personal
      if (currentOrganization && !isPersonalOrg) {
        const orgContacts = await getOrganizationContacts(currentOrganization);
        results.push(...orgContacts);
      }

      // Deduplicate by ID
      const unique = results.filter(
        (contact, index, self) =>
          index === self.findIndex((c) => c.id === contact.id),
      );

      return unique;
    },
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
    },
  );
  const contactsData = contactsQuery.data ?? [];
  const contactsLoading = contactsQuery.isLoading;

  // Filter contacts
  const filteredContacts = useMemo(
    () =>
      contactsData.filter((contact) => {
        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const name =
          contact.contactType === "Business"
            ? contact.businessName
            : `${contact.firstName} ${contact.lastName}`;
        const matchesSearch =
          !searchQuery ||
          name.toLowerCase().includes(searchLower) ||
          contact.email.toLowerCase().includes(searchLower) ||
          contact.phoneNumber?.includes(searchQuery);

        // Type filter
        const matchesType =
          filters.type === "all" || contact.contactType === filters.type;

        // Badge filter
        const matchesBadge =
          filters.badge === "all" || contact.badge === filters.badge;

        // Login access filter
        const matchesLoginAccess =
          filters.hasLoginAccess === null ||
          contact.hasLoginAccess === filters.hasLoginAccess;

        // Access level filter (private vs organization)
        const matchesAccessLevel =
          filters.accessLevel === "all" ||
          contact.accessLevel === filters.accessLevel;

        return (
          matchesSearch &&
          matchesType &&
          matchesBadge &&
          matchesLoginAccess &&
          matchesAccessLevel
        );
      }),
    [contactsData, searchQuery, filters],
  );

  // Get display name for a contact
  const getContactName = (contact: Contact): string => {
    if (contact.contactType === "Business") {
      return contact.businessName;
    }
    return `${contact.firstName} ${contact.lastName}`;
  };

  // Get location string
  const getLocation = (contact: Contact): string => {
    if (!contact.address) return "-";
    return `${contact.address.city}, ${contact.address.country}`;
  };

  // Handle contact click - navigate to detail page
  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  // Count active filters
  const activeFilterCount =
    (filters.type !== "all" ? 1 : 0) +
    (filters.badge !== "all" ? 1 : 0) +
    (filters.hasLoginAccess !== null ? 1 : 0) +
    (filters.accessLevel !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("contacts:title")}
        description={t("contacts:description")}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("contacts:list.title")}</CardTitle>
              <CardDescription>
                {t("contacts:list.description", {
                  count: filteredContacts.length,
                })}
              </CardDescription>
            </div>
            <Button onClick={() => createDialog.openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t("contacts:actions.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("contacts:search.placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.type}
              onValueChange={(value) =>
                setFilters({ ...filters, type: value as ContactFilterType })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("contacts:filters.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("contacts:filters.allTypes")}
                </SelectItem>
                <SelectItem value="Personal">
                  {t("contacts:filters.personal")}
                </SelectItem>
                <SelectItem value="Business">
                  {t("contacts:filters.business")}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Visibility filter - only show for business orgs */}
            {!isPersonalOrg && (
              <Select
                value={filters.accessLevel}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    accessLevel: value as AccessLevelFilter,
                  })
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("contacts:filters.visibility")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("contacts:filters.allVisibility")}
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      {t("contacts:filters.private")}
                    </div>
                  </SelectItem>
                  <SelectItem value="organization">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {t("contacts:filters.shared")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t("contacts:filters.more")}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {t("contacts:filters.byBadge")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.badge === "all"}
                  onCheckedChange={() =>
                    setFilters({ ...filters, badge: "all" })
                  }
                >
                  {t("contacts:filters.allBadges")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.badge === "member"}
                  onCheckedChange={() =>
                    setFilters({ ...filters, badge: "member" })
                  }
                >
                  {t("contacts:badge.member")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.badge === "external"}
                  onCheckedChange={() =>
                    setFilters({ ...filters, badge: "external" })
                  }
                >
                  {t("contacts:badge.external")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  {t("contacts:filters.byAccess")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.hasLoginAccess === true}
                  onCheckedChange={(checked) =>
                    setFilters({
                      ...filters,
                      hasLoginAccess: checked ? true : null,
                    })
                  }
                >
                  {t("contacts:filters.withAccess")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.hasLoginAccess === false}
                  onCheckedChange={(checked) =>
                    setFilters({
                      ...filters,
                      hasLoginAccess: checked ? false : null,
                    })
                  }
                >
                  {t("contacts:filters.withoutAccess")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contacts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("contacts:table.name")}</TableHead>
                  <TableHead>{t("contacts:table.type")}</TableHead>
                  <TableHead>{t("contacts:table.email")}</TableHead>
                  <TableHead>{t("contacts:table.phone")}</TableHead>
                  <TableHead>{t("contacts:table.location")}</TableHead>
                  <TableHead>{t("contacts:table.badge")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactsLoading ? (
                  <>
                    <ContactRowSkeleton />
                    <ContactRowSkeleton />
                    <ContactRowSkeleton />
                    <ContactRowSkeleton />
                  </>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <User className="h-8 w-8" />
                        <p>{t("contacts:list.empty")}</p>
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
                  filteredContacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleContactClick(contact.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <ContactTypeIcon type={contact.contactType} />
                          </div>
                          <div>
                            <p className="font-medium">
                              {getContactName(contact)}
                            </p>
                            {contact.contactType === "Business" &&
                              contact.contactPerson && (
                                <p className="text-xs text-muted-foreground">
                                  {contact.contactPerson.firstName}{" "}
                                  {contact.contactPerson.lastName}
                                </p>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {contact.contactType === "Business"
                            ? t("contacts:type.business")
                            : t("contacts:type.personal")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {contact.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {contact.phoneNumber || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {getLocation(contact)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ContactBadgeComponent badge={contact.badge} />
                          {!isPersonalOrg &&
                            (contact.accessLevel === "user" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("contacts:visibility.private")}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("contacts:visibility.shared")}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Stats */}
          {!contactsLoading && filteredContacts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                {t("contacts:stats.total")}: {contactsData?.length || 0}
              </span>
              <span>•</span>
              <span>
                {t("contacts:stats.personal")}:{" "}
                {contactsData?.filter((c) => c.contactType === "Personal")
                  .length || 0}
              </span>
              <span>•</span>
              <span>
                {t("contacts:stats.business")}:{" "}
                {contactsData?.filter((c) => c.contactType === "Business")
                  .length || 0}
              </span>
              {!isPersonalOrg && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {t("contacts:stats.private")}:{" "}
                    {contactsData?.filter((c) => c.accessLevel === "user")
                      .length || 0}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t("contacts:stats.shared")}:{" "}
                    {contactsData?.filter(
                      (c) => c.accessLevel === "organization",
                    ).length || 0}
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TODO: Add CreateContactDialog when needed */}
    </div>
  );
}
