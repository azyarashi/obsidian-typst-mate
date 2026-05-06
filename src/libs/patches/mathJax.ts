import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';

class MathJaxPatch implements Singleton {
  init(_: ObsidianTypstMate) {}

  apply() {
    // TODO:
  }

  detach() {}
}

export const mathJaxPatch = new MathJaxPatch();
