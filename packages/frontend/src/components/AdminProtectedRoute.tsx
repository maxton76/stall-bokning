import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemAdmin } from "@/hooks/useSystemAdmin";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that ensures user is authenticated AND has system_admin role.
 * Redirects to /login if not authenticated, /overview if not admin.
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemAdmin) {
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
}
