import { migration as migration_3_0_0 } from './3.0.0';

export interface Migration {
  version: string | undefined;
  next: string;
  migrate: (oldSettings: any) => any;
}

export const migrations: Migration[] = [migration_3_0_0];
