import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  updateFeatureRequestStatus,
  setFeatureRequestPriority,
} from "@/services/featureRequestService";
import type {
  FeatureRequest,
  FeatureRequestStatus,
  FeatureRequestPriority,
} from "@equiduty/shared";

const STATUSES: FeatureRequestStatus[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "declined",
];

const PRIORITIES: (FeatureRequestPriority | "none")[] = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
];

interface AdminFeatureRequestActionsProps {
  request: FeatureRequest;
  onUpdate: () => void;
}

export function AdminFeatureRequestActions({
  request,
  onUpdate,
}: AdminFeatureRequestActionsProps) {
  const { t } = useTranslation(["featureRequests", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();

  const [status, setStatus] = useState<FeatureRequestStatus>(request.status);
  const [priority, setPriority] = useState<FeatureRequestPriority | "none">(
    request.priority ?? "none",
  );
  const [adminResponse, setAdminResponse] = useState(
    request.adminResponse ?? "",
  );

  // Only show for system admins
  if (user?.systemRole !== "system_admin") {
    return null;
  }

  const statusMutation = useMutation({
    mutationFn: () =>
      updateFeatureRequestStatus(request.id, {
        status,
        adminResponse: adminResponse.trim() || undefined,
      }),
    onSuccess: () => {
      toast({
        title: t("featureRequests:adminUpdateSuccess"),
      });
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: t("common:errors.somethingWentWrong"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const priorityMutation = useMutation({
    mutationFn: () =>
      setFeatureRequestPriority(request.id, {
        priority: priority === "none" ? null : priority,
      }),
    onSuccess: () => {
      toast({
        title: t("featureRequests:adminUpdateSuccess"),
      });
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: t("common:errors.somethingWentWrong"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isPending = statusMutation.isPending || priorityMutation.isPending;

  function handleSave() {
    const promises: Promise<unknown>[] = [];

    if (
      status !== request.status ||
      adminResponse.trim() !== (request.adminResponse ?? "")
    ) {
      promises.push(statusMutation.mutateAsync());
    }

    const newPriority = priority === "none" ? null : priority;
    if (newPriority !== request.priority) {
      promises.push(priorityMutation.mutateAsync());
    }

    if (promises.length === 0) {
      toast({ title: t("featureRequests:noChanges") });
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/20">
      <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
        {t("featureRequests:adminActions")}
      </h4>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="admin-status">
            {t("featureRequests:fields.status")}
          </Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as FeatureRequestStatus)}
          >
            <SelectTrigger id="admin-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`featureRequests:statuses.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-priority">
            {t("featureRequests:fields.priority")}
          </Label>
          <Select
            value={priority}
            onValueChange={(v) =>
              setPriority(v as FeatureRequestPriority | "none")
            }
          >
            <SelectTrigger id="admin-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`featureRequests:priorities.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-response">
          {t("featureRequests:fields.adminResponse")}
        </Label>
        <Textarea
          id="admin-response"
          value={adminResponse}
          onChange={(e) => setAdminResponse(e.target.value)}
          placeholder={t("featureRequests:placeholders.adminResponse")}
          rows={3}
          disabled={isPending}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? t("common:buttons.saving") : t("common:buttons.save")}
        </Button>
      </div>
    </div>
  );
}
