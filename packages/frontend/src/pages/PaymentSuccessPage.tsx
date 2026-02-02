import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function PaymentSuccessPage() {
  const { t } = useTranslation(["payments", "common"]);
  const { currentOrganization } = useOrganization();
  const { organizationId, invoiceId } = useParams<{
    organizationId: string;
    invoiceId: string;
  }>();

  const orgId = organizationId || currentOrganization;

  return (
    <div className="container mx-auto py-12 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle>{t("payments:checkout.success")}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {t("payments:messages.paymentConfirmation")}
          </p>

          <div className="flex flex-col gap-2">
            {invoiceId && orgId && (
              <Button asChild variant="outline">
                <Link to={`/organizations/${orgId}/invoices/${invoiceId}`}>
                  {t("payments:history.viewDetails")}
                </Link>
              </Button>
            )}
            {orgId && (
              <Button asChild>
                <Link to={`/organizations/${orgId}/invoices`}>
                  {t("common:back")}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
