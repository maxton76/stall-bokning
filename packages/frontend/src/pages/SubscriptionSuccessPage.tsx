import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSubscriptionDetails } from "@/hooks/useSubscription";
import { verifyCheckoutSession } from "@/services/subscriptionService";

const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

type PageState = "polling" | "verifying" | "ready" | "timeout";

export default function SubscriptionSuccessPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { t } = useTranslation(["organizations", "common"]);
  const { data, refetch } = useSubscriptionDetails(organizationId ?? null);
  const [pollingCount, setPollingCount] = useState(0);
  const [pageState, setPageState] = useState<PageState>("polling");

  const isReady = !!data?.subscription?.status;

  // Mark as ready when subscription data arrives
  useEffect(() => {
    if (isReady) {
      setPageState("ready");
    }
  }, [isReady]);

  const attemptVerify = useCallback(async () => {
    if (!organizationId || !sessionId) {
      setPageState("timeout");
      return;
    }

    setPageState("verifying");
    try {
      const result = await verifyCheckoutSession(organizationId, sessionId);
      if (result.synced) {
        // Refetch to get updated data through the normal hook
        await refetch();
        setPageState("ready");
      } else {
        setPageState("timeout");
      }
    } catch {
      setPageState("timeout");
    }
  }, [organizationId, sessionId, refetch]);

  // Poll until webhook has processed the subscription
  useEffect(() => {
    if (pageState !== "polling" || isReady) return;

    if (pollingCount >= MAX_POLL_ATTEMPTS) {
      // Polling exhausted — try verify-checkout fallback
      attemptVerify();
      return;
    }

    const timer = setTimeout(() => {
      refetch();
      setPollingCount((c) => c + 1);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [pageState, isReady, pollingCount, refetch, attemptVerify]);

  const handleRetry = () => {
    setPollingCount(0);
    setPageState("polling");
    refetch();
  };

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          {pageState === "ready" ? (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-2" />
              <CardTitle>
                {t("organizations:subscription.success.title")}
              </CardTitle>
              <CardDescription>
                {t("organizations:subscription.success.description")}
              </CardDescription>
            </>
          ) : pageState === "timeout" ? (
            <>
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-2" />
              <CardTitle>
                {t("organizations:subscription.success.timeoutTitle")}
              </CardTitle>
              <CardDescription>
                {t("organizations:subscription.success.timeoutDescription")}
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
        <CardContent className="space-y-4">
          {pageState === "ready" && data?.subscription && (
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
          {pageState === "timeout" && (
            <Button variant="outline" onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("organizations:subscription.success.retry")}
            </Button>
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
