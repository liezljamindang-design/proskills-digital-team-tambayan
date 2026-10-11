/** @mentions: who a message is calling, by @username or @firstname (spaces left out), or @everyone. */
interface Named { id: string; name: string; firstName?: string }

const tagsIn = (text: string) => (text.toLowerCase().match(/@[\p{L}\p{N}_.-]+/gu) ?? []).map((t) => t.slice(1));
const handles = (p: Pick<Named, "name" | "firstName">) => [p.name, p.firstName].filter(Boolean).map((n) => n!.toLowerCase().replace(/\s+/g, ""));
const hit = (tags: string[], p: Pick<Named, "name" | "firstName">) => tags.some((t) => handles(p).some((n) => n === t || (n.startsWith(t) && t.length >= 3)));

/** True when the message calls this person, or everyone. */
export function mentions(text: string, person: Pick<Named, "name" | "firstName">): boolean {
  const tags = tagsIn(text);
  return tags.includes("everyone") || hit(tags, person);
}
/** The people a message calls by name. @everyone is not expanded here. */
export function mentionedIds(text: string, people: Named[]): string[] {
  const tags = tagsIn(text);
  return tags.length ? people.filter((p) => hit(tags, p)).map((p) => p.id).slice(0, 20) : [];
}
/** What to type after @ to call this person: their name with the spaces taken out. */
export const handleOf = (p: Pick<Named, "name">) => p.name.replace(/\s+/g, "");
