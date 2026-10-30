import type { Metadata } from "next";
import { Suspense } from "react";
import { DirectoryFiltersForm } from "@/components/mentors/directory-filters";
import { MentorCard } from "@/components/mentors/mentor-card";
import { Skeleton } from "@/components/ui/skeleton";
import { parseDirectoryFilters } from "@/lib/mentors/filters";
import { getPublishedMentors } from "@/lib/mentors/queries";

export const metadata: Metadata = {
  title: "Find a mentor",
  description: "Browse experienced mentors by skill and language, and book a one-to-one session.",
};

export default function MentorsPage({ searchParams }: PageProps<"/mentors">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Find a mentor</h1>
        <p className="text-muted-foreground">
          Every mentor is reviewed by the Northlight Learning team.
        </p>
      </header>
      <Suspense fallback={<DirectorySkeleton />}>
        <Directory searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Directory({ searchParams }: { searchParams: PageProps<"/mentors">["searchParams"] }) {
  // Request data is read here, outside the cache; only plain filters reach the cached query.
  const filters = parseDirectoryFilters(await searchParams);
  const mentors = await getPublishedMentors(filters);

  return (
    <div className="space-y-6">
      <DirectoryFiltersForm filters={filters} />
      <p role="status" className="text-sm text-muted-foreground">
        {mentors.length === 1 ? "1 mentor" : `${mentors.length} mentors`}
      </p>
      {mentors.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No mentor matches these filters yet. Try another skill or language.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {mentors.map((mentor) => (
            <li key={mentor.slug}>
              <MentorCard mentor={mentor} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}
