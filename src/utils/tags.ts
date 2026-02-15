export function expandHierarchicalTags(tags: string[]): string[] {
  const expanded: string[] = [];

  for (const tag of tags) {
    const parts = tag.slice(1).split('/');
    let current = parts[0]!;
    expanded.push(current);

    for (let i = 1; i < parts.length; i++) {
      current = `${current}/${parts[i]}`;
      expanded.push(current);
    }
  }

  return expanded;
}
