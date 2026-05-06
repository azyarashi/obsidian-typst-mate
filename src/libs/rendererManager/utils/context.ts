import type { TFile } from 'obsidian';
import type { NPath } from '@/types/obsidian';

export function getNDirAndNPath(file: TFile | null): { ndir: NPath; npath?: NPath } {
  const parent = file?.parent;
  return { ndir: parent ? parent.path : '/', npath: file?.path };
}

export function getParentNPathByFileNPath(npath: NPath): NPath {
  const i = npath.lastIndexOf('/');
  return i === -1 ? '/' : `/${npath.slice(0, i + 1)}`;
}
