import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDialog } from "@/hooks/useDialog";
import { useCRUD } from "@/hooks/useCRUD";
import { useUserStables } from "@/hooks/useUserStables";
import {
  getFacilitiesByStable,
  createFacility,
  updateFacility,
  deleteFacility,
} from "@/services/facilityService";
import type {
  Facility,
  FacilityType,
  CreateFacilityData,
  UpdateFacilityData,
} from "@/types/facility";
import { useToast } from "@/hooks/use-toast";
import { FacilityFormDialog } from "@/components/FacilityFormDialog";

const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  transport: "Transport",
  water_treadmill: "Water treadmill",
  indoor_arena: "Indoor arena",
  outdoor_arena: "Outdoor arena",
  galloping_track: "Galloping track",
  lunging_ring: "Lunging ring",
  paddock: "Paddock",
  solarium: "Solarium",
  jumping_yard: "Jumping yard",
  treadmill: "Treadmill",
  vibration_plate: "Vibration plate",
  pasture: "Pasture",
  walker: "Walker",
  other: "Other",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  maintenance: "bg-yellow-100 text-yellow-800",
};

export default function ManageFacilitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const facilityDialog = useDialog<Facility>();

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable when stables load
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId) {
      setSelectedStableId(stables[0]!.id);
    }
  }, [stables, selectedStableId]);

  // Load facilities for selected stable
  const facilities = useAsyncData<Facility[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getFacilitiesByStable(selectedStableId);
    },
  });

  // Reload facilities when stable changes
  useEffect(() => {
    if (selectedStableId) {
      facilities.load();
    }
  }, [selectedStableId]);

  // CRUD operations
  const { create, update, remove } = useCRUD<Facility>({
    createFn: async (data) => {
      if (!selectedStableId || !user) throw new Error("Missing required data");
      return await createFacility(
        selectedStableId,
        data as CreateFacilityData,
        user.uid,
      );
    },
    updateFn: async (id, data) => {
      if (!user) throw new Error("User not authenticated");
      await updateFacility(id, data as UpdateFacilityData, user.uid);
    },
    deleteFn: async (id) => {
      if (!user) throw new Error("User not authenticated");
      await deleteFacility(id, user.uid);
    },
    onSuccess: async () => {
      await facilities.reload();
    },
    successMessages: {
      create: "Facility created successfully",
      update: "Facility updated successfully",
      delete: "Facility deleted successfully",
    },
  });

  // Filter facilities by search query
  const filteredFacilities = useMemo(() => {
    if (!facilities.data) return [];

    if (!searchQuery.trim()) return facilities.data;

    const query = searchQuery.toLowerCase();

    return facilities.data.filter(
      (facility) =>
        facility.name.toLowerCase().includes(query) ||
        FACILITY_TYPE_LABELS[facility.type].toLowerCase().includes(query),
    );
  }, [facilities.data, searchQuery]);

  const handleAddFacility = () => {
    facilityDialog.openDialog();
  };

  const handleEditFacility = (facility: Facility) => {
    facilityDialog.openDialog(facility);
  };

  const handleDeleteFacility = async (facility: Facility) => {
    if (confirm(`Are you sure you want to delete "${facility.name}"?`)) {
      await remove(facility.id);
    }
  };

  const handleSaveFacility = async (
    data: CreateFacilityData | UpdateFacilityData,
  ) => {
    try {
      if (facilityDialog.data) {
        // Update existing facility
        await update(facilityDialog.data.id, data as UpdateFacilityData);
      } else {
        // Create new facility
        await create(data as CreateFacilityData);
      }
      facilityDialog.closeDialog();
    } catch (error) {
      console.error("Failed to save facility:", error);
      toast({
        title: "Error",
        description: "Failed to save facility. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading stables...</p>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No stables found</h3>
            <p className="text-muted-foreground">
              You need to be a stable owner or manager to manage facilities.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manage Facilities
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure facilities available for booking
          </p>
        </div>
        <Button onClick={handleAddFacility} disabled={!selectedStableId}>
          <Plus className="mr-2 h-4 w-4" />
          Add Facility
        </Button>
      </div>

      {/* Stable Selector */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Stable
              </label>
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a stable" />
                </SelectTrigger>
                <SelectContent>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facilities ({filteredFacilities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFacilities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No facilities found matching your search"
                  : "No facilities yet"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={handleAddFacility}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Facility
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Max Horses</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFacilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell className="font-medium">
                        {facility.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {FACILITY_TYPE_LABELS[facility.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[facility.status]}>
                          {facility.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {facility.availableFrom} - {facility.availableTo}
                      </TableCell>
                      <TableCell>{facility.maxHorsesPerReservation}</TableCell>
                      <TableCell>{facility.minTimeSlotDuration} min</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditFacility(facility)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteFacility(facility)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facility Form Dialog */}
      <FacilityFormDialog
        open={facilityDialog.open}
        onOpenChange={facilityDialog.closeDialog}
        facility={facilityDialog.data || undefined}
        onSave={handleSaveFacility}
      />
    </div>
  );
}
