import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium tracking-wide text-primary uppercase">
        Northlight Learning
      </p>
      <h1 className="text-4xl font-semibold sm:text-5xl">
        Learn faster with a mentor who has done it before.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        TutorNest connects learners with experienced mentors for one-to-one
        video sessions. Set a goal, pick a time, and start learning.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/mentors">Find a mentor</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/become-a-mentor">Become a mentor</Link>
        </Button>
      </div>
    </main>
  );
}
