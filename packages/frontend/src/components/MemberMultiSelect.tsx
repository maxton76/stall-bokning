import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useActiveOrganizationMembers } from "@/hooks/useOrganizationMembers";
import type { OrganizationMember } from "@equiduty/shared";

interface MemberMultiSelectProps {
  /** ID of the organization to load members from */
  organizationId: string;

  /** Currently selected member IDs */
  selectedMemberIds: string[];

  /** Callback when selection changes */
  onChange: (memberIds: string[]) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Whether the component is disabled */
  disabled?: boolean;

  /** Optional CSS class */
  className?: string;
}

/**
 * Multi-select component for organization members
 * Shows active members with search and checkbox selection
 */
export function MemberMultiSelect({
  organizationId,
  selectedMemberIds,
  onChange,
  placeholder = "Select members...",
  disabled = false,
  className,
}: MemberMultiSelectProps) {
  const { t } = useTranslation(["invoices", "common", "organizations"]);
  const [open, setOpen] = useState(false);

  // Load active members from organization using TanStack Query
  const { data: members = [], isLoading: loading } =
    useActiveOrganizationMembers(organizationId);

  // Format member display name with role
  const formatMemberName = (member: OrganizationMember): string => {
    const name =
      `${member.firstName} ${member.lastName}`.trim() || member.userEmail;
    return name;
  };

  // Get primary role label for display
  const getPrimaryRole = (member: OrganizationMember): string | undefined => {
    if (!member.roles || member.roles.length === 0) return undefined;
    // Return first role as primary
    return member.roles[0];
  };

  // Get selected members for display
  const selectedMembers = members.filter((member) =>
    selectedMemberIds.includes(member.userId),
  );

  // Toggle member selection
  const toggleMember = (memberId: string) => {
    const newSelection = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id) => id !== memberId)
      : [...selectedMemberIds, memberId];
    onChange(newSelection);
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
  };

  // Get display text for trigger button
  const getDisplayText = () => {
    if (selectedMembers.length === 0) {
      return placeholder;
    }
    if (selectedMembers.length === 1) {
      return formatMemberName(selectedMembers[0]!);
    }
    if (selectedMembers.length === members.length) {
      return t("invoices:billingGroups.memberSelection.allMembers", {
        count: members.length,
      });
    }
    return t("invoices:billingGroups.memberSelection.membersSelected", {
      count: selectedMembers.length,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {loading ? t("common:loading.default") : getDisplayText()}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selectedMembers.length > 0 && (
              <Badge variant="secondary" className="px-1.5">
                {selectedMembers.length}
              </Badge>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t(
              "invoices:billingGroups.memberSelection.searchPlaceholder",
            )}
          />
          <CommandList>
            <CommandEmpty>
              {t("invoices:billingGroups.memberSelection.noMembersFound")}
            </CommandEmpty>
            <CommandGroup>
              {/* Header with clear all button */}
              {selectedMemberIds.length > 0 && (
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="text-muted-foreground">
                    {t("invoices:billingGroups.memberSelection.selected", {
                      count: selectedMemberIds.length,
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-auto p-1 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t("common:buttons.clearAll")}
                  </Button>
                </div>
              )}

              {/* Member list */}
              {members.map((member) => {
                const isSelected = selectedMemberIds.includes(member.userId);
                const displayName = formatMemberName(member);
                const primaryRole = getPrimaryRole(member);

                return (
                  <CommandItem
                    key={member.userId}
                    value={`${displayName} ${member.userEmail}`}
                    onSelect={() => toggleMember(member.userId)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={cn(
                          "h-4 w-4 border rounded flex items-center justify-center",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-input",
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <span>{displayName}</span>
                        {primaryRole && (
                          <Badge variant="outline" className="text-xs">
                            {t(`organizations:members.roles.${primaryRole}.label`)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
