import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar as CalendarIcon, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useStablePlanningMembers } from "@/hooks/useOrganizationMembers";
import { useCreateSelectionProcess } from "@/hooks/useSelectionProcess";
import { TurnOrderEditor } from "@/components/selectionProcess/TurnOrderEditor";
import type { CreateSelectionProcessMember } from "@equiduty/shared";
import i18next from "i18next";

/**
 * Form schema for creating a selection process
 */
const createProcessSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().optional(),
    selectionStartDate: z.date({ message: "Start date is required" }),
    selectionEndDate: z.date({ message: "End date is required" }),
  })
  .refine((data) => data.selectionEndDate > data.selectionStartDate, {
    message: "End date must be after start date",
    path: ["selectionEndDate"],
  });

type FormData = z.infer<typeof createProcessSchema>;

interface CreateSelectionProcessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  stableId: string;
  onSuccess?: (processId: string) => void;
}

/**
 * CreateSelectionProcessModal
 *
 * Multi-step modal for creating a new selection process:
 * 1. Basic info (name, description, dates)
 * 2. Select members
 * 3. Order members (drag-drop)
 */
export function CreateSelectionProcessModal({
  open,
  onOpenChange,
  organizationId,
  stableId,
  onSuccess,
}: CreateSelectionProcessModalProps) {
  const { t } = useTranslation(["selectionProcess", "common"]);

  // Form state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [orderedMembers, setOrderedMembers] = useState<
    CreateSelectionProcessMember[]
  >([]);

  // Get locale for calendar
  const currentLocale = i18next.language === "sv" ? sv : enUS;

  // Load planning members
  const { data: members, isLoading: membersLoading } = useStablePlanningMembers(
    organizationId,
    stableId,
  );

  // Create mutation
  const { createProcess, isCreating } = useCreateSelectionProcess({
    onSuccess: (data) => {
      onSuccess?.(data.id);
      handleClose();
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createProcessSchema as any) as any,
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const startDate = watch("selectionStartDate");
  const endDate = watch("selectionEndDate");

  // Memoized member list for checkboxes
  const memberList = useMemo(() => {
    return (members || []).map((member) => ({
      id: member.userId,
      name: `${member.firstName} ${member.lastName}`.trim() || member.userEmail,
      email: member.userEmail,
    }));
  }, [members]);

  // Handle member selection toggle
  const handleMemberToggle = (userId: string, checked: boolean) => {
    setSelectedMemberIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    setSelectedMemberIds(new Set(memberList.map((m) => m.id)));
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds(new Set());
  };

  // Move to step 3 (order members)
  const handleProceedToOrder = () => {
    // Convert selected member IDs to ordered member objects
    const selectedMembers = memberList
      .filter((m) => selectedMemberIds.has(m.id))
      .map((m) => ({
        userId: m.id,
        userName: m.name,
        userEmail: m.email,
      }));
    setOrderedMembers(selectedMembers);
    setStep(3);
  };

  // Submit the form
  const onSubmit = async (data: FormData) => {
    try {
      await createProcess({
        organizationId,
        stableId,
        name: data.name,
        description: data.description,
        selectionStartDate: data.selectionStartDate
          .toISOString()
          .split("T")[0]!,
        selectionEndDate: data.selectionEndDate.toISOString().split("T")[0]!,
        memberOrder: orderedMembers,
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Reset and close
  const handleClose = () => {
    setStep(1);
    setSelectedMemberIds(new Set());
    setOrderedMembers([]);
    reset();
    onOpenChange(false);
  };

  // Back navigation
  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && t("selectionProcess:titles.create")}
            {step === 2 && t("selectionProcess:modals.selectMembers.title")}
            {step === 3 && t("selectionProcess:modals.setOrder.title")}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && t("selectionProcess:descriptions.create")}
            {step === 2 &&
              t("selectionProcess:modals.selectMembers.description")}
            {step === 3 && t("selectionProcess:modals.setOrder.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <form onSubmit={handleSubmit(() => setStep(2))} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("selectionProcess:form.name")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t("selectionProcess:form.namePlaceholder")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t("selectionProcess:form.description")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("selectionProcess:form.descriptionPlaceholder")}
                rows={3}
                {...register("description")}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>
                {t("selectionProcess:form.startDate")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "PPP", { locale: currentLocale })
                      : t("common:labels.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) =>
                      date && setValue("selectionStartDate", date)
                    }
                    locale={currentLocale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.selectionStartDate && (
                <p className="text-sm text-destructive">
                  {errors.selectionStartDate.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>
                {t("selectionProcess:form.endDate")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, "PPP", { locale: currentLocale })
                      : t("common:labels.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) =>
                      date && setValue("selectionEndDate", date)
                    }
                    disabled={(date) => (startDate ? date <= startDate : false)}
                    locale={currentLocale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.selectionEndDate && (
                <p className="text-sm text-destructive">
                  {errors.selectionEndDate.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("common:buttons.cancel")}
              </Button>
              <Button type="submit">{t("common:buttons.next")}</Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: Select Members */}
        {step === 2 && (
          <div className="space-y-4">
            {membersLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                {t("common:labels.loading")}
              </div>
            ) : memberList.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("selectionProcess:emptyStates.noParticipants")}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Select All / Deselect All */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedMemberIds.size} / {memberList.length}{" "}
                    {t("selectionProcess:form.memberCount", {
                      count: selectedMemberIds.size,
                    })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {t("selectionProcess:form.selectAllMembers")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                    >
                      {t("selectionProcess:form.deselectAllMembers")}
                    </Button>
                  </div>
                </div>

                {/* Member List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
                  {memberList.map((member) => (
                    <label
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                        "hover:bg-muted transition-colors",
                        selectedMemberIds.has(member.id) && "bg-muted",
                      )}
                    >
                      <Checkbox
                        checked={selectedMemberIds.has(member.id)}
                        onCheckedChange={(checked) =>
                          handleMemberToggle(member.id, checked === true)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block truncate">
                          {member.name}
                        </span>
                        <span className="text-sm text-muted-foreground truncate block">
                          {member.email}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Validation message */}
                {selectedMemberIds.size < 2 && (
                  <p className="text-sm text-amber-600">
                    {t("selectionProcess:validation.invalidMemberCount")}
                  </p>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleBack}>
                {t("common:buttons.back")}
              </Button>
              <Button
                type="button"
                onClick={handleProceedToOrder}
                disabled={selectedMemberIds.size < 2}
              >
                {t("selectionProcess:modals.selectMembers.confirm")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Order Members */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Users className="h-4 w-4" />
              <span>
                {orderedMembers.length} {t("selectionProcess:labels.members")}
              </span>
            </div>

            <TurnOrderEditor
              members={orderedMembers}
              onOrderChange={setOrderedMembers}
              className="max-h-[300px] overflow-y-auto"
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleBack}>
                {t("common:buttons.back")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isCreating}
              >
                {isCreating
                  ? t("common:labels.loading")
                  : t("selectionProcess:buttons.create")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreateSelectionProcessModal;
