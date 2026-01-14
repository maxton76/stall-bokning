import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AssigneeAvatarProps {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.substring(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500 text-white",
    "bg-green-500 text-white",
    "bg-purple-500 text-white",
    "bg-orange-500 text-white",
    "bg-pink-500 text-white",
    "bg-teal-500 text-white",
    "bg-indigo-500 text-white",
    "bg-rose-500 text-white",
    "bg-amber-500 text-white",
    "bg-cyan-500 text-white",
  ];

  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length]!;
}

export function AssigneeAvatar({
  name,
  size = "sm",
  className,
}: AssigneeAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (!name) {
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarFallback className="bg-gray-200 text-gray-500">?</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className={cn("font-medium", getAvatarColor(name))}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
