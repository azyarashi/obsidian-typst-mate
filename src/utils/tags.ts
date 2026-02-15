export function expandHierarchicalTags(tags: string[]): Set<string> {
  const expanded: Set<string> = new Set();

  for (const tag of tags) {
    const parts = tag.slice(1).split('/');
    let current = parts[0]!;
    expanded.add(current);

    for (let i = 1; i < parts.length; i++) {
      current = `${current}/${parts[i]}`;
      expanded.add(current);
    }
  }

  return expanded;
}
