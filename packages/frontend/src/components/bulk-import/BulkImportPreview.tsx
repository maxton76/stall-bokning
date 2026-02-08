import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/utils/badgeHelpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { OrganizationRole } from "@equiduty/shared";
import type { PreviewRow, ValidationSummary } from "@/lib/importValidator";
import { getValidationMessageKey } from "@/lib/importValidator";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Base roles always available
const BASE_ROLES: OrganizationRole[] = [
  "administrator",
  "schedule_planner",
  "veterinarian",
  "dentist",
  "farrier",
  "customer",
  "groom",
  "saddle_maker",
  "horse_owner",
  "rider",
  "inseminator",
];

interface BulkImportPreviewProps {
  previewRows: PreviewRow[];
  globalRoles: OrganizationRole[];
  globalPrimaryRole: OrganizationRole;
  perRowRoleOverrides: Map<
    number,
    { roles: OrganizationRole[]; primaryRole: OrganizationRole }
  >;
  validationSummary: ValidationSummary;
  sendInviteEmails: boolean;
  canSubmit: boolean;
  submitting: boolean;
  submitError: string | null;
  onSetGlobalRoles: (
    roles: OrganizationRole[],
    primaryRole: OrganizationRole,
  ) => void;
  onSetRowRoleOverride: (
    rowIndex: number,
    roles: OrganizationRole[],
    primaryRole: OrganizationRole,
  ) => void;
  onClearRowRoleOverride: (rowIndex: number) => void;
  onToggleRowExclusion: (rowIndex: number) => void;
  onSendInviteEmailsChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
}

