export interface Migration {
  version: string | undefined;
  next: string;
  migrate: (oldSettings: any) => any;
}

export function migrate(oldSettings: any, version: string) {
  for (const migration of migrations) {
    if (migration.version === version) {
      return migration.migrate(oldSettings);
    }
  }
}
