interface Migration {
  version: string | undefined;
  next: string;
  migrate: (oldSettings: any) => any;
}

export const migrations: Migration[] = [
  {
    version: undefined,
    next: '3.0.0',
    migrate: (oldSettings: any) => {
      return {
        ...oldSettings,
      };
    },
  },
] as const;
