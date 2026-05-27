// Client-side slug helper (matches DB slugify())
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function isValidSlug(s: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 2 && s.length <= 32;
}
