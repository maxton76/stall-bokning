import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import type { Horse } from "@/types/roles";
import { toDate } from "@/utils/timestampUtils";

interface HorseCardProps {
  horse: Horse;
  showOwner?: boolean;
  showStable?: boolean;
  isOwner?: boolean;
  onEdit?: (horse: Horse) => void;
  onDelete?: (horse: Horse) => void;
  onAssign?: (horse: Horse) => void;
  onUnassign?: (horse: Horse) => void;
}

export function HorseCard({
  horse,
  showOwner = false,
  showStable = true,
  isOwner = false,
  onEdit,
  onDelete,
  onAssign,
  onUnassign,
}: HorseCardProps) {
  const { t } = useTranslation(["horses", "common"]);
  const canAssign = isOwner && !horse.currentStableId && onAssign;
  const canUnassign = isOwner && horse.currentStableId && onUnassign;
  const canEdit = isOwner && onEdit;
  const canDelete = isOwner && onDelete;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {horse.name}
              {horse.status === "inactive" && (
                <Badge variant="secondary">{t("common:labels.inactive")}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {horse.breed && <span>{horse.breed}</span>}
              {horse.age && (
                <>
                  {horse.breed && " • "}
                  <span>
                    {horse.age} {t("horses:card.yearsOld")}
                  </span>
                </>
              )}
            </CardDescription>
          </div>

          {(canEdit || canDelete || canAssign || canUnassign) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t("horses:card.openMenu")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(horse)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t("common:buttons.edit")}
                  </DropdownMenuItem>
                )}
                {canAssign && (
                  <DropdownMenuItem onClick={() => onAssign(horse)}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {t("horses:actions.assignToStable")}
                  </DropdownMenuItem>
                )}
                {canUnassign && (
                  <DropdownMenuItem onClick={() => onUnassign(horse)}>
                    <Unlink className="mr-2 h-4 w-4" />
                    {t("horses:actions.unassignFromStable")}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(horse)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("common:buttons.delete")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {horse.gender && (
            <div>
              <span className="text-muted-foreground">
                {t("horses:card.gender")}
              </span>{" "}
              <span className="capitalize">{horse.gender}</span>
            </div>
          )}
          {horse.color && (
            <div>
              <span className="text-muted-foreground">
                {t("horses:card.color")}
              </span>{" "}
              <span>{horse.color}</span>
            </div>
          )}
        </div>

        {/* Owner Info */}
        {showOwner && horse.ownerName && (
          <div className="flex items-center gap-2 text-sm border-t pt-3">
            <span className="text-muted-foreground">
              {t("horses:card.owner")}
            </span>
            <span className="font-medium">{horse.ownerName}</span>
            {horse.ownerEmail && (
              <span className="text-muted-foreground text-xs">
                ({horse.ownerEmail})
              </span>
            )}
          </div>
        )}

        {/* Stable Assignment */}
        {showStable && (
          <div className="border-t pt-3">
            {horse.currentStableId ? (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("horses:card.at")}
                </span>
                <span className="font-medium">
                  {horse.currentStableName || t("horses:card.unknownStable")}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("horses:card.notAssigned")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {horse.notes && (
          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground">{horse.notes}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground">
        {horse.assignedAt && (
          <span>
            {toDate(horse.assignedAt) &&
              `${t("horses:card.assigned")} ${new Date(toDate(horse.assignedAt)!).toLocaleDateString()}`}
          </span>
        )}
        {!horse.assignedAt && horse.createdAt && (
          <span>
            {toDate(horse.createdAt) &&
              `${t("horses:card.added")} ${new Date(toDate(horse.createdAt)!).toLocaleDateString()}`}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
