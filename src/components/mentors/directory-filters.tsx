import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type DirectoryFilters, LANGUAGES } from "@/lib/mentors/filters";

// A GET form: filters live in the URL, so results can be shared and bookmarked,
// and the browser's back button works as users expect.
export function DirectoryFiltersForm({ filters }: { filters: DirectoryFilters }) {
  return (
    <form method="get" role="search" className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="skill">Skill</Label>
        <Input id="skill" name="skill" placeholder="react, sql, interviews…" defaultValue={filters.skill ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
        <select
          id="language"
          name="language"
          defaultValue={filters.language ?? ""}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-44"
        >
          <option value="">Any language</option>
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}
