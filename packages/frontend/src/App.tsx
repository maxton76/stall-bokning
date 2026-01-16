import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AuthenticatedLayout from "./layouts/AuthenticatedLayout";

// Lazy-load public pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const CompleteProfilePage = lazy(() => import("./pages/CompleteProfilePage"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage"));

// Lazy-load authenticated pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));

// Horse pages
const MyHorsesPage = lazy(() => import("./pages/MyHorsesPage"));
const HorseDetailPage = lazy(() => import("./pages/HorseDetailPage"));
const HorseSettingsPage = lazy(() => import("./pages/HorseSettingsPage"));
const LocationHistoryPage = lazy(() => import("./pages/LocationHistoryPage"));

// Facility pages
const FacilitiesReservationsPage = lazy(
  () => import("./pages/FacilitiesReservationsPage"),
);
const ManageFacilitiesPage = lazy(
  () => import("./pages/ManageFacilitiesPage"),
);

// Activity pages
const ActivitiesActionListPage = lazy(
  () => import("./pages/ActivitiesActionListPage"),
);
const ActivitiesPlanningPage = lazy(
  () => import("./pages/ActivitiesPlanningPage"),
);
const ActivitiesCarePage = lazy(() => import("./pages/ActivitiesCarePage"));
const ActivitiesSettingsPage = lazy(
  () => import("./pages/ActivitiesSettingsPage"),
);

// Stable pages
const StablesPage = lazy(() => import("./pages/StablesPage"));
const CreateStablePage = lazy(() => import("./pages/CreateStablePage"));
const StableDetailPage = lazy(() => import("./pages/StableDetailPage"));
const StableSchedulePage = lazy(() => import("./pages/StableSchedulePage"));
const StableSettingsPage = lazy(() => import("./pages/StableSettingsPage"));
const StableInvitePage = lazy(() => import("./pages/StableInvitePage"));
const CreateSchedulePage = lazy(() => import("./pages/CreateSchedulePage"));
const ScheduleEditorPage = lazy(() => import("./pages/ScheduleEditorPage"));

// Organization pages
const OrganizationsPage = lazy(() => import("./pages/OrganizationsPage"));
const CreateOrganizationPage = lazy(
  () => import("./pages/CreateOrganizationPage"),
);
const OrganizationUsersPage = lazy(
  () => import("./pages/OrganizationUsersPage"),
);
const OrganizationSettingsPage = lazy(
  () => import("./pages/OrganizationSettingsPage"),
);
const OrganizationIntegrationsPage = lazy(
  () => import("./pages/OrganizationIntegrationsPage"),
);
const OrganizationManurePage = lazy(
  () => import("./pages/OrganizationManurePage"),
);
const OrganizationPermissionsPage = lazy(
  () => import("./pages/OrganizationPermissionsPage"),
);
const OrganizationSubscriptionPage = lazy(
  () => import("./pages/OrganizationSubscriptionPage"),
);

// Full-page loading spinner for initial route load
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Inline loading spinner for route transitions within layout
function InlineLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes - lazy loaded */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route path="/invites/accept" element={<InviteAcceptPage />} />

              {/* Authenticated routes with layout - lazy loaded */}
              <Route
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="/dashboard"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <AccountPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <SettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/schedule"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <SchedulePage />
                    </Suspense>
                  }
                />

                {/* Horse routes */}
                <Route
                  path="/horses"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <MyHorsesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/horses/:horseId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <HorseDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/horses/settings"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <HorseSettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/location-history"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <LocationHistoryPage />
                    </Suspense>
                  }
                />

                {/* Facility routes */}
                <Route
                  path="/facilities/reservations"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <FacilitiesReservationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/facilities/manage"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ManageFacilitiesPage />
                    </Suspense>
                  }
                />

                {/* Activity routes */}
                <Route
                  path="/activities"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ActivitiesActionListPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/activities/planning"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ActivitiesPlanningPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/activities/care"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ActivitiesCarePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/activities/settings"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ActivitiesSettingsPage />
                    </Suspense>
                  }
                />

                {/* Stable routes */}
                <Route
                  path="/stables"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <StablesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/create"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <CreateStablePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/:stableId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <StableDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/:stableId/schedule"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <StableSchedulePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/:stableId/settings"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <StableSettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/:stableId/horses/settings"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <HorseSettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/:stableId/invite"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <StableInvitePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/:stableId/schedules/create"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <CreateSchedulePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/stables/:stableId/schedules/:scheduleId/edit"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ScheduleEditorPage />
                    </Suspense>
                  }
                />

                {/* Organization routes */}
                <Route
                  path="/organizations"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OrganizationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/create"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <CreateOrganizationPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/users"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OrganizationUsersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/integrations"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OrganizationIntegrationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/manure"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OrganizationManurePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/permissions"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OrganizationPermissionsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/subscription"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OrganizationSubscriptionPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/settings"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OrganizationSettingsPage />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </div>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;
