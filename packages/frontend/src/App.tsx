import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SignupPage from './pages/SignupPage'
import InviteAcceptPage from './pages/InviteAcceptPage'
import DashboardPage from './pages/DashboardPage'
import StablesPage from './pages/StablesPage'
import CreateStablePage from './pages/CreateStablePage'
import StableDetailPage from './pages/StableDetailPage'
import StableSettingsPage from './pages/StableSettingsPage'
import StableSchedulePage from './pages/StableSchedulePage'
import StableInvitePage from './pages/StableInvitePage'
import CreateSchedulePage from './pages/CreateSchedulePage'
import SchedulePage from './pages/SchedulePage'
import ScheduleEditorPage from './pages/ScheduleEditorPage'
import AccountPage from './pages/AccountPage'
import SettingsPage from './pages/SettingsPage'
import MyHorsesPage from './pages/MyHorsesPage'
import HorseDetailPage from './pages/HorseDetailPage'
import HorseSettingsPage from './pages/HorseSettingsPage'
import LocationHistoryPage from './pages/LocationHistoryPage'
import FacilitiesReservationsPage from './pages/FacilitiesReservationsPage'
import ManageFacilitiesPage from './pages/ManageFacilitiesPage'
import ActivitiesActionListPage from './pages/ActivitiesActionListPage'
import ActivitiesPlanningPage from './pages/ActivitiesPlanningPage'
import ActivitiesCarePage from './pages/ActivitiesCarePage'
import ActivitiesSettingsPage from './pages/ActivitiesSettingsPage'
import OrganizationsPage from './pages/OrganizationsPage'
import CreateOrganizationPage from './pages/CreateOrganizationPage'
import OrganizationUsersPage from './pages/OrganizationUsersPage'
import OrganizationSettingsPage from './pages/OrganizationSettingsPage'
import OrganizationIntegrationsPage from './pages/OrganizationIntegrationsPage'
import OrganizationManurePage from './pages/OrganizationManurePage'
import OrganizationPermissionsPage from './pages/OrganizationPermissionsPage'
import OrganizationSubscriptionPage from './pages/OrganizationSubscriptionPage'

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <div className="min-h-screen bg-background">
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/invites/accept" element={<InviteAcceptPage />} />

          {/* Authenticated routes with layout */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/horses" element={<MyHorsesPage />} />
            <Route path="/horses/:horseId" element={<HorseDetailPage />} />
            <Route path="/horses/settings" element={<HorseSettingsPage />} />
            <Route path="/location-history" element={<LocationHistoryPage />} />
            <Route path="/facilities/reservations" element={<FacilitiesReservationsPage />} />
            <Route path="/facilities/manage" element={<ManageFacilitiesPage />} />
            <Route path="/activities" element={<ActivitiesActionListPage />} />
            <Route path="/activities/planning" element={<ActivitiesPlanningPage />} />
            <Route path="/activities/care" element={<ActivitiesCarePage />} />
            <Route path="/activities/settings" element={<ActivitiesSettingsPage />} />
            <Route path="/stables" element={<StablesPage />} />
            <Route path="/stables/create" element={<CreateStablePage />} />
            <Route path="/stables/:stableId" element={<StableDetailPage />} />
            <Route path="/stables/:stableId/schedule" element={<StableSchedulePage />} />
            <Route path="/stables/:stableId/settings" element={<StableSettingsPage />} />
            <Route path="/stables/:stableId/horses/settings" element={<HorseSettingsPage />} />
            <Route path="/stables/:stableId/invite" element={<StableInvitePage />} />
            <Route path="/stables/:stableId/schedules/create" element={<CreateSchedulePage />} />
            <Route path="/stables/:stableId/schedules/:scheduleId/edit" element={<ScheduleEditorPage />} />
            {/* Organization routes */}
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organizations/create" element={<CreateOrganizationPage />} />
            <Route path="/organizations/:organizationId/users" element={<OrganizationUsersPage />} />
            <Route path="/organizations/:organizationId/integrations" element={<OrganizationIntegrationsPage />} />
            <Route path="/organizations/:organizationId/manure" element={<OrganizationManurePage />} />
            <Route path="/organizations/:organizationId/permissions" element={<OrganizationPermissionsPage />} />
            <Route path="/organizations/:organizationId/subscription" element={<OrganizationSubscriptionPage />} />
            <Route path="/organizations/:organizationId/settings" element={<OrganizationSettingsPage />} />
          </Route>
          </Routes>
        </div>
      </OrganizationProvider>
    </AuthProvider>
  )
}

export default App
