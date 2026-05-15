import type ObsidianTypstMate from '@/main';
import { modalOpenPatch } from './modalOpen';

export async function applyAllPatches(plugin: ObsidianTypstMate) {
  modalOpenPatch.init(plugin);
  modalOpenPatch.apply();
}

export async function detachAllPatches() {
  await modalOpenPatch.detach();
}