function StatusIcon({
  status,
}: {
  status: PreviewRow["validation"]["status"];
}) {
  switch (status) {
    case "valid":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

function RoleSelector({
  roles,
  primaryRole,
  availableRoles,
  onChange,
  t,
}: {
  roles: OrganizationRole[];
  primaryRole: OrganizationRole;
  availableRoles: OrganizationRole[];
  onChange: (roles: OrganizationRole[], primaryRole: OrganizationRole) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const handleRoleToggle = (role: OrganizationRole) => {
    const newRoles = roles.includes(role)
      ? roles.filter((r) => r !== role)
      : [...roles, role];
    if (newRoles.length === 0) return;
    const newPrimary = newRoles.includes(primaryRole)
      ? primaryRole
      : (newRoles[0] as OrganizationRole);
    onChange(newRoles, newPrimary);
  };

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      <div className="space-y-2">
        <Label className="text-xs font-medium">
          {t("organizations:invite.rolesLabel")}
        </Label>
        <div className="grid grid-cols-2 gap-1">
          {availableRoles.map((role) => (
            <label
              key={role}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <Checkbox
                checked={roles.includes(role)}
                onCheckedChange={() => handleRoleToggle(role)}
              />
              {t(`organizations:invite.roles.${role}.label`, role)}
            </label>
          ))}
        </div>
      </div>
      {roles.length > 1 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            {t("organizations:invite.primaryRoleLabel")}
          </Label>
          <RadioGroup
            value={primaryRole}
            onValueChange={(v) => onChange(roles, v as OrganizationRole)}
          >
            {roles.map((role) => (
              <div key={role} className="flex items-center gap-2">
                <RadioGroupItem value={role} id={`primary-${role}`} />
                <Label htmlFor={`primary-${role}`} className="text-xs">
                  {t(`organizations:invite.roles.${role}.label`, role)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}
    </div>
  );
}

export function BulkImportPreview({
  previewRows,
  globalRoles,
  globalPrimaryRole,
  perRowRoleOverrides,
  validationSummary,
  sendInviteEmails,
  canSubmit,
  submitting,
  submitError,
  onSetGlobalRoles,
  onSetRowRoleOverride,
  onClearRowRoleOverride,
  onToggleRowExclusion,
  onSendInviteEmailsChange,
  onSubmit,
  onBack,
}: BulkImportPreviewProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const { modules } = useSubscription();
  const [globalRoleOpen, setGlobalRoleOpen] = useState(false);

  const availableRoles: OrganizationRole[] = [
    ...BASE_ROLES,
    ...(modules?.lessons ? (["trainer", "training_admin"] as const) : []),
    ...(modules?.supportAccess ? (["support_contact"] as const) : []),
  ];

  return (
    <div className="space-y-4">
      {/* Global role assignment */}
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">
              {t("organizations:bulkImport.preview.globalRoles")}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("organizations:bulkImport.preview.globalRolesDescription")}
            </p>
          </div>
          <Popover open={globalRoleOpen} onOpenChange={setGlobalRoleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <div className="flex items-center gap-1">
                  {globalRoles.map((role) => (
                    <RoleBadge key={role} role={role} className="text-xs">
                      {t(`organizations:invite.roles.${role}.label`, role)}
                    </RoleBadge>
                  ))}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <RoleSelector
                roles={globalRoles}
                primaryRole={globalPrimaryRole}
                availableRoles={availableRoles}
                onChange={onSetGlobalRoles}
                t={t}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Send invite emails toggle */}
      <div className="flex items-center justify-between rounded-md border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="send-invite-emails" className="text-sm font-medium">
            {t("organizations:bulkImport.preview.sendInviteEmails")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("organizations:bulkImport.preview.sendInviteEmailsDescription")}
          </p>
        </div>
        <Switch
          id="send-invite-emails"
          checked={sendInviteEmails}
          onCheckedChange={onSendInviteEmailsChange}
        />
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 text-sm">
        <span className="text-green-600">
          {validationSummary.valid}{" "}
          {t("organizations:bulkImport.preview.valid")}
        </span>
        {validationSummary.warnings > 0 && (
          <span className="text-yellow-600">
            {validationSummary.warnings}{" "}
            {t("organizations:bulkImport.preview.warnings")}
          </span>
        )}
        {validationSummary.errors > 0 && (
          <span className="text-destructive">
            {validationSummary.errors}{" "}
            {t("organizations:bulkImport.preview.errors")}
          </span>
        )}
        <span className="text-muted-foreground">
          {t("organizations:bulkImport.preview.ofTotal", {
            total: validationSummary.total,
          })}
        </span>
      </div>

      {/* Preview table */}
      <div className="rounded-md border max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" aria-label="Include"></TableHead>
              <TableHead className="w-10" aria-label="Status"></TableHead>
              <TableHead>
                {t("organizations:bulkImport.mapping.email")}
              </TableHead>
              <TableHead>
                {t("organizations:bulkImport.mapping.firstName")}
              </TableHead>
              <TableHead>
                {t("organizations:bulkImport.mapping.lastName")}
              </TableHead>
              <TableHead>
                {t("organizations:bulkImport.mapping.phoneNumber")}
              </TableHead>
              <TableHead>{t("organizations:members.roles")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row) => {
              const override = perRowRoleOverrides.get(row.index);
              const rowRoles = override?.roles || globalRoles;
              const rowPrimary = override?.primaryRole || globalPrimaryRole;
              const isExcluded = row.excluded;

              return (
                <TableRow
                  key={row.index}
                  className={isExcluded ? "opacity-40" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={!isExcluded}
                      onCheckedChange={() => onToggleRowExclusion(row.index)}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusIcon status={row.validation.status} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm">{row.email || "-"}</span>
                      {row.validation.errors.length > 0 && (
                        <div className="space-y-0.5 mt-1">
                          {row.validation.errors.map((err, i) => (
                            <p key={i} className="text-xs text-destructive">
                              {t(getValidationMessageKey(err))}
                            </p>
                          ))}
                        </div>
                      )}
                      {row.validation.warnings.length > 0 && (
                        <div className="space-y-0.5 mt-1">
                          {row.validation.warnings.map((warn, i) => (
                            <p key={i} className="text-xs text-yellow-600">
                              {t(getValidationMessageKey(warn))}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.firstName || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.lastName || "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.phoneNumber || "-"}
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex flex-wrap gap-1 cursor-pointer hover:opacity-80">
                          {rowRoles.map((role) => (
                            <RoleBadge
                              key={role}
                              role={role}
                              className="text-xs"
                            >
                              {t(
                                `organizations:invite.roles.${role}.label`,
                                role,
                              )}
                            </RoleBadge>
                          ))}
                          {override && (
                            <Badge
                              variant="outline"
                              className="text-xs border-blue-500 text-blue-600"
                            >
                              {t(
                                "organizations:bulkImport.preview.customRoles",
                              )}
                            </Badge>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <RoleSelector
                          roles={rowRoles}
                          primaryRole={rowPrimary}
                          availableRoles={availableRoles}
                          onChange={(roles, primary) =>
                            onSetRowRoleOverride(row.index, roles, primary)
                          }
                          t={t}
                        />
                        {override && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 w-full text-xs"
                            onClick={() => onClearRowRoleOverride(row.index)}
                          >
                            {t(
                              "organizations:bulkImport.preview.resetToGlobal",
                            )}
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          {t("common:buttons.back")}
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || submitting}>
          {submitting
            ? t("common:labels.loading")
            : t("organizations:bulkImport.preview.startImport")}
        </Button>
      </div>
    </div>
  );
}
