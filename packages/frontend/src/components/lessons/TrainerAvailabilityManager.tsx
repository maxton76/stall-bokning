import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import {
  getInstructors,
  getInstructorAvailability,
  setInstructorAvailability,
  type InstructorsResponse,
  type InstructorAvailabilityResponse,
  type SetAvailabilityData,
} from "@/services/lessonService";

const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

export function TrainerAvailabilityManager() {
  const { t } = useTranslation(["lessons", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSlot, setNewSlot] = useState<SetAvailabilityData>({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isRecurring: true,
    isAvailable: true,
  });
  const [saving, setSaving] = useState(false);

  const organizationId = currentOrganization;

  // Find instructor record for current user
  const instructorsQuery = useApiQuery<InstructorsResponse>(
    queryKeys.instructors.byOrganization(organizationId || ""),
    () => getInstructors(organizationId!),
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );

  const currentInstructor = instructorsQuery.data?.instructors.find(
    (inst) => inst.userId === user?.uid,
  );

  const availabilityQuery = useApiQuery<InstructorAvailabilityResponse>(
    [
      ...queryKeys.instructors.byOrganization(organizationId || ""),
      "availability",
      currentInstructor?.id || "",
    ],
    () => getInstructorAvailability(organizationId!, currentInstructor!.id),
    {
      enabled: !!organizationId && !!currentInstructor,
      staleTime: 2 * 60 * 1000,
    },
  );

  const handleAddSlot = async () => {
    if (!organizationId || !currentInstructor) return;

    setSaving(true);
    try {
      await setInstructorAvailability(
        organizationId,
        currentInstructor.id,
        newSlot,
      );
      toast({ title: t("lessons:trainerAvailability.saved") });
      setAddDialogOpen(false);
      availabilityQuery.refetch();
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getDayLabel = (day: number): string =>
    t(`lessons:templates.days.${day}`);

  // Group availability by day
  const availability = availabilityQuery.data?.availability || [];
  const availabilityByDay = DAYS_OF_WEEK.reduce(
    (acc, day) => {
      acc[day] = availability.filter(
        (a) => a.dayOfWeek === day && a.isRecurring,
      );
      return acc;
    },
    {} as Record<number, typeof availability>,
  );

  if (!currentInstructor && !instructorsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground">
            {t("lessons:trainerAvailability.noInstructorProfile")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("lessons:trainerAvailability.title")}</CardTitle>
              <CardDescription>
                {t("lessons:trainerAvailability.description")}
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("lessons:trainerAvailability.addWindow")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availabilityQuery.isLoading || instructorsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day) => {
                const slots = availabilityByDay[day] || [];
                return (
                  <div key={day} className="flex items-start gap-4">
                    <div className="w-24 pt-1 text-sm font-medium">
                      {getDayLabel(day)}
                    </div>
                    <div className="flex-1">
                      {slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-1">—</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <Badge
                              key={slot.id}
                              variant="secondary"
                              className="gap-1"
                            >
                              <Clock className="h-3 w-3" />
                              {slot.startTime} - {slot.endTime}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Availability Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("lessons:trainerAvailability.addWindow")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("lessons:trainerAvailability.dayOfWeek")}</Label>
              <Select
                value={newSlot.dayOfWeek.toString()}
                onValueChange={(v) =>
                  setNewSlot({ ...newSlot, dayOfWeek: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {getDayLabel(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("lessons:trainerAvailability.startTime")}</Label>
                <Input
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t("lessons:trainerAvailability.endTime")}</Label>
                <Input
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, endTime: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={saving}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button onClick={handleAddSlot} disabled={saving}>
              {saving ? t("common:buttons.saving") : t("common:buttons.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
