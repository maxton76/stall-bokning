import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { PendingInviteBanner } from "@/components/PendingInviteBanner";
import { useNavigation } from "@/hooks/useNavigation";
import { InlineSearch } from "@/components/CommandPalette/InlineSearch";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  SearchIcon,
  User,
  LogOut,
  ChevronDown,
  Settings as SettingsIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OrganizationsDropdown } from "@/components/shadcn-studio/blocks/dropdown-organizations";
import { LanguageSwitcherCompact } from "@/components/LanguageSwitcher";
import { AssistantButton } from "@/components/assistant";
import { SupportButton } from "@/components/SupportDialog";
import {
  OnboardingPanel,
  OnboardingTriggerButton,
} from "@/components/onboarding";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Clear search when dropdown closes
  useEffect(() => {
    if (!searchOpen) setSearchQuery("");
  }, [searchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setSearchOpen(false);
      setSearchQuery("");
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
      searchInputRef.current?.blur();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <OnboardingProvider>
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
            {organizationNavigation.length > 0 && (
              <SidebarGroup className="mt-auto">
                <SidebarGroupLabel>
                  {t("common:navigation.organizations")}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {organizationNavigation.map((orgItem) => (
                      <SidebarMenuItem key={orgItem.id}>
                        {/* Parent button - toggles expand */}
                        <button
                          type="button"
                          onClick={() => toggleItem(orgItem.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium",
                            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                          )}
                        >
                          <orgItem.icon className="size-5" />
                          <span>{orgItem.label}</span>
                          <ChevronDown
                            className={cn(
                              "ml-auto size-4 transition-transform duration-200",
                              expandedItem === orgItem.id && "rotate-180",
                            )}
                          />
                        </button>

                        {/* Sub-items - simple conditional render */}
                        {expandedItem === orgItem.id && (
                          <ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5">
                            {orgItem.subItems.map((subItem) => (
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
                    ))}
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

            {/* Inline search with dropdown */}
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverAnchor asChild>
                <div className="flex flex-1 max-w-xl items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                  <SearchIcon className="size-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t("common:buttons.search") + "..."}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <kbd className="ml-auto hidden sm:inline-flex rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘K
                  </kbd>
                </div>
              </PopoverAnchor>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <InlineSearch
                  searchQuery={searchQuery}
                  onSelect={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* Header Actions */}
            <div className="ml-auto flex items-center gap-2">
              {/* Language Switcher */}
              <LanguageSwitcherCompact />

              {/* Onboarding Trigger */}
              <OnboardingTriggerButton />

              {/* Support */}
              <SupportButton />

              {/* Notifications */}
              <NotificationBell />

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

          {/* Pending Invite Banner */}
          <PendingInviteBanner />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>

          {/* AI Assistant Floating Button */}
          <AssistantButton />

          {/* Onboarding Guide Panel */}
          <OnboardingPanel />
        </SidebarInset>
      </SidebarProvider>
    </OnboardingProvider>
  );
}
