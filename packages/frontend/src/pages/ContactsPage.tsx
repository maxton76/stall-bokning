import { useState, useEffect } from "react";
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
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDialog } from "@/hooks/useDialog";
import { getOrganizationContacts } from "@/services/contactService";
import type { Contact, ContactBadge } from "@stall-bokning/shared";

type ContactFilterType = "all" | "Personal" | "Business";
type BadgeFilterType = "all" | ContactBadge;

interface ContactsFilters {
  type: ContactFilterType;
  badge: BadgeFilterType;
  hasLoginAccess: boolean | null;
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
  const createDialog = useDialog();

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ContactsFilters>({
    type: "all",
    badge: "all",
    hasLoginAccess: null,
  });

  // Contacts data
  const contacts = useAsyncData<Contact[]>({
    loadFn: async () => {
      if (!currentOrganization) return [];
      return getOrganizationContacts(currentOrganization);
    },
  });

  // Load contacts when organization changes
  useEffect(() => {
    if (currentOrganization) {
      contacts.load();
    }
  }, [currentOrganization]);

  // Filter contacts
  const filteredContacts = (contacts.data || []).filter((contact) => {
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
    const matchesAccess =
      filters.hasLoginAccess === null ||
      contact.hasLoginAccess === filters.hasLoginAccess;

    return matchesSearch && matchesType && matchesBadge && matchesAccess;
  });

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
    (filters.hasLoginAccess !== null ? 1 : 0);

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
                {contacts.isLoading ? (
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
                        <ContactBadgeComponent badge={contact.badge} />
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
          {!contacts.isLoading && filteredContacts.length > 0 && (
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              <span>
                {t("contacts:stats.total")}: {contacts.data?.length || 0}
              </span>
              <span>•</span>
              <span>
                {t("contacts:stats.personal")}:{" "}
                {contacts.data?.filter((c) => c.contactType === "Personal")
                  .length || 0}
              </span>
              <span>•</span>
              <span>
                {t("contacts:stats.business")}:{" "}
                {contacts.data?.filter((c) => c.contactType === "Business")
                  .length || 0}
              </span>
              <span>•</span>
              <span>
                {t("contacts:stats.withAccess")}:{" "}
                {contacts.data?.filter((c) => c.hasLoginAccess).length || 0}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TODO: Add CreateContactDialog when needed */}
    </div>
  );
}
