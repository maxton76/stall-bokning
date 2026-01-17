import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  Star,
  User,
  Stethoscope,
  Hammer,
  GraduationCap,
  Activity,
  Smile,
  Briefcase,
  UserPlus,
  Brush,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import { TeamMemberForm } from "./TeamMemberForm";
import type { Horse } from "@/types/roles";
import type { TeamMember, TeamMemberRole, HorseTeam } from "@shared/types/team";

interface TeamCardProps {
  horse: Horse;
}

const ROLE_ICONS: Record<TeamMemberRole, React.ReactNode> = {
  rider: <User className="h-4 w-4" />,
  groom: <Brush className="h-4 w-4" />,
  farrier: <Hammer className="h-4 w-4" />,
  veterinarian: <Stethoscope className="h-4 w-4" />,
  trainer: <GraduationCap className="h-4 w-4" />,
  dentist: <Smile className="h-4 w-4" />,
  physiotherapist: <Activity className="h-4 w-4" />,
  saddler: <Briefcase className="h-4 w-4" />,
  other: <UserPlus className="h-4 w-4" />,
};

const ROLE_COLORS: Record<TeamMemberRole, string> = {
  rider: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  groom: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  farrier:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  veterinarian: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  trainer:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  dentist: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  physiotherapist:
    "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  saddler: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export function TeamCard({ horse }: TeamCardProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{
    member: TeamMember;
    index: number;
  } | null>(null);
  const [deletingMember, setDeletingMember] = useState<{
    member: TeamMember;
    index: number;
  } | null>(null);

  // Fetch team data
  const { data: teamData, isLoading } = useQuery<HorseTeam>({
    queryKey: ["horse-team", horse.id],
    queryFn: async () => {
      const response = await authFetch(`/api/v1/horses/${horse.id}/team`);
      if (!response.ok) {
        if (response.status === 404) {
          return { additionalContacts: [] };
        }
        throw new Error("Failed to fetch team");
      }
      return response.json();
    },
  });

  // Add/Update team member mutation
  const saveMemberMutation = useMutation({
    mutationFn: async ({
      member,
      index,
    }: {
      member: Partial<TeamMember>;
      index?: number;
    }) => {
      const url =
        index !== undefined
          ? `/api/v1/horses/${horse.id}/team/${index}`
          : `/api/v1/horses/${horse.id}/team`;
      const method = index !== undefined ? "PUT" : "POST";

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save team member");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horse-team", horse.id] });
      setIsAddDialogOpen(false);
      setEditingMember(null);
    },
  });

  // Delete team member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: async (index: number) => {
      const response = await authFetch(
        `/api/v1/horses/${horse.id}/team/${index}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete team member");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horse-team", horse.id] });
      setDeletingMember(null);
    },
  });

  const getRoleLabel = (role: TeamMemberRole): string => {
    const labels: Record<TeamMemberRole, { en: string; sv: string }> = {
      rider: { en: "Rider", sv: "Ryttare" },
      groom: { en: "Groom", sv: "Skötare" },
      farrier: { en: "Farrier", sv: "Hovslagare" },
      veterinarian: { en: "Veterinarian", sv: "Veterinär" },
      trainer: { en: "Trainer", sv: "Tränare" },
      dentist: { en: "Equine Dentist", sv: "Tandvårdare" },
      physiotherapist: { en: "Physiotherapist", sv: "Fysioterapeut" },
      saddler: { en: "Saddler", sv: "Sadelmakare" },
      other: { en: "Other", sv: "Annan" },
    };
    return labels[role]?.[i18n.language as "en" | "sv"] || role;
  };

  // Collect all team members from the team data
  const getAllMembers = (): TeamMember[] => {
    if (!teamData) return [];

    const members: TeamMember[] = [];

    // Add default role members
    const defaultRoles: (keyof HorseTeam)[] = [
      "defaultRider",
      "defaultGroom",
      "defaultFarrier",
      "defaultVet",
      "defaultTrainer",
      "defaultDentist",
    ];

    defaultRoles.forEach((key) => {
      const member = teamData[key] as TeamMember | undefined;
      if (member) {
        members.push({ ...member, isPrimary: true });
      }
    });

    // Add additional contacts
    if (teamData.additionalContacts) {
      members.push(...teamData.additionalContacts);
    }

    return members;
  };

  const members = getAllMembers();

  // Group members by role
  const groupedMembers = members.reduce(
    (acc, member, index) => {
      if (!acc[member.role]) {
        acc[member.role] = [];
      }
      acc[member.role].push({ member, index });
      return acc;
    },
    {} as Record<TeamMemberRole, { member: TeamMember; index: number }[]>,
  );

  const handleSave = (data: Partial<TeamMember>) => {
    saveMemberMutation.mutate({
      member: data,
      index: editingMember?.index,
    });
  };

  const handleDelete = () => {
    if (deletingMember) {
      deleteMemberMutation.mutate(deletingMember.index);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("horses:team.title", "Team")}</CardTitle>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("horses:team.addMember", "Add Member")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Legacy Owner Section */}
        {(horse.ownerName || horse.ownerEmail) && (
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t("horses:ownership.legacyOwner", "Original Owner (Legacy)")}
              </span>
            </div>
            {horse.ownerName && (
              <p className="font-medium">{horse.ownerName}</p>
            )}
            {horse.ownerEmail && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {horse.ownerEmail}
              </p>
            )}
          </div>
        )}

        {/* Team Members */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("common:loading", "Loading...")}
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t("horses:team.noMembers", "No team members yet")}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t(
                "horses:team.addMemberHint",
                "Add riders, grooms, vets, and other team members",
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("horses:team.addFirst", "Add First Member")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedMembers).map(([role, roleMembers]) => (
              <div key={role} className="space-y-2">
                <div className="flex items-center gap-2">
                  {ROLE_ICONS[role as TeamMemberRole]}
                  <span className="text-sm font-medium">
                    {getRoleLabel(role as TeamMemberRole)}
                  </span>
                </div>
                {roleMembers.map(({ member, index }) => (
                  <div
                    key={`${role}-${index}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {member.displayName}
                        </span>
                        {member.isPrimary && (
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Star className="h-3 w-3" />
                            {t("horses:team.primary", "Primary")}
                          </Badge>
                        )}
                        <Badge className={ROLE_COLORS[member.role]}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                        {member.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </span>
                        )}
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                        )}
                      </div>
                      {member.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {member.notes}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingMember({ member, index })}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t("common:buttons.edit", "Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingMember({ member, index })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("common:buttons.delete", "Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("horses:team.addMember", "Add Team Member")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "horses:team.addMemberDescription",
                "Add a new team member to this horse",
              )}
            </DialogDescription>
          </DialogHeader>
          <TeamMemberForm
            onSubmit={handleSave}
            onCancel={() => setIsAddDialogOpen(false)}
            isSubmitting={saveMemberMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("horses:team.editMember", "Edit Team Member")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "horses:team.editMemberDescription",
                "Update team member information",
              )}
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <TeamMemberForm
              defaultValues={editingMember.member}
              onSubmit={handleSave}
              onCancel={() => setEditingMember(null)}
              isSubmitting={saveMemberMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingMember}
        onOpenChange={(open) => !open && setDeletingMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("horses:team.deleteTitle", "Remove Team Member")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "horses:team.deleteConfirm",
                "Are you sure you want to remove {{name}} from the team? This action cannot be undone.",
                { name: deletingMember?.member.displayName },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:buttons.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMemberMutation.isPending
                ? t("common:loading", "Loading...")
                : t("common:buttons.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
