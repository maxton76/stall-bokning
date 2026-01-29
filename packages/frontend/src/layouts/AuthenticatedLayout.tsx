import { Outlet, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/hooks/useNavigation";
import {
  SearchIcon,
  BellIcon,
  User,
  LogOut,
  ChevronDown,
  Settings as SettingsIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import equiDutyIcon from "@/assets/images/equiduty-icon.png";
import ProfileDropdown from "@/components/shadcn-studio/blocks/dropdown-profile";
import NotificationDropdown from "@/components/shadcn-studio/blocks/dropdown-notification";
import { OrganizationsDropdown } from "@/components/shadcn-studio/blocks/dropdown-organizations";
import { LanguageSwitcherCompact } from "@/components/LanguageSwitcher";
import { AssistantButton } from "@/components/assistant";
import { SupportButton } from "@/components/SupportDialog";

export default function AuthenticatedLayout() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation(["common", "organizations"]);
  const navigate = useNavigate();
  const {
    navigation,
    organizationNavigation,
    expandedItem,
    toggleItem,
    isActive,
    pathname,
  } = useNavigation();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-4">
            <img
              src={equiDutyIcon}
              alt="EquiDuty"
              className="h-10 w-10 rounded-lg"
            />
            <span className="text-xl font-semibold text-[#3d5a45]">
              EquiDuty
            </span>
          </div>

          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  // Items with subItems - simple expand/collapse
                  if (item.subItems && item.subItems.length > 0) {
                    const isExpanded = expandedItem === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        {/* Parent button - toggles expand */}
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                          )}
                        >
                          <item.icon className="size-5" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant={
                                item.badge === "new" ? "default" : "secondary"
                              }
                              className="ml-1 text-[10px] py-0 px-1"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronDown
                            className={cn(
                              "ml-auto size-4 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>

                        {/* Sub-items - simple conditional render */}
                        {isExpanded && (
                          <ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5">
                            {item.subItems.map((subItem) => (
                              <li key={subItem.id}>
                                <Link
                                  to={subItem.href}
                                  className={cn(
                                    "flex h-7 w-full min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-left",
                                    "text-sidebar-foreground outline-none ring-sidebar-ring",
                                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    "focus-visible:ring-2",
                                    "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
                                    isActive(subItem.href) &&
                                      "bg-sidebar-accent text-sidebar-accent-foreground",
                                  )}
                                >
                                  <subItem.icon className="size-4" />
                                  <span>{subItem.label}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </SidebarMenuItem>
                    );
                  }

                  // Items without subItems - direct links
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                      >
                        <Link to={item.href}>
                          <item.icon className="size-5" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant={
                                item.badge === "new" ? "default" : "secondary"
                              }
                              className="ml-auto text-[10px] py-0 px-1"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Organization Admin Section */}
          {organizationNavigation && (
            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>
                {t("common:navigation.organizations")}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    {/* Parent button - toggles expand */}
                    <button
                      type="button"
                      onClick={() => toggleItem(organizationNavigation.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      )}
                    >
                      <organizationNavigation.icon className="size-5" />
                      <span>{organizationNavigation.label}</span>
                      <ChevronDown
                        className={cn(
                          "ml-auto size-4 transition-transform duration-200",
                          expandedItem === organizationNavigation.id &&
                            "rotate-180",
                        )}
                      />
                    </button>

                    {/* Sub-items - simple conditional render */}
                    {expandedItem === organizationNavigation.id && (
                      <ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5">
                        {organizationNavigation.subItems.map((subItem) => (
                          <li key={subItem.id}>
                            <Link
                              to={subItem.href}
                              className={cn(
                                "flex h-7 w-full min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-left",
                                "text-sidebar-foreground outline-none ring-sidebar-ring",
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                "focus-visible:ring-2",
                                "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
                                isActive(subItem.href) &&
                                  "bg-sidebar-accent text-sidebar-accent-foreground",
                              )}
                            >
                              <subItem.icon className="size-4" />
                              <span>{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Organizations Dropdown - Bottom Section */}
          <div className="mt-auto border-t pt-4 px-4">
            <OrganizationsDropdown />
          </div>

          {/* User Profile - Clickable Dropdown */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-0 h-auto hover:bg-accent"
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="size-10">
                      <AvatarImage src="" alt={user?.fullName || "User"} />
                      <AvatarFallback>{user?.initials || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden text-left">
                      <p className="text-sm font-medium truncate">
                        {user?.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>
                  {t("common:userMenu.myAccount")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("common:userMenu.profile")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>{t("common:userMenu.settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("common:userMenu.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${t("common:buttons.search")}...`}
                className="pl-9"
                onClick={() => {
                  /* TODO: Open search dialog */
                }}
              />
            </div>
          </div>

          {/* Header Actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcherCompact />

            {/* Support */}
            <SupportButton />

            {/* Notifications */}
            <NotificationDropdown
              trigger={
                <Button variant="ghost" size="icon" className="relative">
                  <BellIcon className="size-5" />
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 size-5 p-0 flex items-center justify-center text-xs"
                  >
                    3
                  </Badge>
                </Button>
              }
            />

            {/* Profile */}
            <ProfileDropdown
              trigger={
                <Button variant="ghost" className="gap-2">
                  <Avatar className="size-8">
                    <AvatarImage src="" alt={user?.fullName || "User"} />
                    <AvatarFallback>{user?.initials || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user?.fullName}</span>
                </Button>
              }
              onLogout={handleLogout}
              user={{
                email: user?.email || undefined,
                firstName: user?.firstName || undefined,
                lastName: user?.lastName || undefined,
                initials: user?.initials || "U",
              }}
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {/* AI Assistant Floating Button */}
        <AssistantButton />
      </SidebarInset>
    </SidebarProvider>
  );
}
