import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AuthenticatedLayout from './layouts/AuthenticatedLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
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

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated routes with layout */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/stables" element={<StablesPage />} />
            <Route path="/stables/create" element={<CreateStablePage />} />
            <Route path="/stables/:stableId" element={<StableDetailPage />} />
            <Route path="/stables/:stableId/schedule" element={<StableSchedulePage />} />
            <Route path="/stables/:stableId/settings" element={<StableSettingsPage />} />
            <Route path="/stables/:stableId/invite" element={<StableInvitePage />} />
            <Route path="/stables/:stableId/schedules/create" element={<CreateSchedulePage />} />
            <Route path="/stables/:stableId/schedules/:scheduleId/edit" element={<ScheduleEditorPage />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
