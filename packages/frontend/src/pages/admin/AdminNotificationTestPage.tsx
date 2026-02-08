import { useState } from "react";
import { Send, Smartphone, Monitor, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import {
  getNotificationUsers,
  sendTestNotification,
  type NotificationUser,
} from "@/services/adminService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const platformIcon = (platform: string) => {
  switch (platform) {
    case "ios":
      return <Smartphone className="size-3" />;
    case "android":
      return <Smartphone className="size-3" />;
    case "web":
      return <Globe className="size-3" />;
    default:
      return <Monitor className="size-3" />;
  }
};

function NotificationTestForm({ users }: { users: NotificationUser[] }) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [title, setTitle] = useState("Test Notification");
  const [body, setBody] = useState(
    "This is a test notification from EquiDuty admin",
  );
  const [channels, setChannels] = useState<string[]>(["push"]);
  const [priority, setPriority] = useState("normal");
  const [actionUrl, setActionUrl] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    notificationId?: string;
    queued?: number;
    error?: string;
  } | null>(null);

  const mutation = useApiMutation(sendTestNotification, {
    successMessage: "Test notification sent!",
    onSuccess: (data) => {
      setResult({
        success: true,
        notificationId: data.notificationId,
        queued: data.queued,
      });
    },
    onError: (error) => {
      setResult({ success: false, error: error.message });
    },
  });

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleSend = () => {
    if (!selectedUserId || channels.length === 0) return;
    setResult(null);
    mutation.mutate({
      userId: selectedUserId,
      title,
      body,
      channels,
      priority,
      ...(actionUrl && { actionUrl }),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Test Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User selector */}
          <div className="space-y-2">
            <Label>Target User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user with FCM tokens..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.displayName}</span>
                      <span className="text-muted-foreground text-xs">
                        ({user.email})
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {user.tokens.length} device
                        {user.tokens.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUser && (
              <div className="flex gap-2 flex-wrap mt-1">
                {selectedUser.tokens.map((token, i) => (
                  <Badge key={i} variant="outline" className="gap-1 text-xs">
                    {platformIcon(token.platform)}
                    {token.deviceName}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <Label>Channels</Label>
            <div className="flex gap-4">
              {(["push", "inApp", "email"] as const).map((ch) => (
                <label
                  key={ch}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={channels.includes(ch)}
                    onCheckedChange={() => toggleChannel(ch)}
                  />
                  <span className="text-sm capitalize">{ch}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notification body text"
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action URL (optional) */}
          <div className="space-y-2">
            <Label htmlFor="actionUrl">Action URL (optional)</Label>
            <Input
              id="actionUrl"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="e.g. /overview"
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={
              !selectedUserId ||
              channels.length === 0 ||
              !title ||
              !body ||
              mutation.isPending
            }
            className="gap-2"
          >
            <Send className="size-4" />
            {mutation.isPending ? "Sending..." : "Send Test Notification"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertTitle>
            {result.success ? "Notification Sent" : "Send Failed"}
          </AlertTitle>
          <AlertDescription>
            {result.success ? (
              <div className="space-y-1">
                <p>
                  Queued <strong>{result.queued}</strong> notification item
                  {result.queued !== 1 ? "s" : ""} for delivery.
                </p>
                <p className="text-xs text-muted-foreground">
                  Notification ID: {result.notificationId}
                </p>
              </div>
            ) : (
              <p>{result.error}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {users.length === 0 && (
        <Alert>
          <AlertTitle>No users with FCM tokens</AlertTitle>
          <AlertDescription>
            No users have registered push notification tokens yet. Users need to
            enable push notifications in their app to register FCM tokens.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

export default function AdminNotificationTestPage() {
  const query = useApiQuery<{ users: NotificationUser[] }>(
    ["admin-notification-users"],
    getNotificationUsers,
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Notification Test"
        description="Send test push notifications to verify the end-to-end delivery flow"
      />

      <QueryBoundary query={query} loadingFallback={<LoadingSkeleton />}>
        {(data) => <NotificationTestForm users={data.users} />}
      </QueryBoundary>
    </div>
  );
}
