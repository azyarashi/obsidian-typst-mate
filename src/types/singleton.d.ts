import type ObsidianTypstMate from '@/main';

export declare abstract class Singleton {
  public abstract init(plugin: ObsidianTypstMate): void | Promise<void>;
  public abstract detach(): void | Promise<void>;
}
