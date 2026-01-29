import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateSelectionProcessMember } from "@stall-bokning/shared";

/**
 * Props for a member item in the turn order list
 */
interface MemberItemProps {
  member: CreateSelectionProcessMember;
  position: number;
}

/**
 * Sortable member item component
 * Shows position, name, email with drag handle
 */
function SortableMemberItem({ member, position }: MemberItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.userId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card",
        "transition-colors",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className={cn(
          "touch-none p-1 rounded cursor-grab active:cursor-grabbing",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "focus:outline-none focus:ring-2 focus:ring-ring",
        )}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Position number */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full",
          "bg-primary text-primary-foreground text-sm font-semibold",
        )}
      >
        {position}
      </div>

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">{member.userName}</span>
        </div>
        <span className="text-sm text-muted-foreground truncate block">
          {member.userEmail}
        </span>
      </div>
    </div>
  );
}

/**
 * TurnOrderEditor Props
 */
interface TurnOrderEditorProps {
  /** List of members to order */
  members: CreateSelectionProcessMember[];
  /** Callback when order changes */
  onOrderChange: (newOrder: CreateSelectionProcessMember[]) => void;
  /** Optional class name */
  className?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * TurnOrderEditor Component
 *
 * A drag-and-drop reorderable list for setting the turn order of members
 * in a selection process. Shows each member with their position number.
 *
 * @example
 * ```tsx
 * <TurnOrderEditor
 *   members={selectedMembers}
 *   onOrderChange={setSelectedMembers}
 * />
 * ```
 */
export function TurnOrderEditor({
  members,
  onOrderChange,
  className,
  disabled = false,
}: TurnOrderEditorProps) {
  const { t } = useTranslation("selectionProcess");

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = members.findIndex((m) => m.userId === active.id);
      const newIndex = members.findIndex((m) => m.userId === over.id);

      const newOrder = arrayMove(members, oldIndex, newIndex);
      onOrderChange(newOrder);
    }
  };

  if (members.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 px-4",
          "text-center text-muted-foreground",
          className,
        )}
      >
        <User className="h-10 w-10 mb-2 opacity-50" />
        <p className="text-sm">{t("messages.selectMembers")}</p>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className={cn("space-y-2", className)}>
        {members.map((member, index) => (
          <div
            key={member.userId}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card opacity-60"
          >
            <div className="w-6" /> {/* Placeholder for drag handle */}
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full",
                "bg-primary text-primary-foreground text-sm font-semibold",
              )}
            >
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{member.userName}</span>
              </div>
              <span className="text-sm text-muted-foreground truncate block">
                {member.userEmail}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={members.map((m) => m.userId)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={cn("space-y-2", className)}
          role="list"
          aria-label={t("modals.setOrder.description")}
        >
          {members.map((member, index) => (
            <SortableMemberItem
              key={member.userId}
              member={member}
              position={index + 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default TurnOrderEditor;
