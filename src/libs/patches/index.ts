import type ObsidianTypstMate from '@/main';
import { editorSaveFilePatch } from './commands';
import { modalOpenPatch } from './modalOpen';

export function applyAllPatches(plugin: ObsidianTypstMate) {
  editorSaveFilePatch.init(plugin);
  editorSaveFilePatch.apply();

  modalOpenPatch.init(plugin);
  modalOpenPatch.apply();
}

export function detachAllPatches() {
  editorSaveFilePatch.detach();
  modalOpenPatch.detach();
}
