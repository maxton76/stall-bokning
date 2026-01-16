import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Lazy-load authenticated pages
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const SchedulePage = lazy(() => import("@/pages/SchedulePage"));

// Horse pages
const MyHorsesPage = lazy(() => import("@/pages/MyHorsesPage"));
const HorseDetailPage = lazy(() => import("@/pages/HorseDetailPage"));
const HorseSettingsPage = lazy(() => import("@/pages/HorseSettingsPage"));
const LocationHistoryPage = lazy(() => import("@/pages/LocationHistoryPage"));

// Facility pages
const FacilitiesReservationsPage = lazy(
  () => import("@/pages/FacilitiesReservationsPage"),
);
const ManageFacilitiesPage = lazy(() => import("@/pages/ManageFacilitiesPage"));

// Activity pages
const ActivitiesActionListPage = lazy(
  () => import("@/pages/ActivitiesActionListPage"),
);
const ActivitiesPlanningPage = lazy(
  () => import("@/pages/ActivitiesPlanningPage"),
);
const ActivitiesCarePage = lazy(() => import("@/pages/ActivitiesCarePage"));
const ActivitiesSettingsPage = lazy(
  () => import("@/pages/ActivitiesSettingsPage"),
);

// Stable pages
const StablesPage = lazy(() => import("@/pages/StablesPage"));
const CreateStablePage = lazy(() => import("@/pages/CreateStablePage"));
const StableDetailPage = lazy(() => import("@/pages/StableDetailPage"));
const StableSchedulePage = lazy(() => import("@/pages/StableSchedulePage"));
const StableSettingsPage = lazy(() => import("@/pages/StableSettingsPage"));
const StableInvitePage = lazy(() => import("@/pages/StableInvitePage"));
const CreateSchedulePage = lazy(() => import("@/pages/CreateSchedulePage"));
const ScheduleEditorPage = lazy(() => import("@/pages/ScheduleEditorPage"));

// Organization pages
const OrganizationsPage = lazy(() => import("@/pages/OrganizationsPage"));
const CreateOrganizationPage = lazy(
  () => import("@/pages/CreateOrganizationPage"),
);
const OrganizationUsersPage = lazy(
  () => import("@/pages/OrganizationUsersPage"),
);
const OrganizationSettingsPage = lazy(
  () => import("@/pages/OrganizationSettingsPage"),
);
const OrganizationIntegrationsPage = lazy(
  () => import("@/pages/OrganizationIntegrationsPage"),
);
const OrganizationManurePage = lazy(
  () => import("@/pages/OrganizationManurePage"),
);
const OrganizationPermissionsPage = lazy(
  () => import("@/pages/OrganizationPermissionsPage"),
);
const OrganizationSubscriptionPage = lazy(
  () => import("@/pages/OrganizationSubscriptionPage"),
);

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Main pages */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />

        {/* Horse pages */}
        <Route path="/horses" element={<MyHorsesPage />} />
        <Route path="/horses/:horseId" element={<HorseDetailPage />} />
        <Route path="/horses/settings" element={<HorseSettingsPage />} />
        <Route path="/location-history" element={<LocationHistoryPage />} />

        {/* Facility pages */}
        <Route
          path="/facilities/reservations"
          element={<FacilitiesReservationsPage />}
        />
        <Route path="/facilities/manage" element={<ManageFacilitiesPage />} />

        {/* Activity pages */}
        <Route path="/activities" element={<ActivitiesActionListPage />} />
        <Route
          path="/activities/planning"
          element={<ActivitiesPlanningPage />}
        />
        <Route path="/activities/care" element={<ActivitiesCarePage />} />
        <Route
          path="/activities/settings"
          element={<ActivitiesSettingsPage />}
        />

        {/* Stable pages */}
        <Route path="/stables" element={<StablesPage />} />
        <Route path="/stables/create" element={<CreateStablePage />} />
        <Route path="/stables/:stableId" element={<StableDetailPage />} />
        <Route
          path="/stables/:stableId/schedule"
          element={<StableSchedulePage />}
        />
        <Route
          path="/stables/:stableId/settings"
          element={<StableSettingsPage />}
        />
        <Route
          path="/stables/:stableId/horses/settings"
          element={<HorseSettingsPage />}
        />
        <Route
          path="/stables/:stableId/invite"
          element={<StableInvitePage />}
        />
        <Route
          path="/stables/:stableId/schedules/create"
          element={<CreateSchedulePage />}
        />
        <Route
          path="/stables/:stableId/schedules/:scheduleId/edit"
          element={<ScheduleEditorPage />}
        />

        {/* Organization pages */}
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route
          path="/organizations/create"
          element={<CreateOrganizationPage />}
        />
        <Route
          path="/organizations/:organizationId/users"
          element={<OrganizationUsersPage />}
        />
        <Route
          path="/organizations/:organizationId/integrations"
          element={<OrganizationIntegrationsPage />}
        />
        <Route
          path="/organizations/:organizationId/manure"
          element={<OrganizationManurePage />}
        />
        <Route
          path="/organizations/:organizationId/permissions"
          element={<OrganizationPermissionsPage />}
        />
        <Route
          path="/organizations/:organizationId/subscription"
          element={<OrganizationSubscriptionPage />}
        />
        <Route
          path="/organizations/:organizationId/settings"
          element={<OrganizationSettingsPage />}
        />
      </Routes>
    </Suspense>
  );
}
