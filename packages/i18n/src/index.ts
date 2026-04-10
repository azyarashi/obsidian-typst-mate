type PathInto<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object ? `${K}` | `${K}.${PathInto<T[K]>}` : `${K}`;
    }[keyof T & string]
  : never;

export type ResourceSchema = Record<string, Record<string, any>>;

export interface InitOptions<T extends ResourceSchema> {
  lng: keyof T & string;
  fallbackLng?: keyof T & string;
  defaultNS: string;
  resources: T;
}

export class I18n<T extends ResourceSchema> {
  private resources: T = {} as T;
  private flatResources = new Map<string, string>();
  private lng = '';
  private fallbackLng = '';
  private defaultNS = '';

  public t = (
    key: PathInto<T[keyof T & string][keyof T[keyof T & string] & string]>,
    options?: Record<string, string | number>,
  ): string => {
    if (!this.lng) return key as string;

    const lookupKeys = [`${this.lng}.${this.defaultNS}.${key}`, `${this.fallbackLng}.${this.defaultNS}.${key}`];

    for (const fullKey of lookupKeys) {
      const value = this.flatResources.get(fullKey);
      if (value !== undefined) return this.interpolate(value, options);
    }

    return key as string;
  };

  public async init(options: InitOptions<T>): Promise<void> {
    this.resources = options.resources;
    this.lng = options.lng;
    this.fallbackLng = options.fallbackLng ?? (options.lng as string);
    this.defaultNS = options.defaultNS;
    this.flattenAll();
  }

  private flattenAll(): void {
    this.flatResources.clear();
    for (const [lng, namespaces] of Object.entries(this.resources))
      for (const [ns, content] of Object.entries(namespaces)) this.flatten(content, `${lng}.${ns}`);
  }

  private flatten(obj: any, prefix: string): void {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      const value = obj[key];
      const fullKey = `${prefix}.${key}`;

      if (typeof value === 'object' && value !== null) this.flatten(value, fullKey);
      else this.flatResources.set(fullKey, String(value));
    }
  }

  private interpolate(str: string, options?: Record<string, string | number>): string {
    if (!options) return str;
    return str.replace(/\{\{(.+?)\}\}/g, (_, k) => {
      const trimK = k.trim();
      return options[trimK] !== undefined ? String(options[trimK]) : `{{${trimK}}}`;
    });
  }

  public static createInstance<U extends ResourceSchema>(): I18n<U> {
    return new I18n<U>();
  }
}
