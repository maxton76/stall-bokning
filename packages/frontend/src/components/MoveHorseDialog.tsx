import { useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect, FormDatePicker } from "@/components/form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  moveHorseToExternalLocation,
  getHorseOrganizationId,
  transferHorse,
} from "@/services/horseService";
import {
  getUnfinishedActivities,
  deleteActivity,
  completeActivity,
} from "@/services/activityService";
import { getOrganizationStables } from "@/lib/firestoreQueries";
import { mapDocsToObjects } from "@/utils/firestoreHelpers";
import { getContactsForSelection } from "@/services/contactService";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { queryKeys } from "@/lib/queryClient";
import type { Horse, Stable } from "@/types/roles";
import type { Activity } from "@/types/activity";
import type { ContactDisplay } from "@shared/types/contact";

interface MoveHorseDialogProps {
  open: boolean;
  onClose: () => void;
  horse: Horse;
  onSuccess: () => void;
}

// Unified move schema - handles both internal transfers and external moves
const moveSchema = z
  .object({
    destination: z.string().optional(), // "stable:ID" or "contact:ID"
    externalLocation: z.string().optional(), // Manual location entry
    moveType: z.enum(["temporary", "permanent"]),
    departureDate: z.string().transform((val) => new Date(val)), // Convert "yyyy-MM-dd" string to Date
    reason: z.string().optional(),
    removeHorse: z.boolean().optional(),
  })
  .refine((data) => data.destination || data.externalLocation, {
    message: "Please select a destination or enter a location",
    path: ["destination"],
  })
  .refine(
    (data) =>
      data.moveType !== "permanent" || (data.reason && data.reason !== ""),
    {
      message: "Reason is required for permanent moves",
      path: ["reason"],
    },
  );

type MoveHorseFormData = z.infer<typeof moveSchema>;

const MOVE_REASONS = [
  { value: "sold_to_dealer", label: "Sold to dealer" },
  { value: "sold_to_private", label: "Sold to private individual" },
  { value: "retirement", label: "Retirement" },
  { value: "euthanasia", label: "Euthanasia" },
  { value: "show", label: "Show" },
  { value: "other", label: "Other" },
];

