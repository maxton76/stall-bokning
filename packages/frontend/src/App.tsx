import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AuthenticatedLayout from "./layouts/AuthenticatedLayout";
import { prewarmApi } from "./services/apiWarmup";

// Lazy-load public pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const CompleteProfilePage = lazy(() => import("./pages/CompleteProfilePage"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage"));

// Lazy-load authenticated pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));

// My Page
const MyStatisticsPage = lazy(() => import("./pages/my-page/MyStatisticsPage"));

// Schedule views
const ScheduleWeekPage = lazy(
  () => import("./pages/schedule/ScheduleWeekPage"),
);
const ScheduleMonthPage = lazy(
  () => import("./pages/schedule/ScheduleMonthPage"),
);
const ScheduleDistributionPage = lazy(
  () => import("./pages/schedule/ScheduleDistributionPage"),
);

// Horse pages
const MyHorsesPage = lazy(() => import("./pages/MyHorsesPage"));
const HorseDetailPage = lazy(() => import("./pages/HorseDetailPage"));
const HorseSettingsPage = lazy(() => import("./pages/HorseSettingsPage"));
const LocationHistoryPage = lazy(() => import("./pages/LocationHistoryPage"));

// Facility pages
const FacilitiesReservationsPage = lazy(
  () => import("./pages/FacilitiesReservationsPage"),
);
const ManageFacilitiesPage = lazy(() => import("./pages/ManageFacilitiesPage"));

// Activity pages (unified "Today" dashboard combines activities and routines)
const TodayPage = lazy(() => import("./pages/TodayPage"));
const ActivitiesPlanningPage = lazy(
  () => import("./pages/ActivitiesPlanningPage"),
);
const ActivitiesCarePage = lazy(() => import("./pages/ActivitiesCarePage"));
const ActivitiesSettingsPage = lazy(
  () => import("./pages/ActivitiesSettingsPage"),
);

// Feeding pages
const FeedingTodayPage = lazy(() => import("./pages/FeedingTodayPage"));
const FeedingSchedulePage = lazy(() => import("./pages/FeedingSchedulePage"));
const FeedingSettingsPage = lazy(() => import("./pages/FeedingSettingsPage"));
const FeedingHistoryPage = lazy(() => import("./pages/FeedingHistoryPage"));

// Inventory pages
const InventoryPage = lazy(() => import("./pages/InventoryPage"));

// Invoice pages
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));

// Lessons pages
const LessonsPage = lazy(() => import("./pages/LessonsPage"));

// Payment pages
const PaymentSettingsPage = lazy(() => import("./pages/PaymentSettingsPage"));

// Routine pages
const RoutinesPage = lazy(() => import("./pages/routines/RoutinesPage"));
const RoutineFlowPage = lazy(() => import("./pages/routines/RoutineFlowPage"));
const RoutineTemplatesPage = lazy(
  () => import("./pages/routines/RoutineTemplatesPage"),
);
const RoutineAnalyticsPage = lazy(
  () => import("./pages/routines/RoutineAnalyticsPage"),
);

// Availability pages
const MyAvailabilityPage = lazy(() => import("./pages/MyAvailabilityPage"));
const StaffMatrixPage = lazy(() => import("./pages/StaffMatrixPage"));

