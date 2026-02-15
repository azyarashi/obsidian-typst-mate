export function expandHierarchicalTags(tags: string[]): Set<string> {
  const expanded = new Set<string>();

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

export function vectorsEqual(a: any[], b: any[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}
