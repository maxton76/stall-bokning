import type { ReactNode } from "react";

import { UserIcon, SettingsIcon, LogOutIcon } from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  trigger: ReactNode;
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    initials?: string;
  };
};

const ProfileDropdown = ({
  trigger,
  defaultOpen,
  align = "end",
  onLogout,
  onNavigate,
  user,
}: Props) => {
  // user.firstName and user.lastName now properly available from AppUser
  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "user@example.com";
  const displayInitials =
    user?.initials || displayName.substring(0, 2).toUpperCase();
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align={align || "end"}>
        <DropdownMenuLabel className="flex items-center gap-4 px-4 py-2.5 font-normal">
          <div className="relative">
            <Avatar className="size-10">
              <AvatarImage src="" alt={displayName} />
              <AvatarFallback>{displayInitials}</AvatarFallback>
            </Avatar>
            <span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-foreground text-lg font-semibold">
              {displayName}
            </span>
            <span className="text-muted-foreground text-base">
              {displayEmail}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="px-4 py-2.5 text-base"
            onClick={() => onNavigate?.("/account")}
          >
            <UserIcon className="text-foreground size-5" />
            <span>My account</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-4 py-2.5 text-base"
            onClick={() => onNavigate?.("/settings")}
          >
            <SettingsIcon className="text-foreground size-5" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="px-4 py-2.5 text-base text-destructive focus:text-destructive"
          onClick={onLogout}
        >
          <LogOutIcon className="size-5" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
