import { State, TypstMate } from '@/api';
import { appUtils, fileManager } from '@/libs';
import type { PackageAsset, PackageSpec } from '@/types/typst';
import { ErrorCode, type Main } from '../worker';

let renderTimer: ReturnType<typeof setTimeout> | undefined;

export function getMain(): Main {
  const adapter = appUtils.app.vault.adapter;

  return {
    notice(message: string, duration?: number) {
      new Notice(message, duration);
    },

    async readBinary(p: string) {
      return await adapter.readBinary(p);
    },

    async writePackage(spec: PackageSpec, files: PackageAsset) {
      await fileManager.writePackage(spec, files);
    },

    /**
     * @see https://github.com/typst/typst/blob/main/crates/typst-kit/src/packages.rs
     */
    async fetchPackage(spec: PackageSpec): Promise<ArrayBuffer> {
      const { namespace, name, version } = spec;
      if (namespace !== 'preview') throw ErrorCode.PackageErrorNotFound;

      const res = await requestUrl({
        url: `https://packages.typst.org/${namespace}/${name}-${version}.tar.gz`,
        method: 'GET',
        throw: false,
      });

      if (res.status === 404) throw ErrorCode.PackageErrorNotFound;
      if (res.status !== 200) throw ErrorCode.PackageErrorNetworkFailed;

      return res.arrayBuffer;
    },

    updateStatus: (status: { isRendering: boolean; message?: string }) => {
      if (renderTimer) clearTimeout(renderTimer);

      if (status.isRendering) TypstMate.setStatus({ state: State.Rendering, message: status.message });
      else {
        renderTimer = setTimeout(() => {
          renderTimer = undefined;
          TypstMate.setStatus({ state: State.Idle });
        }, 250);
      }
    },
  };
}
