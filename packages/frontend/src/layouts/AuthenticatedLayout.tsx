import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  HomeIcon,
  Building2Icon,
  CalendarIcon,
  SettingsIcon,
  UsersIcon,
  SearchIcon,
  BellIcon
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/sidebar'
import Logo from '@/assets/svg/logo'
import ProfileDropdown from '@/components/shadcn-studio/blocks/dropdown-profile'
import NotificationDropdown from '@/components/shadcn-studio/blocks/dropdown-notification'
import SearchDialog from '@/components/shadcn-studio/blocks/dialog-search'
import ActivityDialog from '@/components/shadcn-studio/blocks/dialog-activity'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Stables', href: '/stables', icon: Building2Icon },
  { name: 'Schedule', href: '/schedule', icon: CalendarIcon },
  { name: 'Members', href: '/members', icon: UsersIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
]

export default function AuthenticatedLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const getUserInitials = () => {
    if (!user?.email) return 'U'
    const email = user.email
    return email.substring(0, 2).toUpperCase()
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

          {/* Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
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
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* User Profile */}
          <div className='mt-auto border-t p-4'>
            <div className='flex items-center gap-3'>
              <Avatar className='size-10'>
                <AvatarImage src='' alt={user?.email || 'User'} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className='flex-1 overflow-hidden'>
                <p className='text-sm font-medium truncate'>{user?.email}</p>
                <p className='text-xs text-muted-foreground'>Member</p>
              </div>
            </div>
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
                    <AvatarImage src='' alt={user?.email || 'User'} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className='hidden md:inline'>{user?.email?.split('@')[0]}</span>
                </Button>
              }
              onLogout={handleLogout}
              onNavigate={navigate}
              user={{
                email: user?.email || undefined,
                initials: getUserInitials()
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
