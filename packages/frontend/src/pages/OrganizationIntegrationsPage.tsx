import { useTranslation } from "react-i18next";
import { Plug, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrganizationIntegrationsPage() {
  const { t } = useTranslation(["organizations", "common"]);

  // Placeholder integrations data
  const availableIntegrations = [
    {
      id: "1",
      name: "SendGrid",
      descriptionKey: "integrations.items.sendgrid.description",
      icon: "📧",
      status: "available" as const,
      categoryKey: "integrations.categories.email",
    },
    {
      id: "2",
      name: "Twilio",
      descriptionKey: "integrations.items.twilio.description",
      icon: "📱",
      status: "available" as const,
      categoryKey: "integrations.categories.communication",
    },
    {
      id: "3",
      name: "Stripe",
      descriptionKey: "integrations.items.stripe.description",
      icon: "💳",
      status: "connected" as const,
      categoryKey: "integrations.categories.payments",
    },
    {
      id: "4",
      name: "Google Calendar",
      descriptionKey: "integrations.items.googleCalendar.description",
      icon: "📅",
      status: "available" as const,
      categoryKey: "integrations.categories.calendar",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("organizations:integrations.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("organizations:integrations.pageDescription")}
          </p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableIntegrations.map((integration) => (
          <Card
            key={integration.id}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{integration.icon}</div>
                  <div>
                    <CardTitle className="text-xl">
                      {integration.name}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {t(`organizations:${integration.categoryKey}`)}
                    </Badge>
                  </div>
                </div>
                {integration.status === "connected" ? (
                  <Badge variant="default">
                    {t("organizations:integrations.status.connected")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t("organizations:integrations.status.available")}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {t(`organizations:${integration.descriptionKey}`)}
              </CardDescription>
              {integration.status === "connected" ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    {t("organizations:integrations.buttons.configure")}
                  </Button>
                  <Button variant="ghost" size="sm">
                    {t("organizations:integrations.buttons.disconnect")}
                  </Button>
                </div>
              ) : (
                <Button variant="default" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("organizations:integrations.buttons.connect")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for Custom Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>{t("organizations:integrations.custom.title")}</CardTitle>
          <CardDescription>
            {t("organizations:integrations.custom.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Plug className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("organizations:integrations.custom.emptyState")}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("organizations:integrations.custom.createButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
