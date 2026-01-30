import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSubscriptionDetails } from "@/hooks/useSubscription";

export default function SubscriptionSuccessPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { t } = useTranslation(["organizations", "common"]);
  const { data, isLoading, refetch } = useSubscriptionDetails(
    organizationId ?? null,
  );
  const [pollingCount, setPollingCount] = useState(0);

  // Poll until webhook has processed the subscription
  useEffect(() => {
    if (!data?.subscription?.status && pollingCount < 10) {
      const timer = setTimeout(() => {
        refetch();
        setPollingCount((c) => c + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [data, pollingCount, refetch]);

  const isReady = !!data?.subscription?.status;

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          {isReady ? (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-2" />
              <CardTitle>
                {t("organizations:subscription.success.title")}
              </CardTitle>
              <CardDescription>
                {t("organizations:subscription.success.description")}
              </CardDescription>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-2" />
              <CardTitle>
                {t("organizations:subscription.success.processing")}
              </CardTitle>
              <CardDescription>
                {t("organizations:subscription.success.processingDescription")}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {isReady && data?.subscription && (
            <div className="mb-4 text-sm text-muted-foreground">
              <p>
                {t("organizations:subscription.success.plan")}:{" "}
                <span className="font-semibold capitalize">{data.tier}</span>
              </p>
              <p>
                {t("organizations:subscription.success.status")}:{" "}
                <span className="font-semibold">
                  {data.subscription.status}
                </span>
              </p>
            </div>
          )}
          <Button asChild className="w-full">
            <Link to={`/organizations/${organizationId}/subscription`}>
              {t("organizations:subscription.success.goToSubscription")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
