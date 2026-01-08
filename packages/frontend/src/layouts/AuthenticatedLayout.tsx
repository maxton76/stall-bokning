import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganizationContext } from '@/contexts/OrganizationContext'
import {
  HomeIcon,
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
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import Logo from '@/assets/svg/logo'
import ProfileDropdown from '@/components/shadcn-studio/blocks/dropdown-profile'
import NotificationDropdown from '@/components/shadcn-studio/blocks/dropdown-notification'
import { OrganizationsDropdown } from '@/components/shadcn-studio/blocks/dropdown-organizations'

export default function AuthenticatedLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { currentOrganizationId } = useOrganizationContext()

  // State for accordion menu - track which menu item is expanded
  const [expandedItem, setExpandedItem] = useState<string | null>(() => {
    // Initialize with currently active menu item expanded
    const navigation = [
      { name: 'Dashboard', href: '/dashboard' },
      {
        name: 'My Horses',
        href: '/horses',
        subItems: [
          { href: '/horses' },
          { href: '/location-history' },
          { href: '/horses/settings' },
        ],
      },
      {
        name: 'Activities',
        href: '/activities',
        subItems: [
          { href: '/activities' },
          { href: '/activities/planning' },
          { href: '/activities/care' },
          { href: '/activities/settings' },
        ],
      },
      {
        name: 'Facilities',
        href: '/facilities',
        subItems: [
          { href: '/facilities/reservations' },
          { href: '/facilities/manage' },
          { href: '/stables' },
        ],
      },
      { name: 'Schedule', href: '/schedule' },
      { name: 'Settings', href: '/settings' },
    ]

    // Find which menu item's submenu contains current path
    const activeMenuItem = navigation.find(item =>
      item.subItems?.some(subItem => location.pathname === subItem.href)
    )
    return activeMenuItem?.name || null
  })

  // Toggle accordion menu item
  const toggleMenuItem = (itemName: string) => {
    setExpandedItem(expandedItem === itemName ? null : itemName)
  }

  // Main navigation items
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    {
      name: 'My Horses',
      href: '/horses',
      icon: HorseIcon,
      subItems: [
        { name: 'Horse list', href: '/horses', icon: HorseIcon },
        { name: 'Location History', href: '/location-history', icon: History },
        { name: 'Settings', href: '/horses/settings', icon: Settings2Icon },
      ],
    },
    {
      name: 'Activities',
      href: '/activities',
      icon: ClipboardList,
      subItems: [
        { name: 'Action list', href: '/activities', icon: ClipboardList },
        { name: 'Planning', href: '/activities/planning', icon: CalendarIcon },
        { name: 'Care', href: '/activities/care', icon: Heart },
        { name: 'Settings', href: '/activities/settings', icon: SettingsIcon },
      ],
    },
    {
      name: 'Facilities',
      href: '/facilities',
      icon: Warehouse,
      subItems: [
        { name: 'Reservations', href: '/facilities/reservations', icon: CalendarIcon },
        { name: 'Manage facilities', href: '/facilities/manage', icon: SettingsIcon },
        { name: 'Stables', href: '/stables', icon: Building2 },
      ],
    },
    { name: 'Schedule', href: '/schedule', icon: CalendarIcon },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ]

  // Organization navigation (only show sub-items if an organization is selected)
  const organizationNavigation = currentOrganizationId ? {
    name: 'Organization Admin',
    icon: Building2,
    subItems: [
      {
        name: 'Members',
        href: `/organizations/${currentOrganizationId}/users`,
        icon: UsersIcon
      },
      {
        name: 'Integrations',
        href: `/organizations/${currentOrganizationId}/integrations`,
        icon: Plug
      },
      {
        name: 'Manure',
        href: `/organizations/${currentOrganizationId}/manure`,
        icon: Tractor
      },
      {
        name: 'Permissions',
        href: `/organizations/${currentOrganizationId}/permissions`,
        icon: Shield
      },
      {
        name: 'Subscription',
        href: `/organizations/${currentOrganizationId}/subscription`,
        icon: CreditCard
      },
      {
        name: 'Settings',
        href: `/organizations/${currentOrganizationId}/settings`,
        icon: Settings2Icon
      },
    ],
  } : null

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          {/* Logo */}
          <div className='flex items-center gap-2 px-6 py-4'>
            <Logo className='size-8' />
            <span className='text-xl font-semibold'>StallBokning</span>
          </div>

          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
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
                              <item.icon className='size-5' />
                              <span>{item.name}</span>
                              <ChevronDown
                                className={cn(
                                  'ml-auto size-4 transition-transform duration-200',
                                  expandedItem === item.name && 'rotate-180'
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
                                    isActive={location.pathname === subItem.href}
                                  >
                                    <Link to={subItem.href}>
                                      <subItem.icon className='size-4' />
                                      <span>{subItem.name}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  // Items without subItems remain as direct links
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.href}
                      >
                        <Link to={item.href}>
                          <item.icon className='size-5' />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Organization Admin Section */}
          {organizationNavigation && (
            <SidebarGroup className='mt-auto'>
              <SidebarGroupLabel>Organization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Collapsible
                    open={expandedItem === organizationNavigation.name}
                    onOpenChange={() => toggleMenuItem(organizationNavigation.name)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <organizationNavigation.icon className='size-5' />
                          <span>{organizationNavigation.name}</span>
                          <ChevronDown
                            className={cn(
                              'ml-auto size-4 transition-transform duration-200',
                              expandedItem === organizationNavigation.name && 'rotate-180'
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
                                  <subItem.icon className='size-4' />
                                  <span>{subItem.name}</span>
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
          <div className='mt-auto border-t pt-4 px-4'>
            <OrganizationsDropdown />
          </div>

          {/* User Profile - Clickable Dropdown */}
          <div className='border-t p-4'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='w-full justify-start p-0 h-auto hover:bg-accent'>
                  <div className='flex items-center gap-3 w-full'>
                    <Avatar className='size-10'>
                      <AvatarImage src='' alt={user?.fullName || 'User'} />
                      <AvatarFallback>{user?.initials || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className='flex-1 overflow-hidden text-left'>
                      <p className='text-sm font-medium truncate'>{user?.fullName}</p>
                      <p className='text-xs text-muted-foreground truncate'>{user?.email}</p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-56'>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to='/account'>
                    <User className='mr-2 h-4 w-4' />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to='/settings'>
                    <SettingsIcon className='mr-2 h-4 w-4' />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className='mr-2 h-4 w-4' />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        {/* Header */}
        <header className='sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4'>
          <SidebarTrigger />

          {/* Search */}
          <div className='flex-1 max-w-xl'>
            <div className='relative'>
              <SearchIcon className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search...'
                className='pl-9'
                onClick={() => {/* TODO: Open search dialog */}}
              />
            </div>
          </div>

          {/* Header Actions */}
          <div className='ml-auto flex items-center gap-2'>
            {/* Notifications */}
            <NotificationDropdown
              trigger={
                <Button variant='ghost' size='icon' className='relative'>
                  <BellIcon className='size-5' />
                  <Badge
                    variant='destructive'
                    className='absolute -right-1 -top-1 size-5 p-0 flex items-center justify-center text-xs'
                  >
                    3
                  </Badge>
                </Button>
              }
            />

            {/* Profile */}
            <ProfileDropdown
              trigger={
                <Button variant='ghost' className='gap-2'>
                  <Avatar className='size-8'>
                    <AvatarImage src='' alt={user?.fullName || 'User'} />
                    <AvatarFallback>{user?.initials || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className='hidden md:inline'>{user?.fullName}</span>
                </Button>
              }
              onLogout={handleLogout}
              onNavigate={navigate}
              user={{
                email: user?.email || undefined,
                firstName: user?.firstName || undefined,
                lastName: user?.lastName || undefined,
                initials: user?.initials || 'U'
              }}
            />
          </div>
        </header>

        {/* Main Content */}
        <main className='flex-1 overflow-auto'>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
