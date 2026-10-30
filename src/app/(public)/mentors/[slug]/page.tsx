import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMentorBySlug } from "@/lib/mentors/queries";

export async function generateMetadata({ params }: PageProps<"/mentors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const mentor = await getMentorBySlug(slug);
  if (!mentor) return { title: "Mentor not found" };
  return {
    title: mentor.display_name,
    description: mentor.headline || `Book a mentoring session with ${mentor.display_name}.`,
  };
}

export default function MentorPage({ params }: PageProps<"/mentors/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <MentorDetails params={params} />
      </Suspense>
    </main>
  );
}

async function MentorDetails({ params }: { params: PageProps<"/mentors/[slug]">["params"] }) {
  const { slug } = await params;
  const mentor = await getMentorBySlug(slug);
  if (!mentor) notFound();

  return (
    <article className="space-y-6">
      <header className="flex items-center gap-5">
        <UserAvatar name={mentor.display_name} path={mentor.avatar_path} className="size-20" />
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold">{mentor.display_name}</h1>
          <p className="text-lg text-muted-foreground">{mentor.headline}</p>
        </div>
      </header>
      <section aria-labelledby="skills-heading" className="space-y-2">
        <h2 id="skills-heading" className="text-sm font-semibold uppercase tracking-wide">Skills</h2>
        <ul className="flex flex-wrap gap-2">
          {mentor.skills.map((skill) => (
            <li key={skill}><Badge variant="secondary">{skill}</Badge></li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="about-heading" className="space-y-2">
        <h2 id="about-heading" className="text-sm font-semibold uppercase tracking-wide">About</h2>
        {/* Rendered as text: React escapes it, so a bio cannot inject HTML or scripts. */}
        <p className="whitespace-pre-line leading-relaxed">{mentor.bio}</p>
      </section>
      <p className="text-sm text-muted-foreground">
        Speaks {mentor.languages.join(", ") || "—"} · Time zone {mentor.timezone}
      </p>
      <Button asChild size="lg">
        <Link href={`/mentors/${mentor.slug}/book`}>Book a session</Link>
      </Button>
    </article>
  );
}
