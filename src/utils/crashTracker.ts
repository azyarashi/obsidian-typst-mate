import { settingsManager } from '@/libs';

const MAX_CRASH_COUNT = 3;

export class CrashTracker {
  private shouldBlockStart_: boolean = false;

  get shouldBlockStart(): boolean {
    if (this.shouldBlockStart_) return true;
    else this.shouldBlockStart_ = MAX_CRASH_COUNT <= settingsManager.settings.crashCount;
    return this.shouldBlockStart_;
  }

  updateCrashStatus(crash: boolean) {
    if (crash) {
      settingsManager.settings.crashCount += 1;
      settingsManager.saveSettings();
    } else {
      settingsManager.settings.crashCount = 0;
      settingsManager.saveSettings();
    }
  }
}

export const crashTracker = new CrashTracker();
