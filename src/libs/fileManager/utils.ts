function getExtension(path: string) {
  return path.split('.').pop()?.toLowerCase();
}

export function filterWithExtensions(paths: string[], extensions: string[]) {
  return paths.filter((p) => extensions.includes(getExtension(p) ?? ''));
}
