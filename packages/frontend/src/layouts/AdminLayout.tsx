import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { adminNavigation } from "@/config/adminNavigation";
import { ArrowLeft, LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          {/* Admin Header */}
          <div className="flex items-center gap-3 px-6 py-4">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <span className="text-lg font-semibold text-foreground">
                Admin Portal
              </span>
              <p className="text-xs text-muted-foreground">System Management</p>
            </div>
          </div>

          {/* Back to App */}
          <div className="px-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => navigate("/overview")}
            >
              <ArrowLeft className="size-4" />
              Back to App
            </Button>
          </div>

          {/* Admin Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigation.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.href}>
                          <item.icon className="size-5" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* User Profile */}
          <div className="mt-auto border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src="" alt={user?.fullName || "Admin"} />
                <AvatarFallback>{user?.initials || "A"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-red-600" />
            <span className="text-sm font-medium text-muted-foreground">
              Admin Portal
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
