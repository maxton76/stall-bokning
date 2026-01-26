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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import equiDutyIcon from "@/assets/images/equiduty-icon.png";
import ProfileDropdown from "@/components/shadcn-studio/blocks/dropdown-profile";
import NotificationDropdown from "@/components/shadcn-studio/blocks/dropdown-notification";
import { OrganizationsDropdown } from "@/components/shadcn-studio/blocks/dropdown-organizations";
import { LanguageSwitcherCompact } from "@/components/LanguageSwitcher";
import { AssistantButton } from "@/components/assistant";

export default function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation(["common", "organizations"]);
  const {
    navigation,
    organizationNavigation,
    expandedItem,
    toggleItem,
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
                  // Items with subItems use Collapsible for accordion behavior
                  if (item.subItems && item.subItems.length > 0) {
                    return (
                      <Collapsible
                        key={item.id}
                        open={expandedItem === item.id}
                        onOpenChange={() => toggleItem(item.id)}
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                              <item.icon className="size-5" />
                              <span>{item.label}</span>
                              {item.badge && (
                                <Badge
                                  variant={
                                    item.badge === "new"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="ml-1 text-[10px] py-0 px-1"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                              <ChevronDown
                                className={cn(
                                  "ml-auto size-4 transition-transform duration-200",
                                  expandedItem === item.id && "rotate-180",
                                )}
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.subItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={pathname === subItem.href}
                                  >
                                    <Link to={subItem.href}>
                                      <subItem.icon className="size-4" />
                                      <span>{subItem.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  // Items without subItems remain as direct links
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
                  <Collapsible
                    open={expandedItem === organizationNavigation.id}
                    onOpenChange={() => toggleItem(organizationNavigation.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <organizationNavigation.icon className="size-5" />
                          <span>{organizationNavigation.label}</span>
                          <ChevronDown
                            className={cn(
                              "ml-auto size-4 transition-transform duration-200",
                              expandedItem === organizationNavigation.id &&
                                "rotate-180",
                            )}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {organizationNavigation.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                              >
                                <Link to={subItem.href}>
                                  <subItem.icon className="size-4" />
                                  <span>{subItem.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
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
              onNavigate={navigate}
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
