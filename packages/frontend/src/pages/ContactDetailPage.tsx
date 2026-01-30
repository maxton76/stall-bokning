import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  FileText,
  Calendar,
  CreditCard,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { queryKeys } from "@/lib/queryClient";
import { getContact } from "@/services/contactService";
import type { Contact, ContactBadge } from "@equiduty/shared";

function ContactBadgeDisplay({ badge }: { badge?: ContactBadge }) {
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
  return <Badge className={`${config.variant}`}>{config.label}</Badge>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;

  const content = (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="hover:bg-muted/50 rounded-md -mx-2 px-2 block">
        {content}
      </a>
    );
  }

  return content;
}

function ContactDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const { t } = useTranslation(["contacts", "common", "invoices", "horses"]);
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const editDialog = useDialog();

  // Contact data with TanStack Query
  const contactQuery = useApiQuery<Contact | null>(
    queryKeys.contacts.detail(contactId || ""),
    () => getContact(contactId!),
    {
      enabled: !!contactId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const contactData = contactQuery.data ?? null;
  const contactLoading = contactQuery.isLoading;

  const getContactName = (c: Contact): string => {
    if (c.contactType === "Business") {
      return c.businessName;
    }
    return `${c.firstName} ${c.lastName}`;
  };

  const getFullAddress = (c: Contact): string | null => {
    if (!c.address) return null;
    const parts = [
      c.address.street,
      c.address.houseNumber,
      c.address.addressLine2,
      `${c.address.postcode} ${c.address.city}`,
      c.address.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  if (contactLoading) {
    return <ContactDetailSkeleton />;
  }

  if (!contactData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {t("contacts:detail.notFound")}
        </h2>
        <p className="text-muted-foreground mb-4">
          {t("contacts:detail.notFoundDescription")}
        </p>
        <Button onClick={() => navigate("/contacts")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("contacts:actions.backToList")}
        </Button>
      </div>
    );
  }

  const c = contactData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {c.contactType === "Business" ? (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{getContactName(c)}</h1>
                <ContactBadgeDisplay badge={c.badge} />
                {c.hasLoginAccess && (
                  <Badge variant="outline" className="text-xs">
                    {t("contacts:hasAccess")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {c.contactType === "Business"
                  ? t("contacts:type.business")
                  : t("contacts:type.personal")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => editDialog.openDialog()}>
            <Edit className="mr-2 h-4 w-4" />
            {t("common:actions.edit")}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Contact Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t("contacts:detail.info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow
              icon={Mail}
              label={t("contacts:fields.email")}
              value={c.email}
              href={`mailto:${c.email}`}
            />
            <InfoRow
              icon={Phone}
              label={t("contacts:fields.phone")}
              value={c.phoneNumber}
              href={`tel:${c.phoneNumber}`}
            />
            {c.contactType === "Personal" && c.secondPhoneNumber && (
              <InfoRow
                icon={Phone}
                label={t("contacts:fields.secondPhone")}
                value={c.secondPhoneNumber}
                href={`tel:${c.secondPhoneNumber}`}
              />
            )}
            <Separator className="my-2" />
            <InfoRow
              icon={MapPin}
              label={t("contacts:fields.address")}
              value={getFullAddress(c)}
            />

            {c.contactType === "Business" && (
              <>
                <Separator className="my-2" />
                {c.vatNumber && (
                  <InfoRow
                    icon={FileText}
                    label={t("contacts:fields.vatNumber")}
                    value={c.vatNumber}
                  />
                )}
                {c.companyRegistrationNumber && (
                  <InfoRow
                    icon={FileText}
                    label={t("contacts:fields.companyNumber")}
                    value={c.companyRegistrationNumber}
                  />
                )}
                {c.contactPerson && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium text-muted-foreground pt-2">
                      {t("contacts:fields.contactPerson")}
                    </p>
                    <p className="text-sm">
                      {c.contactPerson.firstName} {c.contactPerson.lastName}
                    </p>
                    {c.contactPerson.title && (
                      <p className="text-xs text-muted-foreground">
                        {c.contactPerson.title}
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {c.note && (
              <>
                <Separator className="my-2" />
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("contacts:fields.notes")}
                  </p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{c.note}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Unified View Tabs */}
        <Card className="md:col-span-2">
          <Tabs defaultValue="horses" className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("contacts:detail.activity")}</CardTitle>
                <TabsList>
                  <TabsTrigger value="horses">
                    {t("contacts:tabs.horses")}
                  </TabsTrigger>
                  <TabsTrigger value="invoices">
                    {t("contacts:tabs.invoices")}
                  </TabsTrigger>
                  <TabsTrigger value="activities">
                    {t("contacts:tabs.activities")}
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="horses" className="mt-0">
                {/* Horses linked to this contact */}
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2" />
                  <p>{t("contacts:detail.noHorses")}</p>
                  <p className="text-sm mt-1">
                    {t("contacts:detail.noHorsesDescription")}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="mt-0">
                {/* Invoices for this contact */}
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2" />
                  <p>{t("contacts:detail.noInvoices")}</p>
                  <p className="text-sm mt-1">
                    {t("contacts:detail.noInvoicesDescription")}
                  </p>
                  <Button variant="outline" className="mt-4" disabled>
                    <FileText className="mr-2 h-4 w-4" />
                    {t("invoices:actions.create")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                {/* Recent activities related to this contact */}
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>{t("contacts:detail.noActivities")}</p>
                  <p className="text-sm mt-1">
                    {t("contacts:detail.noActivitiesDescription")}
                  </p>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Quick Stats (Phase 2 - Invoice Integration) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              {t("contacts:stats.totalInvoices")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">0 kr</div>
            <p className="text-xs text-muted-foreground">
              {t("contacts:stats.totalInvoiced")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">0 kr</div>
            <p className="text-xs text-muted-foreground">
              {t("contacts:stats.totalPaid")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">0 kr</div>
            <p className="text-xs text-muted-foreground">
              {t("contacts:stats.outstanding")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TODO: EditContactDialog */}
    </div>
  );
}
