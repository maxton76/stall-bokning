import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { OrganizationInviteDialog } from "@/components/invites";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, toDate } from "@/lib/utils";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  AlertCircle,
  Calendar,
  Activity,
  Loader2,
  UserPlus,
  UserX,
  Lightbulb,
  MessageSquare,
  Timer,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type {
  Notification,
  NotificationType,
  NotificationPriority,
} from "@equiduty/shared";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS } from "date-fns/locale";

interface NotificationBellProps {
  className?: string;
}

function getNotificationIcon(type: NotificationType): React.ReactNode {
  switch (type) {
    case "shift_reminder":
    case "shift_assigned":
    case "shift_unassigned":
      return <Calendar className="h-4 w-4" />;
    case "health_reminder":
    case "health_overdue":
      return <Activity className="h-4 w-4" />;
    case "shift_missed":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "daily_summary":
    case "weekly_summary":
      return <Clock className="h-4 w-4" />;
    case "membership_invite":
      return <UserPlus className="h-4 w-4 text-blue-500" />;
    case "membership_invite_response":
      return <UserX className="h-4 w-4 text-orange-500" />;
    case "feature_request_status_change":
      return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    case "feature_request_admin_response":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "trial_expiring":
    case "subscription_expiring":
      return <Timer className="h-4 w-4 text-orange-500" />;
    case "payment_failed":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "payment_method_required":
      return <CreditCard className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case "urgent":
      return "border-l-red-500";
    case "high":
      return "border-l-orange-500";
    case "normal":
      return "border-l-blue-500";
    case "low":
      return "border-l-gray-300";
    default:
      return "border-l-blue-500";
  }
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { t, i18n } = useTranslation(["notifications", "common"]);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedInviteMemberId, setSelectedInviteMemberId] = useState<
    string | null
  >(null);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead,
  } = useNotifications({ limit: 20 });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /**
   * Validate that a URL is safe to navigate to (internal route only)
   * Prevents potential XSS/redirect attacks from malicious notification URLs
   */
  const isValidInternalUrl = (url: string): boolean => {
    // Must start with / (relative URL) and not contain protocol indicators
    if (!url.startsWith("/")) return false;
    // Block protocol-relative URLs like //evil.com
    if (url.startsWith("//")) return false;
    // Block javascript: URLs and other dangerous protocols
    const lowercaseUrl = url.toLowerCase();
    if (
      lowercaseUrl.includes("javascript:") ||
      lowercaseUrl.includes("data:") ||
      lowercaseUrl.includes("vbscript:")
    ) {
      return false;
    }
    return true;
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Handle membership invite - show modal instead of navigating
    if (notification.type === "membership_invite") {
      // Extract memberId from actionUrl like /invite-accept?memberId=xxx
      const actionUrl = notification.actionUrl || "";
      const urlParams = new URLSearchParams(actionUrl.split("?")[1] || "");
      const memberId = urlParams.get("memberId");

      if (memberId) {
        setSelectedInviteMemberId(memberId);
        setInviteDialogOpen(true);
        setOpen(false);
        return;
      }
    }

    // Navigate to action URL if provided and validated
    if (notification.actionUrl && isValidInternalUrl(notification.actionUrl)) {
      setOpen(false);
      navigate(notification.actionUrl);
    }
  };

  const handleInviteSuccess = () => {
    // Refresh notifications after accepting/declining invite
    clearRead();
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading("markAll");
    try {
      await markAllAsRead();
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearRead = async () => {
    setActionLoading("clearRead");
    try {
      await clearRead();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setActionLoading(notificationId);
    try {
      await deleteNotification(notificationId);
    } finally {
      setActionLoading(null);
    }
  };

  const locale = i18n.language === "sv" ? sv : enUS;

  const hasUnread = unreadCount > 0;
  const hasRead = notifications.some((n) => n.read);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative", className)}
          >
            {hasUnread ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {hasUnread && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">{t("notifications:title")}</h3>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={actionLoading === "markAll"}
                  className="text-xs h-7"
                >
                  {actionLoading === "markAll" ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <CheckCheck className="h-3 w-3 mr-1" />
                  )}
                  {t("notifications:actions.markAllRead")}
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">{t("notifications:empty")}</span>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 cursor-pointer transition-colors hover:bg-muted/50 border-l-4",
                      getPriorityColor(notification.priority),
                      !notification.read && "bg-muted/30",
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "font-medium text-sm truncate",
                              !notification.read && "text-foreground",
                            )}
                          >
                            {notification.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => handleDelete(e, notification.id)}
                            disabled={actionLoading === notification.id}
                          >
                            {actionLoading === notification.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              toDate(notification.createdAt),
                              {
                                addSuffix: true,
                                locale,
                              },
                            )}
                          </span>
                          {notification.read && (
                            <Check className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings/notifications");
                  }}
                >
                  {t("notifications:settings")}
                </Button>
                {hasRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={handleClearRead}
                    disabled={actionLoading === "clearRead"}
                  >
                    {actionLoading === "clearRead" ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    {t("notifications:actions.clearRead")}
                  </Button>
                )}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Organization Invite Modal Dialog */}
      {selectedInviteMemberId && (
        <OrganizationInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          memberId={selectedInviteMemberId}
          onSuccess={handleInviteSuccess}
        />
      )}
    </>
  );
}
