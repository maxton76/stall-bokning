import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save } from "lucide-react";
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

export default function StableSettingsPage() {
  const { t } = useTranslation(["stables", "common", "settings"]);
  const { stableId } = useParams();
  const [isLoading, setIsLoading] = useState(false);

  // Mock stable data
  const [stableInfo, setStableInfo] = useState<StableInfo>({
    name: "Green Valley Stables",
    description: "A friendly stable community in Stockholm",
    address: "Vallvägen 12",
    city: "Stockholm",
    postalCode: "123 45",
  });

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement actual settings update with Firestore
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    // Show success message (toast would be nice here)
    alert("Settings saved successfully!");
  };

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
