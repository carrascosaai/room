/** Nombre sin mayúsculas, tildes ni espacios de más: «  ana  » y «Ána» son el mismo. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function sameName(a: string, b: string): boolean {
  const na = normalizeName(a);
  return na !== '' && na === normalizeName(b);
}

/** Nombres repetidos de una lista (el primero que se repite de cada uno, como lo escribió el usuario). */
export function duplicateNames(names: string[]): string[] {
  const seen = new Set<string>();
  const dup: string[] = [];
  for (const n of names) {
    const k = normalizeName(n);
    if (!k) continue;
    if (seen.has(k) && !dup.some((d) => normalizeName(d) === k)) dup.push(n.trim());
    seen.add(k);
  }
  return dup;
}
