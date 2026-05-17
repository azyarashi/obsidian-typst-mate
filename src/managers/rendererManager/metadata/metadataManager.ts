import type { CachedMetadata } from 'obsidian';
import { getAllTags } from 'obsidian';
import { appUtils, fileManager, settingsManager } from '@/libs';
import type ObsidianTypstMate from '@/main';
import type { NPath } from '@/types/obsidian';
import { expandHierarchicalTags } from '@/utils/tags';

export class MetadataManager {
  metadataDocs: Map<NPath, string> = new Map();
  tagFiles: Set<string> = new Set();
  lastStateHash = '';
  preamble = '';

  init(_: ObsidianTypstMate) {}

  async collectTagFiles(): Promise<Map<string, string>> {
    const files: Map<string, string> = new Map();
    const { settings } = settingsManager;
    if (!settings.resourcesPath) return files;

    const resourcesPath = settings.resourcesPath;
    if (!(await appUtils.app.vault.adapter.exists(resourcesPath))) return files;

    const filePaths = await appUtils.app.vault.adapter.list(resourcesPath);

    // リソースディレクトリ直下の .typ を登録
    for (const file of filePaths.files) {
      if (!file.endsWith('.typ')) continue;
      const contents = await appUtils.app.vault.adapter.read(file);
      files.set(`/${file}`, contents);
    }

    const tagsPath = `${resourcesPath}/tags`;
    if (!filePaths.folders.contains(tagsPath)) return files;

    // tags/ 以下の .typ をタグ名と紐付けて登録
    const list = await appUtils.app.vault.adapter.list(tagsPath);
    this.tagFiles.clear();
    for (const file of list.files) {
      if (!file.endsWith('.typ')) continue;

      const contents = await appUtils.app.vault.adapter.read(file);
      files.set(`/${file}`, contents);

      this.tagFiles.add(
        file
          .slice(resourcesPath.length + 1) // resourcesPath + "/" の分
          .slice(5) // "tags/" の分
          .slice(0, -4) // ".typ" の分
          .replaceAll('.', '/'),
      );
    }

    return files;
  }

  syncFileCache(npath: NPath, metadata: CachedMetadata): boolean {
    const imports: string[] = metadata.frontmatter?.import ?? [];
    const definitions: string[] = metadata.frontmatter?.definitions ?? metadata.frontmatter?.let ?? [];
    const tags: string[] = [];
    for (const tag of expandHierarchicalTags(getAllTags(metadata) ?? [])) if (this.tagFiles.has(tag)) tags.push(tag);

    const doc = this.constructMetadataDocument(imports, definitions);
    if (this.metadataDocs.get(npath) === doc) return false;

    this.metadataDocs.set(npath, doc);
    return true;
  }

  constructMetadataDocument(imports: string[], definitions: string[]): string {
    let document = '';
    for (const tag of this.tagFiles)
      document += `#import "${fileManager.baseDirPath}/${settingsManager.settings.resourcesPath}/tags/${tag.replaceAll('/', '.')}.typ": *;`;
    for (const i of imports) document += `#import ${i};`;
    for (const d of definitions) document += `#let ${d};`;

    return document;
  }

  /** npath なしで render() が呼ばれた場合にステートをリセットする */
  reset() {
    this.lastStateHash = '';
    this.preamble = '';
    // .wasm.update_frontmatter('');
  }
}

export const metadataManager = new MetadataManager();
