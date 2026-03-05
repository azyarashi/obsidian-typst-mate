import en from '@resources/locales/en.json';
import i18next, { type TOptions } from 'i18next';

export type InterpolationValues = Record<string, string | number>;

/**
 * Recursively extracts dot-separated paths from a nested object type, producing a union of all leaf keys.
 * e.g., `"settings.compiler.font.heading"`
 */
type NestedKeys<T, Prefix extends string = ''> =
  T extends Record<string, unknown>
    ? { [K in keyof T & string]: NestedKeys<T[K], `${Prefix}${K}.`> }[keyof T & string]
    : Prefix extends `${infer R}.`
      ? R
      : Prefix;

export type TranslationKey = NestedKeys<typeof en>;

const supportedLocales = new Set(['en']);

const i18n = i18next.createInstance();

function detectLocale(): string {
  const locale = localStorage.getItem('language')?.toLowerCase();
  if (locale && supportedLocales.has(locale)) return locale;
  return 'en';
}

export async function initI18n(): Promise<void> {
  await i18n.init({
    lng: detectLocale(),
    fallbackLng: 'en',
    defaultNS: 'translation',
    resources: {
      en: { translation: en },
    },
    showSupportNotice: false,
  });
}

/**
 * Returns a translated string for the given key.
 */
export function t(key: TranslationKey, options?: TOptions<InterpolationValues>): string {
  return i18n.t(key, options);
}

export { tFragment } from './fragment';