// My Reservations pages
const MyReservationsPage = lazy(() => import("./pages/MyReservationsPage"));
const FacilityAvailabilityPage = lazy(
  () => import("./pages/FacilityAvailabilityPage"),
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
const LeaveManagementPage = lazy(() => import("./pages/LeaveManagementPage"));
const ScheduleManagementPage = lazy(
  () => import("./pages/ScheduleManagementPage"),
);

// Contact pages
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const ContactDetailPage = lazy(() => import("./pages/ContactDetailPage"));

// Portal pages (Client Self-Service)
const PortalLayout = lazy(() => import("./layouts/PortalLayout"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalHorsesPage = lazy(() => import("./pages/portal/PortalHorsesPage"));
const PortalHorseDetailPage = lazy(
  () => import("./pages/portal/PortalHorseDetailPage"),
);
const PortalInvoicesPage = lazy(
  () => import("./pages/portal/PortalInvoicesPage"),
);
const PortalInvoiceDetailPage = lazy(
  () => import("./pages/portal/PortalInvoiceDetailPage"),
);
const PortalMessagesPage = lazy(
  () => import("./pages/portal/PortalMessagesPage"),
);
const PortalProfilePage = lazy(
  () => import("./pages/portal/PortalProfilePage"),
);
const PortalPaymentPage = lazy(
  () => import("./pages/portal/PortalPaymentPage"),
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
  // Pre-warm API on app load to trigger Cloud Run instance startup
  // This helps reduce cold start delays when users navigate to API-dependent pages
  useEffect(() => {
    prewarmApi();
  }, []);

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
              <Route
                path="/complete-profile"
                element={<CompleteProfilePage />}
              />
              <Route path="/invites/accept" element={<InviteAcceptPage />} />

              {/* Authenticated routes with layout - lazy loaded */}
              <Route
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout />
                  </ProtectedRoute>
                }
              >
                {/* Overview - new landing page */}
                <Route
                  path="/overview"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <OverviewPage />
                    </Suspense>
                  }
                />
                {/* Legacy redirect: /dashboard → /overview */}
                <Route
                  path="/dashboard"
                  element={<Navigate to="/overview" replace />}
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
                {/* Schedule routes */}
                <Route
                  path="/schedule"
                  element={<Navigate to="/schedule/week" replace />}
                />
                <Route
                  path="/schedule/week"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ScheduleWeekPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/schedule/month"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ScheduleMonthPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/schedule/distribution"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ScheduleDistributionPage />
                    </Suspense>
                  }
                />
                {/* Legacy schedule page still available at /schedule/legacy */}
                <Route
                  path="/schedule/legacy"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <SchedulePage />
                    </Suspense>
                  }
                />

                {/* My Reservations routes */}
                <Route
                  path="/my-reservations"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <MyReservationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/my-reservations/facility/:facilityId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <FacilityAvailabilityPage />
                    </Suspense>
                  }
                />

                {/* Task routes - redirect to activities (tasks consolidated) */}
                <Route
                  path="/tasks"
                  element={<Navigate to="/activities" replace />}
                />
                <Route
                  path="/tasks/*"
                  element={<Navigate to="/activities" replace />}
                />

                {/* My Page routes - personal aggregation */}
                <Route
                  path="/my-page"
                  element={<Navigate to="/my-page/availability" replace />}
                />
                <Route
                  path="/my-page/tasks"
                  element={<Navigate to="/activities" replace />}
                />
                <Route
                  path="/my-page/availability"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <MyAvailabilityPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/my-page/statistics"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <MyStatisticsPage />
                    </Suspense>
                  }
                />
                {/* Legacy redirect: /my-availability → /my-page/availability */}
                <Route
                  path="/my-availability"
                  element={<Navigate to="/my-page/availability" replace />}
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

                {/* Activity routes - Unified "Today" dashboard (combines activities + routines) */}
                <Route
                  path="/activities"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <TodayPage />
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
                  path="/activities/analytics"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <RoutineAnalyticsPage />
                    </Suspense>
                  }
                />
                {/* Legacy redirect: /activities/settings moved to /settings/activities */}
                <Route
                  path="/activities/settings"
                  element={<Navigate to="/settings/activities" replace />}
                />

                {/* Feeding routes */}
                <Route
                  path="/feeding"
                  element={<Navigate to="/feeding/today" replace />}
                />
                <Route
                  path="/feeding/today"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <FeedingTodayPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/feeding/overview"
                  element={<Navigate to="/feeding/today" replace />}
                />
                <Route
                  path="/feeding/schedule"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <FeedingSchedulePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/feeding/history"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <FeedingHistoryPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/feeding/settings"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <FeedingSettingsPage />
                    </Suspense>
                  }
                />

                {/* Inventory routes */}
                <Route
                  path="/inventory"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <InventoryPage />
                    </Suspense>
                  }
                />

                {/* Invoice routes */}
                <Route
                  path="/invoices"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <InvoicesPage />
                    </Suspense>
                  }
                />

                {/* Lesson routes */}
                <Route
                  path="/lessons"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <LessonsPage />
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
                <Route
                  path="/organizations/:organizationId/settings/payments"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PaymentSettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/leave-management"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <LeaveManagementPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/schedule-management"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ScheduleManagementPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/organizations/:organizationId/staff-matrix"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <StaffMatrixPage />
                    </Suspense>
                  }
                />

                {/* Contact routes */}
                <Route
                  path="/contacts"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ContactsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/contacts/:contactId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ContactDetailPage />
                    </Suspense>
                  }
                />

                {/* Routine flow route (kept for routine execution) */}
                <Route
                  path="/routines/flow/:instanceId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <RoutineFlowPage />
                    </Suspense>
                  }
                />
                {/* Legacy redirects: Routines menu reorganized under Activities and Settings */}
                <Route
                  path="/routines"
                  element={<Navigate to="/activities" replace />}
                />
                <Route
                  path="/routines/templates"
                  element={<Navigate to="/settings/routines" replace />}
                />
                <Route
                  path="/routines/analytics"
                  element={<Navigate to="/activities/analytics" replace />}
                />

                {/* Settings routes for configuration */}
                <Route
                  path="/settings/account"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <AccountPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/notifications"
                  element={<Navigate to="/settings" replace />}
                />
                <Route
                  path="/settings/routines"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <RoutineTemplatesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/activities"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <ActivitiesSettingsPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Portal routes (Client Self-Service) - separate layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <PortalLayout />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route
                  path="/portal"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="/portal/horses"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalHorsesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/portal/horses/:horseId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalHorseDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/portal/invoices"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalInvoicesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/portal/invoices/:invoiceId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalInvoiceDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/portal/pay/:invoiceId"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalPaymentPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/portal/messages"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalMessagesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/portal/profile"
                  element={
                    <Suspense fallback={<InlineLoader />}>
                      <PortalProfilePage />
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
