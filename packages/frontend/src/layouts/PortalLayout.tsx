import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Horse,
  FileText,
  MessageSquare,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const portalNavItems = [
  {
    href: "/portal",
    icon: LayoutDashboard,
    labelKey: "portal:nav.dashboard",
    exact: true,
  },
  {
    href: "/portal/horses",
    icon: Horse,
    labelKey: "portal:nav.myHorses",
  },
  {
    href: "/portal/invoices",
    icon: FileText,
    labelKey: "portal:nav.invoices",
  },
  {
    href: "/portal/messages",
    icon: MessageSquare,
    labelKey: "portal:nav.messages",
  },
];

export default function PortalLayout() {
  const { t } = useTranslation(["portal", "common"]);
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("flex", mobile ? "flex-col space-y-1" : "space-x-1")}>
      {portalNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <span className="text-lg font-semibold">
                    {t("portal:title")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <NavLinks mobile />
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/portal" className="flex items-center gap-2">
            <Horse className="h-6 w-6 text-primary" />
            <span className="hidden font-semibold sm:inline-block">
              {t("portal:title")}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:ml-6">
            <NavLinks />
          </div>

          {/* Right Side */}
          <div className="ml-auto flex items-center gap-2">
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block max-w-[150px] truncate">
                    {user?.email}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/portal/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {t("portal:nav.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("common:buttons.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {t("portal:footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4">
            <Link to="/portal/help" className="hover:text-foreground">
              {t("portal:footer.help")}
            </Link>
            <Link to="/portal/privacy" className="hover:text-foreground">
              {t("portal:footer.privacy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
