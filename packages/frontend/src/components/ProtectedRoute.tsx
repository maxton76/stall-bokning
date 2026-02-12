import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that ensures user is authenticated before rendering children
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { t } = useTranslation("common");

  // Show nothing while checking authentication status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("labels.loading")}</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Gate unverified email/password users (skip in emulator mode)
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
  if (!isEmulator && user.providerType === "password" && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
