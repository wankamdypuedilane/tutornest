export type DirectoryFilters = {
  skill: string | null;
  language: string | null;
};

export const LANGUAGES = ["English", "French", "Spanish", "Arabic", "Portuguese", "German"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Turns untrusted query-string values into safe, normalized filters. */
export function parseDirectoryFilters(params: SearchParams): DirectoryFilters {
  const rawSkill = first(params.skill)?.trim().toLowerCase() ?? "";
  const skill = /^[a-z0-9+#.\- ]{1,30}$/.test(rawSkill) ? rawSkill : null;

  const rawLanguage = first(params.language) ?? "";
  const language = (LANGUAGES as readonly string[]).includes(rawLanguage) ? rawLanguage : null;

  return { skill, language };
}
