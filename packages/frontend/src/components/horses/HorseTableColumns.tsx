import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, MapPin, Trash2 } from "lucide-react";
import { HorseStatusBadge } from "./HorseStatusBadge";
import { HorseStatusIcons } from "./HorseStatusIcons";
import { getHorseColorClasses, getHorseInitial } from "@/utils/horseColorUtils";
import { toDate } from "@/utils/timestampUtils";
import type { Horse } from "@/types/roles";
import type { TFunction } from "i18next";

interface HorseTableColumnsProps {
  onEdit: (horse: Horse) => void;
  onAssign: (horse: Horse) => void;
  onUnassign: (horse: Horse) => void;
  onDelete: (horse: Horse) => void;
  onViewDetails?: (horse: Horse) => void;
  t: TFunction;
}

export function createHorseTableColumns({
  onEdit,
  onAssign,
  onUnassign,
  onDelete,
  onViewDetails,
  t,
}: HorseTableColumnsProps): ColumnDef<Horse>[] {
  return [
    // Avatar Column (NEW)
    {
      id: "avatar",
      header: "",
      cell: ({ row }) => {
        const horse = row.original;
        const { bg, text } = getHorseColorClasses(horse.color);
        const initial = getHorseInitial(horse.name);

        return (
          <Avatar className="h-10 w-10">
            <AvatarFallback className={`${bg} ${text} text-lg font-semibold`}>
              {initial}
            </AvatarFallback>
          </Avatar>
        );
      },
    },
    // Name Column (ENHANCED with pedigree subtitle and status icons)
    {
      accessorKey: "name",
      header: t("horses:table.name"),
      cell: ({ row }) => {
        const horse = row.original;

        // Build pedigree subtitle
        let pedigree = "";
        if (horse.sire && horse.dam && horse.damsire) {
          pedigree = `${horse.sire} × ${horse.dam} (${horse.damsire})`;
        } else if (horse.sire && horse.dam) {
          pedigree = `${horse.sire} × ${horse.dam}`;
        } else if (horse.sire) {
          pedigree = horse.sire;
        } else if (horse.dam) {
          pedigree = horse.dam;
        }

        return (
          <div
            className={`flex flex-col gap-1 ${onViewDetails ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
            onClick={() => onViewDetails && onViewDetails(horse)}
          >
            <div className="flex items-center gap-2">
              {horse.status === "inactive" && (
                <HorseStatusBadge horse={horse} />
              )}
              <HorseStatusIcons horse={horse} />
              <span className="font-medium">{horse.name}</span>
            </div>
            {pedigree && (
              <span className="text-sm text-muted-foreground">{pedigree}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "gender",
      header: t("horses:table.gender"),
      cell: ({ row }) => {
        const gender = row.getValue("gender") as string | undefined;
        return gender ? (
          <span>{t(`horses:genders.${gender}`)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    // Age Column (ENHANCED with dual display: age + birth year)
    {
      accessorKey: "age",
      header: t("horses:table.age"),
      cell: ({ row }) => {
        const horse = row.original;
        let age: number | undefined;
        let birthYear: number | undefined;

        // Try to use age field first
        if (horse.age !== undefined) {
          age = horse.age;
        }

        // Calculate from dateOfBirth
        if (horse.dateOfBirth) {
          // Handle both Firestore Timestamp objects and ISO date strings from API
          const birthDate = toDate(horse.dateOfBirth);

          if (birthDate) {
            birthYear = birthDate.getFullYear();

            // Calculate age if not already set
            if (age === undefined) {
              const today = new Date();
              age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < birthDate.getDate())
              ) {
                age--;
              }
            }
          }
        }

        return age !== undefined || birthYear !== undefined ? (
          <div className="flex flex-col">
            {age !== undefined && <span className="font-medium">{age}</span>}
            {birthYear && (
              <span className="text-sm text-muted-foreground">{birthYear}</span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "currentStableName",
      header: t("horses:table.stable"),
      cell: ({ row }) => {
        const stableName = row.getValue("currentStableName") as
          | string
          | undefined;
        return stableName ? (
          <span>{stableName}</span>
        ) : (
          <span className="text-muted-foreground">
            {t("horses:table.unassigned")}
          </span>
        );
      },
    },
    // Identification Column (ENHANCED with dual display: UELN + chip)
    {
      id: "identification",
      header: t("horses:table.identification"),
      cell: ({ row }) => {
        const horse = row.original;
        const hasUeln = !!horse.ueln;
        const hasChip = !!horse.chipNumber;

        if (!hasUeln && !hasChip) {
          return <span className="text-muted-foreground">—</span>;
        }

        return (
          <div className="flex flex-col gap-0.5 font-mono text-sm">
            <div>
              <span className="text-muted-foreground text-xs">
                {t("horses:table.ueln")}{" "}
              </span>
              <span>{hasUeln ? horse.ueln : "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">
                {t("horses:table.chip")}{" "}
              </span>
              <span>{hasChip ? horse.chipNumber : "—"}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "ownerName",
      header: t("horses:table.owner"),
      cell: ({ row }) => {
        const ownerName = row.getValue("ownerName") as string | undefined;
        return ownerName ? (
          <span>{ownerName}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    // Group Column (NEW)
    {
      accessorKey: "horseGroupName",
      header: t("horses:table.group"),
      cell: ({ row }) => {
        const groupName = row.getValue("horseGroupName") as string | undefined;
        return groupName ? (
          <Badge variant="secondary" className="font-normal">
            {groupName}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "actions",
      header: t("horses:table.actions"),
      cell: ({ row }) => {
        const horse = row.original;
        const isAssigned = !!horse.currentStableId;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">
                  {t("horses:table.menu.openMenu")}
                </span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(horse)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("horses:table.menu.edit")}
              </DropdownMenuItem>
              {isAssigned ? (
                <DropdownMenuItem onClick={() => onUnassign(horse)}>
                  <MapPin className="mr-2 h-4 w-4" />
                  {t("horses:table.menu.unassignFromStable")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onAssign(horse)}>
                  <MapPin className="mr-2 h-4 w-4" />
                  {t("horses:table.menu.assignToStable")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(horse)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("horses:table.menu.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
