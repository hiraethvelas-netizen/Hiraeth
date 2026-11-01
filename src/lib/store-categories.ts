export type ScheduledCategory = {
  id: string;
  parent_id?: string | null;
  visible?: boolean;
  is_temporary?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export function activeCategories<T extends ScheduledCategory>(
  categories: T[],
  now = new Date(),
): T[] {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  function active(category: T, seen = new Set<string>()): boolean {
    if (seen.has(category.id) || category.visible === false) return false;
    if (
      category.is_temporary &&
      (!category.starts_at ||
        !category.ends_at ||
        category.starts_at > today ||
        category.ends_at < today)
    )
      return false;
    if (!category.parent_id) return true;
    seen.add(category.id);
    const parent = categories.find((item) => item.id === category.parent_id);
    return Boolean(parent && active(parent, seen));
  }
  return categories.filter((category) => active(category));
}
