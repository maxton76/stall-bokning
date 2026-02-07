import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GeneralSettingsTab,
  type StableInfo,
} from "@/components/settings/tabs/GeneralSettingsTab";
import {
  WeightingSettingsTab,
  type WeightingSettings,
} from "@/components/settings/tabs/WeightingSettingsTab";
import {
  SchedulingSettingsTab,
  type SchedulingSettings,
} from "@/components/settings/tabs/SchedulingSettingsTab";
import {
  NotificationSettingsTab,
  type NotificationSettings,
} from "@/components/settings/tabs/NotificationSettingsTab";
import {
  FacilitiesSettingsTab,
  type FacilitiesSettings,
} from "@/components/settings/tabs/FacilitiesSettingsTab";
import { getStable, updateStable } from "@/services/stableService";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type {
  PointsSystemConfig,
  SchedulingConfig,
  NotificationConfig,
} from "@/types/roles";

interface Stable {
  id: string;
  name: string;
  description?: string;
  facilityNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  ownerId: string;
  organizationId?: string;
  pointsSystem?: PointsSystemConfig;
  schedulingConfig?: SchedulingConfig;
  notificationConfig?: NotificationConfig;
  boxes?: string[];
  paddocks?: string[];
}

export default function StableSettingsPage() {
  const { t } = useTranslation(["stables", "common", "settings"]);
  const { stableId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Load stable data
  const stableQuery = useApiQuery<Stable | null>(
    queryKeys.stables.detail(stableId || ""),
    () => getStable(stableId!) as Promise<Stable | null>,
    {
      enabled: !!stableId,
      staleTime: 5 * 60 * 1000,
    },
  );

  const [stableInfo, setStableInfo] = useState<StableInfo>({
    name: "",
    description: "",
    facilityNumber: "",
    address: "",
    city: "",
    postalCode: "",
  });

  // Update form when stable data loads
  useEffect(() => {
    if (stableQuery.data) {
      setStableInfo({
        name: stableQuery.data.name || "",
        description: stableQuery.data.description || "",
        facilityNumber: stableQuery.data.facilityNumber || "",
        address: stableQuery.data.address || "",
        city: stableQuery.data.city || "",
        postalCode: stableQuery.data.postalCode || "",
      });

      // Load weighting from pointsSystem
      if (stableQuery.data.pointsSystem) {
        setWeightingSettings({
          memoryHorizonDays:
            stableQuery.data.pointsSystem.memoryHorizonDays ?? 90,
          resetPeriod: stableQuery.data.pointsSystem.resetPeriod ?? "quarterly",
          pointsMultiplier:
            stableQuery.data.pointsSystem.holidayMultiplier ?? 1.0,
        });
      }

      // Load scheduling config
      if (stableQuery.data.schedulingConfig) {
        setSchedulingSettings({
          scheduleHorizonDays:
            stableQuery.data.schedulingConfig.scheduleHorizonDays ?? 14,
          autoAssignment:
            stableQuery.data.schedulingConfig.autoAssignment ?? true,
          allowSwaps: stableQuery.data.schedulingConfig.allowSwaps ?? true,
          requireApproval:
            stableQuery.data.schedulingConfig.requireApproval ?? false,
          defaultSelectionAlgorithm:
            stableQuery.data.schedulingConfig.defaultSelectionAlgorithm,
        });
      }

      // Load notification config
      if (stableQuery.data.notificationConfig) {
        setNotificationSettings({
          emailNotifications:
            stableQuery.data.notificationConfig.emailNotifications ?? true,
          shiftReminders:
            stableQuery.data.notificationConfig.shiftReminders ?? true,
          schedulePublished:
            stableQuery.data.notificationConfig.schedulePublished ?? true,
          memberJoined:
            stableQuery.data.notificationConfig.memberJoined ?? true,
          shiftSwapRequests:
            stableQuery.data.notificationConfig.shiftSwapRequests ?? true,
        });
      }

      // Load facilities
      setFacilitiesSettings({
        boxes: stableQuery.data.boxes || [],
        paddocks: stableQuery.data.paddocks || [],
      });
    }
  }, [stableQuery.data]);

  const [weightingSettings, setWeightingSettings] = useState<WeightingSettings>(
    {
      memoryHorizonDays: 90,
      resetPeriod: "quarterly",
      pointsMultiplier: 1.0,
    },
  );

  const [schedulingSettings, setSchedulingSettings] =
    useState<SchedulingSettings>({
      scheduleHorizonDays: 14,
      autoAssignment: true,
      allowSwaps: true,
      requireApproval: false,
    });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      emailNotifications: true,
      shiftReminders: true,
      schedulePublished: true,
      memberJoined: true,
      shiftSwapRequests: true,
    });

  const [facilitiesSettings, setFacilitiesSettings] =
    useState<FacilitiesSettings>({
      boxes: [],
      paddocks: [],
    });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stableId || !user) return;

    setIsLoading(true);
    try {
      await updateStable(stableId, user.uid, {
        name: stableInfo.name,
        description: stableInfo.description || undefined,
        facilityNumber: stableInfo.facilityNumber || undefined,
        address: stableInfo.address || undefined,
        pointsSystem: {
          memoryHorizonDays: weightingSettings.memoryHorizonDays,
          resetPeriod: weightingSettings.resetPeriod,
          holidayMultiplier: weightingSettings.pointsMultiplier,
        },
        schedulingConfig: schedulingSettings,
        notificationConfig: notificationSettings,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.stables.detail(stableId),
      });

      toast({
        title: t("settings:messages.saved"),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while fetching stable data
  if (stableQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state if stable not found
  if (!stableQuery.data && !stableQuery.isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Link to="/stables">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common:navigation.stables")}
          </Button>
        </Link>
        <p className="text-muted-foreground">{t("common:errors.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to={`/stables/${stableId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common:navigation.stables")}
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("settings:stableSettings.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("settings:stableSettings.description")}
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading
              ? t("common:labels.loading")
              : t("common:buttons.saveChanges")}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            {t("settings:tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="facilities">
            {t("settings:tabs.facilities")}
          </TabsTrigger>
          <TabsTrigger value="horses" asChild>
            <Link to={`/stables/${stableId}/horses/settings`}>
              {t("common:navigation.horses")}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="weighting">
            {t("settings:tabs.weighting")}
          </TabsTrigger>
          <TabsTrigger value="scheduling">
            {t("settings:tabs.scheduling")}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            {t("settings:tabs.notifications")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettingsTab
            stableInfo={stableInfo}
            onChange={setStableInfo}
            disabled={isLoading}
          />
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4">
          <FacilitiesSettingsTab
            stableId={stableId!}
            settings={facilitiesSettings}
            onChange={setFacilitiesSettings}
            disabled={isLoading}
          />
        </TabsContent>

        <TabsContent value="weighting" className="space-y-4">
          <WeightingSettingsTab
            settings={weightingSettings}
            onChange={setWeightingSettings}
            disabled={isLoading}
          />
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-4">
          <SchedulingSettingsTab
            settings={schedulingSettings}
            onChange={setSchedulingSettings}
            disabled={isLoading}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettingsTab
            settings={notificationSettings}
            onChange={setNotificationSettings}
            disabled={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
