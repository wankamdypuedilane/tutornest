import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
export { initials } from "@/components/profile/user-avatar";
import type { MentorSummary } from "@/lib/mentors/queries";

const MAX_SKILLS = 3;

export function MentorCard({ mentor }: { mentor: MentorSummary }) {
  const shown = mentor.skills.slice(0, MAX_SKILLS);
  const hidden = mentor.skills.length - shown.length;

  return (
    <Link
      href={`/mentors/${mentor.slug}`}
      className="group flex gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UserAvatar name={mentor.display_name} path={mentor.avatar_path} />
      <div className="min-w-0 space-y-2">
        <h2 className="font-display text-lg font-semibold group-hover:text-primary">
          {mentor.display_name}
        </h2>
        <p className="text-sm text-muted-foreground">{mentor.headline}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {shown.map((skill) => (
            <li key={skill}>
              <Badge variant="secondary">{skill}</Badge>
            </li>
          ))}
          {hidden > 0 && (
            <li>
              <Badge variant="outline">+{hidden}</Badge>
            </li>
          )}
        </ul>
      </div>
    </Link>
  );
}
