import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockPayments = [
  {
    id: "pay_001",
    org: "Stallgarden AB",
    amount: 799,
    tier: "Pro",
    date: "2026-01-28",
    status: "succeeded",
  },
  {
    id: "pay_002",
    org: "Hastkraft HB",
    amount: 299,
    tier: "Standard",
    date: "2026-01-27",
    status: "succeeded",
  },
  {
    id: "pay_003",
    org: "Ridklubb Norra",
    amount: 799,
    tier: "Pro",
    date: "2026-01-25",
    status: "failed",
  },
  {
    id: "pay_004",
    org: "Equine Center",
    amount: 299,
    tier: "Standard",
    date: "2026-01-24",
    status: "succeeded",
  },
  {
    id: "pay_005",
    org: "Sadelfabriken",
    amount: 799,
    tier: "Pro",
    date: "2026-01-22",
    status: "succeeded",
  },
];

export default function AdminPaymentsPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Payments & Revenue"
        description="Financial overview (mocked data — will connect to Stripe)"
      />

      {/* Revenue Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,370 SEK</div>
            <p className="text-xs text-muted-foreground">
              Monthly recurring revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100,440 SEK</div>
            <p className="text-xs text-muted-foreground">
              Annual recurring revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.1%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">
                    {payment.id}
                  </TableCell>
                  <TableCell>{payment.org}</TableCell>
                  <TableCell>{payment.tier}</TableCell>
                  <TableCell className="text-right">
                    {payment.amount} SEK
                  </TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        payment.status === "succeeded"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
