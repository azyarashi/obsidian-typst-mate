import type { TFile, TFolder, Vault } from 'obsidian';

export async function createNewFile(vault: Vault, target: TFile | TFolder, content = ''): Promise<TFile> {
  let i = 0;
  let tfile: TFile;

  while (true) {
    const filename = `Untitled${i === 0 ? '' : ` ${i}`}.typ`;
    if (!(await vault.exists(`${target.path}/${filename}`))) {
      tfile = await vault.create(`${target.path}/${filename}`, content);
      break;
    }
    i++;
  }

  return tfile;
}
