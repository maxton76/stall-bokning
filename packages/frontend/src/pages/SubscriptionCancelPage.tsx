import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SubscriptionCancelPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { t } = useTranslation(["organizations"]);

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <CardTitle>{t("organizations:subscription.cancel.title")}</CardTitle>
          <CardDescription>
            {t("organizations:subscription.cancel.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to={`/organizations/${organizationId}/subscription`}>
              {t("organizations:subscription.cancel.goBack")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