export function MoveHorseDialog({
  open,
  onClose,
  horse,
  onSuccess,
}: MoveHorseDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [handlingActivities, setHandlingActivities] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  // Fetch organization ID
  const { data: orgId } = useQuery({
    queryKey: ["horseOrganization", horse.id],
    queryFn: () => getHorseOrganizationId(horse),
    enabled: open && !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch organization stables
  const { data: allStables = [], isLoading: loadingStables } = useQuery({
    queryKey: queryKeys.stables.list(orgId || ""),
    queryFn: async () => {
      if (!orgId) return [];
      const snapshot = await getOrganizationStables(orgId);
      return mapDocsToObjects<Stable>(snapshot);
    },
    enabled: open && !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Filter out current stable
  const organizationStables = allStables.filter(
    (s) => s.id !== horse.currentStableId,
  );

  // Fetch contacts
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: queryKeys.contacts.list({
      userId: user?.uid,
      organizationId: orgId,
    }),
    queryFn: () => getContactsForSelection(user!.uid, orgId),
    enabled: open && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const loadingDestinations = loadingStables || loadingContacts;

  // Fetch unfinished activities
  const { data: unfinishedActivities = [], isLoading: loadingActivities } =
    useQuery({
      queryKey: queryKeys.activities.list({
        horseId: horse.id,
        status: "unfinished",
      }),
      queryFn: () => getUnfinishedActivities(horse.id),
      enabled: open && !!horse.id,
      staleTime: 2 * 60 * 1000,
    });

  const { form, handleSubmit, resetForm } = useFormDialog<MoveHorseFormData>({
    schema: moveSchema,
    defaultValues: {
      destination: undefined,
      externalLocation: "",
      moveType: "temporary",
      departureDate: new Date().toISOString().split("T")[0], // Format as "yyyy-MM-dd" for date input
      reason: undefined,
      removeHorse: false,
    },
    onSubmit: async (data) => {
      if (!user) throw new Error("User not authenticated");

      // Check if there are unfinished activities that need handling
      if (unfinishedActivities.length > 0) {
        throw new Error(
          "Please handle unfinished activities before moving the horse",
        );
      }

      // Parse destination to determine if it's a stable or contact
      const destination = data.destination;

      if (destination?.startsWith("stable:")) {
        // Internal transfer to another stable or assignment to first stable
        const targetStableId = destination.replace("stable:", "");
        const targetStable = organizationStables.find(
          (s) => s.id === targetStableId,
        );

        if (!targetStable) throw new Error("Invalid stable selected");

        if (horse.currentStableId) {
          // Transfer from current stable to target stable
          await transferHorse(
            horse.id,
            horse.currentStableId,
            targetStable.id,
            targetStable.name,
            user.uid,
          );
        } else {
          // Assign unassigned horse to a stable (treat as transfer from null)
          await transferHorse(
            horse.id,
            "", // Empty string for unassigned horse
            targetStable.id,
            targetStable.name,
            user.uid,
          );
        }
      } else {
        // External move (to contact or manual location)
        const contactId = destination?.startsWith("contact:")
          ? destination.replace("contact:", "")
          : undefined;

        await moveHorseToExternalLocation(horse.id, user.uid, {
          contactId,
          externalLocation: data.externalLocation,
          moveType: data.moveType,
          departureDate: data.departureDate,
          reason: data.reason,
          removeHorse: data.removeHorse,
        });
      }
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
  });

  // Handle removing activities
  const handleRemoveActivities = async () => {
    if (!user) return;
    setHandlingActivities(true);
    try {
      await Promise.all(
        unfinishedActivities.map((activity) => deleteActivity(activity.id)),
      );
      // Invalidate activities query to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.list({
          horseId: horse.id,
          status: "unfinished",
        }),
      });
    } catch (error) {
      console.error("Failed to remove activities:", error);
      alert("Failed to remove activities. Please try again.");
    } finally {
      setHandlingActivities(false);
    }
  };

  // Handle marking activities as done
  const handleMarkAsDone = async () => {
    if (!user) return;
    setHandlingActivities(true);
    try {
      await Promise.all(
        unfinishedActivities.map((activity) =>
          completeActivity(activity.id, user.uid),
        ),
      );
      // Invalidate activities query to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.list({
          horseId: horse.id,
          status: "unfinished",
        }),
      });
    } catch (error) {
      console.error("Failed to mark activities as done:", error);
      alert("Failed to mark activities as done. Please try again.");
    } finally {
      setHandlingActivities(false);
    }
  };

  // Format contact display
  const formatContactDisplay = (contact: ContactDisplay) => {
    const accessBadge =
      contact.accessLevel === "organization" ? "Org" : "Personal";
    const location =
      contact.city && contact.country
        ? `${contact.city}, ${contact.country}`
        : "No location";
    return `${contact.displayName} (${location}) [${accessBadge}]`;
  };

  // Build combined options list: Stables first, then Contacts
  const destinationOptions = [
    // Organization stables
    ...organizationStables.map((stable) => ({
      value: `stable:${stable.id}`,
      label: `🏛️ ${stable.name} (Organization Stable)`,
    })),
    // Organization contacts
    ...contacts
      .filter((c) => c.accessLevel === "organization")
      .map((c) => ({
        value: `contact:${c.id}`,
        label: `👤 ${formatContactDisplay(c)}`,
      })),
    // Personal contacts
    ...contacts
      .filter((c) => c.accessLevel === "user")
      .map((c) => ({
        value: `contact:${c.id}`,
        label: `👤 ${formatContactDisplay(c)}`,
      })),
  ];

  // Check if destination is a stable (for conditional rendering)
  const selectedDestination = form.watch("destination");
  const isInternalTransfer = selectedDestination?.startsWith("stable:");

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
          resetForm();
        }
      }}
      title="Move horse"
      description="Transfer horse to another stable or move to external location"
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Save"
      cancelLabel="Cancel"
    >
      <div className="grid gap-4 py-4">
        {/* Destination Selection */}
        <div className="space-y-2">
          <FormSelect
            form={form}
            name="destination"
            label="Select Destination"
            placeholder={
              loadingDestinations
                ? "Loading destinations..."
                : "Choose a stable or contact"
            }
            options={destinationOptions}
            disabled={loadingDestinations}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setContactDialogOpen(true)}
            className="w-full"
          >
            + Create new contact
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">or</div>

        {/* Manual Location Entry */}
        <FormInput
          form={form}
          name="externalLocation"
          label="Manual Location Entry"
          placeholder="e.g., Veterinary clinic, New owner's stable"
        />

        {/* Only show move type, date, and reason if NOT an internal transfer */}
        {!isInternalTransfer && (
          <>
            {/* Move Type Radio Group */}
            <div className="grid gap-2">
              <Label htmlFor="moveType">Temporary or permanent *</Label>
              <RadioGroup
                value={form.watch("moveType") as string}
                onValueChange={(value) =>
                  form.setValue("moveType", value as "temporary" | "permanent")
                }
              >
                <div className="flex items-start space-x-2 rounded-md border p-4">
                  <RadioGroupItem value="temporary" id="temporary" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="temporary" className="font-medium">
                      Temporary away
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Horse is away (i.e. at the vet), but still under
                      responsibility of your stable.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 rounded-md border p-4">
                  <RadioGroupItem value="permanent" id="permanent" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="permanent" className="font-medium">
                      Permanent
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Horse is made external, and is not the responsibility of
                      your stable anymore.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Departure Date */}
            <FormDatePicker
              form={form}
              name="departureDate"
              label="Departure date *"
            />

            {/* Conditional Fields for Permanent Move */}
            {form.watch("moveType") === "permanent" && (
              <>
                <FormSelect
                  form={form}
                  name="reason"
                  label="Reason *"
                  placeholder="Select the reason why the horse is leaving"
                  options={MOVE_REASONS}
                />

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="removeHorse"
                    checked={form.watch("removeHorse")}
                    onCheckedChange={(checked) =>
                      form.setValue("removeHorse", checked === true)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="removeHorse"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remove horse
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Horse will not show up in the external horses.
                    </p>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Internal Transfer Info */}
        {isInternalTransfer && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Internal Transfer</AlertTitle>
            <AlertDescription>
              This will transfer the horse to another stable within your
              organization. The horse will remain active and under your
              organization's responsibility.
            </AlertDescription>
          </Alert>
        )}

        {/* Unfinished Activities Warning */}
        {!loadingActivities && unfinishedActivities.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                This horse has {unfinishedActivities.length} unfinished{" "}
                {unfinishedActivities.length === 1 ? "activity" : "activities"}{" "}
                in the past.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveActivities}
                  disabled={handlingActivities}
                >
                  Remove activities
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsDone}
                  disabled={handlingActivities}
                >
                  Mark as done
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Contact Form Dialog for inline creation */}
      <ContactFormDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        organizationId={horse.currentStableId}
        onSuccess={() => {
          setContactDialogOpen(false);
          // Invalidate contacts query to refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.contacts.list({
              userId: user?.uid,
              organizationId: orgId,
            }),
          });
        }}
      />
    </BaseFormDialog>
  );
}
