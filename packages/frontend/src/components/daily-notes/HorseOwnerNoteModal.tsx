import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { CalendarIcon, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useOwnerHorseNotes } from "@/hooks/useOwnerHorseNotes";
import { cn } from "@/lib/utils";
import type { Horse } from "@/types/roles";
import type {
  NotePriority,
  DailyNoteCategory,
  RoutineType,
  HorseDailyNote,
} from "@shared/types";

interface HorseOwnerNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stableId: string;
  horses: Horse[];
  initialDate?: Date;
  /** When set, the modal is in edit mode */
  editNote?: HorseDailyNote;
}

export function HorseOwnerNoteModal({
  open,
  onOpenChange,
  stableId,
  horses,
  initialDate,
  editNote,
}: HorseOwnerNoteModalProps) {
  const { t } = useTranslation(["routines", "common"]);
  const { toast } = useToast();
  const {
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
    isDeleting,
  } = useOwnerHorseNotes(stableId);

  const isEditing = !!editNote;

  // Form state
  const [horseId, setHorseId] = useState(editNote?.horseId ?? "");
  const [note, setNote] = useState(editNote?.note ?? "");
  const [priority, setPriority] = useState<NotePriority>(
    editNote?.priority ?? "info",
  );
  const [category, setCategory] = useState<DailyNoteCategory | "">(
    editNote?.category ?? "",
  );
  const [routineType, setRoutineType] = useState<RoutineType | "all">(
    editNote?.routineType ?? "all",
  );
  const [startDate, setStartDate] = useState<Date>(
    editNote?.startDate
      ? new Date(editNote.startDate)
      : (initialDate ?? new Date()),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    editNote?.endDate && editNote.endDate !== editNote.startDate
      ? new Date(editNote.endDate)
      : undefined,
  );

  const formatDate = (d: Date) => d.toISOString().split("T")[0]!;

  const handleSubmit = async () => {
    if (!horseId || !note.trim()) return;

    try {
      if (isEditing && editNote?.rangeGroupId) {
        await updateNote({
          rangeGroupId: editNote.rangeGroupId,
          startDate: editNote.startDate!,
          endDate: editNote.endDate || editNote.startDate!,
          data: {
            note: note.trim(),
            priority,
            category: category || undefined,
            routineType,
          },
        });
        toast({
          title: t("routines:ownerNotes.updatedSuccess"),
        });
      } else {
        await createNote({
          horseId,
          note: note.trim(),
          priority,
          category: category || undefined,
          startDate: formatDate(startDate),
          endDate: endDate ? formatDate(endDate) : undefined,
          routineType,
        });
        toast({
          title: t("routines:ownerNotes.createdSuccess"),
        });
      }
      onOpenChange(false);
    } catch {
      toast({
        title: t("common:errors.generic"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!editNote?.rangeGroupId) return;
    try {
      await deleteNote({
        rangeGroupId: editNote.rangeGroupId,
        startDate: editNote.startDate!,
        endDate: editNote.endDate || editNote.startDate!,
      });
      toast({
        title: t("routines:ownerNotes.deletedSuccess"),
      });
      onOpenChange(false);
    } catch {
      toast({
        title: t("common:errors.generic"),
        variant: "destructive",
      });
    }
  };

  // Max end date: 30 days from start
  const maxEndDate = new Date(startDate);
  maxEndDate.setDate(maxEndDate.getDate() + 29);

  const isBusy = isCreating || isUpdating || isDeleting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            {isEditing
              ? t("routines:ownerNotes.editNote")
              : t("routines:ownerNotes.addNote")}
          </DialogTitle>
          <DialogDescription>
            {t("routines:ownerNotes.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Horse Selector */}
          <div className="space-y-2">
            <Label>{t("routines:ownerNotes.selectHorse")}</Label>
            <Select
              value={horseId}
              onValueChange={setHorseId}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("routines:ownerNotes.selectHorse")}
                />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={horse.id}>
                    {horse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("routines:ownerNotes.startDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                    disabled={isEditing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "d MMM yyyy", { locale: sv })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      if (d) {
                        setStartDate(d);
                        // Reset end date if it's before new start
                        if (endDate && endDate < d) setEndDate(undefined);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>
                {t("routines:ownerNotes.endDate")}{" "}
                <span className="text-muted-foreground text-xs">
                  ({t("routines:ownerNotes.maxDays")})
                </span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                    )}
                    disabled={isEditing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, "d MMM yyyy", { locale: sv })
                      : t("routines:ownerNotes.startDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    disabled={(date) => date < startDate || date > maxEndDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Note Text */}
          <div className="space-y-2">
            <Label>{t("routines:ownerNotes.noteText")}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={t("routines:ownerNotes.noteText")}
            />
            <p className="text-xs text-muted-foreground text-right">
              {note.length}/1000
            </p>
          </div>

          {/* Priority + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("routines:ownerNotes.priority")}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as NotePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    {t("routines:dailyNotes.priority.info")}
                  </SelectItem>
                  <SelectItem value="warning">
                    {t("routines:dailyNotes.priority.warning")}
                  </SelectItem>
                  <SelectItem value="critical">
                    {t("routines:dailyNotes.priority.critical")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("routines:ownerNotes.category")}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DailyNoteCategory | "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-</SelectItem>
                  <SelectItem value="medication">
                    {t("routines:dailyNotes.noteCategory.medication")}
                  </SelectItem>
                  <SelectItem value="health">
                    {t("routines:dailyNotes.noteCategory.health")}
                  </SelectItem>
                  <SelectItem value="feeding">
                    {t("routines:dailyNotes.noteCategory.feeding")}
                  </SelectItem>
                  <SelectItem value="blanket">
                    {t("routines:dailyNotes.noteCategory.blanket")}
                  </SelectItem>
                  <SelectItem value="behavior">
                    {t("routines:dailyNotes.noteCategory.behavior")}
                  </SelectItem>
                  <SelectItem value="other">
                    {t("routines:dailyNotes.noteCategory.other")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Routine Type Filter */}
          <div className="space-y-2">
            <Label>{t("routines:ownerNotes.routineFilter")}</Label>
            <Select
              value={routineType}
              onValueChange={(v) => setRoutineType(v as RoutineType | "all")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("routines:ownerNotes.allRoutines")}
                </SelectItem>
                <SelectItem value="morning">
                  {t("routines:types.morning")}
                </SelectItem>
                <SelectItem value="midday">
                  {t("routines:types.midday")}
                </SelectItem>
                <SelectItem value="evening">
                  {t("routines:types.evening")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {isEditing && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {t("routines:ownerNotes.deleteNote")}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!horseId || !note.trim() || isBusy}
            >
              {isEditing
                ? t("common:buttons.save")
                : t("routines:ownerNotes.addNote")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
