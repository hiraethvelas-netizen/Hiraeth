export function categoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

export function libraryCategories(official: string[], personal: string[]) {
  const names = new Map<string, string>();
  for (const value of [...official, ...personal]) {
    const label = value.trim().replace(/\s+/g, " ");
    if (label && !names.has(categoryKey(label))) names.set(categoryKey(label), label);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function canonicalCategory(value: string, choices: string[]) {
  return (
    choices.find((name) => categoryKey(name) === categoryKey(value)) ??
    value.trim().replace(/\s+/g, " ")
  );
}
