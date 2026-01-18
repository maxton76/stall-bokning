import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Clock,
  ListChecks,
} from "lucide-react";
import {
  ROUTINE_TYPE_ICONS,
  ROUTINE_TYPE_BADGE_COLORS,
} from "@/constants/routineStyles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useRoutineTemplates } from "@/hooks/useRoutines";
import { RoutineTemplateEditor } from "@/components/routines/RoutineTemplateEditor";
import type { RoutineTemplate } from "@shared/types";
import { cn } from "@/lib/utils";

export default function RoutineTemplatesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["routines", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  const [selectedStableId, setSelectedStableId] = useState<string>("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<RoutineTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<RoutineTemplate | null>(
    null,
  );

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Get active stable ID
  const activeStableId =
    selectedStableId === "all" ? undefined : selectedStableId;

  // Load templates
  const {
    templates,
    loading: templatesLoading,
    create,
    update,
    remove,
  } = useRoutineTemplates(currentOrganizationId ?? undefined, activeStableId);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: RoutineTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDuplicateTemplate = async (template: RoutineTemplate) => {
    try {
      await create({
        ...template,
        name: `${template.name} (${t("common:labels.copy")})`,
        organizationId: currentOrganizationId!,
      });
      toast({
        title: t("routines:template.duplicated"),
        description: template.name,
      });
    } catch (error) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;

    try {
      await remove(deleteTemplate.id);
      toast({
        title: t("routines:template.deleted"),
        description: deleteTemplate.name,
      });
    } catch (error) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
    setDeleteTemplate(null);
  };

  const handleSaveTemplate = async (data: any) => {
    try {
      if (editingTemplate) {
        await update(editingTemplate.id, data);
        toast({
          title: t("routines:template.updated"),
          description: data.name,
        });
      } else {
        await create({
          ...data,
          organizationId: currentOrganizationId!,
        });
        toast({
          title: t("routines:template.created"),
          description: data.name,
        });
      }
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
  };

  const loading = stablesLoading || templatesLoading;

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:loading")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("routines:page.templatesTitle")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("routines:template.description")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/routines")}>
            {t("common:buttons.back")}
          </Button>
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            {t("routines:actions.createTemplate")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">
              {t("common:labels.stable")}
            </label>
            <Select
              value={selectedStableId}
              onValueChange={setSelectedStableId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("common:labels.selectStable")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common:labels.all")}</SelectItem>
                {stables.map((stable) => (
                  <SelectItem key={stable.id} value={stable.id}>
                    {stable.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <p className="text-muted-foreground">{t("common:loading")}</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("routines:empty.noTemplates")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("routines:empty.noTemplatesDescription")}
            </p>
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              {t("routines:actions.createTemplate")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const TypeIcon = ROUTINE_TYPE_ICONS[template.type];
            return (
              <Card
                key={template.id}
                className={cn(
                  "transition-shadow hover:shadow-md",
                  !template.isActive && "opacity-60",
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          ROUTINE_TYPE_BADGE_COLORS[template.type],
                        )}
                      >
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <CardDescription>
                          {t(`routines:types.${template.type}`)}
                        </CardDescription>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t("routines:actions.editTemplate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {t("routines:actions.duplicateTemplate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTemplate(template)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("routines:actions.deleteTemplate")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      {template.defaultStartTime}
                    </Badge>
                    <Badge variant="outline">
                      {template.steps.length} {t("routines:template.steps")}
                    </Badge>
                    <Badge variant="outline">
                      ~{template.estimatedDuration} {t("routines:flow.minutes")}
                    </Badge>
                  </div>

                  {!template.isActive && (
                    <Badge variant="secondary">
                      {t("common:status.inactive")}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? t("routines:actions.editTemplate")
                : t("routines:actions.createTemplate")}
            </DialogTitle>
            <DialogDescription>
              {t("routines:template.description")}
            </DialogDescription>
          </DialogHeader>

          <RoutineTemplateEditor
            template={editingTemplate}
            stables={stables}
            organizationId={currentOrganizationId!}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTemplate}
        onOpenChange={() => setDeleteTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("routines:actions.deleteTemplate")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("common:messages.deleteConfirmation", {
                item: deleteTemplate?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("common:buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
