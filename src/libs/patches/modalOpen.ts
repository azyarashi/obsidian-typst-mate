import { Modal } from 'obsidian';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { settingsManager } from '../settingsManager';
import { typstManager } from '../typstManager';

class ModalOpenPatch implements Singleton {
  private modalOpenOrig = Modal.prototype.open;

  init(_: ObsidianTypstMate) {}

  apply() {
    const modalOpenOrig = this.modalOpenOrig;

    Modal.prototype.open = function (this: Modal, ...modalOpenArgs: Parameters<typeof Modal.prototype.open>) {
      const modal = this as Modal | PrintToPdfModal;

      const isPdfModal = 'print' in modal && 'printToPdf' in modal;
      if (isPdfModal) {
        const printToPdfOrig = modal.printToPdf.bind(modal);

        modal.printToPdf = async (args) => {
          // TODO
          const pageSize = args.pageSize;
          const oldProfileName = settingsManager.settings.fitToNoteWidthProfile;
          const profileName = settingsManager.settings.fitToNoteWidthProfiles.find((p) => p.name === pageSize)?.name;
          if (profileName) settingsManager.settings.fitToNoteWidthProfile = profileName;

          const before = settingsManager.settings.enableBackgroundRendering;
          if (before) {
            settingsManager.settings.enableBackgroundRendering = false;
            await typstManager.refreshWasm();
          }

          return await printToPdfOrig(args).then(async () => {
            if (profileName) settingsManager.settings.fitToNoteWidthProfile = oldProfileName;
            typstManager.updateNoteWidth();

            if (before) {
              settingsManager.settings.enableBackgroundRendering = true;
              await typstManager.refreshWasm();
            }
          });
        };
      }

      return modalOpenOrig.apply(this, modalOpenArgs);
    };
  }

  detach() {
    Modal.prototype.open = this.modalOpenOrig;
  }
}

export const modalOpenPatch = new ModalOpenPatch();
