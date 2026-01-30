import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";

const services = [
  { name: "Cloud Run API", status: "healthy", latency: "45ms" },
  { name: "Firestore", status: "healthy", latency: "12ms" },
  { name: "Cloud Functions", status: "healthy", latency: "89ms" },
  { name: "Firebase Auth", status: "healthy", latency: "23ms" },
  { name: "Cloud Storage", status: "healthy", latency: "67ms" },
  { name: "Stripe API", status: "degraded", latency: "340ms" },
];

const recentErrors = [
  {
    time: "2026-01-30 09:23",
    service: "Cloud Functions",
    message: "Timeout in scanForReminders",
    severity: "warn",
  },
  {
    time: "2026-01-30 08:45",
    service: "Cloud Run API",
    message: "Rate limit exceeded for /api/v1/horses",
    severity: "info",
  },
  {
    time: "2026-01-29 22:10",
    service: "Stripe API",
    message: "Webhook delivery failed - retry scheduled",
    severity: "error",
  },
];

const statusColors: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  degraded: "bg-yellow-100 text-yellow-800",
  down: "bg-red-100 text-red-800",
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warn: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
};

export default function AdminSystemHealthPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="System Health"
        description="Operational monitoring (mocked data — will connect to GCP monitoring)"
      />

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.latency}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusColors[service.status]}`}
                >
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentErrors.map((error, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${severityColors[error.severity]}`}
                >
                  {error.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{error.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {error.service} — {error.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
