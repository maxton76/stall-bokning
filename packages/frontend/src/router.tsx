import { lazy, Suspense, useEffect } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { useLanguageSync } from "./hooks/useLanguageSync";
import { prewarmApi } from "./services/apiWarmup";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import AuthenticatedLayout from "./layouts/AuthenticatedLayout";

// Loading components
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function InlineLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Lazy-loaded components
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const CompleteProfilePage = lazy(() => import("./pages/CompleteProfilePage"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage"));
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const MyStatisticsPage = lazy(() => import("./pages/my-page/MyStatisticsPage"));
const MyInvoicesPage = lazy(() => import("./pages/my-page/MyInvoicesPage"));
const MyPackagesPage = lazy(() => import("./pages/my-page/MyPackagesPage"));
const ScheduleWeekPage = lazy(
  () => import("./pages/schedule/ScheduleWeekPage"),
);
const ScheduleMonthPage = lazy(
  () => import("./pages/schedule/ScheduleMonthPage"),
);
const ScheduleDistributionPage = lazy(
  () => import("./pages/schedule/ScheduleDistributionPage"),
);
const ScheduleRoutinesPage = lazy(
  () => import("./pages/schedule/ScheduleRoutinesPage"),
);
const SelectionProcessListPage = lazy(
  () => import("./pages/schedule/SelectionProcessListPage"),
);
const SelectionProcessPage = lazy(
  () => import("./pages/schedule/SelectionProcessPage"),
);
const MyHorsesPage = lazy(() => import("./pages/MyHorsesPage"));
const HorseDetailPage = lazy(() => import("./pages/HorseDetailPage"));
const HorseSettingsPage = lazy(() => import("./pages/HorseSettingsPage"));
const LocationHistoryPage = lazy(() => import("./pages/LocationHistoryPage"));
const FacilitiesReservationsPage = lazy(
  () => import("./pages/FacilitiesReservationsPage"),
);
const ManageFacilitiesPage = lazy(() => import("./pages/ManageFacilitiesPage"));
const TodayPage = lazy(() => import("./pages/TodayPage"));
const ActivitiesPlanningPage = lazy(
  () => import("./pages/ActivitiesPlanningPage"),
);
const ActivitiesCarePage = lazy(() => import("./pages/ActivitiesCarePage"));
const ActivitiesSettingsPage = lazy(
  () => import("./pages/ActivitiesSettingsPage"),
);
const FeedingTodayPage = lazy(() => import("./pages/FeedingTodayPage"));
const FeedingSchedulePage = lazy(() => import("./pages/FeedingSchedulePage"));
const FeedingSettingsPage = lazy(() => import("./pages/FeedingSettingsPage"));
const FeedingHistoryPage = lazy(() => import("./pages/FeedingHistoryPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const LessonsPage = lazy(() => import("./pages/LessonsPage"));
const LessonsCalendarPage = lazy(
  () => import("./pages/lessons/LessonsCalendarPage"),
);
const MyLessonBookingsPage = lazy(
  () => import("./pages/lessons/MyLessonBookingsPage"),
);
const ManageLessonsPage = lazy(
  () => import("./pages/lessons/ManageLessonsPage"),
);
const PaymentSettingsPage = lazy(() => import("./pages/PaymentSettingsPage"));
const RoutineFlowPage = lazy(() => import("./pages/routines/RoutineFlowPage"));
const RoutineTemplatesPage = lazy(
  () => import("./pages/routines/RoutineTemplatesPage"),
);
const RoutineAnalyticsPage = lazy(
  () => import("./pages/routines/RoutineAnalyticsPage"),
);
const MyAvailabilityPage = lazy(() => import("./pages/MyAvailabilityPage"));
const StaffMatrixPage = lazy(() => import("./pages/StaffMatrixPage"));
const MyReservationsPage = lazy(() => import("./pages/MyReservationsPage"));
const FacilityAvailabilityPage = lazy(
  () => import("./pages/FacilityAvailabilityPage"),
);
const StablesPage = lazy(() => import("./pages/StablesPage"));
const CreateStablePage = lazy(() => import("./pages/CreateStablePage"));
const StableDetailPage = lazy(() => import("./pages/StableDetailPage"));
const StableSchedulePage = lazy(() => import("./pages/StableSchedulePage"));
const StableSettingsPage = lazy(() => import("./pages/StableSettingsPage"));
const StableInvitePage = lazy(() => import("./pages/StableInvitePage"));
const CreateSchedulePage = lazy(() => import("./pages/CreateSchedulePage"));
const ScheduleEditorPage = lazy(() => import("./pages/ScheduleEditorPage"));
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
const SubscriptionSuccessPage = lazy(
  () => import("./pages/SubscriptionSuccessPage"),
);
const SubscriptionCancelPage = lazy(
  () => import("./pages/SubscriptionCancelPage"),
);
const LeaveManagementPage = lazy(() => import("./pages/LeaveManagementPage"));
const ScheduleManagementPage = lazy(
  () => import("./pages/ScheduleManagementPage"),
);
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const ContactDetailPage = lazy(() => import("./pages/ContactDetailPage"));
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

// Admin pages (System Admin Portal)
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboardPage = lazy(
  () => import("./pages/admin/AdminDashboardPage"),
);
const AdminOrganizationsPage = lazy(
  () => import("./pages/admin/AdminOrganizationsPage"),
);
const AdminOrganizationDetailPage = lazy(
  () => import("./pages/admin/AdminOrganizationDetailPage"),
);
const AdminTierManagementPage = lazy(
  () => import("./pages/admin/AdminTierManagementPage"),
);
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(
  () => import("./pages/admin/AdminUserDetailPage"),
);
const AdminPaymentsPage = lazy(() => import("./pages/admin/AdminPaymentsPage"));
const AdminSystemHealthPage = lazy(
  () => import("./pages/admin/AdminSystemHealthPage"),
);
const AdminSupportPage = lazy(() => import("./pages/admin/AdminSupportPage"));
const FeatureRequestsPage = lazy(() => import("./pages/FeatureRequestsPage"));
const FeatureRequestDetailPage = lazy(
  () => import("./pages/FeatureRequestDetailPage"),
);
const AdminFeatureRequestsPage = lazy(
  () => import("./pages/admin/AdminFeatureRequestsPage"),
);
const FeatureTogglesPage = lazy(
  () => import("./pages/admin/FeatureTogglesPage"),
);
const AdminNotificationTestPage = lazy(
  () => import("./pages/admin/AdminNotificationTestPage"),
);

// Finance & Invoicing pages
const PaymentDashboardPage = lazy(() => import("./pages/PaymentDashboardPage"));
const LineItemsPage = lazy(() => import("./pages/LineItemsPage"));
const DisputesPage = lazy(() => import("./pages/DisputesPage"));
const PackagesPage = lazy(() => import("./pages/PackagesPage"));
const BillingGroupsPage = lazy(() => import("./pages/BillingGroupsPage"));
const ChargeableItemsPage = lazy(() => import("./pages/ChargeableItemsPage"));
const TrainerCommissionPage = lazy(
  () => import("./pages/TrainerCommissionPage"),
);
const OrganizationHorseGroupsPage = lazy(
  () => import("./pages/OrganizationHorseGroupsPage"),
);
const InvoicePayPage = lazy(() => import("./pages/InvoicePayPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentCancelPage = lazy(() => import("./pages/PaymentCancelPage"));
const PackagePurchasePage = lazy(
  () => import("./pages/portal/PackagePurchasePage"),
);

// Helper to wrap lazy components with Suspense
function withSuspense(
  Component: React.LazyExoticComponent<React.ComponentType<unknown>>,
  fallback: React.ReactNode = <InlineLoader />,
) {
  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}

// Component to sync language preference with Firestore
function LanguageSyncWrapper({ children }: { children: React.ReactNode }) {
  useLanguageSync();
  return <>{children}</>;
}

// Root layout that wraps everything with providers
function RootLayout() {
  // Subscribe to location changes to ensure re-renders propagate through the tree
  // This fixes React Router 7 + React 19 navigation issues where Link clicks
  // update the URL but don't trigger component re-renders
  useLocation();

  useEffect(() => {
    prewarmApi();
  }, []);

  return (
    <AuthProvider>
      <LanguageSyncWrapper>
        <OrganizationProvider>
          <SubscriptionProvider>
            <div className="min-h-screen bg-background">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </SubscriptionProvider>
        </OrganizationProvider>
      </LanguageSyncWrapper>
    </AuthProvider>
  );
}

// Protected layout wrapper
function ProtectedAuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout />
    </ProtectedRoute>
  );
}

function ProtectedPortalLayout() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        <PortalLayout />
      </Suspense>
    </ProtectedRoute>
  );
}

function ProtectedAdminLayout() {
  return (
    <AdminProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        <AdminLayout />
      </Suspense>
    </AdminProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes — landing page is now served by the Astro site
      { path: "/", element: <Navigate to="/login" replace /> },
      { path: "/login", element: withSuspense(LoginPage, <PageLoader />) },
      {
        path: "/register",
        element: withSuspense(RegisterPage, <PageLoader />),
      },
      { path: "/signup", element: withSuspense(SignupPage, <PageLoader />) },
      {
        path: "/complete-profile",
        element: withSuspense(CompleteProfilePage, <PageLoader />),
      },
      {
        path: "/invites/accept",
        element: withSuspense(InviteAcceptPage, <PageLoader />),
      },

      // Payment flow (accessible via invoice links)
      {
        path: "/pay/:invoiceId",
        element: withSuspense(InvoicePayPage, <PageLoader />),
      },
      {
        path: "/payment/success",
        element: withSuspense(PaymentSuccessPage, <PageLoader />),
      },
      {
        path: "/payment/cancel",
        element: withSuspense(PaymentCancelPage, <PageLoader />),
      },

      // Authenticated routes
      {
        element: <ProtectedAuthenticatedLayout />,
        children: [
          { path: "/overview", element: withSuspense(OverviewPage) },
          { path: "/dashboard", element: <Navigate to="/overview" replace /> },
          { path: "/account", element: withSuspense(AccountPage) },
          { path: "/settings", element: withSuspense(SettingsPage) },

          // Schedule
          {
            path: "/schedule",
            element: <Navigate to="/schedule/week" replace />,
          },
          { path: "/schedule/week", element: withSuspense(ScheduleWeekPage) },
          { path: "/schedule/month", element: withSuspense(ScheduleMonthPage) },
          {
            path: "/schedule/distribution",
            element: withSuspense(ScheduleDistributionPage),
          },
          {
            path: "/schedule/routines",
            element: withSuspense(ScheduleRoutinesPage),
          },
          {
            path: "/schedule/selection",
            element: withSuspense(SelectionProcessListPage),
          },
          {
            path: "/schedule/selection/:processId",
            element: withSuspense(SelectionProcessPage),
          },
          { path: "/schedule/legacy", element: withSuspense(SchedulePage) },
          {
            path: "/schedule/routinetemplates",
            element: withSuspense(RoutineTemplatesPage),
          },

          // My Reservations
          {
            path: "/my-reservations",
            element: withSuspense(MyReservationsPage),
          },
          {
            path: "/my-reservations/facility/:facilityId",
            element: withSuspense(FacilityAvailabilityPage),
          },

          // Tasks redirect
          { path: "/tasks", element: <Navigate to="/activities" replace /> },
          { path: "/tasks/*", element: <Navigate to="/activities" replace /> },

          // My Page
          {
            path: "/my-page",
            element: <Navigate to="/my-page/availability" replace />,
          },
          {
            path: "/my-page/tasks",
            element: <Navigate to="/activities" replace />,
          },
          {
            path: "/my-page/availability",
            element: withSuspense(MyAvailabilityPage),
          },
          {
            path: "/my-page/statistics",
            element: withSuspense(MyStatisticsPage),
          },
          {
            path: "/my-page/invoices",
            element: withSuspense(MyInvoicesPage),
          },
          {
            path: "/my-page/packages",
            element: withSuspense(MyPackagesPage),
          },
          {
            path: "/my-page/commissions",
            element: withSuspense(TrainerCommissionPage),
          },
          {
            path: "/my-availability",
            element: <Navigate to="/my-page/availability" replace />,
          },

          // Horses
          { path: "/horses", element: withSuspense(MyHorsesPage) },
          {
            path: "/horses/care",
            element: (
              <Suspense fallback={<InlineLoader />}>
                <ActivitiesCarePage scope="my" />
              </Suspense>
            ),
          },
          { path: "/horses/:horseId", element: withSuspense(HorseDetailPage) },
          {
            path: "/horses/settings",
            element: withSuspense(HorseSettingsPage),
          },
          {
            path: "/location-history",
            element: withSuspense(LocationHistoryPage),
          },

          // Facilities
          {
            path: "/facilities/reservations",
            element: withSuspense(FacilitiesReservationsPage),
          },
          {
            path: "/facilities/manage",
            element: withSuspense(ManageFacilitiesPage),
          },

          // Activities
          { path: "/activities", element: withSuspense(TodayPage) },
          {
            path: "/activities/planning",
            element: withSuspense(ActivitiesPlanningPage),
          },
          {
            path: "/activities/care",
            element: (
              <Suspense fallback={<InlineLoader />}>
                <ActivitiesCarePage />
              </Suspense>
            ),
          },
          {
            path: "/activities/analytics",
            element: withSuspense(RoutineAnalyticsPage),
          },
          {
            path: "/activities/settings",
            element: <Navigate to="/settings/activities" replace />,
          },

          // Feeding
          {
            path: "/feeding",
            element: <Navigate to="/feeding/today" replace />,
          },
          { path: "/feeding/today", element: withSuspense(FeedingTodayPage) },
          {
            path: "/feeding/overview",
            element: <Navigate to="/feeding/today" replace />,
          },
          {
            path: "/feeding/schedule",
            element: withSuspense(FeedingSchedulePage),
          },
          {
            path: "/feeding/history",
            element: withSuspense(FeedingHistoryPage),
          },
          {
            path: "/feeding/settings",
            element: withSuspense(FeedingSettingsPage),
          },

          // Inventory
          { path: "/inventory", element: withSuspense(InventoryPage) },

          // Invoices
          { path: "/invoices", element: withSuspense(InvoicesPage) },

          // Finance
          {
            path: "/finance",
            element: <Navigate to="/finance/dashboard" replace />,
          },
          {
            path: "/finance/dashboard",
            element: withSuspense(PaymentDashboardPage),
          },
          {
            path: "/finance/line-items",
            element: withSuspense(LineItemsPage),
          },
          {
            path: "/finance/disputes",
            element: withSuspense(DisputesPage),
          },
          {
            path: "/finance/packages",
            element: withSuspense(PackagesPage),
          },

          // Lessons
          {
            path: "/lessons",
            element: <Navigate to="/lessons/calendar" replace />,
          },
          {
            path: "/lessons/calendar",
            element: withSuspense(LessonsCalendarPage),
          },
          {
            path: "/lessons/my-bookings",
            element: withSuspense(MyLessonBookingsPage),
          },
          {
            path: "/lessons/manage",
            element: withSuspense(ManageLessonsPage),
          },

          // Stables
          { path: "/stables", element: withSuspense(StablesPage) },
          { path: "/stables/create", element: withSuspense(CreateStablePage) },
          {
            path: "/stables/:stableId",
            element: withSuspense(StableDetailPage),
          },
          {
            path: "/stables/:stableId/schedule",
            element: withSuspense(StableSchedulePage),
          },
          {
            path: "/stables/:stableId/settings",
            element: withSuspense(StableSettingsPage),
          },
          {
            path: "/stables/:stableId/horses/settings",
            element: withSuspense(HorseSettingsPage),
          },
          {
            path: "/stables/:stableId/invite",
            element: withSuspense(StableInvitePage),
          },
          {
            path: "/stables/:stableId/schedules/create",
            element: withSuspense(CreateSchedulePage),
          },
          {
            path: "/stables/:stableId/schedules/:scheduleId/edit",
            element: withSuspense(ScheduleEditorPage),
          },

          // Organizations
          { path: "/organizations", element: withSuspense(OrganizationsPage) },
          {
            path: "/organizations/create",
            element: withSuspense(CreateOrganizationPage),
          },
          {
            path: "/organizations/:organizationId/users",
            element: withSuspense(OrganizationUsersPage),
          },
          {
            path: "/organizations/:organizationId/integrations",
            element: withSuspense(OrganizationIntegrationsPage),
          },
          {
            path: "/organizations/:organizationId/manure",
            element: withSuspense(OrganizationManurePage),
          },
          {
            path: "/organizations/:organizationId/permissions",
            element: withSuspense(OrganizationPermissionsPage),
          },
          {
            path: "/organizations/:organizationId/subscription",
            element: withSuspense(OrganizationSubscriptionPage),
          },
          {
            path: "/organizations/:organizationId/subscription/success",
            element: withSuspense(SubscriptionSuccessPage),
          },
          {
            path: "/organizations/:organizationId/subscription/cancel",
            element: withSuspense(SubscriptionCancelPage),
          },
          {
            path: "/organizations/:organizationId/settings",
            element: withSuspense(OrganizationSettingsPage),
          },
          {
            path: "/organizations/:organizationId/settings/payments",
            element: withSuspense(PaymentSettingsPage),
          },
          {
            path: "/organizations/:organizationId/leave-management",
            element: withSuspense(LeaveManagementPage),
          },
          {
            path: "/organizations/:organizationId/schedule-management",
            element: withSuspense(ScheduleManagementPage),
          },
          {
            path: "/organizations/:organizationId/staff-matrix",
            element: withSuspense(StaffMatrixPage),
          },
          {
            path: "/organizations/:organizationId/chargeable-items",
            element: withSuspense(ChargeableItemsPage),
          },
          {
            path: "/organizations/:organizationId/billing-groups",
            element: withSuspense(BillingGroupsPage),
          },
          {
            path: "/organizations/:organizationId/trainer-commissions",
            element: withSuspense(TrainerCommissionPage),
          },
          {
            path: "/organizations/:organizationId/horse-groups",
            element: withSuspense(OrganizationHorseGroupsPage),
          },

          // Contacts
          { path: "/contacts", element: withSuspense(ContactsPage) },
          {
            path: "/contacts/:contactId",
            element: withSuspense(ContactDetailPage),
          },

          // Routines
          {
            path: "/routines/flow/:instanceId",
            element: withSuspense(RoutineFlowPage),
          },
          { path: "/routines", element: <Navigate to="/activities" replace /> },
          {
            path: "/routines/create",
            element: <Navigate to="/activities" replace />,
          },
          {
            path: "/routines/templates",
            element: <Navigate to="/schedule/routinetemplates" replace />,
          },
          {
            path: "/routines/analytics",
            element: <Navigate to="/activities/analytics" replace />,
          },

          // Feature Requests
          {
            path: "/feature-requests",
            element: withSuspense(FeatureRequestsPage),
          },
          {
            path: "/feature-requests/:requestId",
            element: withSuspense(FeatureRequestDetailPage),
          },

          // Settings
          { path: "/settings/account", element: withSuspense(AccountPage) },
          {
            path: "/settings/notifications",
            element: <Navigate to="/settings" replace />,
          },
          {
            path: "/settings/activities",
            element: withSuspense(ActivitiesSettingsPage),
          },
        ],
      },

      // Portal routes
      {
        element: <ProtectedPortalLayout />,
        children: [
          { path: "/portal", element: withSuspense(PortalDashboard) },
          { path: "/portal/horses", element: withSuspense(PortalHorsesPage) },
          {
            path: "/portal/horses/:horseId",
            element: withSuspense(PortalHorseDetailPage),
          },
          {
            path: "/portal/invoices",
            element: withSuspense(PortalInvoicesPage),
          },
          {
            path: "/portal/invoices/:invoiceId",
            element: withSuspense(PortalInvoiceDetailPage),
          },
          {
            path: "/portal/pay/:invoiceId",
            element: withSuspense(PortalPaymentPage),
          },
          {
            path: "/portal/messages",
            element: withSuspense(PortalMessagesPage),
          },
          { path: "/portal/profile", element: withSuspense(PortalProfilePage) },
          {
            path: "/portal/packages",
            element: withSuspense(PackagePurchasePage),
          },
          {
            path: "/portal/packages/:packageId",
            element: withSuspense(PackagePurchasePage),
          },
        ],
      },

      // Admin routes (System Admin Portal)
      {
        element: <ProtectedAdminLayout />,
        children: [
          { path: "/admin", element: withSuspense(AdminDashboardPage) },
          {
            path: "/admin/organizations",
            element: withSuspense(AdminOrganizationsPage),
          },
          {
            path: "/admin/organizations/:id",
            element: withSuspense(AdminOrganizationDetailPage),
          },
          {
            path: "/admin/tiers",
            element: withSuspense(AdminTierManagementPage),
          },
          { path: "/admin/users", element: withSuspense(AdminUsersPage) },
          {
            path: "/admin/users/:id",
            element: withSuspense(AdminUserDetailPage),
          },
          { path: "/admin/payments", element: withSuspense(AdminPaymentsPage) },
          {
            path: "/admin/system",
            element: withSuspense(AdminSystemHealthPage),
          },
          { path: "/admin/support", element: withSuspense(AdminSupportPage) },
          {
            path: "/admin/feature-requests",
            element: withSuspense(AdminFeatureRequestsPage),
          },
          {
            path: "/admin/feature-toggles",
            element: withSuspense(FeatureTogglesPage),
          },
          {
            path: "/admin/notifications-test",
            element: withSuspense(AdminNotificationTestPage),
          },
          {
            path: "/admin/stripe-products",
            element: <Navigate to="/admin/tiers" replace />,
          },
        ],
      },
    ],
  },
]);
