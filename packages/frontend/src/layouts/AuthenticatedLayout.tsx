import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import {
  CalendarIcon,
  SettingsIcon,
  UsersIcon,
  SearchIcon,
  BellIcon,
  House as HorseIcon,
  History,
  Settings as Settings2Icon,
  User,
  LogOut,
  Building2,
  Plug,
  Tractor,
  Shield,
  CreditCard,
  Warehouse,
  ClipboardList,
  Heart,
  ChevronDown,
  Wheat,
  UserCircle,
  CalendarCheck2,
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
import Logo from "@/assets/svg/logo";
import ProfileDropdown from "@/components/shadcn-studio/blocks/dropdown-profile";
import NotificationDropdown from "@/components/shadcn-studio/blocks/dropdown-notification";
import { OrganizationsDropdown } from "@/components/shadcn-studio/blocks/dropdown-organizations";
import { LanguageSwitcherCompact } from "@/components/LanguageSwitcher";

export default function AuthenticatedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  const { t } = useTranslation(["common", "organizations"]);

  // State for accordion menu - track which menu item is expanded
  const [expandedItem, setExpandedItem] = useState<string | null>(() => {
    // Initialize with currently active menu item expanded
    const navigation = [
      {
        name: "horses",
        href: "/horses",
        subItems: [
          { href: "/horses" },
          { href: "/location-history" },
          { href: "/horses/settings" },
        ],
      },
      {
        name: "activities",
        href: "/activities",
        subItems: [
          { href: "/activities" },
          { href: "/activities/planning" },
          { href: "/activities/care" },
          { href: "/activities/settings" },
        ],
      },
      {
        name: "feeding",
        href: "/feeding",
        subItems: [
          { href: "/feeding/schedule" },
          { href: "/feeding/settings" },
        ],
      },
      {
        name: "facilities",
        href: "/facilities",
        subItems: [
          { href: "/facilities/reservations" },
          { href: "/facilities/manage" },
          { href: "/stables" },
        ],
      },
      { name: "schedule", href: "/schedule" },
      { name: "myAvailability", href: "/my-availability" },
      { name: "settings", href: "/settings" },
    ];

    // Find which menu item's submenu contains current path
    const activeMenuItem = navigation.find((item) =>
      item.subItems?.some((subItem) => location.pathname === subItem.href),
    );
    return activeMenuItem?.name || null;
  });

  // Toggle accordion menu item
  const toggleMenuItem = (itemName: string) => {
    setExpandedItem(expandedItem === itemName ? null : itemName);
  };

  // Main navigation items with translation keys
  const navigation = [
    {
      name: "horses",
      label: t("common:navigation.myHorses"),
      href: "/horses",
      icon: HorseIcon,
      subItems: [
        {
          name: "horseList",
          label: t("common:navigation.horses"),
          href: "/horses",
          icon: HorseIcon,
        },
        {
          name: "locationHistory",
          label: t("common:navigation.locationHistory"),
          href: "/location-history",
          icon: History,
        },
        {
          name: "settings",
          label: t("common:navigation.settings"),
          href: "/horses/settings",
          icon: Settings2Icon,
        },
      ],
    },
    {
      name: "activities",
      label: t("common:navigation.activities"),
      href: "/activities",
      icon: ClipboardList,
      subItems: [
        {
          name: "actionList",
          label: t("common:navigation.activities"),
          href: "/activities",
          icon: ClipboardList,
        },
        {
          name: "planning",
          label: t("common:navigation.schedule"),
          href: "/activities/planning",
          icon: CalendarIcon,
        },
        {
          name: "care",
          label: t("common:roles.groom"),
          href: "/activities/care",
          icon: Heart,
        },
        {
          name: "settings",
          label: t("common:navigation.settings"),
          href: "/activities/settings",
          icon: SettingsIcon,
        },
      ],
    },
    {
      name: "feeding",
      label: t("common:navigation.feeding"),
      href: "/feeding",
      icon: Wheat,
      subItems: [
        {
          name: "schedule",
          label: t("common:navigation.schedule"),
          href: "/feeding/schedule",
          icon: CalendarIcon,
        },
        {
          name: "settings",
          label: t("common:navigation.settings"),
          href: "/feeding/settings",
          icon: Settings2Icon,
        },
      ],
    },
    {
      name: "facilities",
      label: t("common:navigation.facilities"),
      href: "/facilities",
      icon: Warehouse,
      subItems: [
        {
          name: "reservations",
          label: t("common:navigation.myReservations"),
          href: "/facilities/reservations",
          icon: CalendarIcon,
        },
        {
          name: "manageFacilities",
          label: t("common:navigation.facilities"),
          href: "/facilities/manage",
          icon: SettingsIcon,
        },
        {
          name: "stables",
          label: t("common:navigation.stables"),
          href: "/stables",
          icon: Building2,
        },
      ],
    },
    {
      name: "schedule",
      label: t("common:navigation.schedule"),
      href: "/schedule",
      icon: CalendarIcon,
    },
    {
      name: "myAvailability",
      label: t("common:navigation.myAvailability"),
      href: "/my-availability",
      icon: UserCircle,
    },
    {
      name: "settings",
      label: t("common:navigation.settings"),
      href: "/settings",
      icon: SettingsIcon,
    },
  ];

  // Organization navigation (only show sub-items if an organization is selected)
  const organizationNavigation = currentOrganizationId
    ? {
        name: "organizationAdmin",
        label: t("organizations:menu.settings"),
        icon: Building2,
        subItems: [
          {
            name: "members",
            label: t("organizations:menu.members"),
            href: `/organizations/${currentOrganizationId}/users`,
            icon: UsersIcon,
          },
          {
            name: "leaveManagement",
            label: t("organizations:menu.leaveManagement"),
            href: `/organizations/${currentOrganizationId}/leave-management`,
            icon: CalendarIcon,
          },
          {
            name: "scheduleManagement",
            label: t("organizations:menu.scheduleManagement"),
            href: `/organizations/${currentOrganizationId}/schedule-management`,
            icon: ClipboardList,
          },
          {
            name: "integrations",
            label: t("organizations:menu.integrations"),
            href: `/organizations/${currentOrganizationId}/integrations`,
            icon: Plug,
          },
          {
            name: "manure",
            label: t("organizations:menu.manure"),
            href: `/organizations/${currentOrganizationId}/manure`,
            icon: Tractor,
          },
          {
            name: "permissions",
            label: t("organizations:menu.permissions"),
            href: `/organizations/${currentOrganizationId}/permissions`,
            icon: Shield,
          },
          {
            name: "subscription",
            label: t("organizations:menu.subscription"),
            href: `/organizations/${currentOrganizationId}/subscription`,
            icon: CreditCard,
          },
          {
            name: "settings",
            label: t("organizations:menu.settings"),
            href: `/organizations/${currentOrganizationId}/settings`,
            icon: Settings2Icon,
          },
        ],
      }
    : null;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-4">
            <Logo className="size-8" />
            <span className="text-xl font-semibold">StallBokning</span>
          </div>

          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>
              {t("common:navigation.dashboard")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  // Items with subItems use Collapsible for accordion behavior
                  if (item.subItems) {
                    return (
                      <Collapsible
                        key={item.name}
                        open={expandedItem === item.name}
                        onOpenChange={() => toggleMenuItem(item.name)}
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                              <item.icon className="size-5" />
                              <span>{item.label}</span>
                              <ChevronDown
                                className={cn(
                                  "ml-auto size-4 transition-transform duration-200",
                                  expandedItem === item.name && "rotate-180",
                                )}
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.subItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.name}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={
                                      location.pathname === subItem.href
                                    }
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
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.href}
                      >
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

          {/* My Reservations - Personal Section */}
          <SidebarGroup>
            <SidebarGroupLabel>
              {t("common:userMenu.profile")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      location.pathname === "/my-reservations" ||
                      location.pathname.startsWith("/my-reservations/")
                    }
                  >
                    <Link to="/my-reservations">
                      <CalendarCheck2 className="size-5" />
                      <span>{t("common:navigation.myReservations")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                    open={expandedItem === organizationNavigation.name}
                    onOpenChange={() =>
                      toggleMenuItem(organizationNavigation.name)
                    }
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <organizationNavigation.icon className="size-5" />
                          <span>{organizationNavigation.label}</span>
                          <ChevronDown
                            className={cn(
                              "ml-auto size-4 transition-transform duration-200",
                              expandedItem === organizationNavigation.name &&
                                "rotate-180",
                            )}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {organizationNavigation.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.name}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === subItem.href}
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
      </SidebarInset>
    </SidebarProvider>
  );
}
