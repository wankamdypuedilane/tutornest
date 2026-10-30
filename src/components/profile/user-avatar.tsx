import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarPublicUrl } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

type UserAvatarProps = { name: string; path?: string | null; className?: string };

// The photo when there is one, the initials otherwise (and while it loads).
export function UserAvatar({ name, path, className }: UserAvatarProps) {
  const src = avatarPublicUrl(path);
  return (
    <Avatar className={cn("size-12", className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback aria-hidden="true">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
