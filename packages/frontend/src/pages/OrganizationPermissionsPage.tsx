import { useTranslation } from "react-i18next";
import { Shield, Check, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrganizationPermissionsPage() {
  const { t } = useTranslation(["organizations", "common"]);

  // Permission matrix: role -> permissions
  const permissions = [
    {
      actionKey: "permissions.actions.manageSettings",
      admin: true,
      manager: false,
      member: false,
    },
    {
      actionKey: "permissions.actions.manageMembers",
      admin: true,
      manager: true,
      member: false,
    },
    {
      actionKey: "permissions.actions.viewAllStables",
      admin: true,
      manager: true,
      member: true,
    },
    {
      actionKey: "permissions.actions.createStables",
      admin: true,
      manager: true,
      member: false,
    },
    {
      actionKey: "permissions.actions.editStableSettings",
      admin: true,
      manager: true,
      member: false,
    },
    {
      actionKey: "permissions.actions.manageHorses",
      admin: true,
      manager: true,
      member: true,
    },
    {
      actionKey: "permissions.actions.viewSchedules",
      admin: true,
      manager: true,
      member: true,
    },
    {
      actionKey: "permissions.actions.createSchedules",
      admin: true,
      manager: true,
      member: false,
    },
    {
      actionKey: "permissions.actions.bookShifts",
      admin: true,
      manager: true,
      member: true,
    },
    {
      actionKey: "permissions.actions.manageManureRecords",
      admin: true,
      manager: true,
      member: false,
    },
    {
      actionKey: "permissions.actions.viewIntegrations",
      admin: true,
      manager: true,
      member: false,
    },
    {
      actionKey: "permissions.actions.configureIntegrations",
      admin: true,
      manager: false,
      member: false,
    },
    {
      actionKey: "permissions.actions.viewSubscription",
      admin: true,
      manager: false,
      member: false,
    },
    {
      actionKey: "permissions.actions.manageBilling",
      admin: true,
      manager: false,
      member: false,
    },
  ];

  const roleDefinitions = [
    {
      roleKey: "permissions.roles.administrator",
      key: "admin" as const,
      descriptionKey: "permissions.roleDescriptions.administrator",
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
    {
      roleKey: "permissions.roles.manager",
      key: "manager" as const,
      descriptionKey: "permissions.roleDescriptions.manager",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    {
      roleKey: "permissions.roles.member",
      key: "member" as const,
      descriptionKey: "permissions.roleDescriptions.member",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("organizations:permissions.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("organizations:permissions.description")}
        </p>
      </div>

      {/* Role Definitions */}
      <div className="grid gap-4 md:grid-cols-3">
        {roleDefinitions.map((def) => (
          <Card key={def.key}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5" />
                <CardTitle className="text-lg">
                  {t(`organizations:${def.roleKey}`)}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t(`organizations:${def.descriptionKey}`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>{t("organizations:permissions.matrix.title")}</CardTitle>
          <CardDescription>
            {t("organizations:permissions.matrix.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">
                    {t("organizations:permissions.matrix.action")}
                  </th>
                  {roleDefinitions.map((def) => (
                    <th key={def.key} className="text-center p-4">
                      <Badge className={def.color}>
                        {t(`organizations:${def.roleKey}`)}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm, index) => (
                  <tr
                    key={index}
                    className="border-b hover:bg-accent transition-colors"
                  >
                    <td className="p-4">
                      {t(`organizations:${perm.actionKey}`)}
                    </td>
                    <td className="text-center p-4">
                      {perm.admin ? (
                        <Check className="mx-auto h-5 w-5 text-green-600" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-red-600" />
                      )}
                    </td>
                    <td className="text-center p-4">
                      {perm.manager ? (
                        <Check className="mx-auto h-5 w-5 text-green-600" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-red-600" />
                      )}
                    </td>
                    <td className="text-center p-4">
                      {perm.member ? (
                        <Check className="mx-auto h-5 w-5 text-green-600" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-red-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Additional Roles Note */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("organizations:permissions.customRoles.title")}
          </CardTitle>
          <CardDescription>
            {t("organizations:permissions.customRoles.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("organizations:permissions.customRoles.explanation")}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>
              {t("organizations:permissions.customRoles.specializedRoles")}
            </strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
