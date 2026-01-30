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

const mockTickets = [
  {
    id: "T-1042",
    subject: "Cannot login after password change",
    org: "Stallgarden AB",
    priority: "high",
    status: "open",
    created: "2026-01-30",
  },
  {
    id: "T-1041",
    subject: "Feeding schedule not syncing",
    org: "Hastkraft HB",
    priority: "medium",
    status: "open",
    created: "2026-01-29",
  },
  {
    id: "T-1040",
    subject: "Invoice PDF formatting issue",
    org: "Ridklubb Norra",
    priority: "low",
    status: "pending",
    created: "2026-01-28",
  },
  {
    id: "T-1039",
    subject: "Need to upgrade from Pro to Enterprise",
    org: "Equine Center",
    priority: "medium",
    status: "open",
    created: "2026-01-27",
  },
  {
    id: "T-1038",
    subject: "Member permissions not working correctly",
    org: "Sadelfabriken",
    priority: "high",
    status: "resolved",
    created: "2026-01-25",
  },
];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
};

export default function AdminSupportPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Support"
        description="Support ticket overview (mocked data — will connect to Zendesk)"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-xs">
                    {ticket.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {ticket.subject}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.org}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority]}`}
                    >
                      {ticket.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status]}`}
                    >
                      {ticket.status}
                    </span>
                  </TableCell>
                  <TableCell>{ticket.created}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
